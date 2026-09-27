import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

// Per-request Supabase client for server components and route handlers.
// Session refresh is written back by middleware; setAll here is best-effort
// because server components cannot set cookies.
export function createClient() {
  const cookieStore = cookies()
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        try {
          toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // Called from a server component; middleware refreshes the session
        }
      },
    },
  })
}
