'use client'

import { useEffect, useState } from 'react'
import { Command, FileText, MessageSquare } from 'lucide-react'
import MarketProvider, { type LiveSymbol } from './MarketProvider'
import BotProvider from './BotProvider'
import LeoPresenceProvider, { PRESENCE_LABEL, useLeo } from './LeoPresence'
import LeoOrb from './LeoOrb'
import TickerStrip, { type Regime } from './TickerStrip'
import LiveChart from './LiveChart'
import EventFeed from './EventFeed'
import CommandPalette from './CommandPalette'
import BotPanel from '../BotPanel'
import LeoChat from '../LeoChat'
import BriefPanel from '../BriefPanel'
import SignOutButton from '../SignOutButton'

type Brief = { id: string; created_at: string; content: string }

type Props = {
  email: string
  regimes: Partial<Record<LiveSymbol, Regime>>
  briefs: Brief[]
}

export default function DashboardShell(props: Props) {
  return (
    <MarketProvider>
      <BotProvider>
        <LeoPresenceProvider>
          <Layout {...props} />
          <CommandPalette />
        </LeoPresenceProvider>
      </BotProvider>
    </MarketProvider>
  )
}

function Layout({ email, regimes, briefs }: Props) {
  const leo = useLeo()
  const [tab, setTab] = useState<'chat' | 'briefs'>('chat')

  useEffect(() => leo.register('showTab', setTab), [leo])

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-4 flex flex-col gap-4 lg:h-screen">
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <LeoOrb state={leo.state} size={40} />
          <div>
            <h1 className="font-heading font-bold text-white leading-tight">Leo</h1>
            <p className="text-[11px] text-muted flex items-center gap-1.5" aria-live="polite">
              <span className={`w-1.5 h-1.5 rounded-full ${leo.state === 'idle' ? 'bg-emerald-400' : 'bg-[#00AEEF] animate-pulse'}`} />
              {PRESENCE_LABEL[leo.state]}
            </p>
          </div>
        </div>

        <button
          onClick={() => window.dispatchEvent(new Event('leo:command-palette'))}
          className="hidden md:flex items-center gap-2 flex-1 max-w-md rounded-xl border border-white/[0.08] bg-[#0b1220]/80 px-3 py-2 text-sm text-muted hover:border-white/15 transition-colors"
        >
          <Command className="w-4 h-4" />
          Ask Leo or run a command…
          <kbd className="ml-auto text-[10px] border border-white/10 rounded px-1.5 py-0.5">⌘K</kbd>
        </button>

        <div className="flex items-center gap-4">
          <button
            onClick={() => window.dispatchEvent(new Event('leo:command-palette'))}
            className="md:hidden text-muted hover:text-white"
            aria-label="Open command bar"
          >
            <Command className="w-4 h-4" />
          </button>
          <span className="hidden sm:inline text-xs text-muted">{email}</span>
          <SignOutButton />
        </div>
      </header>

      <TickerStrip regimes={regimes} />

      <div className="grid lg:grid-cols-[minmax(0,1fr)_420px] gap-4 lg:flex-1 lg:min-h-0">
        <div className="flex flex-col gap-4 lg:overflow-y-auto lg:min-h-0 lg:pr-1">
          <LiveChart />
          <div className="grid md:grid-cols-2 gap-4 items-start">
            <BotPanel />
            <EventFeed briefs={briefs} />
          </div>
        </div>

        <section className="rounded-2xl border border-white/[0.06] bg-[#0b1220]/80 flex flex-col h-[640px] lg:h-auto lg:min-h-0">
          <div className="flex items-center gap-1 px-3 pt-3 border-b border-white/[0.06]">
            {(
              [
                ['chat', 'Ask Leo', MessageSquare],
                ['briefs', 'Briefs', FileText],
              ] as const
            ).map(([id, label, Icon]) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex items-center gap-1.5 px-3 pb-2.5 pt-1 text-sm font-semibold border-b-2 -mb-px transition-colors ${
                  tab === id ? 'border-[#F5B400] text-white' : 'border-transparent text-muted hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
          {/* Both stay mounted so a running reply or brief keeps streaming when you switch */}
          <div className={`flex-1 min-h-0 ${tab === 'chat' ? 'flex flex-col' : 'hidden'}`}>
            <LeoChat />
          </div>
          <div className={`flex-1 min-h-0 ${tab === 'briefs' ? 'flex flex-col' : 'hidden'}`}>
            <BriefPanel briefs={briefs} />
          </div>
        </section>
      </div>
    </div>
  )
}
