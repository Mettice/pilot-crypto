'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowUp, Loader2, Sparkles } from 'lucide-react'
import Markdown from './Markdown'
import { readLeoStream } from '@/lib/leo/read-stream'
import type { ChatTurn } from '@/lib/leo/agent'

const STORAGE_KEY = 'leo-chat-v1'

const SUGGESTIONS = [
  'What is the market regime on BTC right now, 4h and daily?',
  'Compare ETH and SOL momentum. Which is stronger and why?',
  'What news could move crypto this week?',
  'Help me write rules for a trend-following strategy on BTC 4h.',
]

export default function LeoChat() {
  const [turns, setTurns] = useState<ChatTurn[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const scroller = useRef<HTMLDivElement>(null)

  // Conversation survives reloads on this device only
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) setTurns(JSON.parse(saved))
    } catch {}
  }, [])
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(turns))
    } catch {}
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight })
  }, [turns, status])

  async function send(text: string) {
    const content = text.trim()
    if (!content || busy) return
    const history: ChatTurn[] = [...turns, { role: 'user', content }]
    setTurns([...history, { role: 'assistant', content: '' }])
    setInput('')
    setBusy(true)
    setError(null)

    let reply = ''
    try {
      const res = await fetch('/api/leo/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Failed (empty) assistant turns are not sent back to the model
        body: JSON.stringify({ messages: history.filter((t) => t.content) }),
      })
      await readLeoStream(res, (e) => {
        if (e.t === 'text') {
          reply += e.v
          setStatus(null)
          setTurns([...history, { role: 'assistant', content: reply }])
        } else if (e.t === 'status') setStatus(e.v)
        else if (e.t === 'error') setError(e.v)
      })
    } catch {
      setError('Connection lost. Try again.')
    } finally {
      if (!reply) setTurns(history) // drop the empty placeholder
      setBusy(false)
      setStatus(null)
    }
  }

  return (
    <section className="flex flex-col rounded-2xl border border-white/[0.06] bg-[#0b1220]/80 min-h-[560px] lg:h-[calc(100vh-7.5rem)]">
      <header className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#F5B400]" />
          <h2 className="font-heading font-semibold text-white">Ask Leo</h2>
        </div>
        {turns.length > 0 && (
          <button
            onClick={() => setTurns([])}
            disabled={busy}
            className="text-xs text-muted hover:text-white transition-colors disabled:opacity-40"
          >
            New chat
          </button>
        )}
      </header>

      <div ref={scroller} className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
        {turns.length === 0 && (
          <div className="h-full flex flex-col justify-center gap-4">
            <p className="text-muted text-sm">
              Leo reads live Binance data and searches the news. Analysis only: trading isn&apos;t connected yet.
            </p>
            <div className="grid sm:grid-cols-2 gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-left text-sm text-white/80 rounded-xl border border-white/[0.08] px-3.5 py-3 hover:border-[#00AEEF]/40 hover:bg-[#00AEEF]/5 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {turns.map((t, i) =>
          t.role === 'user' ? (
            <div key={i} className="flex justify-end">
              <p className="max-w-[85%] rounded-2xl rounded-br-md bg-[#00AEEF]/15 border border-[#00AEEF]/20 px-4 py-2.5 text-sm text-white whitespace-pre-wrap">
                {t.content}
              </p>
            </div>
          ) : (
            <div key={i} className="text-sm text-white/85 max-w-full">
              {t.content ? <Markdown>{t.content}</Markdown> : null}
            </div>
          )
        )}

        {busy && (
          <p className="flex items-center gap-2 text-xs text-muted">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            {status ?? 'Thinking…'}
          </p>
        )}
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          send(input)
        }}
        className="p-3 border-t border-white/[0.06]"
      >
        <div className="flex items-end gap-2 rounded-xl border border-white/[0.08] bg-[#050816] px-3 py-2 focus-within:border-[#00AEEF]/40">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send(input)
              }
            }}
            rows={1}
            placeholder="Ask about a coin, a level, a strategy…"
            className="flex-1 resize-none bg-transparent text-sm text-white placeholder:text-muted/60 outline-none py-1.5 max-h-40"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            aria-label="Send"
            className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#00AEEF] text-[#050816] disabled:opacity-30 transition-opacity"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        </div>
      </form>
    </section>
  )
}
