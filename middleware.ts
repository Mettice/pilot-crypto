import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { isLeoHost, isOperator } from '@/lib/leo/hosts'

// Reachable on the Leo subdomain without being signed in
const LEO_PUBLIC_PATHS = ['/login', '/auth/callback', '/api/leo/login']

const notFound = () => new NextResponse('Not found', { status: 404 })

// req.url can carry the server's own host (e.g. in dev), so build redirects
// from the Host header to stay on the leo. subdomain.
function leoUrl(req: NextRequest, path: string) {
  const proto = req.headers.get('x-forwarded-proto') ?? req.nextUrl.protocol.replace(':', '')
  return new URL(path, `${proto}://${req.headers.get('host')}`)
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl

  // Public site: Leo's internal routes do not exist here
  if (!isLeoHost(req.headers.get('host'))) {
    if (pathname.startsWith('/leo') || pathname.startsWith('/api/leo')) return notFound()
    return NextResponse.next()
  }

  // Leo subdomain: only Leo's own API, and pages map onto app/leo/*
  const isApi = pathname.startsWith('/api/')
  if (isApi && !pathname.startsWith('/api/leo/')) return notFound()
  if (pathname.startsWith('/leo')) return notFound()
  const target = new URL((isApi ? pathname : `/leo${pathname === '/' ? '' : pathname}`) + search, req.url)

  let res = NextResponse.rewrite(target, { request: { headers: req.headers } })
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (toSet, headers) => {
        // Refreshed tokens go to both the downstream request and the browser
        toSet.forEach(({ name, value }) => req.cookies.set(name, value))
        res = NextResponse.rewrite(target, { request: { headers: req.headers } })
        toSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options))
        Object.entries(headers ?? {}).forEach(([k, v]) => res.headers.set(k, v))
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()
  const allowed = !!user && isOperator(user.email)

  if (!allowed && !LEO_PUBLIC_PATHS.includes(pathname)) {
    if (isApi) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.redirect(leoUrl(req, '/login'))
  }
  if (allowed && pathname === '/login') return NextResponse.redirect(leoUrl(req, '/'))

  res.headers.set('X-Robots-Tag', 'noindex, nofollow')
  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|.*\.(?:png|jpg|jpeg|svg|ico|mp4|txt|xml|webmanifest)$).*)'],
}
