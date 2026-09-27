import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getOperator } from '@/lib/leo/access'
import { botConfigured, runBotAction } from '@/lib/leo/bot'

const Body = z.object({
  action: z.enum(['pause', 'resume', 'kill']),
  reason: z.string().max(500).optional(),
})

// Operator controls from the dashboard. Every attempt is written to the audit log.
export async function POST(req: Request) {
  const op = await getOperator()
  if (!op) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!botConfigured()) return NextResponse.json({ error: 'Bot not connected' }, { status: 503 })
  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  const { action, reason } = parsed.data
  let ok = true
  let result: string
  try {
    result = await runBotAction(action)
  } catch (err) {
    ok = false
    result = err instanceof Error ? err.message : 'Bot unreachable'
  }
  await op.supabase.from('leo_bot_actions').insert({ source: 'dashboard', action, reason, ok, result })
  return NextResponse.json({ ok, result }, { status: ok ? 200 : 502 })
}
