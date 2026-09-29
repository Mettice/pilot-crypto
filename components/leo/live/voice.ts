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

// Live loudness of Leo's voice (0..1), read by the HUD core to drive its waveform
export const voiceLevel = { value: 0 }

let currentAudio: HTMLAudioElement | null = null
let audioCtx: AudioContext | null = null
let levelRaf = 0

function trackLevel(audio: HTMLAudioElement) {
  try {
    audioCtx ??= new AudioContext()
    const source = audioCtx.createMediaElementSource(audio)
    const analyser = audioCtx.createAnalyser()
    analyser.fftSize = 512
    source.connect(analyser)
    analyser.connect(audioCtx.destination)
    const data = new Uint8Array(analyser.fftSize)
    const tick = () => {
      analyser.getByteTimeDomainData(data)
      let sum = 0
      for (let i = 0; i < data.length; i++) sum += ((data[i] - 128) / 128) ** 2
      // Smooth and boost the RMS so normal speech fills the range
      voiceLevel.value = voiceLevel.value * 0.6 + Math.min(1, Math.sqrt(sum / data.length) * 4) * 0.4
      levelRaf = requestAnimationFrame(tick)
    }
    tick()
  } catch {
    // Level metering is cosmetic; playback works without it
  }
}

// Leo's voice: ElevenLabs via /api/leo/speak, falling back to the browser's
// built-in voice if the service isn't configured or fails.
export async function speakLeo(text: string, hooks: { onStart?: () => void; onEnd?: () => void } = {}) {
  stopSpeaking()
  const spoken = toSpeech(text)
  if (!spoken) return
  try {
    const res = await fetch('/api/leo/speak', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: spoken.slice(0, 800) }),
    })
    if (!res.ok) throw new Error(`speak ${res.status}`)
    const url = URL.createObjectURL(await res.blob())
    const audio = new Audio(url)
    currentAudio = audio
    trackLevel(audio)
    const done = () => {
      cancelAnimationFrame(levelRaf)
      voiceLevel.value = 0
      URL.revokeObjectURL(url)
      if (currentAudio === audio) currentAudio = null
      hooks.onEnd?.()
    }
    audio.onplay = () => hooks.onStart?.()
    audio.onended = done
    audio.onerror = done
    await audioCtx?.resume()
    await audio.play()
  } catch {
    speak(text, hooks)
  }
}

export function stopSpeaking() {
  if (typeof window === 'undefined') return
  window.speechSynthesis?.cancel()
  if (currentAudio) {
    currentAudio.onended = null
    currentAudio.pause()
    currentAudio = null
  }
  cancelAnimationFrame(levelRaf)
  voiceLevel.value = 0
}
