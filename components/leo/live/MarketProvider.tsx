'use client'

import { createContext, useContext, useEffect, useRef, useState } from 'react'

// Binance's public market-data endpoints: no key, browser-friendly (CORS open)
export const BINANCE_REST = 'https://data-api.binance.vision/api/v3'
export const BINANCE_WS = 'wss://data-stream.binance.vision/stream'

export const LIVE_SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'TAOUSDT'] as const
export type LiveSymbol = (typeof LIVE_SYMBOLS)[number]

export type Tick = {
  price: number
  change24hPct: number
  dir: 'up' | 'down' | 'flat' // direction of the latest tick, for flashes
  spark: number[] // last 24 hourly closes, newest updated live
  at: number
}

type MarketState = { ticks: Partial<Record<LiveSymbol, Tick>>; connected: boolean }

const MarketContext = createContext<MarketState>({ ticks: {}, connected: false })
export const useMarket = () => useContext(MarketContext)
export const useTick = (symbol: string) => useContext(MarketContext).ticks[symbol.replace('/', '') as LiveSymbol]

export default function MarketProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<MarketState>({ ticks: {}, connected: false })
  const sparks = useRef<Partial<Record<LiveSymbol, number[]>>>({})

  // Seed sparklines with the last 24 hourly closes
  useEffect(() => {
    LIVE_SYMBOLS.forEach(async (s) => {
      try {
        const res = await fetch(`${BINANCE_REST}/klines?symbol=${s}&interval=1h&limit=24`)
        const rows: (string | number)[][] = await res.json()
        sparks.current[s] = rows.map((r) => Number(r[4]))
      } catch {}
    })
  }, [])

  // One combined stream of 24h mini-tickers, reconnecting with backoff
  useEffect(() => {
    let ws: WebSocket | null = null
    let retry = 0
    let timer: ReturnType<typeof setTimeout>
    let closed = false

    const connect = () => {
      const streams = LIVE_SYMBOLS.map((s) => `${s.toLowerCase()}@miniTicker`).join('/')
      ws = new WebSocket(`${BINANCE_WS}?streams=${streams}`)
      ws.onopen = () => {
        retry = 0
        setState((s) => ({ ...s, connected: true }))
      }
      ws.onmessage = (msg) => {
        const d = JSON.parse(msg.data).data as { s: LiveSymbol; c: string; o: string }
        const price = Number(d.c)
        const open = Number(d.o)
        setState((prev) => {
          const last = prev.ticks[d.s]
          const spark = sparks.current[d.s] ?? []
          if (spark.length) spark[spark.length - 1] = price
          return {
            ...prev,
            ticks: {
              ...prev.ticks,
              [d.s]: {
                price,
                change24hPct: ((price - open) / open) * 100,
                dir: !last || price === last.price ? 'flat' : price > last.price ? 'up' : 'down',
                spark: [...spark],
                at: Date.now(),
              },
            },
          }
        })
      }
      ws.onclose = () => {
        setState((s) => ({ ...s, connected: false }))
        if (!closed) timer = setTimeout(connect, Math.min(30_000, 1000 * 2 ** retry++))
      }
      ws.onerror = () => ws?.close()
    }

    connect()
    return () => {
      closed = true
      clearTimeout(timer)
      ws?.close()
    }
  }, [])

  return <MarketContext.Provider value={state}>{children}</MarketContext.Provider>
}
