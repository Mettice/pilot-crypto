import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { isOperator } from './hosts'

// For route handlers and server components: the signed-in operator, or null.
// Middleware already gates Leo routes; this is the second, per-handler check.
export async function getOperator(): Promise<{ user: User; supabase: ReturnType<typeof createClient> } | null> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || !isOperator(user.email)) return null
  return { user, supabase }
}
