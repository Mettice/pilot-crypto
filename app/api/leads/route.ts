import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getTransporter } from '@/lib/email/welcome'
import { LEAD_COOKIE, publicSupabase, signLead, visitorHash } from '@/lib/leo/visitor'

export const dynamic = 'force-dynamic'

const Body = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(200),
  whatsapp: z
    .string()
    .trim()
    .regex(/^\+?[0-9 ()-]{6,24}$/, 'Enter a valid WhatsApp number'),
  consent: z.literal(true),
  transcript: z
    .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().max(4000) }))
    .max(30)
    .default([]),
})

const escape = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

async function notifyTeam(lead: z.infer<typeof Body>) {
  const to = process.env.MAIL_LEADS_TO || process.env.SMTP_USER
  if (!to || !process.env.SMTP_PASS) return
  const wa = lead.whatsapp.replace(/[^0-9]/g, '')
  const convo = lead.transcript
    .map((m) => `<p style="margin:0 0 8px"><strong>${m.role === 'user' ? escape(lead.name) : 'Leo'}:</strong> ${escape(m.content)}</p>`)
    .join('')
  await getTransporter().sendMail({
    from: process.env.MAIL_FROM ?? process.env.SMTP_USER,
    to,
    replyTo: lead.email,
    subject: `New lead from Leo chat: ${lead.name}`,
    text: `${lead.name}\n${lead.email}\nWhatsApp: ${lead.whatsapp}\n\n${lead.transcript.map((m) => `${m.role === 'user' ? lead.name : 'Leo'}: ${m.content}`).join('\n\n')}`,
    html: `<div style="font-family:Arial,sans-serif;font-size:14px;color:#1a1f2b">
      <h2 style="margin:0 0 12px">New lead from the Leo chat</h2>
      <p style="margin:0 0 4px"><strong>${escape(lead.name)}</strong></p>
      <p style="margin:0 0 4px"><a href="mailto:${escape(lead.email)}">${escape(lead.email)}</a></p>
      <p style="margin:0 0 16px">WhatsApp: <a href="https://wa.me/${wa}">${escape(lead.whatsapp)}</a></p>
      <h3 style="margin:0 0 8px;font-size:14px">Conversation</h3>${convo || '<p>(none)</p>'}
    </div>`,
  })
}

// Lead form in the public chat. Saves the lead, unlocks more chat for this
// browser, and emails the team.
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    return NextResponse.json({ error: first?.path[0] === 'consent' ? 'Please accept to continue' : first?.message ?? 'Invalid details' }, { status: 400 })
  }
  const lead = parsed.data
  const transcript = lead.transcript.map((m) => ({ role: m.role, content: m.content.slice(0, 1500) }))

  const { data: id, error } = await publicSupabase().rpc('submit_lead', {
    p_name: lead.name,
    p_email: lead.email,
    p_whatsapp: lead.whatsapp,
    p_transcript: transcript,
    p_visitor: visitorHash(req),
  })
  if (error || !id) {
    console.error('submit_lead failed:', error?.message)
    return NextResponse.json({ error: 'Could not save your details. Please try again.' }, { status: 500 })
  }

  try {
    await notifyTeam({ ...lead, transcript })
  } catch (err) {
    console.error('Lead notification email failed:', err) // the lead is saved either way
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set(LEAD_COOKIE, signLead(String(id)), {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  })
  return res
}
