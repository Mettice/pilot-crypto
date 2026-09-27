// Pure helpers, safe to import from middleware.

// Leo is served on its own subdomain: leo.pilotcrytor.io in production,
// leo.localhost:3000 in development.
export function isLeoHost(host: string | null) {
  return !!host && host.split(':')[0].startsWith('leo.')
}

// App-level allowlist. The database enforces the same list via RLS
// (public.leo_operators), so both layers must agree for access.
export function isOperator(email: string | null | undefined) {
  if (!email) return false
  const allowed = (process.env.LEO_ALLOWED_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
  return allowed.includes(email.toLowerCase())
}
