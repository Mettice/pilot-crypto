'use client'

import { useEffect, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Environment, Float, Lightformer, MeshTransmissionMaterial, Sparkles } from '@react-three/drei'
import * as THREE from 'three'

const GOLD = '#F5B400'
const BLUE = '#00AEEF'
// What the orb "sees" through its glass where the scene is empty
const ORB_BG = new THREE.Color('#12305a')

// Pointer position in -1..1, tracked on window because the canvas
// sits behind the hero content and has pointer-events disabled.
const pointer = { x: 0, y: 0 }

function Coin({ scale = 1 }: { scale?: number }) {
  return (
    <group scale={scale} rotation={[Math.PI / 2, 0, 0]}>
      {/* Body */}
      <mesh>
        <cylinderGeometry args={[1.4, 1.4, 0.2, 96]} />
        <meshStandardMaterial color={GOLD} metalness={0.9} roughness={0.28} emissive="#5a3a00" emissiveIntensity={0.35} />
      </mesh>
      {/* Raised rims on both faces */}
      {[0.1, -0.1].map((y) => (
        <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.28, 0.06, 16, 96]} />
          <meshStandardMaterial color="#FFD35C" metalness={1} roughness={0.15} />
        </mesh>
      ))}
      {/* Emblem: diamond + inner ring */}
      {[1, -1].map((side) => (
        <group key={side} position={[0, 0.1 * side, 0]}>
          <mesh rotation={[0, Math.PI / 4, 0]} scale={[1, 0.12, 1]}>
            <octahedronGeometry args={[0.55, 0]} />
            <meshStandardMaterial color="#FFE08A" metalness={0.55} roughness={0.3} emissive="#5a3a00" emissiveIntensity={0.4} />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.85, 0.025, 12, 96]} />
            <meshStandardMaterial color="#FFE08A" metalness={1} roughness={0.2} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function Spinner({ children, speed = 0.4 }: { children: React.ReactNode; speed?: number }) {
  const ref = useRef<THREE.Group>(null)
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * speed
  })
  return <group ref={ref}>{children}</group>
}

function GlassOrb() {
  return (
    <mesh>
      <sphereGeometry args={[1.1, 64, 64]} />
      <MeshTransmissionMaterial
        samples={4}
        resolution={256}
        thickness={0.6}
        roughness={0.05}
        ior={1.3}
        chromaticAberration={0.25}
        anisotropy={0.2}
        distortion={0.3}
        distortionScale={0.4}
        temporalDistortion={0.1}
        color="#dff6ff"
        background={ORB_BG}
        backside={false}
      />
    </mesh>
  )
}

function Scene() {
  const rig = useRef<THREE.Group>(null)

  useFrame((_, dt) => {
    const g = rig.current
    if (!g) return
    // Gentle parallax toward the pointer
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, pointer.x * 0.15, 3, dt)
    g.rotation.x = THREE.MathUtils.damp(g.rotation.x, -pointer.y * 0.1, 3, dt)
  })

  return (
    <group ref={rig}>
      {/* Hero coin, upper right */}
      <Float speed={1.4} rotationIntensity={0.4} floatIntensity={0.8}>
        <group position={[4.9, 2.05, -1]} rotation={[0.25, 0, -0.2]}>
          <Spinner speed={0.5}>
            <Coin scale={0.62} />
          </Spinner>
        </group>
      </Float>

      {/* Glass orb, below the dashboard, refracting the glow behind it */}
      <Float speed={1} rotationIntensity={0.2} floatIntensity={0.6}>
        <group position={[2.1, -2.35, 0]} scale={0.6}>
          <GlassOrb />
        </group>
      </Float>

      {/* Small accent coin, far left edge */}
      <Float speed={2} rotationIntensity={0.8} floatIntensity={1.2}>
        <group position={[-5.1, -3.25, -2]} rotation={[0.6, 0.4, 0.3]}>
          <Spinner speed={-0.7}>
            <Coin scale={0.32} />
          </Spinner>
        </group>
      </Float>

      {/* Blue glow hidden directly behind the orb (same line of sight),
          so it is only seen bent through the glass */}
      <mesh position={[2.1 * 1.3, -2.35 * 1.3, -3]}>
        <sphereGeometry args={[0.45, 32, 32]} />
        <meshBasicMaterial color={BLUE} toneMapped={false} />
      </mesh>

      <Sparkles count={60} scale={[14, 7, 4]} size={2.2} speed={0.3} opacity={0.6} color={BLUE} />
      <Sparkles count={30} scale={[14, 7, 4]} size={3} speed={0.25} opacity={0.7} color={GOLD} />
    </group>
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
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 5, 5]} intensity={1.2} />
        {/* Local studio lighting — no HDR download */}
        <Environment resolution={256}>
          <Lightformer form="rect" intensity={3} position={[0, 5, -5]} scale={[10, 2, 1]} />
          <Lightformer form="rect" intensity={1.2} color={BLUE} position={[-5, 0, 2]} scale={[2, 8, 1]} />
          <Lightformer form="rect" intensity={2} color={GOLD} position={[5, -2, 2]} scale={[2, 6, 1]} />
          <Lightformer form="ring" intensity={1.5} position={[0, 0, 6]} scale={3} />
          <Lightformer form="rect" intensity={1} position={[0, 0, 8]} scale={[12, 6, 1]} />
        </Environment>
        <Scene />
      </Canvas>
    </div>
  )
}
