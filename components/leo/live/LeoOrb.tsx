'use client'

import { useEffect, useRef } from 'react'
import type { PresenceState } from './LeoPresence'

// Visual signature per state: core colour, pulse speed, and an optional
// orbiting ring (searching/reading) or waveform (listening/speaking).
const LOOK: Record<PresenceState, { color: [number, number, number]; speed: number; ring?: boolean; wave?: boolean }> = {
  idle: { color: [245, 180, 0], speed: 0.6 },
  thinking: { color: [255, 214, 102], speed: 2.4 },
  data: { color: [0, 174, 239], speed: 1.6, ring: true },
  market: { color: [0, 174, 239], speed: 1.8, ring: true },
  search: { color: [94, 234, 255], speed: 2.2, ring: true },
  bot: { color: [245, 180, 0], speed: 1.8, ring: true },
  pause: { color: [248, 113, 113], speed: 2, ring: true },
  listening: { color: [52, 211, 153], speed: 1.4, wave: true },
  speaking: { color: [0, 174, 239], speed: 1.4, wave: true },
}

export default function LeoOrb({ state, size = 40 }: { state: PresenceState; size?: number }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef(state)
  stateRef.current = state

  useEffect(() => {
    const el = canvas.current
    if (!el) return
    const ctx = el.getContext('2d')!
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    el.width = size * dpr
    el.height = size * dpr
    ctx.scale(dpr, dpr)

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const current = [...LOOK.idle.color]
    let raf = 0
    let t = 0
    let last = performance.now()

    const draw = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      const look = LOOK[stateRef.current]
      t += dt * (reduced ? 0 : look.speed)
      // Ease colour between states
      for (let i = 0; i < 3; i++) current[i] += (look.color[i] - current[i]) * Math.min(1, dt * 6)
      const [r, g, b] = current.map(Math.round)
      const c = size / 2

      ctx.clearRect(0, 0, size, size)

      // Outer glow
      const pulse = 0.5 + 0.5 * Math.sin(t * Math.PI)
      const glow = ctx.createRadialGradient(c, c, size * 0.1, c, c, size * 0.5)
      glow.addColorStop(0, `rgba(${r},${g},${b},${0.35 + pulse * 0.25})`)
      glow.addColorStop(1, `rgba(${r},${g},${b},0)`)
      ctx.fillStyle = glow
      ctx.fillRect(0, 0, size, size)

      // Core with a moving highlight
      const coreR = size * (0.24 + pulse * 0.03)
      const hx = c + Math.cos(t * 0.8) * coreR * 0.35
      const hy = c + Math.sin(t * 0.8) * coreR * 0.35
      const core = ctx.createRadialGradient(hx, hy, 1, c, c, coreR)
      core.addColorStop(0, 'rgba(255,255,255,0.95)')
      core.addColorStop(0.35, `rgba(${r},${g},${b},0.95)`)
      core.addColorStop(1, `rgba(${Math.round(r * 0.35)},${Math.round(g * 0.35)},${Math.round(b * 0.35)},0.9)`)
      ctx.beginPath()
      ctx.arc(c, c, coreR, 0, Math.PI * 2)
      ctx.fillStyle = core
      ctx.fill()

      // Orbiting arcs while Leo is fetching something
      if (look.ring) {
        ctx.lineWidth = 1.5
        ctx.lineCap = 'round'
        for (let i = 0; i < 3; i++) {
          const start = t * 2 + (i * Math.PI * 2) / 3
          ctx.beginPath()
          ctx.arc(c, c, size * 0.4, start, start + 0.9)
          ctx.strokeStyle = `rgba(${r},${g},${b},${0.9 - i * 0.2})`
          ctx.stroke()
        }
      }

      // Waveform ring while listening or speaking
      if (look.wave) {
        ctx.beginPath()
        for (let a = 0; a <= Math.PI * 2 + 0.01; a += Math.PI / 32) {
          const amp = 1.5 + Math.sin(a * 6 + t * 5) * 1.5 + Math.sin(a * 11 - t * 7) * 1
          const rr = size * 0.38 + amp
          const x = c + Math.cos(a) * rr
          const y = c + Math.sin(a) * rr
          a === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
        }
        ctx.strokeStyle = `rgba(${r},${g},${b},0.85)`
        ctx.lineWidth = 1.2
        ctx.stroke()
      }

      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [size])

  return <canvas ref={canvas} style={{ width: size, height: size }} aria-hidden="true" />
}
