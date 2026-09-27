import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getOperator } from '@/lib/leo/access'
import { leoResponse, runLeo } from '@/lib/leo/agent'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

const Body = z.object({
  messages: z
    .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().min(1).max(20000) }))
    .min(1)
    .max(60)
    .refine((m) => m[m.length - 1].role === 'user', 'Last message must be from the user'),
})

export async function POST(req: Request) {
  if (!(await getOperator())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  return leoResponse(async (emit) => {
    await runLeo(parsed.data.messages, emit)
  })
}
