'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Loader2, Mail } from 'lucide-react'

function LoginForm() {
  const params = useSearchParams()
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [error, setError] = useState<string | null>(
    params.get('error') === 'link' ? 'That sign-in link is invalid or expired. Request a new one.' : null
  )

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setState('sending')
    setError(null)
    const res = await fetch('/api/leo/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    if (res.ok) setState('sent')
    else {
      setError((await res.json().catch(() => ({}))).error ?? 'Something went wrong')
      setState('idle')
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-white/[0.06] bg-[#0b1220]/80 p-7">
        <div className="w-11 h-11 rounded-xl bg-gold-gradient flex items-center justify-center font-heading font-bold text-lg text-[#050816] mb-5">
          L
        </div>
        <h1 className="font-heading font-bold text-2xl text-white mb-1">Leo</h1>
        <p className="text-muted text-sm mb-6">Private access. We&apos;ll email you a sign-in link.</p>

        {state === 'sent' ? (
          <p className="text-sm text-white/85 rounded-xl border border-[#00AEEF]/20 bg-[#00AEEF]/5 px-4 py-3">
            If that address has access, a sign-in link is on its way. Open it on this device.
          </p>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-3">
            <label className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-[#050816] px-3 focus-within:border-[#00AEEF]/40">
              <Mail className="w-4 h-4 text-muted" />
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="flex-1 bg-transparent py-3 text-sm text-white placeholder:text-muted/60 outline-none"
              />
            </label>
            <button
              type="submit"
              disabled={state === 'sending'}
              className="flex items-center justify-center gap-2 rounded-xl bg-gold-gradient py-3 text-sm font-semibold text-[#050816] disabled:opacity-60"
            >
              {state === 'sending' && <Loader2 className="w-4 h-4 animate-spin" />}
              Send sign-in link
            </button>
          </form>
        )}
        {error && <p className="text-xs text-red-400 mt-3">{error}</p>}
      </div>
    </main>
  )
}

// useSearchParams needs a Suspense boundary for static rendering
export default function LeoLogin() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
