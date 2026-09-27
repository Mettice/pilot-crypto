import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { isOperator } from '@/lib/leo/hosts'

const Body = z.object({ email: z.string().email().max(200) })

// Sends a magic sign-in link, but only to allowlisted operators. The reply is
// identical either way so the endpoint doesn't reveal who is allowed.
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Enter a valid email' }, { status: 400 })

  const email = parsed.data.email.trim().toLowerCase()
  if (isOperator(email)) {
    const h = headers()
    const proto = h.get('x-forwarded-proto') ?? 'http'
    const origin = `${proto}://${h.get('host')}`
    const { error } = await createClient().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${origin}/auth/callback` },
    })
    if (error) {
      console.error('Leo login error:', error.message)
      return NextResponse.json({ error: 'Could not send the link. Try again shortly.' }, { status: 500 })
    }
  }
  return NextResponse.json({ ok: true })
}
