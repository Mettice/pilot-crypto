'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowUp, Check, Loader2, Mail, MessageCircle, Phone, RotateCcw, User, X } from 'lucide-react'
import Markdown from '@/components/leo/Markdown'
import LeoOrb from '@/components/leo/live/LeoOrb'
import { readLeoStream } from '@/lib/leo/read-stream'

type Turn = { role: 'user' | 'assistant'; content: string }

const STORAGE_KEY = 'pc-leo-chat-v1'
const LEAD_KEY = 'pc-leo-lead'
const FREE_MESSAGES = 5 // keep in sync with lib/leo/visitor.ts
const WHATSAPP_URL = 'https://wa.me/33662361149'

const SUGGESTIONS = [
  'What is crypto, simply?',
  'How do I buy my first Bitcoin safely?',
  "How's Bitcoin doing today?",
  "What's in the Community plan?",
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
  const [confirmClear, setConfirmClear] = useState(false)
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
    // On phones, focusing would pop the keyboard over the sheet straight away
    if (window.matchMedia('(min-width: 640px)').matches) inputRef.current?.focus()
  }, [])
  useEffect(() => {
    try {
      // Saving before the stored conversation loads would overwrite it with []
      if (loaded) localStorage.setItem(STORAGE_KEY, JSON.stringify(turns))
    } catch {}
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' })
  }, [turns, gate, status, loaded])

  // Phone bottom sheet: lock the page behind it; Escape closes everywhere
  useEffect(() => {
    const phone = window.matchMedia('(max-width: 639px)').matches
    const previous = document.body.style.overflow
    if (phone) document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  const visitorMessages = turns.filter((t) => t.role === 'user').length
  const freeLeft = Math.max(0, FREE_MESSAGES - visitorMessages)

  function newChat() {
    if (turns.length && !confirmClear) {
      setConfirmClear(true)
      return
    }
    setConfirmClear(false)
    setTurns([])
    setInput('')
    setStatus(null)
    setError(null)
    setGate(false)
    setLimit(false)
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {}
  }

  async function send(text: string) {
    const content = text.trim()
    if (!content || busy) return
    if (!isLead && visitorMessages >= FREE_MESSAGES) {
      setGate(true)
      setInput(content)
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
    <>
      {/* Phones: dim the page behind the sheet; tap to close */}
      <div className="fixed inset-0 z-[59] bg-[#020610]/60 backdrop-blur-[2px] sm:hidden leo-fade" onClick={onClose} aria-hidden="true" />

      <div
        role="dialog"
        aria-label="Chat with Leo"
        className="fixed z-[60] inset-x-0 bottom-0 h-[78dvh] max-h-[680px] sm:inset-x-auto sm:bottom-6 sm:left-6 sm:w-[384px] sm:h-[600px] sm:max-h-[calc(100dvh-3rem)] leo-sheet"
      >
        {/* Gradient edge: blue at the top fading to gold */}
        <div className="h-full p-px rounded-t-[28px] sm:rounded-[28px] bg-gradient-to-b from-[#00AEEF]/60 via-white/[0.06] to-[#F5B400]/40 shadow-[0_-10px_60px_rgba(0,120,255,0.25)] sm:shadow-[0_20px_80px_rgba(0,90,200,0.35)]">
          <div className="relative h-full flex flex-col overflow-hidden rounded-t-[27px] sm:rounded-[27px] bg-[#070d1f]/[0.97] backdrop-blur-xl">
            {/* Ambient glow behind the header */}
            <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-48 rounded-full bg-[#00AEEF]/20 blur-3xl" />

            {/* Drag handle (phones) */}
            <div className="sm:hidden flex justify-center pt-2.5">
              <span className="h-1 w-10 rounded-full bg-white/20" />
            </div>

            <header className="relative flex items-center gap-3 px-4 pt-2.5 pb-3 sm:pt-4">
              <LeoOrb state={busy ? 'thinking' : 'idle'} size={38} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="font-heading font-semibold text-white leading-tight">Leo</p>
                  <span className="rounded-md bg-gradient-to-r from-[#00AEEF] to-[#0077c8] px-1.5 py-px text-[9px] font-bold tracking-wider text-white">
                    AI
                  </span>
                </div>
                <p className="flex items-center gap-1.5 text-[11px] text-white/55">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60 animate-ping" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  </span>
                  {busy ? 'Typing…' : 'Online · Pilot Crypto guide'}
                </p>
              </div>
              <button
                onClick={newChat}
                aria-label="Start a new chat"
                title="New chat"
                className={`h-8 w-8 flex items-center justify-center rounded-full transition-colors ${
                  confirmClear ? 'text-[#00AEEF] bg-[#00AEEF]/15' : 'text-white/60 hover:text-white hover:bg-white/[0.08]'
                }`}
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                aria-label="Close chat"
                className="h-8 w-8 flex items-center justify-center rounded-full text-white/60 hover:text-white hover:bg-white/[0.08] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </header>
            <div className="h-px mx-4 bg-gradient-to-r from-transparent via-white/10 to-transparent" />

            {confirmClear && (
              <div className="relative flex items-center justify-between gap-2 px-4 py-2 bg-[#00AEEF]/[0.07] border-b border-[#00AEEF]/15 leo-pop">
                <p className="text-[11.5px] text-white/70">Clear this conversation?</p>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setConfirmClear(false)}
                    className="rounded-lg px-2.5 py-1 text-[11.5px] font-medium text-white/60 hover:text-white hover:bg-white/[0.08] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={newChat}
                    className="rounded-lg bg-[#00AEEF] px-2.5 py-1 text-[11.5px] font-semibold text-white hover:bg-[#0096cf] transition-colors"
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}

            <div ref={scroller} className="relative flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-4 space-y-3 scrollbar-hide">
              {turns.length === 0 && (
                <>
                  <LeoBubble>
                    Hi, I&apos;m Leo 👋 Ask me anything about crypto: how it works, getting started safely, or what the market is
                    doing today.
                  </LeoBubble>
                  <div className="flex flex-wrap gap-2 pl-9">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        onClick={() => send(s)}
                        className="rounded-full border border-[#00AEEF]/30 bg-[#00AEEF]/[0.06] px-3 py-1.5 text-xs text-[#bfeaff] hover:bg-[#00AEEF]/15 hover:border-[#00AEEF]/60 transition-colors"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {turns.map((t, i) =>
                t.role === 'user' ? (
                  <div key={i} className="flex justify-end leo-pop">
                    <p className="max-w-[82%] rounded-2xl rounded-br-md bg-gradient-to-br from-[#00AEEF] to-[#0068b8] px-3.5 py-2 text-[13.5px] leading-relaxed text-white whitespace-pre-wrap shadow-[0_4px_16px_rgba(0,140,230,0.25)]">
                      {t.content}
                    </p>
                  </div>
                ) : t.content ? (
                  <LeoBubble key={i}>
                    <Markdown>{t.content}</Markdown>
                  </LeoBubble>
                ) : (
                  <LeoBubble key={i}>
                    {status ? (
                      <span className="flex items-center gap-2 text-xs text-white/60">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> {status}
                      </span>
                    ) : (
                      <TypingDots />
                    )}
                  </LeoBubble>
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
                <div className="rounded-2xl border border-[#F5B400]/30 bg-[#F5B400]/[0.06] p-3.5 text-sm text-white/85 leo-pop">
                  You&apos;ve reached today&apos;s chat limit. For more, talk to the team directly:
                  <a
                    href={WHATSAPP_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2.5 flex items-center justify-center gap-2 rounded-xl bg-[#25D366] py-2.5 font-semibold text-white"
                  >
                    <MessageCircle className="w-4 h-4" /> Chat on WhatsApp
                  </a>
                </div>
              )}
              {error && <p className="text-xs text-red-400 pl-9">{error}</p>}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                send(input)
              }}
              className="px-3 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
            >
              {!isLead && freeLeft > 0 && freeLeft <= 2 && !gate && (
                <p className="mb-1.5 text-center text-[10.5px] text-[#9fdcf5]/70">
                  {freeLeft} free {freeLeft === 1 ? 'question' : 'questions'} left, then just leave your details to keep chatting
                </p>
              )}
              <div className="flex items-end gap-2 rounded-2xl border border-white/[0.09] bg-white/[0.04] pl-4 pr-1.5 py-1.5 transition-all focus-within:border-[#00AEEF]/60 focus-within:shadow-[0_0_0_4px_rgba(0,174,239,0.12)]">
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
                  placeholder="Message Leo…"
                  // 16px on phones stops iOS zooming into the field
                  className="flex-1 resize-none bg-transparent text-base sm:text-sm text-white placeholder:text-white/35 outline-none py-2 max-h-28 scrollbar-hide"
                />
                <button
                  type="submit"
                  disabled={busy || !input.trim() || limit}
                  aria-label="Send"
                  className="h-9 w-9 flex-shrink-0 flex items-center justify-center rounded-full bg-gradient-to-br from-[#00AEEF] to-[#0068b8] text-white shadow-[0_0_16px_rgba(0,174,239,0.45)] disabled:opacity-30 disabled:shadow-none transition-opacity"
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
              </div>
              <p className="mt-1.5 text-[10px] text-white/35 text-center">AI guide for education, not financial advice. Crypto is risky.</p>
            </form>
          </div>
        </div>
      </div>
    </>
  )
}

function LeoBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-end gap-2 leo-pop">
      <span className="mb-0.5 h-7 w-7 flex-shrink-0 rounded-full bg-gradient-to-br from-[#00AEEF] to-[#F5B400] p-px">
        <span className="flex h-full w-full items-center justify-center rounded-full bg-[#070d1f] font-heading text-[11px] font-bold text-white">
          L
        </span>
      </span>
      <div className="max-w-[85%] rounded-2xl rounded-bl-md border border-white/[0.07] bg-white/[0.045] px-3.5 py-2.5 text-[13.5px] leading-relaxed text-white/90">
        {children}
      </div>
    </div>
  )
}

function TypingDots() {
  return (
    <span className="flex items-center gap-1 py-1" aria-label="Leo is typing">
      {[0, 150, 300].map((d) => (
        <span key={d} className="h-1.5 w-1.5 rounded-full bg-[#9fdcf5] animate-bounce" style={{ animationDelay: `${d}ms` }} />
      ))}
    </span>
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

  return (
    <div className="rounded-2xl p-px bg-gradient-to-br from-[#00AEEF]/60 via-white/[0.06] to-[#F5B400]/50 leo-pop">
      <form onSubmit={submit} className="rounded-[15px] bg-[#0a1430] p-4 space-y-2.5">
        <p className="font-heading text-[15px] font-semibold text-white">Enjoying the chat? Let&apos;s keep going ✨</p>
        <p className="text-xs leading-relaxed text-white/60">
          Leave your details to keep chatting with Leo. A Pilot Crypto mentor may also reach out to help you get started.
        </p>
        <Field icon={User}>
          <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" autoComplete="name" maxLength={100} />
        </Field>
        <Field icon={Mail}>
          <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" autoComplete="email" maxLength={200} />
        </Field>
        <Field icon={Phone}>
          <input
            required
            type="tel"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            placeholder="WhatsApp, e.g. +33 6 12 34 56 78"
            autoComplete="tel"
            maxLength={24}
          />
        </Field>
        <label className="flex items-start gap-2 pt-0.5 text-[11px] leading-snug text-white/60">
          <input type="checkbox" required checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-3.5 w-3.5 accent-[#00AEEF]" />
          I agree that Pilot Crypto may contact me by email and WhatsApp about its services. I can opt out at any time.
        </label>
        <button
          type="submit"
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-gold-gradient py-2.5 text-sm font-semibold text-[#050816] shadow-[0_0_20px_rgba(245,180,0,0.3)] disabled:opacity-60"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          Continue chatting
        </button>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </form>
    </div>
  )
}

function Field({ icon: Icon, children }: { icon: typeof User; children: React.ReactElement }) {
  return (
    <label className="flex items-center gap-2.5 rounded-xl border border-white/[0.09] bg-white/[0.04] px-3 focus-within:border-[#00AEEF]/60 transition-colors [&>input]:flex-1 [&>input]:min-w-0 [&>input]:bg-transparent [&>input]:py-2.5 [&>input]:text-base sm:[&>input]:text-sm [&>input]:text-white [&>input]:outline-none [&>input::placeholder]:text-white/35">
      <Icon className="w-4 h-4 flex-shrink-0 text-[#9fdcf5]/70" />
      {children}
    </label>
  )
}
