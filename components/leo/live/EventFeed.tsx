'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowDownRight, ArrowUpRight, FileText, Pause, Play, OctagonX, Radio } from 'lucide-react'
import { createClient } from '@/lib/supabase/browser'
import { useBot } from './BotProvider'
import HudPanel from './HudPanel'

type Brief = { id: string; created_at: string }
type FeedItem = { id: string; at: string; icon: typeof Radio; color: string; title: string; detail?: string }

function ago(iso: string, now: number | null) {
  if (now === null) return ''
  const s = Math.max(0, (now - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

// Freqtrade reports naive UTC timestamps ("2026-09-27 15:59:12")
const utc = (s: string) => (s.includes('T') || s.endsWith('Z') ? s : `${s.replace(' ', 'T')}Z`)

export default function EventFeed({ briefs }: { briefs: Brief[] }) {
  const { data, refresh } = useBot()
  const router = useRouter()
  // Relative times start after mount: the server's clock would differ from the browser's
  const [now, setNow] = useState<number | null>(null)

  useEffect(() => {
    setNow(Date.now())
    const id = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [])

  // Push updates from either operator (or Leo) the moment they're written
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('leo-events')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'leo_bot_actions' }, () => refresh())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'leo_briefs' }, () => router.refresh())
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [refresh, router])

  const items = useMemo(() => {
    const list: FeedItem[] = []
    if (data?.connected && data.reachable) {
      for (const t of data.status.openTrades)
        list.push({
          id: `open-${t.id}`,
          at: utc(t.openedAt),
          icon: ArrowUpRight,
          color: 'text-emerald-400',
          title: `Bot bought ${t.pair}`,
          detail: `at ${t.entry.toLocaleString('en-US')}`,
        })
      for (const t of data.status.recentTrades)
        list.push({
          id: `close-${t.id}`,
          at: utc(t.closedAt),
          icon: ArrowDownRight,
          color: t.profitPct >= 0 ? 'text-emerald-400' : 'text-red-400',
          title: `Bot sold ${t.pair} (${t.profitPct >= 0 ? '+' : ''}${t.profitPct.toFixed(2)}%)`,
          detail: t.exitReason.replace(/_/g, ' '),
        })
    }
    if (data?.connected)
      for (const a of data.actions ?? [])
        list.push({
          id: `act-${a.created_at}`,
          at: a.created_at,
          icon: a.action === 'pause' ? Pause : a.action === 'resume' ? Play : OctagonX,
          color: !a.ok ? 'text-red-400' : a.action === 'kill' ? 'text-red-400' : 'text-[#F5B400]',
          title: `${a.source === 'leo' ? 'Leo' : 'Operator'} ${a.action === 'kill' ? 'hit the kill switch' : a.action === 'pause' ? 'paused entries' : 'resumed the bot'}${a.ok ? '' : ' (failed)'}`,
          detail: a.reason ?? undefined,
        })
    for (const b of briefs.slice(0, 5))
      list.push({ id: `brief-${b.id}`, at: b.created_at, icon: FileText, color: 'text-[#00AEEF]', title: 'New market brief' })
    return list.sort((x, y) => new Date(y.at).getTime() - new Date(x.at).getTime()).slice(0, 12)
  }, [data, briefs])

  return (
    <HudPanel index="03" title="Activity log" icon={Radio}>
      <ul className="px-4 py-3 space-y-3 overflow-y-auto max-h-[260px]">
        {items.length === 0 && <li className="text-xs text-muted">Nothing yet. Trades, controls and briefs appear here live.</li>}
        {items.map((it) => (
          <li key={it.id} className="flex gap-3">
            <span className={`mt-0.5 w-6 h-6 rounded-md border border-[#00AEEF]/15 bg-[#00AEEF]/[0.04] flex items-center justify-center flex-shrink-0 ${it.color}`}>
              <it.icon className="w-3.5 h-3.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-white/90">{it.title}</p>
              <p className="font-hud text-[10px] text-[#00AEEF]/60 truncate">
                {ago(it.at, now)}
                {it.detail && ` · ${it.detail}`}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </HudPanel>
  )
}
