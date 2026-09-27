'use client'

import { useMarket } from './MarketProvider'
import { useBot } from './BotProvider'
import { PRESENCE_LABEL, useLeo } from './LeoPresence'

function Light({ label, state }: { label: string; state: 'ok' | 'warn' | 'off' }) {
  const color = state === 'ok' ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : state === 'warn' ? 'bg-[#F5B400]' : 'bg-red-400'
  return (
    <span className="flex items-center gap-1.5">
      <span className={`w-1.5 h-1.5 rounded-full ${color}`} />
      {label}
    </span>
  )
}

// One-line system health: data feed, bot link, Leo
export default function SystemStatus() {
  const { connected } = useMarket()
  const { data } = useBot()
  const leo = useLeo()
  const bot = !data ? 'warn' : data.connected && data.reachable ? 'ok' : 'off'
  return (
    <div className="hidden lg:flex items-center gap-4 font-hud text-[10px] uppercase tracking-[0.16em] text-[#9fdcf5]/80">
      <Light label="Binance feed" state={connected ? 'ok' : 'warn'} />
      <Light label="Bot link" state={bot} />
      <Light label={`Leo · ${PRESENCE_LABEL[leo.state]}`} state="ok" />
    </div>
  )
}
