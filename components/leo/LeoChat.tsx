'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowUp, Check, Loader2, Mic, Square, Volume2, VolumeX } from 'lucide-react'
import Markdown from './Markdown'
import { readLeoStream } from '@/lib/leo/read-stream'
import type { StepKind } from '@/lib/leo/agent'
import { useLeo } from './live/LeoPresence'
import { speakLeo, stopSpeaking, useSpeechInput } from './live/voice'

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
    // Recording shows as listening; the upload to be transcribed as thinking
    if (voice.listening) leo.setState(voice.interim ? 'thinking' : 'listening')
    else if (!busy) leo.setState('idle')
  }, [voice.listening, voice.interim]) // eslint-disable-line react-hooks/exhaustive-deps

  async function send(text: string) {
    const content = text.trim()
    if (!content || busy) return
    stopSpeaking()
    const voiceOn = leo.voiceReplies
    const history: Turn[] = [...turns, { role: 'user', content }]
    let raw = ''
    let reply = ''
    let steps: Step[] = []
    let spokeSummary = false
    let talking = false
    let streaming = true
    const show = () => setTurns([...history, { role: 'assistant', content: reply, steps: [...steps] }])
    // While Leo's voice is playing, the orb shows speaking rather than work steps
    const presence = (s: Parameters<typeof leo.setState>[0]) => {
      if (!talking) leo.setState(s)
    }
    const say = (words: string) => {
      talking = true
      speakLeo(words, {
        onStart: () => leo.setState('speaking'),
        onEnd: () => {
          talking = false
          leo.setState(streaming ? 'thinking' : 'idle')
        },
      })
    }
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
          voice: voiceOn,
        }),
      })
      await readLeoStream(res, (e) => {
        if (e.t === 'status') {
          steps = [...steps.map((s) => ({ ...s, done: true })), { v: e.v, kind: e.kind, done: false }]
          presence(e.kind)
          show()
        } else if (e.t === 'text') {
          raw += e.v
          const { display, spoken, closed } = splitSpoken(raw)
          reply = display
          // Speak the summary the moment it's complete; the full answer keeps streaming
          if (voiceOn && closed && spoken && !spokeSummary) {
            spokeSummary = true
            say(spoken)
          }
          if (steps.some((s) => !s.done)) steps = steps.map((s) => ({ ...s, done: true }))
          presence('thinking')
          show()
        } else if (e.t === 'error') setError(e.v)
      })
    } catch {
      setError('Connection lost. Try again.')
    } finally {
      streaming = false
      steps = steps.map((s) => ({ ...s, done: true }))
      if (reply) show()
      else setTurns(history)
      setBusy(false)
      // Leo skipped the summary block: read the first couple of sentences instead
      if (voiceOn && reply && !spokeSummary) say(firstSentences(reply))
      else if (!talking) leo.setState('idle')
    }
  }

  // Command bar and other panels can ask Leo directly
  useEffect(() => {
    leo.register('askLeo', (text: string) => send(text))
    leo.register('toggleVoice', () => (voice.listening ? voice.stop() : voice.start()))
  })

  const draft = voice.listening ? voice.interim : input

  return (
    <div className="flex flex-col h-full min-h-0">
      <div ref={scroller} className="flex-1 min-h-0 overflow-y-auto px-5 py-5 space-y-5">
        {turns.length === 0 && (
          <div className="min-h-full flex flex-col justify-center gap-4">
            <p className="text-muted text-sm">
              Leo reads live Binance data, searches the news and watches your paper-trading bot. It can pause the bot when
              you ask, but never trades. Type, tap the core to talk, or hit <kbd className="px-1 rounded bg-white/10 text-white/80 text-xs">⌘K</kbd>.
            </p>
            <div className="grid gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-left text-sm text-[#cfeaf7] rounded-md border border-[#00AEEF]/15 bg-[#00AEEF]/[0.03] px-3.5 py-2.5 hover:border-[#00AEEF]/45 hover:bg-[#00AEEF]/[0.08] transition-colors"
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
              <p className="max-w-[88%] rounded-md rounded-br-none bg-[#00AEEF]/10 border border-[#00AEEF]/25 px-4 py-2.5 text-sm text-white whitespace-pre-wrap">
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
                      className="flex items-center gap-1.5 rounded border border-[#00AEEF]/20 bg-[#00AEEF]/[0.05] pl-1.5 pr-2.5 py-0.5 font-hud text-[10px] uppercase tracking-wider text-[#9fdcf5]"
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
          className={`flex items-end gap-2 rounded-md border bg-[#020816]/90 px-3 py-2 transition-all ${
            voice.listening ? 'border-emerald-400/60 shadow-[0_0_16px_rgba(52,211,153,0.2)]' : 'border-[#00AEEF]/25 focus-within:border-[#00AEEF]/60 focus-within:shadow-[0_0_16px_rgba(0,174,239,0.15)]'
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

// Leo opens voice-mode replies with <spoken>…</spoken>: pull it out of the
// on-screen text (hiding it while it streams in) and hand it to the voice.
function splitSpoken(raw: string): { display: string; spoken: string | null; closed: boolean } {
  const trimmed = raw.trimStart()
  if (trimmed && '<spoken>'.startsWith(trimmed)) return { display: '', spoken: null, closed: false }
  const m = trimmed.match(/^<spoken>([\s\S]*?)(<\/spoken>|$)/)
  if (!m) return { display: raw, spoken: null, closed: false }
  return { display: trimmed.slice(m[0].length).trimStart(), spoken: m[1].trim(), closed: m[2] === '</spoken>' }
}

function firstSentences(md: string, count = 2) {
  const plain = md.replace(/```[\s\S]*?```/g, ' ').replace(/[#*_`>|]/g, '').replace(/\s+/g, ' ')
  return (plain.match(/[^.!?]+[.!?]+/g) ?? [plain]).slice(0, count).join(' ').slice(0, 400)
}
