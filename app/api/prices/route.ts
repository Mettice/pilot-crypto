import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Prices for the landing page (hero cards and ticker). Binance's public
// market-data mirror plus Crypto.com's public API for CRO (not on Binance).
// CoinGecko's free API rate-limits and blocks Vercel's servers, so it isn't used.
// Response keeps CoinGecko's field names, which the components read.
const BINANCE = 'https://data-api.binance.vision/api/v3/ticker/24hr'
const COINS: { id: string; binance?: string }[] = [
  { id: 'bitcoin', binance: 'BTCUSDT' },
  { id: 'ethereum', binance: 'ETHUSDT' },
  { id: 'crypto-com-chain' },
  { id: 'solana', binance: 'SOLUSDT' },
  { id: 'binancecoin', binance: 'BNBUSDT' },
  { id: 'cardano', binance: 'ADAUSDT' },
  { id: 'polkadot', binance: 'DOTUSDT' },
  { id: 'matic-network', binance: 'POLUSDT' }, // MATIC was renamed POL
  { id: 'avalanche-2', binance: 'AVAXUSDT' },
  { id: 'chainlink', binance: 'LINKUSDT' },
]

type Price = { id: string; current_price: number; price_change_percentage_24h: number }

let lastKnown: Price[] | null = null

async function binancePrices(): Promise<Price[]> {
  const symbols = COINS.filter((c) => c.binance).map((c) => c.binance)
  const res = await fetch(`${BINANCE}?symbols=${encodeURIComponent(JSON.stringify(symbols))}&type=MINI`, {
    next: { revalidate: 30 },
  })
  if (!res.ok) throw new Error(`Binance ${res.status}`)
  const rows: { symbol: string; lastPrice: string; openPrice: string }[] = await res.json()
  return rows.flatMap((r) => {
    const coin = COINS.find((c) => c.binance === r.symbol)
    const last = Number(r.lastPrice)
    const open = Number(r.openPrice)
    return coin ? [{ id: coin.id, current_price: last, price_change_percentage_24h: open ? ((last - open) / open) * 100 : 0 }] : []
  })
}

async function croPrice(): Promise<Price[]> {
  const res = await fetch('https://api.crypto.com/exchange/v1/public/get-tickers?instrument_name=CRO_USD', {
    next: { revalidate: 30 },
  })
  if (!res.ok) throw new Error(`Crypto.com ${res.status}`)
  const t = (await res.json()).result?.data?.[0] as { a: string; c: string } | undefined
  if (!t) return []
  // "a" is the last trade price, "c" the 24h change as a fraction
  return [{ id: 'crypto-com-chain', current_price: Number(t.a), price_change_percentage_24h: Number(t.c) * 100 }]
}

export async function GET() {
  const [main, cro] = await Promise.allSettled([binancePrices(), croPrice()])
  const prices = [...(main.status === 'fulfilled' ? main.value : []), ...(cro.status === 'fulfilled' ? cro.value : [])]
  if (main.status === 'rejected') console.error('Binance prices failed:', main.reason)
  if (cro.status === 'rejected') console.error('CRO price failed:', cro.reason)

  if (prices.length) {
    lastKnown = prices
    return NextResponse.json(prices)
  }
  if (lastKnown) return NextResponse.json(lastKnown)
  return NextResponse.json({ error: 'Prices unavailable' }, { status: 502 })
}
