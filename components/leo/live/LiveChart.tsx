'use client'

import { useEffect, useRef, useState } from 'react'
import {
  CandlestickSeries,
  ColorType,
  createChart,
  LineSeries,
  LineStyle,
  type IChartApi,
  type IPriceLine,
  type ISeriesApi,
  type UTCTimestamp,
} from 'lightweight-charts'
import { CandlestickChart, Loader2 } from 'lucide-react'
import HudPanel from './HudPanel'
import { BINANCE_REST, BINANCE_WS, LIVE_SYMBOLS } from './MarketProvider'
import { useLeo, type ChartTimeframe } from './LeoPresence'
import { useBot } from './BotProvider'

const TIMEFRAMES: ChartTimeframe[] = ['1h', '4h', '1d']
const EMA_FAST = 50
const EMA_SLOW = 200

type Bar = { time: UTCTimestamp; open: number; high: number; low: number; close: number }

function emaSeries(closes: number[], period: number) {
  const k = 2 / (period + 1)
  const out: number[] = []
  closes.forEach((c, i) => out.push(i === 0 ? c : c * k + out[i - 1] * (1 - k)))
  return out
}

export default function LiveChart({ className = '' }: { className?: string }) {
  const { chart: sel, setChart } = useLeo()
  const { status } = useBot()
  const box = useRef<HTMLDivElement>(null)
  const api = useRef<{ chart: IChartApi; candles: ISeriesApi<'Candlestick'>; fast: ISeriesApi<'Line'>; slow: ISeriesApi<'Line'> } | null>(null)
  const botLines = useRef<IPriceLine[]>([])
  const [loading, setLoading] = useState(true)

  // Create the chart once
  useEffect(() => {
    if (!box.current) return
    const chart = createChart(box.current, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#7fb8d6',
        fontSize: 10,
        fontFamily: 'var(--font-hud), monospace',
      },
      grid: { vertLines: { color: 'rgba(0,174,239,0.06)' }, horzLines: { color: 'rgba(0,174,239,0.06)' } },
      rightPriceScale: { borderColor: 'rgba(0,174,239,0.15)' },
      timeScale: { borderColor: 'rgba(0,174,239,0.15)', timeVisible: true },
      crosshair: { vertLine: { color: 'rgba(0,174,239,0.4)' }, horzLine: { color: 'rgba(0,174,239,0.4)' } },
    })
    const candles = chart.addSeries(CandlestickSeries, {
      upColor: '#34d399',
      downColor: '#f87171',
      borderVisible: false,
      wickUpColor: '#34d399',
      wickDownColor: '#f87171',
    })
    const line = { lineWidth: 1 as const, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false }
    const fast = chart.addSeries(LineSeries, { ...line, color: '#00AEEF' })
    const slow = chart.addSeries(LineSeries, { ...line, color: '#F5B400' })
    api.current = { chart, candles, fast, slow }
    return () => {
      chart.remove()
      api.current = null
    }
  }, [])

  // Load history for the selected symbol/timeframe, then stream updates
  useEffect(() => {
    const a = api.current
    if (!a) return
    let ws: WebSocket | null = null
    let cancelled = false
    const bars: Bar[] = []
    let fastVals: number[] = []
    let slowVals: number[] = []
    setLoading(true)

    const pushEma = (vals: number[], period: number, close: number, replaceLast: boolean) => {
      const k = 2 / (period + 1)
      const prev = vals[replaceLast ? vals.length - 2 : vals.length - 1] ?? close
      const v = close * k + prev * (1 - k)
      if (replaceLast) vals[vals.length - 1] = v
      else vals.push(v)
      return v
    }

    ;(async () => {
      try {
        const res = await fetch(`${BINANCE_REST}/klines?symbol=${sel.symbol}&interval=${sel.timeframe}&limit=500`)
        const rows: (string | number)[][] = await res.json()
        if (cancelled) return
        rows.forEach((r) =>
          bars.push({ time: (Number(r[0]) / 1000) as UTCTimestamp, open: +r[1], high: +r[2], low: +r[3], close: +r[4] })
        )
        const closes = bars.map((b) => b.close)
        fastVals = emaSeries(closes, EMA_FAST)
        slowVals = emaSeries(closes, EMA_SLOW)
        a.candles.setData(bars)
        // Skip the warm-up stretch where the averages aren't meaningful yet
        a.fast.setData(bars.slice(EMA_FAST).map((b, i) => ({ time: b.time, value: fastVals[i + EMA_FAST] })))
        a.slow.setData(bars.slice(EMA_SLOW).map((b, i) => ({ time: b.time, value: slowVals[i + EMA_SLOW] })))
        a.chart.timeScale().setVisibleLogicalRange({ from: bars.length - 120, to: bars.length + 3 })
      } finally {
        if (!cancelled) setLoading(false)
      }

      ws = new WebSocket(`${BINANCE_WS}?streams=${sel.symbol.toLowerCase()}@kline_${sel.timeframe}`)
      ws.onmessage = (msg) => {
        const k = JSON.parse(msg.data).data.k as { t: number; o: string; h: string; l: string; c: string }
        const bar: Bar = { time: (k.t / 1000) as UTCTimestamp, open: +k.o, high: +k.h, low: +k.l, close: +k.c }
        const last = bars[bars.length - 1]
        if (!last || bar.time < last.time) return
        const replace = bar.time === last.time
        if (replace) bars[bars.length - 1] = bar
        else bars.push(bar)
        a.candles.update(bar)
        a.fast.update({ time: bar.time, value: pushEma(fastVals, EMA_FAST, bar.close, replace) })
        a.slow.update({ time: bar.time, value: pushEma(slowVals, EMA_SLOW, bar.close, replace) })
      }
    })()

    return () => {
      cancelled = true
      ws?.close()
    }
  }, [sel.symbol, sel.timeframe])

  // Draw the bot's open position for this pair: entry and stop
  const pair = sel.symbol.replace('USDT', '/USDT')
  const position = status?.openTrades.find((t) => t.pair === pair)
  useEffect(() => {
    const a = api.current
    if (!a) return
    botLines.current.forEach((l) => a.candles.removePriceLine(l))
    botLines.current = []
    if (!position) return
    botLines.current.push(
      a.candles.createPriceLine({
        price: position.entry,
        color: '#F5B400',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: 'Bot entry',
      })
    )
    if (position.stop)
      botLines.current.push(
        a.candles.createPriceLine({
          price: position.stop,
          color: '#f87171',
          lineWidth: 1,
          lineStyle: LineStyle.Dotted,
          axisLabelVisible: true,
          title: 'Stop',
        })
      )
  }, [position?.entry, position?.stop]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <HudPanel
      index="05"
      title="Chart"
      icon={CandlestickChart}
      className={className}
      right={
        <div className="flex items-center gap-2">
          <div className="flex items-center">
            {LIVE_SYMBOLS.map((s) => (
              <button
                key={s}
                onClick={() => setChart({ symbol: s })}
                className={`font-hud text-[10px] font-semibold rounded px-1.5 py-0.5 ${
                  sel.symbol === s ? 'bg-[#00AEEF]/15 text-white' : 'text-[#9fdcf5]/60 hover:text-white'
                }`}
              >
                {s.replace('USDT', '')}
              </button>
            ))}
          </div>
          <div className="flex items-center rounded bg-[#00AEEF]/[0.06] p-0.5">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf}
                onClick={() => setChart({ timeframe: tf })}
                className={`font-hud text-[10px] font-semibold rounded px-1.5 py-0.5 ${
                  sel.timeframe === tf ? 'bg-[#00AEEF] text-[#020816]' : 'text-[#9fdcf5]/60 hover:text-white'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>
      }
    >
      <div className="relative h-full min-h-[300px]">
        <div ref={box} className="absolute inset-0" />
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-5 h-5 text-muted animate-spin" />
          </div>
        )}
        <div className="absolute left-3 top-2 flex items-center gap-3 font-hud text-[9px] tracking-wider text-[#9fdcf5]/70 pointer-events-none">
          <span className="flex items-center gap-1">
            <span className="w-3 h-px bg-[#00AEEF]" /> EMA50
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-px bg-[#F5B400]" /> EMA200
          </span>
          {position && (
            <span className="flex items-center gap-1 text-[#F5B400]">
              <span className="w-3 border-t border-dashed border-[#F5B400]" /> BOT POSITION
            </span>
          )}
        </div>
      </div>
    </HudPanel>
  )
}
