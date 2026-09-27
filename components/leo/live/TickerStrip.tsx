'use client'

import Sparkline from './Sparkline'
import { LIVE_SYMBOLS, useMarket, type LiveSymbol } from './MarketProvider'
import { useLeo } from './LeoPresence'

export type Regime = { trend: 'uptrend' | 'downtrend' | 'range'; rsi14: number }

const TREND_STYLE: Record<Regime['trend'], string> = {
  uptrend: 'text-emerald-400 bg-emerald-400/10',
  downtrend: 'text-red-400 bg-red-400/10',
  range: 'text-[#F5B400] bg-[#F5B400]/10',
}

export const formatPrice = (n: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: n >= 100 ? 2 : 4 })

export default function TickerStrip({ regimes }: { regimes: Partial<Record<LiveSymbol, Regime>> }) {
  const { ticks, connected } = useMarket()
  const { chart, setChart } = useLeo()

  return (
    <div className="flex items-stretch gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
      <div className="flex items-center gap-1.5 pr-1 flex-shrink-0" title={connected ? 'Streaming from Binance' : 'Reconnecting…'}>
        <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-muted'}`} />
        <span className="text-[10px] font-semibold tracking-widest text-muted">{connected ? 'LIVE' : '…'}</span>
      </div>
      {LIVE_SYMBOLS.map((s) => {
        const tick = ticks[s]
        const regime = regimes[s]
        const active = chart.symbol === s
        return (
          <button
            key={s}
            onClick={() => setChart({ symbol: s })}
            className={`flex flex-1 items-center gap-3 rounded-xl border px-3 py-2 flex-shrink-0 min-w-[210px] text-left transition-colors ${
              active ? 'border-[#00AEEF]/40 bg-[#00AEEF]/[0.06]' : 'border-white/[0.06] bg-[#0b1220]/80 hover:border-white/15'
            }`}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-white">{s.replace('USDT', '')}</span>
                {regime && (
                  <span className={`text-[9px] font-semibold uppercase tracking-wide rounded px-1 py-px ${TREND_STYLE[regime.trend]}`}>
                    {regime.trend}
                  </span>
                )}
              </div>
              <span
                key={tick?.at}
                className={`inline-block rounded px-0.5 -mx-0.5 text-sm font-semibold tabular-nums text-white ${
                  tick?.dir === 'up' ? 'leo-flash-up' : tick?.dir === 'down' ? 'leo-flash-down' : ''
                }`}
              >
                {tick ? `$${formatPrice(tick.price)}` : '—'}
              </span>
              <span className={`ml-1.5 text-[11px] tabular-nums ${!tick ? 'text-muted' : tick.change24hPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {tick ? `${tick.change24hPct >= 0 ? '+' : ''}${tick.change24hPct.toFixed(2)}%` : ''}
              </span>
            </div>
            <Sparkline values={tick?.spark ?? []} />
          </button>
        )
      })}
    </div>
  )
}
