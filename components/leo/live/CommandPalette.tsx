'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { CandlestickChart, Clock, FileText, LogOut, MessageSquare, OctagonX, Pause, Play, Search, Volume2 } from 'lucide-react'
import { LIVE_SYMBOLS } from './MarketProvider'
import { useLeo, type ChartTimeframe } from './LeoPresence'
import { useBot } from './BotProvider'

type Command = { id: string; label: string; hint?: string; icon: typeof Search; run: () => void; danger?: boolean }

export default function CommandPalette() {
  const leo = useLeo()
  const bot = useBot()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [index, setIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    const onOpen = () => setOpen(true)
    window.addEventListener('keydown', onKey)
    window.addEventListener('leo:command-palette', onOpen)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('leo:command-palette', onOpen)
    }
  }, [])

  useEffect(() => {
    if (open) {
      setQuery('')
      setIndex(0)
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [open])

  const commands = useMemo<Command[]>(() => {
    const status = bot.status
    const list: Command[] = [
      { id: 'brief', label: 'Write a new market brief', icon: FileText, run: () => leo.run('newBrief') },
      { id: 'talk', label: 'Talk to Leo (voice)', icon: MessageSquare, run: () => leo.run('toggleVoice') },
      { id: 'chart', label: 'Show chart', icon: CandlestickChart, run: () => leo.run('showTab', 'chart') },
      { id: 'briefs', label: 'Open briefs', icon: FileText, run: () => leo.run('showTab', 'briefs') },
      ...LIVE_SYMBOLS.map((s) => ({
        id: `chart-${s}`,
        label: `Chart ${s.replace('USDT', '')}`,
        icon: CandlestickChart,
        run: () => leo.setChart({ symbol: s }),
      })),
      ...(['1h', '4h', '1d'] as ChartTimeframe[]).map((tf) => ({
        id: `tf-${tf}`,
        label: `Timeframe ${tf}`,
        icon: Clock,
        run: () => leo.setChart({ timeframe: tf }),
      })),
      {
        id: 'voice',
        label: leo.voiceReplies ? 'Turn off spoken replies' : 'Turn on spoken replies',
        icon: Volume2,
        run: () => leo.setVoiceReplies(!leo.voiceReplies),
      },
    ]
    if (status?.state === 'running')
      list.push({ id: 'pause', label: 'Pause bot entries', icon: Pause, run: () => bot.act('pause') })
    if (status && status.state !== 'running')
      list.push({ id: 'resume', label: 'Resume the bot', icon: Play, run: () => bot.act('resume') })
    if (status)
      list.push({ id: 'kill', label: 'Kill switch: sell all and stop', icon: OctagonX, run: () => bot.act('kill'), danger: true })
    list.push({
      id: 'signout',
      label: 'Sign out',
      icon: LogOut,
      run: async () => {
        await fetch('/api/leo/logout', { method: 'POST' })
        window.location.href = '/login'
      },
    })
    return list
  }, [leo, bot])

  const q = query.trim().toLowerCase()
  const matches = commands.filter((c) => !q || c.label.toLowerCase().includes(q))
  // Anything typed can go straight to Leo
  const items: Command[] = q
    ? [
        {
          id: 'ask',
          label: `Ask Leo: “${query.trim()}”`,
          icon: Search,
          run: () => {
            leo.run('askLeo', query.trim())
          },
        },
        ...matches,
      ]
    : matches

  function choose(c: Command | undefined) {
    if (!c) return
    setOpen(false)
    c.run()
  }

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm px-4 pt-[12vh]" onClick={() => setOpen(false)}>
      <div
        role="dialog"
        aria-label="Command bar"
        className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0b1220] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 border-b border-white/[0.06]">
          <Search className="w-4 h-4 text-muted" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setIndex(0)
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                setIndex((i) => Math.min(i + 1, items.length - 1))
              } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setIndex((i) => Math.max(i - 1, 0))
              } else if (e.key === 'Enter') {
                e.preventDefault()
                choose(items[index])
              } else if (e.key === 'Escape') setOpen(false)
            }}
            placeholder="Ask Leo or run a command…"
            className="flex-1 bg-transparent py-3.5 text-sm text-white placeholder:text-muted/60 outline-none"
          />
          <kbd className="text-[10px] text-muted border border-white/10 rounded px-1.5 py-0.5">esc</kbd>
        </div>
        <ul className="max-h-[50vh] overflow-y-auto p-1.5">
          {items.map((c, i) => (
            <li key={c.id}>
              <button
                onMouseEnter={() => setIndex(i)}
                onClick={() => choose(c)}
                className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-left ${
                  i === index ? 'bg-white/[0.07]' : ''
                } ${c.danger ? 'text-red-400' : 'text-white/85'}`}
              >
                <c.icon className="w-4 h-4 flex-shrink-0 opacity-70" />
                {c.label}
              </button>
            </li>
          ))}
          {items.length === 0 && <li className="px-3 py-2 text-sm text-muted">No matching commands</li>}
        </ul>
      </div>
    </div>
  )
}
