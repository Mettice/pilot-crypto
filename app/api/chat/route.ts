import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { leoResponse } from '@/lib/leo/agent'
import { runPublicLeo } from '@/lib/leo/public-agent'
import { DAILY_LIMIT_ANON, DAILY_LIMIT_LEAD, FREE_MESSAGES, LEAD_COOKIE, hasValidLead, underDailyLimit, visitorHash } from '@/lib/leo/visitor'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const Body = z.object({
  messages: z
    .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().min(1).max(4000) }))
    .min(1)
    .max(80)
    .refine((m) => m[m.length - 1].role === 'user', 'Last message must be from the visitor')
    .refine((m) => m[m.length - 1].content.length <= 1000, 'Message too long'),
})

// Public Leo chat on the landing page
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  const isLead = hasValidLead(cookies().get(LEAD_COOKIE)?.value)
  const visitorMessages = parsed.data.messages.filter((m) => m.role === 'user').length
  if (!isLead && visitorMessages > FREE_MESSAGES) {
    return NextResponse.json({ error: 'gate' }, { status: 403 })
  }
  if (!(await underDailyLimit(visitorHash(req), isLead ? DAILY_LIMIT_LEAD : DAILY_LIMIT_ANON))) {
    return NextResponse.json({ error: 'limit' }, { status: 429 })
  }

  // Recent context is enough for short answers and keeps cost flat
  const history = parsed.data.messages.slice(-12)
  const start = history[0].role === 'assistant' ? history.slice(1) : history
  return leoResponse((emit) => runPublicLeo(start, emit))
}
