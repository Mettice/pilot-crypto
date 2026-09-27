'use client'

import { useMarket } from './MarketProvider'
import { useLeo } from './LeoPresence'
import { formatPrice } from './TickerStrip'

// Large digital readout of the selected coin, under the core
export default function PriceReadout() {
  const { chart } = useLeo()
  const tick = useMarket().ticks[chart.symbol]
  const up = (tick?.change24hPct ?? 0) >= 0
  return (
    <div className="hud-panel inline-flex items-center gap-4 px-5 py-2.5">
      <span className="font-hud text-[10px] uppercase tracking-[0.2em] text-[#00AEEF]/70">
        {chart.symbol.replace('USDT', '')}/USDT
      </span>
      <span
        key={tick?.at}
        className={`font-hud text-2xl sm:text-3xl font-semibold tabular-nums text-white hud-glow-text rounded px-1 ${
          tick?.dir === 'up' ? 'leo-flash-up' : tick?.dir === 'down' ? 'leo-flash-down' : ''
        }`}
      >
        {tick ? `$${formatPrice(tick.price)}` : '—'}
      </span>
      <span className={`font-hud text-sm tabular-nums ${up ? 'text-emerald-400' : 'text-red-400'}`}>
        {tick ? `${up ? '▲' : '▼'} ${Math.abs(tick.change24hPct).toFixed(2)}%` : ''}
      </span>
    </div>
  )
}
