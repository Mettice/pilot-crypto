import { redirect } from 'next/navigation'
import { getOperator } from '@/lib/leo/access'
import { getWatchlistSnapshots } from '@/lib/leo/market'
import DashboardShell from '@/components/leo/live/DashboardShell'
import type { Regime } from '@/components/leo/live/TickerStrip'
import type { LiveSymbol } from '@/components/leo/live/MarketProvider'

export const dynamic = 'force-dynamic'

export default async function LeoDashboard() {
  const op = await getOperator()
  if (!op) redirect('/login')

  const [snapshots, { data: briefs }] = await Promise.all([
    getWatchlistSnapshots('4h').catch(() => []),
    op.supabase.from('leo_briefs').select('id, created_at, content').order('created_at', { ascending: false }).limit(10),
  ])

  // Trend regime per coin (4h) for the ticker badges; prices stream live in the browser
  const regimes: Partial<Record<LiveSymbol, Regime>> = Object.fromEntries(
    snapshots.map((s) => [s.symbol, { trend: s.trend, rsi14: s.rsi14 }])
  )

  return <DashboardShell email={op.user.email ?? ''} regimes={regimes} briefs={briefs ?? []} />
}
