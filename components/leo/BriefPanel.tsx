'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, Loader2, RefreshCw } from 'lucide-react'
import Markdown from './Markdown'
import { readLeoStream } from '@/lib/leo/read-stream'

type Brief = { id: string; created_at: string; content: string }

export default function BriefPanel({ briefs }: { briefs: Brief[] }) {
  const router = useRouter()
  const [draft, setDraft] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState(0)
  const busy = draft !== null

  async function generate() {
    setDraft('')
    setError(null)
    setStatus('Starting…')
    let text = ''
    try {
      const res = await fetch('/api/leo/brief', { method: 'POST' })
      await readLeoStream(res, (e) => {
        if (e.t === 'text') {
          text += e.v
          setDraft(text)
          setStatus(null)
        } else if (e.t === 'status') setStatus(e.v)
        else if (e.t === 'error') setError(e.v)
        else if (e.t === 'saved') {
          setSelected(0)
          router.refresh() // pull the saved brief from the server
        }
      })
    } catch {
      setError('Connection lost while writing the brief.')
    } finally {
      setDraft(null)
      setStatus(null)
    }
  }

  const shown = briefs[selected]

  return (
    <section className="rounded-2xl border border-white/[0.06] bg-[#0b1220]/80">
      <header className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-[#00AEEF]" />
          <h2 className="font-heading font-semibold text-white">Market brief</h2>
        </div>
        <button
          onClick={generate}
          disabled={busy}
          className="flex items-center gap-1.5 text-xs font-semibold text-[#050816] bg-gold-gradient rounded-lg px-3 py-1.5 disabled:opacity-50"
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          {busy ? 'Writing…' : 'New brief'}
        </button>
      </header>

      <div className="px-5 py-4 text-sm text-white/85 max-h-[520px] overflow-y-auto">
        {busy ? (
          <>
            {status && (
              <p className="flex items-center gap-2 text-xs text-muted mb-3">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                {status}
              </p>
            )}
            {draft && <Markdown>{draft}</Markdown>}
          </>
        ) : shown ? (
          <>
            <div className="flex items-center gap-2 mb-3">
              <select
                value={selected}
                onChange={(e) => setSelected(Number(e.target.value))}
                className="bg-[#050816] border border-white/10 rounded-md text-xs text-muted px-2 py-1"
              >
                {briefs.map((b, i) => (
                  <option key={b.id} value={i}>
                    {new Date(b.created_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
                  </option>
                ))}
              </select>
            </div>
            <Markdown>{shown.content}</Markdown>
          </>
        ) : (
          <p className="text-muted">No briefs yet. Generate the first one. It takes a minute or two while Leo reads the market and the news.</p>
        )}
        {error && <p className="text-xs text-red-400 mt-3">{error}</p>}
      </div>
    </section>
  )
}
