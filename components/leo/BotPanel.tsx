'use client'

import { useCallback, useEffect, useState } from 'react'
import { Bot, Loader2, OctagonX, Pause, Play } from 'lucide-react'
import type { BotAction, BotStatus } from '@/lib/leo/bot'

type ActionLog = { created_at: string; source: 'dashboard' | 'leo'; action: BotAction; reason: string | null; ok: boolean }
type Data =
  | { connected: false }
  | { connected: true; reachable: false; error: string; actions: ActionLog[] | null }
  | { connected: true; reachable: true; status: BotStatus; actions: ActionLog[] | null }

const STATE_STYLE: Record<string, string> = {
  running: 'text-emerald-400 bg-emerald-400/10',
  paused: 'text-[#F5B400] bg-[#F5B400]/10',
  stopped: 'text-red-400 bg-red-400/10',
}

const money = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const signed = (n: number, suffix = '') => `${n >= 0 ? '+' : ''}${money(n)}${suffix}`
const tone = (n: number) => (n >= 0 ? 'text-emerald-400' : 'text-red-400')

export default function BotPanel() {
  const [data, setData] = useState<Data | null>(null)
  const [busy, setBusy] = useState<BotAction | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/leo/bot', { cache: 'no-store' })
      if (res.ok) setData(await res.json())
    } catch {}
  }, [])

  useEffect(() => {
    load()
    const id = setInterval(load, 30_000)
    return () => clearInterval(id)
  }, [load])

  async function act(action: BotAction) {
    const prompts: Record<BotAction, string> = {
      pause: 'Pause new entries? Open positions stay managed with their stops.',
      resume: 'Resume the bot? It will take new entries again when its rules signal.',
      kill: 'KILL SWITCH: market-sell every open position and stop the bot. Continue?',
    }
    if (!window.confirm(prompts[action])) return
    setBusy(action)
    setMessage(null)
    try {
      const res = await fetch('/api/leo/bot/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const body = await res.json().catch(() => ({}))
      setMessage(body.result ?? body.error ?? (res.ok ? 'Done' : 'Failed'))
    } finally {
      setBusy(null)
      load()
    }
  }

  return (
    <section className="rounded-2xl border border-white/[0.06] bg-[#0b1220]/80">
      <header className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-[#F5B400]" />
          <h2 className="font-heading font-semibold text-white">Trading bot</h2>
        </div>
        {data?.connected && data.reachable && (
          <div className="flex items-center gap-1.5">
            {data.status.dryRun && (
              <span className="text-[10px] font-semibold uppercase tracking-wide rounded px-1.5 py-0.5 text-[#00AEEF] bg-[#00AEEF]/10">
                Paper
              </span>
            )}
            <span
              className={`text-[10px] font-semibold uppercase tracking-wide rounded px-1.5 py-0.5 ${STATE_STYLE[data.status.state] ?? 'text-muted bg-white/5'}`}
            >
              {data.status.state}
            </span>
          </div>
        )}
      </header>

      <div className="px-5 py-4 text-sm">
        {!data ? (
          <p className="flex items-center gap-2 text-muted text-xs">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Connecting…
          </p>
        ) : !data.connected ? (
          <p className="text-muted text-xs">
            Not connected yet. Deploy the bot server (leo-bot/README.md), then set LEO_BOT_URL, LEO_BOT_USERNAME and
            LEO_BOT_PASSWORD in Vercel.
          </p>
        ) : !data.reachable ? (
          <p className="text-red-400 text-xs">Bot unreachable: {data.error}</p>
        ) : (
          <BotDetails status={data.status} />
        )}

        {data?.connected && data.reachable && (
          <div className="flex gap-2 mt-4">
            {data.status.state === 'running' ? (
              <ControlButton onClick={() => act('pause')} busy={busy === 'pause'} icon={Pause} label="Pause entries" />
            ) : (
              <ControlButton onClick={() => act('resume')} busy={busy === 'resume'} icon={Play} label="Resume" />
            )}
            <button
              onClick={() => act('kill')}
              disabled={busy !== null}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-red-500/40 text-red-400 hover:bg-red-500/10 px-3 py-2 text-xs font-semibold disabled:opacity-40"
            >
              {busy === 'kill' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <OctagonX className="w-3.5 h-3.5" />}
              Kill switch
            </button>
          </div>
        )}
        {message && <p className="text-xs text-muted mt-2">{message}</p>}

        {data?.connected && data.actions && data.actions.length > 0 && (
          <div className="mt-4 pt-3 border-t border-white/[0.05]">
            <p className="text-[11px] uppercase tracking-wide text-muted mb-1.5">Control log</p>
            <ul className="space-y-1">
              {data.actions.map((a) => (
                <li key={a.created_at} className="text-[11px] text-muted">
                  <span className={a.ok ? 'text-white/80' : 'text-red-400'}>{a.action}</span> by {a.source === 'leo' ? 'Leo' : 'operator'} ·{' '}
                  {new Date(a.created_at).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}
                  {a.reason && <span className="block text-muted/70 truncate">“{a.reason}”</span>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  )
}

function ControlButton({ onClick, busy, icon: Icon, label }: { onClick: () => void; busy: boolean; icon: typeof Pause; label: string }) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-white/10 text-white/85 hover:bg-white/5 px-3 py-2 text-xs font-semibold disabled:opacity-40"
    >
      {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Icon className="w-3.5 h-3.5" />}
      {label}
    </button>
  )
}

function BotDetails({ status: s }: { status: BotStatus }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <p className="text-[11px] text-muted">Total P&amp;L</p>
          <p className={`font-semibold tabular-nums ${tone(s.profit.totalAbs)}`}>
            {signed(s.profit.totalAbs)} {s.stakeCurrency}
          </p>
          <p className={`text-[11px] tabular-nums ${tone(s.profit.totalPct)}`}>{signed(s.profit.totalPct, '%')}</p>
        </div>
        <div>
          <p className="text-[11px] text-muted">Closed trades</p>
          <p className="font-semibold text-white tabular-nums">
            {s.profit.wins}W / {s.profit.losses}L
          </p>
          <p className="text-[11px] text-muted tabular-nums">Max DD {s.profit.maxDrawdownPct}%</p>
        </div>
      </div>

      <p className="text-[11px] uppercase tracking-wide text-muted mb-1.5">
        Open positions · {s.strategy} ({s.timeframe})
      </p>
      {s.openTrades.length === 0 ? (
        <p className="text-xs text-muted mb-3">In cash: no open positions.</p>
      ) : (
        <ul className="divide-y divide-white/[0.05] mb-3">
          {s.openTrades.map((t) => (
            <li key={t.id} className="py-2 flex items-center justify-between gap-3">
              <div>
                <p className="text-white text-sm font-semibold">{t.pair}</p>
                <p className="text-[11px] text-muted tabular-nums">
                  in {money(t.entry)} · stop {t.stop ? money(t.stop) : '—'}
                </p>
              </div>
              <div className="text-right tabular-nums">
                <p className={`text-sm ${tone(t.profitAbs)}`}>{signed(t.profitAbs)}</p>
                <p className={`text-[11px] ${tone(t.profitPct)}`}>{signed(t.profitPct, '%')}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {s.recentTrades.length > 0 && (
        <>
          <p className="text-[11px] uppercase tracking-wide text-muted mb-1.5">Recent closed</p>
          <ul className="space-y-1 mb-1">
            {s.recentTrades.slice(0, 3).map((t) => (
              <li key={t.id} className="flex items-center justify-between text-xs">
                <span className="text-white/80">
                  {t.pair} <span className="text-muted">· {t.exitReason}</span>
                </span>
                <span className={`tabular-nums ${tone(t.profitAbs)}`}>{signed(t.profitPct, '%')}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      {s.locks.length > 0 && (
        <p className="text-[11px] text-[#F5B400] mt-2">
          Protection lock: {s.locks.map((l) => l.pair).join(', ')} until {new Date(s.locks[0].until).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}
        </p>
      )}
    </>
  )
}
