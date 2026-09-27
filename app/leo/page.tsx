import { redirect } from 'next/navigation'
import { Activity, ShieldCheck } from 'lucide-react'
import { getOperator } from '@/lib/leo/access'
import { getWatchlistSnapshots, type Snapshot } from '@/lib/leo/market'
import LeoChat from '@/components/leo/LeoChat'
import BriefPanel from '@/components/leo/BriefPanel'
import SignOutButton from '@/components/leo/SignOutButton'

export const dynamic = 'force-dynamic'

const TREND_STYLE: Record<Snapshot['trend'], string> = {
  uptrend: 'text-emerald-400 bg-emerald-400/10',
  downtrend: 'text-red-400 bg-red-400/10',
  range: 'text-[#F5B400] bg-[#F5B400]/10',
}

function formatPrice(n: number) {
  return n.toLocaleString('en-US', { maximumFractionDigits: n >= 100 ? 2 : 4 })
}

export default async function LeoDashboard() {
  const op = await getOperator()
  if (!op) redirect('/login')

  const [snapshots, { data: briefs }] = await Promise.all([
    getWatchlistSnapshots('4h').catch(() => []),
    op.supabase.from('leo_briefs').select('id, created_at, content').order('created_at', { ascending: false }).limit(10),
  ])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5">
      <header className="flex items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gold-gradient flex items-center justify-center font-heading font-bold text-[#050816]">
            L
          </div>
          <div>
            <h1 className="font-heading font-bold text-white leading-tight">Leo</h1>
            <p className="text-[11px] text-muted">Private market analyst · Pilot Crypto</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden sm:inline text-xs text-muted">{op.user.email}</span>
          <SignOutButton />
        </div>
      </header>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_400px] gap-5 items-start">
        <LeoChat />

        <aside className="flex flex-col gap-5">
          <section className="rounded-2xl border border-white/[0.06] bg-[#0b1220]/80">
            <header className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#00AEEF]" />
                <h2 className="font-heading font-semibold text-white">Watchlist · 4h</h2>
              </div>
              <span className="text-[11px] text-muted">Binance</span>
            </header>
            <ul className="divide-y divide-white/[0.05]">
              {snapshots.length === 0 && <li className="px-5 py-4 text-sm text-muted">Market data unavailable.</li>}
              {snapshots.map((s) => (
                <li key={s.symbol} className="px-5 py-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white text-sm">{s.symbol.replace('USDT', '')}</p>
                    <p className="text-[11px] text-muted">
                      RSI {s.rsi14} · ATR {s.atrPctOfPrice}%
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-white tabular-nums">${formatPrice(s.price)}</p>
                    <div className="flex items-center justify-end gap-2 mt-0.5">
                      {s.change.last24hPct !== null && (
                        <span className={`text-[11px] tabular-nums ${s.change.last24hPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {s.change.last24hPct >= 0 ? '+' : ''}
                          {s.change.last24hPct}%
                        </span>
                      )}
                      <span className={`text-[10px] font-semibold uppercase tracking-wide rounded px-1.5 py-0.5 ${TREND_STYLE[s.trend]}`}>
                        {s.trend}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <BriefPanel briefs={briefs ?? []} />

          <section className="rounded-2xl border border-white/[0.06] bg-[#0b1220]/80 px-5 py-4 flex gap-3">
            <ShieldCheck className="w-5 h-5 text-muted flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-white">Trading: not connected</p>
              <p className="text-xs text-muted mt-1">
                Phase 1 is analysis only. Next: paper trading with Freqtrade on Binance, an approval queue and a kill switch.
              </p>
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}
