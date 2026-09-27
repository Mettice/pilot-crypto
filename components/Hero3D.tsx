'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Billboard, Environment, Lightformer, Sparkles, Stars } from '@react-three/drei'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import * as THREE from 'three'

const GOLD = '#F5B400'
const BLUE = '#00AEEF'

// Pointer position in -1..1, tracked on window because the canvas
// sits behind the hero content and has pointer-events disabled.
const pointer = { x: 0, y: 0 }

// The beam falls from off-screen top-right (SOURCE) toward the viewer at
// the bottom (END). Coins travel along it, spreading as the beam widens.
const SOURCE = new THREE.Vector3(5.4, 4.8, -5)
const END = new THREE.Vector3(1.8, -5.4, 3)
const DIR = END.clone().sub(SOURCE)
const DIR_N = DIR.clone().normalize()
const PERP = new THREE.Vector3(-DIR.y, DIR.x, 0).normalize()
const BEAM_QUAT = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), DIR_N)

const COIN_COUNT = 26
const LOOP_SECONDS = 16 // time for one coin to travel the whole beam

// ── Coin geometry: body + raised rims + emblem, merged into one mesh ──────────
function useCoinGeometry() {
  return useMemo(() => {
    const parts: THREE.BufferGeometry[] = [new THREE.CylinderGeometry(1, 1, 0.14, 64)]
    for (const side of [1, -1]) {
      const rim = new THREE.TorusGeometry(0.92, 0.05, 12, 64)
      rim.rotateX(Math.PI / 2).translate(0, 0.07 * side, 0)
      const ring = new THREE.TorusGeometry(0.6, 0.02, 8, 64)
      ring.rotateX(Math.PI / 2).translate(0, 0.07 * side, 0)
      const diamond = new THREE.OctahedronGeometry(0.38, 0)
      diamond.scale(1, 0.1, 1).rotateY(Math.PI / 4).translate(0, 0.07 * side, 0)
      parts.push(rim, ring, diamond)
    }
    // mergeGeometries needs every part to share attributes and indexing
    const merged = mergeGeometries(
      parts.map((g) => {
        const n = g.index ? g.toNonIndexed() : g
        n.deleteAttribute('uv')
        return n
      })
    )
    merged.computeVertexNormals()
    parts.forEach((g) => g.dispose())
    return merged
  }, [])
}

// ── Coin stream: one instanced draw call for all coins ────────────────────────
function CoinStream() {
  const mesh = useRef<THREE.InstancedMesh>(null)
  const geometry = useCoinGeometry()

  const coins = useMemo(
    () =>
      Array.from({ length: COIN_COUNT }, (_, i) => ({
        t0: i / COIN_COUNT + Math.random() * 0.02,
        lateral: (Math.random() * 2 - 1) * 1.1,
        depth: (Math.random() * 2 - 1) * 1.2,
        size: 0.28 + Math.random() * 0.12,
        phase: Math.random() * Math.PI * 2,
        wobble: 0.4 + Math.random() * 0.5,
        spin: (Math.random() < 0.5 ? -1 : 1) * (0.2 + Math.random() * 0.4),
        push: new THREE.Vector2(),
      })),
    []
  )

  const tmp = useMemo(
    () => ({
      obj: new THREE.Object3D(),
      pos: new THREE.Vector3(),
      away: new THREE.Vector2(),
      cursor: new THREE.Vector2(),
    }),
    []
  )

  useFrame(({ clock, viewport }, dt) => {
    const m = mesh.current
    if (!m) return
    const time = clock.elapsedTime
    const { obj, pos, away, cursor } = tmp

    // Cursor in world units on the z=0 plane
    cursor.set((pointer.x * viewport.width) / 2, (-pointer.y * viewport.height) / 2)

    coins.forEach((c, i) => {
      const t = (c.t0 + time / LOOP_SECONDS) % 1
      const spread = 0.6 + 1.6 * t // beam widens toward the viewer

      pos
        .copy(SOURCE)
        .addScaledVector(DIR, t)
        .addScaledVector(PERP, c.lateral * spread)
      pos.z += c.depth * (0.4 + t)

      // Coins drift out of the cursor's way
      away.set(pos.x - c.push.x - cursor.x, pos.y - c.push.y - cursor.y)
      const dist = away.length()
      const target = dist < 1.6 ? away.normalize().multiplyScalar((1.6 - dist) * 0.8) : away.set(0, 0)
      c.push.x = THREE.MathUtils.damp(c.push.x, target.x, 4, dt)
      c.push.y = THREE.MathUtils.damp(c.push.y, target.y, 4, dt)
      pos.x += c.push.x
      pos.y += c.push.y

      obj.position.copy(pos)
      // Face tilted up toward the light, with a slow wobble and spin
      obj.rotation.set(
        0.8 + Math.sin(time * c.wobble + c.phase) * 0.22,
        c.phase + time * c.spin,
        Math.sin(time * c.wobble * 0.7 + c.phase) * 0.3,
        'XZY'
      )
      // Grow in at the source so coins never pop into view
      obj.scale.setScalar(c.size * THREE.MathUtils.smoothstep(t, 0, 0.08))
      obj.updateMatrix()
      m.setMatrixAt(i, obj.matrix)
    })
    m.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={mesh} args={[geometry, undefined, COIN_COUNT]} frustumCulled={false}>
      <meshStandardMaterial
        color={GOLD}
        metalness={0.9}
        roughness={0.26}
        emissive="#5a3a00"
        emissiveIntensity={0.4}
      />
    </instancedMesh>
  )
}

// ── Volumetric-looking light beam (open cone, additive, soft edges) ───────────
const beamVertex = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;
  varying float vAlong;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vView = normalize(-mv.xyz);
    vAlong = uv.y; // 1 at the apex (source), 0 at the wide end
    gl_Position = projectionMatrix * mv;
  }
