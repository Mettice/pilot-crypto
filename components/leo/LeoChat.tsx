'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowUp, Check, Loader2, Mic, Square, Volume2, VolumeX } from 'lucide-react'
import Markdown from './Markdown'
import { readLeoStream } from '@/lib/leo/read-stream'
import type { StepKind } from '@/lib/leo/agent'
import { useLeo } from './live/LeoPresence'
import { speak, stopSpeaking, useSpeechInput } from './live/voice'

const STORAGE_KEY = 'leo-chat-v2'

type Step = { v: string; kind: StepKind; done: boolean }
// Steps are display-only; only role + content are sent back to the model
type Turn = { role: 'user' | 'assistant'; content: string; steps?: Step[] }

const SUGGESTIONS = [
  'What is the market regime on BTC right now, 4h and daily?',
  'How is the bot doing, and why is it in or out of the market?',
  'Compare ETH and SOL momentum. Which is stronger and why?',
  'What news could move crypto this week?',
]

const STEP_ICON: Record<StepKind, string> = {
  data: 'bg-[#00AEEF]',
  market: 'bg-[#00AEEF]',
  search: 'bg-cyan-300',
  bot: 'bg-[#F5B400]',
  pause: 'bg-red-400',
}

export default function LeoChat() {
  const leo = useLeo()
  const [turns, setTurns] = useState<Turn[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const voice = useSpeechInput((text) => send(text))

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
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' })
  }, [turns])

  // Orb shows the microphone while listening
  useEffect(() => {
    if (voice.listening) leo.setState('listening')
    else if (!busy) leo.setState('idle')
  }, [voice.listening]) // eslint-disable-line react-hooks/exhaustive-deps

  async function send(text: string) {
    const content = text.trim()
    if (!content || busy) return
    stopSpeaking()
    const history: Turn[] = [...turns, { role: 'user', content }]
    let reply = ''
    let steps: Step[] = []
    const show = () => setTurns([...history, { role: 'assistant', content: reply, steps: [...steps] }])
    show()
    setInput('')
    setBusy(true)
    setError(null)
    leo.setState('thinking')

    try {
      const res = await fetch('/api/leo/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history.filter((t) => t.content).map(({ role, content }) => ({ role, content })),
        }),
      })
      await readLeoStream(res, (e) => {
        if (e.t === 'status') {
          steps = [...steps.map((s) => ({ ...s, done: true })), { v: e.v, kind: e.kind, done: false }]
          leo.setState(e.kind)
          show()
        } else if (e.t === 'text') {
          reply += e.v
          if (steps.some((s) => !s.done)) steps = steps.map((s) => ({ ...s, done: true }))
          leo.setState('thinking')
          show()
        } else if (e.t === 'error') setError(e.v)
      })
    } catch {
      setError('Connection lost. Try again.')
    } finally {
      steps = steps.map((s) => ({ ...s, done: true }))
      if (reply) show()
      else setTurns(history)
      setBusy(false)
      if (reply && leo.voiceReplies) {
        speak(reply, { onStart: () => leo.setState('speaking'), onEnd: () => leo.setState('idle') })
      } else leo.setState('idle')
    }
  }

  // Command bar and other panels can ask Leo directly
  useEffect(() => leo.register('askLeo', (text: string) => send(text)))

  const draft = voice.listening ? voice.interim : input

  return (
    <div className="flex flex-col h-full min-h-0">
      <div ref={scroller} className="flex-1 min-h-0 overflow-y-auto px-5 py-5 space-y-5">
        {turns.length === 0 && (
          <div className="h-full flex flex-col justify-center gap-4">
            <p className="text-muted text-sm">
              Leo reads live Binance data, searches the news, and watches your paper-trading bot. It can pause the bot when
              you ask, but never trades. Type, press the mic to talk, or hit <kbd className="px-1 rounded bg-white/10 text-white/80 text-xs">⌘K</kbd>.
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
              <p className="max-w-[88%] rounded-2xl rounded-br-md bg-[#00AEEF]/15 border border-[#00AEEF]/20 px-4 py-2.5 text-sm text-white whitespace-pre-wrap">
                {t.content}
              </p>
            </div>
          ) : (
            <div key={i} className="text-sm text-white/85 max-w-full">
              {!!t.steps?.length && (
                <ol className="mb-3 flex flex-wrap gap-1.5">
                  {t.steps.map((s, j) => (
                    <li
                      key={j}
                      className="flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] pl-1.5 pr-2.5 py-0.5 text-[11px] text-muted"
                    >
                      {s.done ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <span className={`w-2 h-2 rounded-full animate-pulse ${STEP_ICON[s.kind]}`} />
                      )}
                      {s.v}
                    </li>
                  ))}
                </ol>
              )}
              {t.content ? (
                <Markdown>{t.content}</Markdown>
              ) : busy && i === turns.length - 1 && !t.steps?.length ? (
                <p className="flex items-center gap-2 text-xs text-muted">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Thinking…
                </p>
              ) : null}
            </div>
          )
        )}
        {error && <p className="text-xs text-red-400">{error}</p>}
        {voice.error && <p className="text-xs text-red-400">{voice.error}</p>}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          send(input)
        }}
        className="p-3 border-t border-white/[0.06]"
      >
        <div
          className={`flex items-end gap-2 rounded-xl border bg-[#050816] px-3 py-2 transition-colors ${
            voice.listening ? 'border-emerald-400/50' : 'border-white/[0.08] focus-within:border-[#00AEEF]/40'
          }`}
        >
          <textarea
            value={draft}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send(input)
              }
            }}
            readOnly={voice.listening}
            rows={1}
            placeholder={voice.listening ? 'Listening…' : 'Ask about a coin, the bot, a strategy…'}
            className="flex-1 resize-none bg-transparent text-sm text-white placeholder:text-muted/60 outline-none py-1.5 max-h-40 scrollbar-hide"
          />
          <button
            type="button"
            onClick={() => leo.setVoiceReplies(!leo.voiceReplies)}
            aria-label={leo.voiceReplies ? 'Turn off spoken replies' : 'Turn on spoken replies'}
            title={leo.voiceReplies ? 'Spoken replies on' : 'Spoken replies off'}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
              leo.voiceReplies ? 'text-[#00AEEF] bg-[#00AEEF]/10' : 'text-muted hover:text-white'
            }`}
          >
            {leo.voiceReplies ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
          {voice.supported && (
            <button
              type="button"
              onClick={() => (voice.listening ? voice.stop() : voice.start())}
              disabled={busy}
              aria-label={voice.listening ? 'Stop listening' : 'Talk to Leo'}
              title={voice.listening ? 'Stop listening' : 'Talk to Leo'}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors disabled:opacity-30 ${
                voice.listening ? 'bg-emerald-400 text-[#050816] animate-pulse' : 'text-muted hover:text-white'
              }`}
            >
              {voice.listening ? <Square className="w-3.5 h-3.5" /> : <Mic className="w-4 h-4" />}
            </button>
          )}
          <button
            type="submit"
            disabled={busy || !input.trim() || voice.listening}
            aria-label="Send"
            className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#00AEEF] text-[#050816] disabled:opacity-30 transition-opacity"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  )
}
