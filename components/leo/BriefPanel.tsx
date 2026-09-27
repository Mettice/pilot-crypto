'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Loader2, RefreshCw } from 'lucide-react'
import Markdown from './Markdown'
import { readLeoStream } from '@/lib/leo/read-stream'
import { useLeo } from './live/LeoPresence'

type Brief = { id: string; created_at: string; content: string }

export default function BriefPanel({ briefs }: { briefs: Brief[] }) {
  const router = useRouter()
  const leo = useLeo()
  const [draft, setDraft] = useState<string | null>(null)
  const [steps, setSteps] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState(0)
  const busy = draft !== null

  async function generate() {
    if (busy) return
    leo.run('showTab', 'briefs')
    setDraft('')
    setSteps([])
    setError(null)
    leo.setState('thinking')
    let text = ''
    try {
      const res = await fetch('/api/leo/brief', { method: 'POST' })
      await readLeoStream(res, (e) => {
        if (e.t === 'text') {
          text += e.v
          setDraft(text)
          leo.setState('thinking')
        } else if (e.t === 'status') {
          setSteps((s) => [...s, e.v])
          leo.setState(e.kind)
        } else if (e.t === 'error') setError(e.v)
        else if (e.t === 'saved') {
          setSelected(0)
          router.refresh() // pull the saved brief from the server
        }
      })
    } catch {
      setError('Connection lost while writing the brief.')
    } finally {
      setDraft(null)
      leo.setState('idle')
    }
  }

  useEffect(() => leo.register('newBrief', generate))

  const shown = briefs[selected]

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between gap-2 px-5 py-3 border-b border-white/[0.06]">
        {shown && !busy ? (
          <select
            value={selected}
            onChange={(e) => setSelected(Number(e.target.value))}
            className="bg-[#050816] border border-white/10 rounded-md text-xs text-muted px-2 py-1 min-w-0"
          >
            {briefs.map((b, i) => (
              <option key={b.id} value={i}>
                {new Date(b.created_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
              </option>
            ))}
          </select>
        ) : (
          <span className="text-xs text-muted">{busy ? 'Writing a new brief…' : 'No briefs yet'}</span>
        )}
        <button
          onClick={generate}
          disabled={busy}
          className="flex items-center gap-1.5 text-xs font-semibold text-[#050816] bg-gold-gradient rounded-lg px-3 py-1.5 disabled:opacity-50 flex-shrink-0"
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          {busy ? 'Writing…' : 'New brief'}
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 text-sm text-white/85">
        {busy ? (
          <>
            {steps.length > 0 && (
              <ol className="mb-3 flex flex-wrap gap-1.5">
                {steps.map((s, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] pl-1.5 pr-2.5 py-0.5 text-[11px] text-muted"
                  >
                    {i < steps.length - 1 || draft ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-[#00AEEF] animate-pulse" />
                    )}
                    {s}
                  </li>
                ))}
              </ol>
            )}
            {draft && <Markdown>{draft}</Markdown>}
          </>
        ) : shown ? (
          <Markdown>{shown.content}</Markdown>
        ) : (
          <p className="text-muted">
            Generate the first brief. It takes a minute or two while Leo reads the market, the news and the bot.
          </p>
        )}
        {error && <p className="text-xs text-red-400 mt-3">{error}</p>}
      </div>
    </div>
  )
}
