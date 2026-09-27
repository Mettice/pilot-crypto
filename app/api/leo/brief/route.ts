import { NextResponse } from 'next/server'
import { getOperator } from '@/lib/leo/access'
import { leoResponse, runLeo } from '@/lib/leo/agent'
import { getWatchlistSnapshots, WATCHLIST } from '@/lib/leo/market'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const BRIEF_PROMPT = `Write today's market brief for the operators.

Snapshots for the watchlist (4h and 1d) are attached below; fetch more with get_market_snapshot if useful, and search the web for the most important crypto and macro news of the last 24 hours.

Structure:
## Market regime
One paragraph: overall risk-on / risk-off read, and why.
## Watchlist
Per asset: trend on 4h and 1d, momentum (RSI), volatility (ATR %), key levels from the data, and what would change the picture.
## News that matters
3–5 items with a one-line "why it matters" each, citing sources.
## Watch next
Upcoming events and the specific levels or conditions to monitor.

Keep it under 600 words.`

export async function POST() {
  const op = await getOperator()
  if (!op) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  return leoResponse(async (emit) => {
    emit({ t: 'status', v: 'Loading market data…' })
    const [h4, d1] = await Promise.all([getWatchlistSnapshots('4h'), getWatchlistSnapshots('1d')])
    const snapshot = { watchlist: WATCHLIST, h4, d1 }

    const content = await runLeo(
      [{ role: 'user', content: `${BRIEF_PROMPT}\n\nSnapshots:\n${JSON.stringify(snapshot)}` }],
      emit,
      { effort: 'high' }
    )
    if (!content.trim()) return

    // Written with the operator's session, so RLS enforces the allowlist too
    const { data, error } = await op.supabase
      .from('leo_briefs')
      .insert({ model: 'claude-opus-5', content, snapshot })
      .select('id')
      .single()
    if (error) emit({ t: 'error', v: `Brief not saved: ${error.message}` })
    else emit({ t: 'saved', v: data.id })
  })
}
