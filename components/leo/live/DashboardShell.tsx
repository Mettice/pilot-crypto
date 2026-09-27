'use client'

import { useEffect, useState } from 'react'
import { CandlestickChart, Command, FileText } from 'lucide-react'
import MarketProvider, { type LiveSymbol } from './MarketProvider'
import BotProvider from './BotProvider'
import LeoPresenceProvider, { PRESENCE_LABEL, useLeo } from './LeoPresence'
import HudCore from './HudCore'
import LeoOrb from './LeoOrb'
import HudClock from './HudClock'
import SystemStatus from './SystemStatus'
import MarketFeed from './MarketFeed'
import MarketRadar from './MarketRadar'
import PriceReadout from './PriceReadout'
import LiveChart from './LiveChart'
import EventFeed from './EventFeed'
import CommandPalette from './CommandPalette'
import type { Regime } from './TickerStrip'
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
          <Hud {...props} />
          <CommandPalette />
        </LeoPresenceProvider>
      </BotProvider>
    </MarketProvider>
  )
}

function useCoreSize() {
  const [size, setSize] = useState(240)
  useEffect(() => {
    const fit = () => setSize(window.innerWidth >= 1024 ? Math.max(220, Math.min(300, window.innerHeight * 0.3)) : 200)
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [])
  return size
}

function Hud({ email, regimes, briefs }: Props) {
  const leo = useLeo()
  const coreSize = useCoreSize()
  const [side, setSide] = useState<'chart' | 'briefs'>('chart')

  useEffect(() => leo.register('showTab', setSide), [leo])

  const openPalette = () => window.dispatchEvent(new Event('leo:command-palette'))

  return (
    <div className="max-w-[1680px] mx-auto px-4 sm:px-5 py-3 flex flex-col gap-3 lg:h-screen">
      {/* ── Top bar ─────────────────────────────────────────────── */}
      <header className="hud-panel flex items-center justify-between gap-4 px-4 py-2">
        <div className="flex items-center gap-3">
          <span className="lg:hidden">
            <LeoOrb state={leo.state} size={32} />
          </span>
          <div className="leading-tight">
            <h1 className="font-hud font-bold tracking-[0.35em] text-white hud-glow-text">LEO</h1>
            <p className="hidden sm:block font-hud text-[9px] tracking-[0.2em] text-[#00AEEF]/70">PILOT CRYPTO · PRIVATE</p>
          </div>
        </div>
        <SystemStatus />
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            onClick={openPalette}
            className="hidden md:flex items-center gap-2 rounded border border-[#00AEEF]/25 px-2.5 py-1.5 font-hud text-[10px] tracking-widest text-[#9fdcf5] hover:bg-[#00AEEF]/10"
          >
            <Command className="w-3.5 h-3.5" /> CMD+K
          </button>
          <button onClick={openPalette} className="md:hidden text-[#9fdcf5]" aria-label="Open command bar">
            <Command className="w-4 h-4" />
          </button>
          <HudClock />
          <div className="hidden xl:block font-hud text-[10px] text-[#9fdcf5]/60">{email}</div>
          <SignOutButton />
        </div>
      </header>

      {/* ── Three columns ───────────────────────────────────────── */}
      <div className="grid gap-3 lg:grid-cols-[320px_minmax(0,1fr)_380px] xl:grid-cols-[340px_minmax(0,1fr)_420px] lg:flex-1 lg:min-h-0">
        {/* Left: instruments */}
        <div className="flex flex-col gap-3 order-2 lg:order-1 lg:overflow-y-auto lg:min-h-0 scrollbar-hide">
          <MarketFeed regimes={regimes} />
          <BotPanel />
          <EventFeed briefs={briefs} />
        </div>

        {/* Center: the core and the conversation */}
        <div className="flex flex-col items-center order-1 lg:order-2 lg:min-h-0">
          <div className="flex flex-col items-center pt-1">
            <HudCore
              state={leo.state}
              size={coreSize}
              onActivate={() => leo.run('toggleVoice')}
              label={leo.state === 'listening' ? 'Stop listening' : 'Tap to talk to Leo'}
            />
            <p className="font-hud text-[10px] tracking-[0.3em] text-[#9fdcf5] -mt-1 mb-2 uppercase" aria-live="polite">
              {leo.state === 'idle' ? 'Tap core to talk' : PRESENCE_LABEL[leo.state]}
            </p>
            <PriceReadout />
          </div>
          <div className="hud-panel w-full h-[480px] lg:h-auto lg:flex-1 lg:min-h-0 mt-3 flex flex-col">
            <LeoChat />
          </div>
        </div>

        {/* Right: radar, chart / briefs */}
        <div className="flex flex-col gap-3 order-3 lg:min-h-0">
          <MarketRadar />
          <div className="flex items-center gap-1">
            {(
              [
                ['chart', 'Chart', CandlestickChart],
                ['briefs', 'Briefs', FileText],
              ] as const
            ).map(([id, label, Icon]) => (
              <button
                key={id}
                onClick={() => setSide(id)}
                className={`flex items-center gap-1.5 rounded px-3 py-1.5 font-hud text-[10px] font-semibold uppercase tracking-[0.18em] transition-colors ${
                  side === id ? 'bg-[#00AEEF]/15 text-white border border-[#00AEEF]/40' : 'text-[#9fdcf5]/60 border border-transparent hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>
          {/* Both stay mounted so a brief keeps streaming while the chart is shown */}
          <div className={`${side === 'chart' ? 'flex' : 'hidden'} flex-col lg:flex-1 lg:min-h-0 h-[380px] lg:h-auto`}>
            <LiveChart className="flex-1" />
          </div>
          <div className={`${side === 'briefs' ? 'flex' : 'hidden'} hud-panel flex-col lg:flex-1 lg:min-h-0 h-[520px] lg:h-auto`}>
            <BriefPanel briefs={briefs} />
          </div>
        </div>
      </div>
    </div>
  )
}
