'use client'

import { Radar } from 'lucide-react'
import HudPanel from './HudPanel'
import { LIVE_SYMBOLS, useMarket } from './MarketProvider'
import { useLeo } from './LeoPresence'

const SIZE = 220
const C = SIZE / 2
const EDGE = C - 8
const INNER = 22 // blips never sit on top of the center

// Each coin is a blip on its own bearing; distance from the center is the
// size of its 24h move, colour is the direction. The scale adapts to the
// day's biggest mover so quiet and wild days both spread out.
export default function MarketRadar() {
  const { ticks } = useMarket()
  const { chart, setChart } = useLeo()
  const moves = LIVE_SYMBOLS.map((s) => Math.abs(ticks[s]?.change24hPct ?? 0))
  const scale = Math.max(1, Math.ceil(Math.max(...moves) * 1.25)) // % at the outer ring
  const sweepEnd = { x: C + EDGE * Math.sin(0.6), y: C - EDGE * Math.cos(0.6) }

  return (
    <HudPanel index="04" title="Momentum radar" icon={Radar}>
      <div className="flex flex-col items-center py-3">
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} overflow="visible" role="img" aria-label="24 hour momentum radar">
          <defs>
            <linearGradient id="leo-sweep" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="rgba(94,234,255,0.28)" />
              <stop offset="1" stopColor="rgba(94,234,255,0)" />
            </linearGradient>
          </defs>
          {[0.25, 0.5, 0.75, 1].map((f) => (
            <circle
              key={f}
              cx={C}
              cy={C}
              r={INNER + (EDGE - INNER) * f}
              fill="none"
              stroke="rgba(0,174,239,0.18)"
              strokeDasharray={f === 1 ? undefined : '2 4'}
            />
          ))}
          <circle cx={C} cy={C} r={3} fill="rgba(94,234,255,0.6)" />
          <line x1={C} y1={8} x2={C} y2={SIZE - 8} stroke="rgba(0,174,239,0.12)" />
          <line x1={8} y1={C} x2={SIZE - 8} y2={C} stroke="rgba(0,174,239,0.12)" />
          <g className="hud-sweep">
            <path d={`M ${C} ${C} L ${C} 8 A ${EDGE} ${EDGE} 0 0 1 ${sweepEnd.x} ${sweepEnd.y} Z`} fill="url(#leo-sweep)" />
          </g>
          {LIVE_SYMBOLS.map((s, i) => {
            const tick = ticks[s]
            const move = Math.min(Math.abs(tick?.change24hPct ?? 0), scale)
            const r = INNER + (move / scale) * (EDGE - INNER - 6)
            // Coins spread evenly around the dial, first one at the top
            const angle = -Math.PI / 2 + (i * 2 * Math.PI) / LIVE_SYMBOLS.length
            const x = C + Math.cos(angle) * r
            const y = C + Math.sin(angle) * r
            // Label sits outward from the blip so neighbours never collide
            const lr = Math.min(r + 16, EDGE - 6)
            const lx = C + Math.cos(angle) * lr
            const ly = C + Math.sin(angle) * lr + 3
            const anchor = Math.abs(Math.cos(angle)) < 0.3 ? 'middle' : Math.cos(angle) > 0 ? 'start' : 'end'
            const up = (tick?.change24hPct ?? 0) >= 0
            const color = up ? '#34d399' : '#f87171'
            return (
              <g key={s} onClick={() => setChart({ symbol: s })} style={{ cursor: 'pointer' }}>
                <line x1={C} y1={C} x2={x} y2={y} stroke={color} strokeOpacity={0.25} />
                <circle cx={x} cy={y} r={chart.symbol === s ? 10 : 7} fill={color} opacity={0.2} />
                <circle cx={x} cy={y} r={3.5} fill={color} />
                <text
                  x={lx}
                  y={ly}
                  textAnchor={anchor}
                  fontSize="9"
                  fill="#9fdcf5"
                  style={{ fontFamily: 'var(--font-hud), monospace' }}
                >
                  {s.replace('USDT', '')} {tick ? `${up ? '+' : ''}${tick.change24hPct.toFixed(2)}%` : ''}
                </text>
              </g>
            )
          })}
        </svg>
        <p className="font-hud text-[10px] text-[#00AEEF]/60 tracking-wider mt-1">
          DISTANCE = 24H MOVE · OUTER RING = {scale}%
        </p>
      </div>
    </HudPanel>
  )
}
