'use client'

import { useEffect, useState } from 'react'
import { Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/browser'
import HudPanel from './HudPanel'

type Lead = { id: string; created_at: string; name: string; email: string; whatsapp: string; transcript: { role: string; content: string }[] }

// Leads from the public chat on the landing page; new ones appear instantly
export default function LeadsPanel() {
  const [leads, setLeads] = useState<Lead[] | null>(null)
  const [open, setOpen] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    const load = async () => {
      const { data } = await supabase
        .from('leads')
        .select('id, created_at, name, email, whatsapp, transcript')
        .order('created_at', { ascending: false })
        .limit(15)
      setLeads(data ?? [])
    }
    load()
    const channel = supabase
      .channel('leo-leads')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'leads' }, load)
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return (
    <HudPanel
      index="06"
      title="Leads"
      icon={Users}
      right={leads && <span className="font-hud text-[10px] text-[#9fdcf5]/70">{leads.length} RECENT</span>}
    >
      <ul className="px-4 py-3 space-y-2 max-h-[300px] overflow-y-auto">
        {leads === null && <li className="text-xs text-muted">Loading…</li>}
        {leads?.length === 0 && <li className="text-xs text-muted">No leads yet. They arrive here from the Ask Leo chat on the website.</li>}
        {leads?.map((l) => (
          <li key={l.id} className="rounded-md border border-[#00AEEF]/10 bg-[#00AEEF]/[0.03] px-3 py-2">
            <button onClick={() => setOpen(open === l.id ? null : l.id)} className="w-full text-left">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-white font-semibold truncate">{l.name}</span>
                <span className="font-hud text-[10px] text-[#00AEEF]/60 flex-shrink-0">
                  {new Date(l.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                </span>
              </div>
            </button>
            <div className="flex flex-wrap gap-x-3 text-[11px]">
              <a href={`mailto:${l.email}`} className="text-[#9fdcf5] hover:text-white truncate">{l.email}</a>
              <a href={`https://wa.me/${l.whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300">
                WhatsApp {l.whatsapp}
              </a>
            </div>
            {open === l.id && (
              <div className="mt-2 space-y-1 border-t border-white/[0.06] pt-2">
                {l.transcript.map((m, i) => (
                  <p key={i} className="text-[11px] text-white/70">
                    <span className={m.role === 'user' ? 'text-[#9fdcf5]' : 'text-[#F5B400]'}>{m.role === 'user' ? 'Visitor' : 'Leo'}:</span> {m.content}
                  </p>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
    </HudPanel>
  )
}
