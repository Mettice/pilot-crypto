'use client'

import { Activity } from 'lucide-react'
import HudPanel from './HudPanel'
import Sparkline from './Sparkline'
import { LIVE_SYMBOLS, useMarket, type LiveSymbol } from './MarketProvider'
import { useLeo } from './LeoPresence'
import { formatPrice, type Regime } from './TickerStrip'

const TREND: Record<Regime['trend'], string> = {
  uptrend: 'text-emerald-400',
  downtrend: 'text-red-400',
  range: 'text-[#F5B400]',
}

export default function MarketFeed({ regimes }: { regimes: Partial<Record<LiveSymbol, Regime>> }) {
  const { ticks, connected } = useMarket()
  const { chart, setChart } = useLeo()
  return (
    <HudPanel
      index="01"
      title="Market feed"
      icon={Activity}
      right={
        <span className="font-hud text-[10px] tracking-widest flex items-center gap-1.5 text-[#9fdcf5]/70">
          <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-[#F5B400]'}`} />
          {connected ? 'LIVE' : 'SYNC'}
        </span>
      }
    >
      <ul className="divide-y divide-[#00AEEF]/[0.08]">
        {LIVE_SYMBOLS.map((s) => {
          const tick = ticks[s]
          const regime = regimes[s]
          return (
            <li key={s}>
              <button
                onClick={() => setChart({ symbol: s })}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                  chart.symbol === s ? 'bg-[#00AEEF]/[0.07]' : 'hover:bg-white/[0.02]'
                }`}
              >
                <div className="w-16">
                  <p className="font-hud text-xs font-semibold text-white">{s.replace('USDT', '')}</p>
                  {regime && <p className={`font-hud text-[9px] uppercase tracking-wider ${TREND[regime.trend]}`}>{regime.trend}</p>}
                </div>
                <Sparkline values={tick?.spark ?? []} width={64} height={22} />
                <div className="flex-1 text-right">
                  <span
                    key={tick?.at}
                    className={`inline-block rounded px-0.5 font-hud text-[13px] tabular-nums text-white ${
                      tick?.dir === 'up' ? 'leo-flash-up' : tick?.dir === 'down' ? 'leo-flash-down' : ''
                    }`}
                  >
                    {tick ? formatPrice(tick.price) : '—'}
                  </span>
                  <p
                    className={`font-hud text-[10px] tabular-nums ${
                      !tick ? 'text-muted' : tick.change24hPct >= 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {tick ? `${tick.change24hPct >= 0 ? '+' : ''}${tick.change24hPct.toFixed(2)}%` : ''}
                  </p>
                </div>
              </button>
            </li>
          )
        })}
      </ul>
    </HudPanel>
  )
}
