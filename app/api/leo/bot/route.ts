import { NextResponse } from 'next/server'
import { getOperator } from '@/lib/leo/access'
import { botConfigured, getBotStatus } from '@/lib/leo/bot'

export const dynamic = 'force-dynamic'

export async function GET() {
  const op = await getOperator()
  if (!op) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!botConfigured()) return NextResponse.json({ connected: false })

  const [status, { data: actions }] = await Promise.all([
    getBotStatus().catch((err: Error) => ({ error: err.message })),
    op.supabase
      .from('leo_bot_actions')
      .select('created_at, source, action, reason, ok')
      .order('created_at', { ascending: false })
      .limit(5),
  ])
  if ('error' in status) return NextResponse.json({ connected: true, reachable: false, error: status.error, actions })
  return NextResponse.json({ connected: true, reachable: true, status, actions })
}