`
const beamFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uCore;
  uniform float uTime;
  varying vec3 vNormal;
  varying vec3 vView;
  varying float vAlong;
  void main() {
    float facing = abs(dot(vNormal, vView));
    float soft = pow(facing, 1.8);               // fade toward the silhouette
    float falloff = pow(vAlong, 1.6);            // brightest at the source
    float shimmer = 0.9 + 0.1 * sin(vAlong * 30.0 - uTime * 1.5);
    float a = soft * (0.1 + 0.75 * falloff) * shimmer;
    vec3 col = mix(uColor, uCore, falloff);
    gl_FragColor = vec4(col, a);
  }
`

function Beam() {
  const length = DIR.length() * 1.15
  const uniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color(BLUE) },
      uCore: { value: new THREE.Color('#c9f6ff') },
      uTime: { value: 0 },
    }),
    []
  )
  useFrame(({ clock }) => {
    uniforms.uTime.value = clock.elapsedTime
  })
  // Cone apex sits at SOURCE, opening along the beam direction
  const center = SOURCE.clone().addScaledVector(DIR_N, length / 2)
  const quat = useMemo(
    () => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), DIR_N.clone().negate()),
    []
  )
  return (
    <mesh position={center} quaternion={quat} renderOrder={-1}>
      <coneGeometry args={[4, length, 48, 1, true]} />
      <shaderMaterial
        vertexShader={beamVertex}
        fragmentShader={beamFragment}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

// ── Glow at the beam's source ────────────────────────────────────────────────
const glowFragment = /* glsl */ `
  uniform vec3 uColor;
  varying vec2 vUv;
  void main() {
    float d = length(vUv - 0.5) * 2.0;
    float a = pow(max(1.0 - d, 0.0), 2.2);
    gl_FragColor = vec4(uColor, a * 0.9);
  }
`
const glowVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

function SourceGlow() {
  const uniforms = useMemo(() => ({ uColor: { value: new THREE.Color('#bff4ff') } }), [])
  return (
    <Billboard position={SOURCE}>
      <mesh>
        <planeGeometry args={[9, 9]} />
        <shaderMaterial
          vertexShader={glowVertex}
          fragmentShader={glowFragment}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </Billboard>
  )
}

function Scene() {
  const rig = useRef<THREE.Group>(null)
  const dustCenter = useMemo(() => SOURCE.clone().addScaledVector(DIR, 0.5), [])

  useFrame(({ camera }, dt) => {
    const g = rig.current
    if (!g) return
    // Gentle parallax toward the pointer
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, pointer.x * 0.08, 3, dt)
    g.rotation.x = THREE.MathUtils.damp(g.rotation.x, pointer.y * 0.05, 3, dt)
    // Camera sinks slightly as the page scrolls, as if descending the beam
    const scroll = Math.min(window.scrollY / window.innerHeight, 1)
    camera.position.y = THREE.MathUtils.damp(camera.position.y, -scroll * 1.6, 4, dt)
  })

  return (
    <>
      <Stars radius={40} depth={30} count={1400} factor={2.6} saturation={0} fade speed={0.4} />
      <group ref={rig}>
        <Beam />
        <SourceGlow />
        <CoinStream />
        {/* Dust floating inside the beam */}
        <group position={dustCenter} quaternion={BEAM_QUAT}>
          <Sparkles count={70} scale={[3.2, DIR.length(), 2.5]} size={2} speed={0.35} opacity={0.7} color="#bdf3ff" />
          <Sparkles count={25} scale={[3.2, DIR.length(), 2.5]} size={3} speed={0.25} opacity={0.6} color={GOLD} />
        </group>
      </group>
    </>
  )
}

export default function Hero3D() {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1
      pointer.y = (e.clientY / window.innerHeight) * 2 - 1
    }
    window.addEventListener('pointermove', onMove, { passive: true })

    // Stop rendering when the hero scrolls out of view
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting))
    if (wrapRef.current) io.observe(wrapRef.current)

    return () => {
      window.removeEventListener('pointermove', onMove)
      io.disconnect()
    }
  }, [])

  return (
    <div ref={wrapRef} className="absolute inset-0 pointer-events-none" aria-hidden="true">
      <Canvas
        frameloop={visible ? 'always' : 'never'}
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, 10], fov: 35 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      >
        <ambientLight intensity={0.35} />
        {/* Key light from the beam source (kept warm so gold stays gold), fill from the front-left */}
        <directionalLight position={SOURCE} color="#fff4dc" intensity={2.2} />
        <directionalLight position={[-6, 2, 8]} color="#ffd27a" intensity={0.7} />
        {/* Local studio lighting for the metal — no HDR download */}
        <Environment resolution={256}>
          <Lightformer form="rect" intensity={3} position={[0, 5, -5]} scale={[10, 2, 1]} />
          <Lightformer form="rect" intensity={2} color="#fff6e0" position={[5, 5, 0]} scale={[3, 8, 1]} />
          <Lightformer form="rect" intensity={1.5} color={GOLD} position={[-5, -2, 2]} scale={[2, 6, 1]} />
          <Lightformer form="rect" intensity={1} position={[0, 0, 8]} scale={[12, 6, 1]} />
        </Environment>
        <Scene />
      </Canvas>
    </div>
  )
}
