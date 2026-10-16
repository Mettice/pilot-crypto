import { createHash, createHmac, timingSafeEqual } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

// Helpers for the public chat on the landing page.

export const FREE_MESSAGES = 5 // visitor messages before the lead form
export const DAILY_LIMIT_ANON = 12 // per visitor per day before leaving details
export const DAILY_LIMIT_LEAD = 60 // per visitor per day after
export const LEAD_COOKIE = 'pc_lead'

// Server-only secret material. PUBLIC_CHAT_SECRET if set, otherwise derived
// from the Anthropic key so no extra setup is needed.
function secret() {
  const base = process.env.PUBLIC_CHAT_SECRET || process.env.ANTHROPIC_API_KEY || ''
  if (!base) throw new Error('No secret available for the public chat')
  return createHash('sha256').update(`pilot-crypto-public-chat:${base}`).digest()
}

// Salted hash of the visitor's IP: enough to rate-limit, never stores the IP
export function visitorHash(req: Request) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown'
  return createHmac('sha256', secret()).update(ip).digest('hex')
}

// Signed cookie proving this browser already left its details
export function signLead(leadId: string) {
  return `${leadId}.${createHmac('sha256', secret()).update(leadId).digest('hex')}`
}

export function hasValidLead(cookieValue: string | undefined) {
  if (!cookieValue) return false
  const [id, sig] = cookieValue.split('.')
  if (!id || !sig) return false
  const expected = createHmac('sha256', secret()).update(id).digest('hex')
  return sig.length === expected.length && timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
}

// Anonymous Supabase client: can only call the public RPC functions
export function publicSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false },
  })
}

export async function underDailyLimit(visitor: string, limit: number) {
  const { data, error } = await publicSupabase().rpc('chat_hit', { p_visitor: visitor, p_limit: limit })
  if (error) {
    console.error('chat_hit failed:', error.message)
    return true // fail open: a database hiccup shouldn't take the chat down
  }
  return data === true
}
