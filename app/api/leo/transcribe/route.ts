import { NextResponse } from 'next/server'
import { getOperator } from '@/lib/leo/access'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const MAX_BYTES = 8 * 1024 * 1024 // ~2 minutes of compressed speech; keeps uploads small

// Speech-to-text for talking to Leo (ElevenLabs Scribe). Works in every
// browser, unlike built-in speech recognition, which in Chromium depends on
// Google's service and fails in Brave, behind VPNs, etc.
export async function POST(req: Request) {
  if (!(await getOperator())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'Voice not configured' }, { status: 503 })

  const form = await req.formData().catch(() => null)
  const audio = form?.get('audio')
  if (!(audio instanceof Blob) || audio.size === 0) return NextResponse.json({ error: 'No audio' }, { status: 400 })
  if (audio.size > MAX_BYTES) return NextResponse.json({ error: 'Recording too long' }, { status: 413 })

  const upstream = new FormData()
  upstream.append('model_id', process.env.ELEVENLABS_STT_MODEL_ID ?? 'scribe_v2')
  // Keep the browser's container type (WebM in Chrome/Firefox, MP4 in Safari)
  upstream.append('file', audio, audio instanceof File && audio.name ? audio.name : 'speech.webm')
  const res = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
    method: 'POST',
    headers: { 'xi-api-key': apiKey },
    body: upstream,
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    console.error('ElevenLabs STT error', res.status, detail.slice(0, 300))
    return NextResponse.json({ error: `Transcription failed (${res.status})` }, { status: 502 })
  }
  const data = (await res.json()) as { text?: string }
  return NextResponse.json({ text: (data.text ?? '').trim() })
}
