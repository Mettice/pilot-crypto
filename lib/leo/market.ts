// Public Binance market data + indicators for Leo.
// data-api.binance.vision is Binance's public market-data mirror; unlike
// api.binance.com it isn't geo-blocked from US-hosted serverless regions.
const BINANCE = 'https://data-api.binance.vision/api/v3'

export const WATCHLIST = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'TAOUSDT'] as const
export const INTERVALS = ['15m', '1h', '4h', '1d', '1w'] as const
export type Interval = (typeof INTERVALS)[number]

type Candle = { time: number; open: number; high: number; low: number; close: number; volume: number }

async function getCandles(symbol: string, interval: Interval, limit = 300): Promise<Candle[]> {
  const res = await fetch(`${BINANCE}/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`, {
    next: { revalidate: 60 },
  })
  if (!res.ok) throw new Error(`Binance klines ${symbol} ${interval}: HTTP ${res.status}`)
  const rows: (string | number)[][] = await res.json()
  return rows.map((r) => ({
    time: Number(r[0]),
    open: Number(r[1]),
    high: Number(r[2]),
    low: Number(r[3]),
    close: Number(r[4]),
    volume: Number(r[5]),
  }))
}

function ema(values: number[], period: number): number[] {
  const k = 2 / (period + 1)
  const out: number[] = []
  values.forEach((v, i) => out.push(i === 0 ? v : v * k + out[i - 1] * (1 - k)))
  return out
}

// Wilder's RSI
function rsi(closes: number[], period = 14): number {
  let gain = 0
  let loss = 0
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1]
    if (d >= 0) gain += d
    else loss -= d
  }
  gain /= period
  loss /= period
  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1]
    gain = (gain * (period - 1) + Math.max(d, 0)) / period
    loss = (loss * (period - 1) + Math.max(-d, 0)) / period
  }
  return loss === 0 ? 100 : 100 - 100 / (1 + gain / loss)
}

// Wilder's ATR
function atr(candles: Candle[], period = 14): number {
  const trs = candles.slice(1).map((c, i) => {
    const prev = candles[i].close
    return Math.max(c.high - c.low, Math.abs(c.high - prev), Math.abs(c.low - prev))
  })
  let value = trs.slice(0, period).reduce((a, b) => a + b, 0) / period
  for (let i = period; i < trs.length; i++) value = (value * (period - 1) + trs[i]) / period
  return value
}

const round = (n: number, digits = 2) => Number(n.toFixed(digits))

export type Snapshot = {
  symbol: string
  interval: Interval
  asOf: string
  price: number
  change: { last24hPct: number | null; lookbackPct: number; lookbackCandles: number }
  ema: { ema20: number; ema50: number; ema200: number }
  rsi14: number
  atr14: number
  atrPctOfPrice: number
  trend: 'uptrend' | 'downtrend' | 'range'
  priceVsEma200Pct: number
  range: { high: number; low: number; candles: number }
  volumeVsAvg20: number
}

export async function getSnapshot(symbol: string, interval: Interval): Promise<Snapshot> {
  const candles = await getCandles(symbol, interval)
  if (candles.length < 210) throw new Error(`Not enough history for ${symbol} ${interval}`)
  const closes = candles.map((c) => c.close)
  const last = candles[candles.length - 1]
  const e20 = ema(closes, 20).at(-1)!
  const e50 = ema(closes, 50).at(-1)!
  const e200 = ema(closes, 200).at(-1)!
  const a = atr(candles)
  const recent = candles.slice(-50)
  const vols = candles.slice(-21, -1).map((c) => c.volume)
  const avgVol = vols.reduce((x, y) => x + y, 0) / vols.length

  // Simple regime: stacked EMAs define a trend, anything else is a range
  const trend =
    last.close > e50 && e50 > e200 ? 'uptrend' : last.close < e50 && e50 < e200 ? 'downtrend' : 'range'

  let last24hPct: number | null = null
  try {
    const t = await fetch(`${BINANCE}/ticker/24hr?symbol=${symbol}`, { next: { revalidate: 60 } })
    if (t.ok) last24hPct = round(Number((await t.json()).priceChangePercent))
  } catch {}

  return {
    symbol,
    interval,
    asOf: new Date(last.time).toISOString(),
    price: last.close,
    change: {
      last24hPct,
      lookbackPct: round(((last.close - recent[0].close) / recent[0].close) * 100),
      lookbackCandles: recent.length,
    },
    ema: { ema20: round(e20), ema50: round(e50), ema200: round(e200) },
    rsi14: round(rsi(closes), 1),
    atr14: round(a),
    atrPctOfPrice: round((a / last.close) * 100),
    trend,
    priceVsEma200Pct: round(((last.close - e200) / e200) * 100),
    range: {
      high: Math.max(...recent.map((c) => c.high)),
      low: Math.min(...recent.map((c) => c.low)),
      candles: recent.length,
    },
    volumeVsAvg20: round(last.volume / avgVol),
  }
}

export async function getWatchlistSnapshots(interval: Interval = '4h') {
  const results = await Promise.allSettled(WATCHLIST.map((s) => getSnapshot(s, interval)))
  return results.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []))
}
