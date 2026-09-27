'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

// Minimal typings: the Web Speech recognition API isn't in TypeScript's DOM lib
type RecognitionResult = { isFinal: boolean; 0: { transcript: string } }
type RecognitionEvent = { resultIndex: number; results: ArrayLike<RecognitionResult> }
type Recognition = {
  lang: string
  interimResults: boolean
  continuous: boolean
  onresult: ((e: RecognitionEvent) => void) | null
  onend: (() => void) | null
  onerror: ((e: { error: string }) => void) | null
  start: () => void
  stop: () => void
}
type RecognitionCtor = new () => Recognition

function getRecognition(): RecognitionCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

// Push-to-talk: live transcript while speaking, final text when done
export function useSpeechInput(onFinal: (text: string) => void) {
  const [supported, setSupported] = useState(false)
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')
  const [error, setError] = useState<string | null>(null)
  const rec = useRef<Recognition | null>(null)
  const finalText = useRef('')
  const onFinalRef = useRef(onFinal)
  onFinalRef.current = onFinal

  useEffect(() => setSupported(!!getRecognition()), [])

  const start = useCallback(() => {
    const Ctor = getRecognition()
    if (!Ctor || rec.current) return
    const r = new Ctor()
    r.lang = navigator.language || 'en-US'
    r.interimResults = true
    r.continuous = false
    finalText.current = ''
    setInterim('')
    setError(null)
    r.onresult = (e) => {
      let live = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i]
        if (res.isFinal) finalText.current += res[0].transcript
        else live += res[0].transcript
      }
      setInterim((finalText.current + live).trim())
    }
    r.onerror = (e) => {
      if (e.error !== 'no-speech' && e.error !== 'aborted')
        setError(e.error === 'not-allowed' ? 'Microphone permission was denied.' : `Voice input error: ${e.error}`)
    }
    r.onend = () => {
      rec.current = null
      setListening(false)
      const text = finalText.current.trim()
      setInterim('')
      if (text) onFinalRef.current(text)
    }
    rec.current = r
    r.start()
    setListening(true)
  }, [])

  const stop = useCallback(() => rec.current?.stop(), [])

  return { supported, listening, interim, error, start, stop }
}

// Markdown → something pleasant to hear
function toSpeech(md: string) {
  return md
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[#*_`>|]/g, '')
    .replace(/^\s*[-•]\s+/gm, '')
    .replace(/\$(\d)/g, '$1 dollars ')
    .replace(/\s+/g, ' ')
    .trim()
}

function pickVoice() {
  const voices = window.speechSynthesis.getVoices().filter((v) => v.lang.startsWith('en'))
  return (
    voices.find((v) => /natural|neural/i.test(v.name)) ??
    voices.find((v) => /Google UK English Male|Google US English|Samantha|Daniel/i.test(v.name)) ??
    voices[0]
  )
}

// Speak text sentence-by-sentence (long utterances get cut off in Chrome)
export function speak(md: string, hooks: { onStart?: () => void; onEnd?: () => void } = {}) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  window.speechSynthesis.cancel()
  const sentences = toSpeech(md).match(/[^.!?]+[.!?]*/g) ?? []
  if (!sentences.length) return
  const voice = pickVoice()
  sentences.forEach((s, i) => {
    const u = new SpeechSynthesisUtterance(s.trim())
    if (voice) u.voice = voice
    u.rate = 1.05
    if (i === 0) u.onstart = () => hooks.onStart?.()
    if (i === sentences.length - 1) u.onend = () => hooks.onEnd?.()
    u.onerror = () => hooks.onEnd?.()
    window.speechSynthesis.speak(u)
  })
}

export function stopSpeaking() {
  if (typeof window !== 'undefined') window.speechSynthesis?.cancel()
}
