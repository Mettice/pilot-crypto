import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

// Magic-link landing: swap the one-time code for a session cookie
export async function GET(req: Request) {
  const code = new URL(req.url).searchParams.get('code')
  // Redirect on the host the browser used (the leo. subdomain)
  const h = headers()
  const origin = `${h.get('x-forwarded-proto') ?? 'http'}://${h.get('host')}`
  if (code) {
    const { error } = await createClient().auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(`${origin}/`)
  }
  return NextResponse.redirect(`${origin}/login?error=link`)
}
