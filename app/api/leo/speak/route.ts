import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getOperator } from '@/lib/leo/access'

export const dynamic = 'force-dynamic'

// ElevenLabs' stock "George" voice unless ELEVENLABS_VOICE_ID picks another
const DEFAULT_VOICE_ID = 'JBFqnCBsd6RMkjVDRZzb'
// Flash v2.5: lowest latency and about half the credits of the top model
const MODEL_ID = process.env.ELEVENLABS_MODEL_ID ?? 'eleven_flash_v2_5'

// Spoken summaries are short; the cap keeps a runaway reply from burning credits
const Body = z.object({ text: z.string().trim().min(1).max(800) })

// Text-to-speech for Leo's spoken replies. Operator-only; the API key never
// leaves the server.
export async function POST(req: Request) {
  if (!(await getOperator())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'Voice not configured' }, { status: 503 })

  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid text' }, { status: 400 })

  const voiceId = process.env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE_ID
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}/stream?output_format=mp3_44100_128`,
    {
      method: 'POST',
      headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
      body: JSON.stringify({ text: parsed.data.text, model_id: MODEL_ID }),
    }
  )
  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => '')
    console.error('ElevenLabs error', res.status, detail.slice(0, 300))
    return NextResponse.json({ error: `Voice service error (${res.status})` }, { status: 502 })
  }

  return new Response(res.body, {
    headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-store' },
  })
}
