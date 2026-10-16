'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowUp, Check, Loader2, MessageCircle, X } from 'lucide-react'
import Markdown from '@/components/leo/Markdown'
import LeoOrb from '@/components/leo/live/LeoOrb'
import { readLeoStream } from '@/lib/leo/read-stream'

type Turn = { role: 'user' | 'assistant'; content: string }

const STORAGE_KEY = 'pc-leo-chat-v1'
const LEAD_KEY = 'pc-leo-lead'
const FREE_MESSAGES = 5 // keep in sync with lib/leo/visitor.ts
const WHATSAPP_URL = 'https://wa.me/33662361149'

const SUGGESTIONS = [
  'What is crypto, in simple terms?',
  'How do I buy my first Bitcoin safely?',
  "How's Bitcoin doing today?",
  "What's included in the Community plan?",
]

export default function LeoChatPanel({ onClose }: { onClose: () => void }) {
  const [turns, setTurns] = useState<Turn[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLead, setIsLead] = useState(false)
  const [gate, setGate] = useState(false)
  const [limit, setLimit] = useState(false)
  const scroller = useRef<HTMLDivElement>(null)
  // State, not a ref: saving must wait for the render that has the loaded turns
  const [loaded, setLoaded] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) setTurns(JSON.parse(saved))
      setIsLead(localStorage.getItem(LEAD_KEY) === '1')
    } catch {}
    setLoaded(true)
    inputRef.current?.focus()
  }, [])
  useEffect(() => {
    try {
      // Saving before the stored conversation loads would overwrite it with []
      if (loaded) localStorage.setItem(STORAGE_KEY, JSON.stringify(turns))
    } catch {}
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' })
  }, [turns, gate, status, loaded])

  const visitorMessages = turns.filter((t) => t.role === 'user').length

  async function send(text: string) {
    const content = text.trim()
    if (!content || busy) return
    if (!isLead && visitorMessages >= FREE_MESSAGES) {
      setGate(true)
      return
    }
    const history: Turn[] = [...turns, { role: 'user', content }]
    let reply = ''
    setTurns([...history, { role: 'assistant', content: '' }])
    setInput('')
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history.filter((t) => t.content) }),
      })
      if (res.status === 403) {
        setGate(true)
        setTurns(turns)
        setInput(content)
        return
      }
      if (res.status === 429) {
        setLimit(true)
        setTurns(history)
        return
      }
      await readLeoStream(res, (e) => {
        if (e.t === 'text') {
          reply += e.v
          setStatus(null)
          setTurns([...history, { role: 'assistant', content: reply }])
        } else if (e.t === 'status') setStatus(e.v)
        else if (e.t === 'error') setError(e.v)
      })
      if (!reply) setTurns(history)
    } catch {
      setError('Connection lost. Please try again.')
      setTurns(history)
    } finally {
      setBusy(false)
      setStatus(null)
    }
  }

  return (
    <div
      role="dialog"
      aria-label="Chat with Leo"
      className="fixed z-[60] inset-0 sm:inset-auto sm:bottom-6 sm:left-6 sm:w-[390px] sm:h-[600px] sm:max-h-[calc(100vh-3rem)] flex flex-col bg-[#060b1a] sm:rounded-2xl border border-[#00AEEF]/20 shadow-[0_0_60px_rgba(0,120,255,0.18)] overflow-hidden"
    >
      <header className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06] bg-[#0b1220]">
        <LeoOrb state={busy ? 'thinking' : 'idle'} size={34} />
        <div className="flex-1 min-w-0">
          <p className="font-heading font-semibold text-white leading-tight">Leo</p>
          <p className="text-[11px] text-muted">Pilot Crypto&apos;s AI guide</p>
        </div>
        <button onClick={onClose} aria-label="Close chat" className="text-muted hover:text-white p-1">
          <X className="w-5 h-5" />
        </button>
      </header>

      <div ref={scroller} className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-4">
        {turns.length === 0 && (
          <div className="space-y-3">
            <p className="text-sm text-white/85">
              Hi, I&apos;m Leo 👋 Ask me anything about crypto: how it works, getting started safely, or what the market is doing
              today.
            </p>
            <div className="grid gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-left text-sm text-white/80 rounded-xl border border-white/[0.08] px-3.5 py-2.5 hover:border-[#00AEEF]/40 hover:bg-[#00AEEF]/5 transition-colors"
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
              <p className="max-w-[85%] rounded-2xl rounded-br-md bg-[#00AEEF]/15 border border-[#00AEEF]/20 px-3.5 py-2 text-sm text-white whitespace-pre-wrap">
                {t.content}
              </p>
            </div>
          ) : (
            <div key={i} className="text-sm text-white/85">
              {t.content ? (
                <Markdown>{t.content}</Markdown>
              ) : (
                <p className="flex items-center gap-2 text-xs text-muted">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> {status ?? 'Thinking…'}
                </p>
              )}
            </div>
          )
        )}

        {gate && !isLead && (
          <LeadForm
            transcript={turns}
            onDone={() => {
              setIsLead(true)
              setGate(false)
              try {
                localStorage.setItem(LEAD_KEY, '1')
              } catch {}
              if (input.trim()) send(input)
            }}
          />
        )}

        {limit && (
          <div className="rounded-xl border border-[#F5B400]/30 bg-[#F5B400]/5 p-3.5 text-sm text-white/85">
            You&apos;ve reached today&apos;s chat limit. For more, talk to the team directly:
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 flex items-center justify-center gap-2 rounded-lg bg-[#25D366] py-2 font-semibold text-white"
            >
              <MessageCircle className="w-4 h-4" /> Chat on WhatsApp
            </a>
          </div>
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
        <div className="flex items-end gap-2 rounded-xl border border-white/[0.1] bg-[#050816] px-3 py-2 focus-within:border-[#00AEEF]/50">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send(input)
              }
            }}
            rows={1}
            maxLength={1000}
            placeholder="Ask Leo about crypto…"
            className="flex-1 resize-none bg-transparent text-sm text-white placeholder:text-muted/60 outline-none py-1.5 max-h-32 scrollbar-hide"
          />
          <button
            type="submit"
            disabled={busy || !input.trim() || limit}
            aria-label="Send"
            className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#00AEEF] text-[#050816] disabled:opacity-30"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        </div>
        <p className="mt-1.5 text-[10px] text-muted/70 text-center">
          Leo is an AI guide for education, not financial advice. Crypto is risky.
        </p>
      </form>
    </div>
  )
}

