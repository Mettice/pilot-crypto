'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

const SILENCE_LEVEL = 0.06 // loudness below this counts as silence
const SILENCE_MS = 1400 // stop this long after you finish speaking
const MAX_MS = 60_000 // hard cap per recording
const NO_SPEECH_MS = 8000 // give up if nothing is said at all

function pickMimeType() {
  const options = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus']
  return options.find((t) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)) ?? ''
}

// Tap to talk: records the microphone, stops by itself after a pause, then
// transcribes with ElevenLabs (via /api/leo/transcribe) and hands back the text.
// Replaces the browser's built-in recognition, which in Chromium relies on
// Google's service and fails in Brave, behind VPNs, etc.
export function useSpeechInput(onFinal: (text: string) => void) {
  const [supported, setSupported] = useState(false)
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')
  const [error, setError] = useState<string | null>(null)
  const recorder = useRef<MediaRecorder | null>(null)
  const cleanup = useRef<(() => void) | null>(null)
  const onFinalRef = useRef(onFinal)
  onFinalRef.current = onFinal

  useEffect(() => {
    setSupported(typeof MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia)
    return () => cleanup.current?.()
  }, [])

  const stop = useCallback(() => {
    if (recorder.current?.state === 'recording') recorder.current.stop()
  }, [])

  const start = useCallback(async () => {
    if (recorder.current) return
    setError(null)
    setInterim('')
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
    } catch {
      setError('Microphone permission was denied.')
      return
    }

    const mimeType = pickMimeType()
    const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
    const chunks: Blob[] = []
    recorder.current = rec
    setListening(true)

    // Loudness meter: drives the core's waveform and detects the end of speech
    const ctx = new AudioContext()
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 512
    ctx.createMediaStreamSource(stream).connect(analyser)
    const data = new Uint8Array(analyser.fftSize)
    const startedAt = performance.now()
    let heardSpeech = false
    let lastLoud = startedAt
    let raf = 0
    const meter = () => {
      analyser.getByteTimeDomainData(data)
      let sum = 0
      for (let i = 0; i < data.length; i++) sum += ((data[i] - 128) / 128) ** 2
      const level = Math.min(1, Math.sqrt(sum / data.length) * 4)
      voiceLevel.value = voiceLevel.value * 0.6 + level * 0.4
      const now = performance.now()
      if (level > SILENCE_LEVEL) {
        heardSpeech = true
        lastLoud = now
      }
      const silentFor = now - lastLoud
      if ((heardSpeech && silentFor > SILENCE_MS) || now - startedAt > MAX_MS || (!heardSpeech && now - startedAt > NO_SPEECH_MS)) {
        stop()
        return
      }
      raf = requestAnimationFrame(meter)
    }
    raf = requestAnimationFrame(meter)

    cleanup.current = () => {
      cancelAnimationFrame(raf)
      voiceLevel.value = 0
      stream.getTracks().forEach((t) => t.stop())
      ctx.close().catch(() => {})
    }

    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data)
    rec.onstop = async () => {
      cleanup.current?.()
      cleanup.current = null
      recorder.current = null
      if (!heardSpeech || !chunks.length) {
        setListening(false)
        return
      }
      setInterim('Transcribing…')
      try {
        const type = rec.mimeType || chunks[0].type || 'audio/webm'
        const ext = type.includes('mp4') ? 'mp4' : type.includes('ogg') ? 'ogg' : 'webm'
        const body = new FormData()
        body.append('audio', new Blob(chunks, { type }), `speech.${ext}`)
        const res = await fetch('/api/leo/transcribe', { method: 'POST', body })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(json.error ?? `Transcription failed (${res.status})`)
        if (json.text) onFinalRef.current(json.text)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Transcription failed')
      } finally {
        setInterim('')
        setListening(false)
      }
    }
    rec.start()
  }, [stop])

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
