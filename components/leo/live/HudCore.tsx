'use client'

import { useEffect, useRef } from 'react'
import type { PresenceState } from './LeoPresence'

type Look = {
  color: [number, number, number]
  spin: number // ring speed multiplier
  energy: number // core brightness / pulse depth, 0..1
  sweep?: boolean // radar sweep (searching)
  wave?: boolean // waveform ring (listening/speaking)
}

const LOOK: Record<PresenceState, Look> = {
  idle: { color: [0, 174, 239], spin: 0.35, energy: 0.35 },
  thinking: { color: [94, 234, 255], spin: 1.3, energy: 0.8 },
  data: { color: [0, 174, 239], spin: 1.1, energy: 0.6 },
  market: { color: [0, 174, 239], spin: 1.4, energy: 0.7 },
  search: { color: [94, 234, 255], spin: 1, energy: 0.7, sweep: true },
  bot: { color: [245, 180, 0], spin: 1.2, energy: 0.7 },
  pause: { color: [248, 113, 113], spin: 1.6, energy: 0.9 },
  listening: { color: [52, 211, 153], spin: 0.6, energy: 0.7, wave: true },
  speaking: { color: [94, 234, 255], spin: 0.6, energy: 0.8, wave: true },
}

// The big animated "reactor" at the center of Leo's HUD
export default function HudCore({ state, size, onActivate, label }: { state: PresenceState; size: number; onActivate?: () => void; label: string }) {
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
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const c = size / 2
    const R = size / 2
    const col = [...LOOK.idle.color]
    let spin = LOOK.idle.spin
    let energy = LOOK.idle.energy
    let t = 0
    let sweepAlpha = 0
    let waveAlpha = 0
    let last = performance.now()
    let raf = 0

    const rgba = (a: number) => `rgba(${Math.round(col[0])},${Math.round(col[1])},${Math.round(col[2])},${a})`
    const ring = (r: number, width: number, alpha: number, dash?: number[]) => {
      ctx.beginPath()
      ctx.arc(c, c, r, 0, Math.PI * 2)
      ctx.setLineDash(dash ?? [])
      ctx.lineWidth = width
      ctx.strokeStyle = rgba(alpha)
      ctx.stroke()
      ctx.setLineDash([])
    }
    const arc = (r: number, start: number, len: number, width: number, alpha: number) => {
      ctx.beginPath()
      ctx.arc(c, c, r, start, start + len)
      ctx.lineWidth = width
      ctx.strokeStyle = rgba(alpha)
      ctx.stroke()
    }

    const draw = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      const look = LOOK[stateRef.current]
      const ease = Math.min(1, dt * 4)
      for (let i = 0; i < 3; i++) col[i] += (look.color[i] - col[i]) * ease
      spin += (look.spin - spin) * ease
      energy += (look.energy - energy) * ease
      sweepAlpha += ((look.sweep ? 1 : 0) - sweepAlpha) * ease
      waveAlpha += ((look.wave ? 1 : 0) - waveAlpha) * ease
      if (!reduced) t += dt * spin

      ctx.clearRect(0, 0, size, size)
      ctx.lineCap = 'round'

      // Ambient glow
      const glow = ctx.createRadialGradient(c, c, R * 0.1, c, c, R)
      glow.addColorStop(0, rgba(0.22 + energy * 0.18))
      glow.addColorStop(0.55, rgba(0.06))
      glow.addColorStop(1, rgba(0))
      ctx.fillStyle = glow
      ctx.fillRect(0, 0, size, size)

      // 1. Outer tick ring, slowly turning
      ctx.save()
      ctx.translate(c, c)
      ctx.rotate(t * 0.12)
      for (let i = 0; i < 120; i++) {
        const major = i % 10 === 0
        const a = (i / 120) * Math.PI * 2
        const r1 = R * 0.95
        const r2 = R * (major ? 0.89 : 0.925)
        ctx.beginPath()
        ctx.moveTo(Math.cos(a) * r1, Math.sin(a) * r1)
        ctx.lineTo(Math.cos(a) * r2, Math.sin(a) * r2)
        ctx.lineWidth = major ? 1.6 : 0.8
        ctx.strokeStyle = rgba(major ? 0.8 : 0.35)
        ctx.stroke()
      }
      ctx.restore()

      // 2. Segmented ring, counter-rotating
      for (let i = 0; i < 12; i++) arc(R * 0.83, -t * 0.35 + (i * Math.PI) / 6, Math.PI / 6 - 0.09, 3, 0.25 + (i % 3 === 0 ? 0.35 : 0))

      // 3. Fast bright arcs: Leo's activity
      ring(R * 0.74, 1, 0.25)
      for (let i = 0; i < 3; i++) arc(R * 0.74, t * 1.4 + (i * Math.PI * 2) / 3, 0.55 + energy * 0.5, 2.2, 0.55 + energy * 0.4)

      // 4. Dashed ring
      ctx.save()
      ctx.translate(c, c)
      ctx.rotate(-t * 0.5)
      ctx.translate(-c, -c)
      ring(R * 0.63, 1, 0.45, [2, 6])
      ctx.restore()

      // Radar sweep while searching
      if (sweepAlpha > 0.02) {
        const a = t * 2.4
        const g = ctx.createConicGradient ? ctx.createConicGradient(a - 1, c, c) : null
        if (g) {
          g.addColorStop(0, rgba(0))
          g.addColorStop(0.16, rgba(0.35 * sweepAlpha))
          g.addColorStop(0.161, rgba(0))
          ctx.beginPath()
          ctx.arc(c, c, R * 0.9, 0, Math.PI * 2)
          ctx.fillStyle = g
          ctx.fill()
        }
      }

      // Waveform ring while listening/speaking
      if (waveAlpha > 0.02) {
        ctx.beginPath()
        for (let i = 0; i <= 180; i++) {
          const a = (i / 180) * Math.PI * 2
          const amp = (Math.sin(a * 9 + t * 9) * 0.5 + Math.sin(a * 17 - t * 13) * 0.3 + Math.sin(a * 5 + t * 4) * 0.2) * R * 0.045
          const r = R * 0.53 + amp * waveAlpha
          const x = c + Math.cos(a) * r
          const y = c + Math.sin(a) * r
          i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)
        }
        ctx.lineWidth = 1.5
        ctx.strokeStyle = rgba(0.85 * waveAlpha)
        ctx.stroke()
      }

      // 5. Reactor core: spokes + glowing heart
      const pulse = 0.5 + 0.5 * Math.sin(t * 3.2)
      ctx.save()
      ctx.translate(c, c)
      ctx.rotate(t * 0.25)
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2
        ctx.beginPath()
        ctx.moveTo(Math.cos(a) * R * 0.2, Math.sin(a) * R * 0.2)
        ctx.lineTo(Math.cos(a) * R * 0.44, Math.sin(a) * R * 0.44)
        ctx.lineWidth = 5
        ctx.strokeStyle = rgba(0.12 + energy * 0.12)
        ctx.stroke()
      }
      ctx.restore()
      ring(R * 0.45, 1.5, 0.6)
      ring(R * 0.2, 1, 0.7)

      const heartR = R * (0.3 + pulse * 0.02 * (0.5 + energy))
      const heart = ctx.createRadialGradient(c, c, 0, c, c, heartR)
      heart.addColorStop(0, `rgba(255,255,255,${0.75 + energy * 0.25})`)
      heart.addColorStop(0.25, rgba(0.85))
      heart.addColorStop(0.7, rgba(0.25 + energy * 0.2))
      heart.addColorStop(1, rgba(0))
      ctx.beginPath()
      ctx.arc(c, c, heartR, 0, Math.PI * 2)
      ctx.fillStyle = heart
      ctx.fill()

      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [size])

  return (
    <button
      type="button"
      onClick={onActivate}
      aria-label={label}
      title={label}
      className="relative rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5eeaff]/60"
      style={{ width: size, height: size }}
    >
      <canvas ref={canvas} style={{ width: size, height: size }} aria-hidden="true" />
    </button>
  )
}
