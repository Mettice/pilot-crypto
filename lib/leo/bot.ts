// Server-only client for the Freqtrade REST API on the bot server.
// Credentials stay on the server (Vercel env); the browser never sees them.

const TIMEOUT_MS = 15000

export type BotAction = 'pause' | 'resume' | 'kill'

export function botConfigured() {
  return !!(process.env.LEO_BOT_URL && process.env.LEO_BOT_USERNAME && process.env.LEO_BOT_PASSWORD)
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const auth = Buffer.from(`${process.env.LEO_BOT_USERNAME}:${process.env.LEO_BOT_PASSWORD}`).toString('base64')
  try {
    const res = await fetch(`${process.env.LEO_BOT_URL!.replace(/\/$/, '')}/api/v1/${path}`, {
      ...init,
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json', ...init.headers },
      cache: 'no-store',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return (await res.json()) as T
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'failed'
    throw new Error(`Bot API (${path}): ${msg}`)
  }
}

type FtConfig = { state: string; dry_run: boolean; strategy: string; timeframe: string; max_open_trades: number; stake_currency: string }
type FtOpenTrade = {
  trade_id: number
  pair: string
  open_date: string
  open_rate: number
  current_rate: number
  stake_amount: number
  profit_pct: number
  profit_abs: number
  stop_loss_abs: number | null
  enter_tag: string | null
  amount: number
  fee_open: number | null
  fee_close: number | null
}
type FtClosedTrade = { trade_id: number; pair: string; close_date: string; profit_pct: number; profit_abs: number; exit_reason: string }
type FtProfit = {
  profit_all_coin: number
  profit_all_percent: number
  profit_closed_coin: number
  trade_count: number
  closed_trade_count: number
  winning_trades: number
  losing_trades: number
  max_drawdown: number
}
type FtBalance = { total: number; starting_capital: number; stake: string }
type FtLocks = { lock_count: number; locks: { pair: string; lock_end_time: string; reason: string }[] }

export type BotStatus = {
  // Endpoints that timed out and are showing their previous answer
  stale: string[]
  state: string
  dryRun: boolean
  strategy: string
  timeframe: string
  stakeCurrency: string
  equity: number
  startingCapital: number
  profit: { totalAbs: number; totalPct: number; closedAbs: number; trades: number; closedTrades: number; wins: number; losses: number; maxDrawdownPct: number }
  openTrades: {
    id: number
    pair: string
    openedAt: string
    entry: number
    current: number
    stake: number
    profitPct: number
    profitAbs: number
    stop: number | null
    amount: number
    feeRate: number // open + close fee, for live P&L estimates
  }[]
  recentTrades: { id: number; pair: string; closedAt: string; profitPct: number; profitAbs: number; exitReason: string }[]
  locks: { pair: string; until: string; reason: string }[]
}

// Last good answer per endpoint. Several endpoints make the bot fetch live
// prices from Binance, which can occasionally stall; one slow endpoint then
// falls back to its previous answer instead of failing the whole status.
const lastGood = new Map<string, unknown>()

async function callOrLast<T>(path: string, stale: string[]): Promise<T> {
  try {
    const value = await call<T>(path)
    lastGood.set(path, value)
    return value
  } catch (err) {
    if (!lastGood.has(path)) throw err
    console.warn(`${err instanceof Error ? err.message : err}; using last good answer`)
    stale.push(path)
    return lastGood.get(path) as T
  }
}

export async function getBotStatus(): Promise<BotStatus> {
  const stale: string[] = []
  // show_config is a plain read of the bot's state; if it fails the bot really is down
  const [config, open, profit, balance, trades, locks] = await Promise.all([
    call<FtConfig>('show_config'),
    callOrLast<FtOpenTrade[]>('status', stale),
    callOrLast<FtProfit>('profit', stale),
    callOrLast<FtBalance>('balance', stale),
    callOrLast<{ trades: FtClosedTrade[] }>('trades?limit=10&order_by_id=true', stale),
    callOrLast<FtLocks>('locks', stale),
  ])
  return {
    stale,
    state: config.state,
    dryRun: config.dry_run,
    strategy: config.strategy,
    timeframe: config.timeframe,
    stakeCurrency: config.stake_currency,
    equity: balance.total,
    startingCapital: balance.starting_capital,
    profit: {
      totalAbs: profit.profit_all_coin,
      totalPct: profit.profit_all_percent,
      closedAbs: profit.profit_closed_coin,
      trades: profit.trade_count,
      closedTrades: profit.closed_trade_count,
      wins: profit.winning_trades,
      losses: profit.losing_trades,
      maxDrawdownPct: Number((profit.max_drawdown * 100).toFixed(2)),
    },
    openTrades: open.map((t) => ({
      id: t.trade_id,
      pair: t.pair,
      openedAt: t.open_date,
      entry: t.open_rate,
      current: t.current_rate,
      stake: t.stake_amount,
      profitPct: t.profit_pct,
      profitAbs: t.profit_abs,
      stop: t.stop_loss_abs,
      amount: t.amount,
      feeRate: (t.fee_open ?? 0.001) + (t.fee_close ?? 0.001),
    })),
    recentTrades: trades.trades
      .filter((t) => t.close_date)
      .map((t) => ({
        id: t.trade_id,
        pair: t.pair,
        closedAt: t.close_date,
        profitPct: t.profit_pct,
        profitAbs: t.profit_abs,
        exitReason: t.exit_reason,
      })),
    locks: locks.locks.map((l) => ({ pair: l.pair, until: l.lock_end_time, reason: l.reason })),
  }
}

// pause:  stop new entries, keep managing open trades (stops still active)
// resume: allow entries again
// kill:   pause, market-exit every open trade, then stop the bot
export async function runBotAction(action: BotAction): Promise<string> {
  switch (action) {
    case 'pause':
      return (await call<{ status: string }>('stopentry', { method: 'POST' })).status
    case 'resume':
      return (await call<{ status: string }>('start', { method: 'POST' })).status
    case 'kill': {
      await call('stopentry', { method: 'POST' })
      const exit = await call<{ result: string }>('forceexit', { method: 'POST', body: JSON.stringify({ tradeid: 'all' }) })
      await call('stop', { method: 'POST' })
      return `${exit.result} Bot stopped.`
    }
  }
}