function LeadForm({ transcript, onDone }: { transcript: Turn[]; onDone: () => void }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [consent, setConsent] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, whatsapp, consent, transcript: transcript.filter((t) => t.content).slice(-20) }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error ?? 'Something went wrong')
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  const field =
    'w-full rounded-lg border border-white/[0.1] bg-[#050816] px-3 py-2 text-sm text-white placeholder:text-muted/60 outline-none focus:border-[#00AEEF]/50'

  return (
    <form onSubmit={submit} className="rounded-xl border border-[#00AEEF]/25 bg-[#00AEEF]/[0.05] p-4 space-y-2.5">
      <p className="text-sm font-semibold text-white">Enjoying the chat? Let&apos;s keep going 🚀</p>
      <p className="text-xs text-white/70">
        Leave your details to continue chatting with Leo. A Pilot Crypto mentor may also reach out to help you get started.
      </p>
      <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" autoComplete="name" maxLength={100} className={field} />
      <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" autoComplete="email" maxLength={200} className={field} />
      <input
        required
        type="tel"
        value={whatsapp}
        onChange={(e) => setWhatsapp(e.target.value)}
        placeholder="WhatsApp number, e.g. +33 6 12 34 56 78"
        autoComplete="tel"
        maxLength={24}
        className={field}
      />
      <label className="flex items-start gap-2 text-[11px] text-white/70 leading-snug">
        <input type="checkbox" required checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 accent-[#00AEEF]" />
        I agree that Pilot Crypto may contact me by email and WhatsApp about its services. I can opt out at any time.
      </label>
      <button
        type="submit"
        disabled={saving}
        className="w-full flex items-center justify-center gap-2 rounded-lg bg-gold-gradient py-2.5 text-sm font-semibold text-[#050816] disabled:opacity-60"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
        Continue chatting
      </button>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </form>
  )
}
