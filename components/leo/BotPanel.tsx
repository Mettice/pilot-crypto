'use client'

import { useState } from 'react'
import { Bot, Loader2, OctagonX, Pause, Play } from 'lucide-react'
import type { BotStatus } from '@/lib/leo/bot'
import { useBot } from './live/BotProvider'
import { useMarket, type LiveSymbol } from './live/MarketProvider'
import { formatPrice } from './live/TickerStrip'
import HudPanel from './live/HudPanel'

const STATE_STYLE: Record<string, string> = {
  running: 'text-emerald-400 bg-emerald-400/10',
  paused: 'text-[#F5B400] bg-[#F5B400]/10',
  stopped: 'text-red-400 bg-red-400/10',
}

const money = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const signed = (n: number, suffix = '') => `${n >= 0 ? '+' : ''}${money(n)}${suffix}`
const tone = (n: number) => (n >= 0 ? 'text-emerald-400' : 'text-red-400')

type OpenTrade = BotStatus['openTrades'][number]

// P&L at the live price, net of entry and (estimated) exit fees
function liveProfit(t: OpenTrade, price: number | undefined) {
  if (!price) return { abs: t.profitAbs, pct: t.profitPct, live: false }
  const half = t.feeRate / 2
  const abs = t.amount * (price - t.entry) - half * t.amount * (t.entry + price)
  return { abs, pct: (abs / (t.amount * t.entry)) * 100, live: true }
}

export default function BotPanel() {
  const { data, status, act, busy } = useBot()
  const [message, setMessage] = useState<string | null>(null)

  async function control(action: 'pause' | 'resume' | 'kill') {
    const r = await act(action)
    if (r) setMessage(r.result)
  }

  return (
    <HudPanel
      index="02"
      title="Trading bot"
      icon={Bot}
      right={
        status && (
          <div className="flex items-center gap-1.5 font-hud">
            {status.dryRun && (
              <span className="text-[9px] font-semibold uppercase tracking-widest rounded px-1.5 py-0.5 text-[#5eeaff] bg-[#00AEEF]/10">
                Paper
              </span>
            )}
            <span className={`text-[9px] font-semibold uppercase tracking-widest rounded px-1.5 py-0.5 ${STATE_STYLE[status.state] ?? 'text-muted bg-white/5'}`}>
              {status.state}
            </span>
          </div>
        )
      }
    >
      <div className="px-4 py-4 text-sm">
        {!data ? (
          <p className="flex items-center gap-2 text-muted text-xs">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Connecting…
          </p>
        ) : !data.connected ? (
          <p className="text-muted text-xs">
            Not connected yet. Set LEO_BOT_URL, LEO_BOT_USERNAME and LEO_BOT_PASSWORD in Vercel (see leo-bot/README.md).
          </p>
        ) : !data.reachable ? (
          <p className="text-red-400 text-xs">Bot unreachable: {data.error}</p>
        ) : (
          <BotDetails status={data.status} />
        )}

        {status && (
          <div className="flex gap-2 mt-4">
            {status.state === 'running' ? (
              <ControlButton onClick={() => control('pause')} busy={busy === 'pause'} icon={Pause} label="Pause entries" />
            ) : (
              <ControlButton onClick={() => control('resume')} busy={busy === 'resume'} icon={Play} label="Resume" />
            )}
            <button
              onClick={() => control('kill')}
              disabled={busy !== null}
              className="flex items-center justify-center gap-1.5 rounded-md border border-red-500/40 text-red-400 hover:bg-red-500/10 px-3 py-2 text-[11px] font-semibold font-hud uppercase tracking-wider disabled:opacity-40"
            >
              {busy === 'kill' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <OctagonX className="w-3.5 h-3.5" />}
              Kill switch
            </button>
          </div>
        )}
        {message && <p className="text-xs text-muted mt-2">{message}</p>}
      </div>
    </HudPanel>
  )
}

function ControlButton({ onClick, busy, icon: Icon, label }: { onClick: () => void; busy: boolean; icon: typeof Pause; label: string }) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className="flex-1 flex items-center justify-center gap-1.5 rounded-md border border-[#00AEEF]/25 text-[#9fdcf5] hover:bg-[#00AEEF]/10 font-hud uppercase tracking-wider px-3 py-2 text-xs font-semibold disabled:opacity-40"
    >
      {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Icon className="w-3.5 h-3.5" />}
      {label}
    </button>
  )
}

function BotDetails({ status: s }: { status: BotStatus }) {
  const { ticks } = useMarket()
  const positions = s.openTrades.map((t) => ({ t, p: liveProfit(t, ticks[t.pair.replace('/', '') as LiveSymbol]?.price) }))
  const openAbs = positions.reduce((sum, { p }) => sum + p.abs, 0)
  const totalAbs = s.profit.closedAbs + openAbs
  const totalPct = (totalAbs / s.startingCapital) * 100
  const live = positions.some(({ p }) => p.live)

  return (
    <>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <p className="text-[11px] text-muted flex items-center gap-1.5">
            Total P&amp;L
            {live && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" title="Updating with live prices" />}
          </p>
          <p className={`font-hud text-lg font-semibold tabular-nums ${tone(totalAbs)}`}>
            {signed(totalAbs)} <span className="text-xs text-muted">{s.stakeCurrency}</span>
          </p>
          <p className={`text-[11px] tabular-nums ${tone(totalPct)}`}>{signed(totalPct, '%')} of paper capital</p>
        </div>
        <div>
          <p className="text-[11px] text-muted">Closed trades</p>
          <p className="font-hud text-lg font-semibold text-white tabular-nums">
            {s.profit.wins}W / {s.profit.losses}L
          </p>
          <p className="text-[11px] text-muted tabular-nums">Max drawdown {s.profit.maxDrawdownPct}%</p>
        </div>
      </div>

      <p className="text-[11px] uppercase tracking-wide text-muted mb-1.5">
        Open positions · {s.strategy} ({s.timeframe})
      </p>
      {positions.length === 0 ? (
        <p className="text-xs text-muted mb-1">In cash: no open positions.</p>
      ) : (
        <ul className="divide-y divide-white/[0.05]">
          {positions.map(({ t, p }) => (
            <li key={t.id} className="py-2 flex items-center justify-between gap-3">
              <div>
                <p className="text-white text-sm font-semibold">{t.pair}</p>
                <p className="text-[11px] text-muted tabular-nums">
                  in {formatPrice(t.entry)} · stop {t.stop ? formatPrice(t.stop) : '—'}
                </p>
              </div>
              <div className="text-right tabular-nums">
                <p className={`text-sm font-semibold ${tone(p.abs)}`}>{signed(p.abs)}</p>
                <p className={`text-[11px] ${tone(p.pct)}`}>{signed(p.pct, '%')}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {s.stale.length > 0 && (
        <p className="font-hud text-[10px] text-[#F5B400] mt-2">
          Bot is slow to answer ({s.stale.join(', ')}): showing its last update.
        </p>
      )}
      {s.locks.length > 0 && (
        <p className="text-[11px] text-[#F5B400] mt-2">
          Protection lock: {s.locks.map((l) => l.pair).join(', ')} until{' '}
          {new Date(s.locks[0].until).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}
        </p>
      )}
    </>
  )
}
