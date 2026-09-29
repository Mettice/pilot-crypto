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

// The beam falls from off-screen top-right (source) toward the viewer at
// the bottom (end). Coins travel along it, spreading as the beam widens.
type Path = {
  source: THREE.Vector3
  dir: THREE.Vector3
  dirN: THREE.Vector3
  perp: THREE.Vector3
  quat: THREE.Quaternion
}
function makePath(source: [number, number, number], end: [number, number, number]): Path {
  const src = new THREE.Vector3(...source)
  const dir = new THREE.Vector3(...end).sub(src)
  const dirN = dir.clone().normalize()
  return {
    source: src,
    dir,
    dirN,
    perp: new THREE.Vector3(-dir.y, dir.x, 0).normalize(),
    quat: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dirN),
  }
}

// Desktop: a wide diagonal down the right half. Phone (portrait, lite): a
// steeper fall from just off the top-right corner through the middle, with
// fewer, smaller coins and less dust so it stays smooth on mobile GPUs.
const PRESETS = {
  desktop: { path: makePath([5.4, 4.8, -5], [1.8, -5.4, 3]), coins: 26, lateral: 1.1, size: 1, beam: 4, glow: 9, dust: 1, stars: 1400 },
  lite: { path: makePath([2.4, 5.4, -5], [0.1, -5.6, 3]), coins: 14, lateral: 0.7, size: 0.8, beam: 2.6, glow: 6, dust: 0.45, stars: 600 },
}
type Preset = (typeof PRESETS)['desktop']

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
function CoinStream({ preset }: { preset: Preset }) {
  const mesh = useRef<THREE.InstancedMesh>(null)
  const geometry = useCoinGeometry()

  const coins = useMemo(
    () =>
      Array.from({ length: preset.coins }, (_, i) => ({
        t0: i / preset.coins + Math.random() * 0.02,
        lateral: (Math.random() * 2 - 1) * preset.lateral,
        depth: (Math.random() * 2 - 1) * 1.2,
        size: (0.28 + Math.random() * 0.12) * preset.size,
        phase: Math.random() * Math.PI * 2,
        wobble: 0.4 + Math.random() * 0.5,
        spin: (Math.random() < 0.5 ? -1 : 1) * (0.2 + Math.random() * 0.4),
        push: new THREE.Vector2(),
      })),
    [preset]
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
        .copy(preset.path.source)
        .addScaledVector(preset.path.dir, t)
        .addScaledVector(preset.path.perp, c.lateral * spread)
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
    <instancedMesh ref={mesh} args={[geometry, undefined, preset.coins]} frustumCulled={false}>
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

function Beam({ preset }: { preset: Preset }) {
  const { source, dir, dirN } = preset.path
  const length = dir.length() * 1.15
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
  const center = source.clone().addScaledVector(dirN, length / 2)
  const quat = useMemo(
    () => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dirN.clone().negate()),
    [dirN]
  )
  return (
    <mesh position={center} quaternion={quat} renderOrder={-1}>
      <coneGeometry args={[preset.beam, length, 48, 1, true]} />
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

function SourceGlow({ preset }: { preset: Preset }) {
  const uniforms = useMemo(() => ({ uColor: { value: new THREE.Color('#bff4ff') } }), [])
  return (
    <Billboard position={preset.path.source}>
      <mesh>
        <planeGeometry args={[preset.glow, preset.glow]} />
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

function Scene({ preset }: { preset: Preset }) {
  const rig = useRef<THREE.Group>(null)
  const { source, dir, quat } = preset.path
  const dustCenter = useMemo(() => source.clone().addScaledVector(dir, 0.5), [source, dir])

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
      <Stars radius={40} depth={30} count={preset.stars} factor={2.6} saturation={0} fade speed={0.4} />
      <group ref={rig}>
        <Beam preset={preset} />
        <SourceGlow preset={preset} />
        <CoinStream preset={preset} />
        {/* Dust floating inside the beam */}
        <group position={dustCenter} quaternion={quat}>
          <Sparkles count={Math.round(70 * preset.dust)} scale={[preset.beam * 0.8, dir.length(), 2.5]} size={2} speed={0.35} opacity={0.7} color="#bdf3ff" />
          <Sparkles count={Math.round(25 * preset.dust)} scale={[preset.beam * 0.8, dir.length(), 2.5]} size={3} speed={0.25} opacity={0.6} color={GOLD} />
        </group>
      </group>
    </>
  )
}

// lite: phones and small screens (fewer coins, portrait path, lower resolution)
export default function Hero3D({ lite = false }: { lite?: boolean }) {
  const preset = lite ? PRESETS.lite : PRESETS.desktop
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
        dpr={lite ? 1 : [1, 1.5]}
        camera={{ position: [0, 0, 10], fov: 35 }}
        gl={{ antialias: !lite, alpha: true, powerPreference: lite ? 'default' : 'high-performance' }}
      >
        <ambientLight intensity={0.35} />
        {/* Key light from the beam source (kept warm so gold stays gold), fill from the front-left */}
        <directionalLight position={preset.path.source} color="#fff4dc" intensity={2.2} />
        <directionalLight position={[-6, 2, 8]} color="#ffd27a" intensity={0.7} />
        {/* Local studio lighting for the metal — no HDR download */}
        <Environment resolution={256}>
          <Lightformer form="rect" intensity={3} position={[0, 5, -5]} scale={[10, 2, 1]} />
          <Lightformer form="rect" intensity={2} color="#fff6e0" position={[5, 5, 0]} scale={[3, 8, 1]} />
          <Lightformer form="rect" intensity={1.5} color={GOLD} position={[-5, -2, 2]} scale={[2, 6, 1]} />
          <Lightformer form="rect" intensity={1} position={[0, 0, 8]} scale={[12, 6, 1]} />
        </Environment>
        <Scene preset={preset} />
      </Canvas>
    </div>
  )
}
