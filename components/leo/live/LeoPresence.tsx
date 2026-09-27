'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { StepKind } from '@/lib/leo/agent'
import type { LiveSymbol } from './MarketProvider'

// What Leo is doing right now, shown by the orb in the header
export type PresenceState = 'idle' | 'thinking' | 'listening' | 'speaking' | StepKind

export const PRESENCE_LABEL: Record<PresenceState, string> = {
  idle: 'Online',
  thinking: 'Thinking',
  listening: 'Listening',
  speaking: 'Speaking',
  data: 'Loading data',
  market: 'Reading the market',
  search: 'Searching the news',
  bot: 'Checking the bot',
  pause: 'Pausing the bot',
}

export type ChartTimeframe = '1h' | '4h' | '1d'

// Actions any panel can trigger (command bar, voice, buttons). Panels that
// own the behaviour register their handler here.
type Handlers = {
  askLeo: (text: string) => void
  newBrief: () => void
  showTab: (tab: 'chart' | 'briefs') => void
  toggleVoice: () => void
}

type PresenceValue = {
  state: PresenceState
  setState: (s: PresenceState) => void
  chart: { symbol: LiveSymbol; timeframe: ChartTimeframe }
  setChart: (c: Partial<{ symbol: LiveSymbol; timeframe: ChartTimeframe }>) => void
  voiceReplies: boolean
  setVoiceReplies: (on: boolean) => void
  register: <K extends keyof Handlers>(name: K, fn: Handlers[K]) => void
  run: <K extends keyof Handlers>(name: K, ...args: Parameters<Handlers[K]>) => void
}

const PresenceContext = createContext<PresenceValue | null>(null)
export const useLeo = () => {
  const ctx = useContext(PresenceContext)
  if (!ctx) throw new Error('useLeo outside LeoPresenceProvider')
  return ctx
}

export default function LeoPresenceProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PresenceState>('idle')
  const [chart, setChartState] = useState<{ symbol: LiveSymbol; timeframe: ChartTimeframe }>({
    symbol: 'BTCUSDT',
    timeframe: '4h',
  })
  const [voiceReplies, setVoiceRepliesState] = useState(false)
  const handlers = useRef<Partial<Handlers>>({})

  // Restored after mount so server and client render the same markup
  useEffect(() => {
    try {
      if (localStorage.getItem('leo-voice-replies') === '1') setVoiceRepliesState(true)
    } catch {}
  }, [])

  const setChart = useCallback(
    (c: Partial<{ symbol: LiveSymbol; timeframe: ChartTimeframe }>) => setChartState((prev) => ({ ...prev, ...c })),
    []
  )
  const setVoiceReplies = useCallback((on: boolean) => {
    setVoiceRepliesState(on)
    try {
      localStorage.setItem('leo-voice-replies', on ? '1' : '0')
    } catch {}
    if (!on && typeof window !== 'undefined') window.speechSynthesis?.cancel()
  }, [])
  const register = useCallback(<K extends keyof Handlers>(name: K, fn: Handlers[K]) => {
    handlers.current[name] = fn
  }, [])
  const run = useCallback(<K extends keyof Handlers>(name: K, ...args: Parameters<Handlers[K]>) => {
    const fn = handlers.current[name] as ((...a: Parameters<Handlers[K]>) => void) | undefined
    fn?.(...args)
  }, [])

  const value = useMemo(
    () => ({ state, setState, chart, setChart, voiceReplies, setVoiceReplies, register, run }),
    [state, chart, setChart, voiceReplies, setVoiceReplies, register, run]
  )
  return <PresenceContext.Provider value={value}>{children}</PresenceContext.Provider>
}
