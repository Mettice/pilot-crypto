'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { BotAction, BotStatus } from '@/lib/leo/bot'

export type ActionLog = {
  created_at: string
  source: 'dashboard' | 'leo'
  action: BotAction
  reason: string | null
  ok: boolean
}

export type BotData =
  | { connected: false }
  | { connected: true; reachable: false; error: string; actions: ActionLog[] | null }
  | { connected: true; reachable: true; status: BotStatus; actions: ActionLog[] | null }

type BotContextValue = {
  data: BotData | null
  status: BotStatus | null
  refresh: () => Promise<void>
  act: (action: BotAction) => Promise<{ ok: boolean; result: string } | null>
  busy: BotAction | null
}

const BotContext = createContext<BotContextValue | null>(null)
export const useBot = () => {
  const ctx = useContext(BotContext)
  if (!ctx) throw new Error('useBot outside BotProvider')
  return ctx
}

const CONFIRM: Record<BotAction, string> = {
  pause: 'Pause new entries? Open positions stay managed with their stops.',
  resume: 'Resume the bot? It will take new entries again when its rules signal.',
  kill: 'KILL SWITCH: market-sell every open position and stop the bot. Continue?',
}

export default function BotProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<BotData | null>(null)
  const [busy, setBusy] = useState<BotAction | null>(null)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/leo/bot', { cache: 'no-store' })
      if (res.ok) setData(await res.json())
    } catch {}
  }, [])

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, 15_000)
    return () => clearInterval(id)
  }, [refresh])

  const act = useCallback(
    async (action: BotAction) => {
      if (!window.confirm(CONFIRM[action])) return null
      setBusy(action)
      try {
        const res = await fetch('/api/leo/bot/action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action }),
        })
        const body = await res.json().catch(() => ({}))
        return { ok: res.ok, result: body.result ?? body.error ?? (res.ok ? 'Done' : 'Failed') }
      } finally {
        setBusy(null)
        refresh()
      }
    },
    [refresh]
  )

  const status = data?.connected && data.reachable ? data.status : null
  return <BotContext.Provider value={{ data, status, refresh, act, busy }}>{children}</BotContext.Provider>
}
