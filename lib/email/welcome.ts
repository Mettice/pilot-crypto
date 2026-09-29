import fs from 'node:fs/promises'
import path from 'node:path'
import nodemailer from 'nodemailer'
import type { Attachment } from 'nodemailer/lib/mailer'
import type { Transporter } from 'nodemailer'

// Files in this folder are attached to every welcome email (README excluded).
// next.config.js bundles the folder with the webhook function.
export const WELCOME_PACK_DIR = path.join(process.cwd(), 'emails', 'welcome-pack')
// Logo embedded in the email itself (not linked), so it shows without "load images"
const LOGO_PATH = path.join(process.cwd(), 'emails', 'assets', 'logo.jpg')
const LOGO_CID = 'pilot-crypto-logo'
const SITE_URL = 'https://www.pilotcrytor.io'
const MAX_ATTACHMENT_BYTES = 15 * 1024 * 1024 // stay well under Zoho's 20 MB limit

const WHATSAPP_URL = 'https://wa.me/33662361149'

const PLAN_NAMES: Record<string, string> = {
  starter: 'Starter',
  community: 'Community',
  vip: 'VIP Elite',
}

export async function loadWelcomePack(): Promise<Attachment[]> {
  let names: string[]
  try {
    names = await fs.readdir(WELCOME_PACK_DIR)
  } catch {
    return []
  }
  const files = names.filter((n) => !n.startsWith('.') && n.toLowerCase() !== 'readme.md').sort()
  const attachments: Attachment[] = []
  let total = 0
  for (const name of files) {
    const filePath = path.join(WELCOME_PACK_DIR, name)
    const { size, isFile } = await fs.stat(filePath).then((s) => ({ size: s.size, isFile: s.isFile() }))
    if (!isFile) continue
    total += size
    if (total > MAX_ATTACHMENT_BYTES) {
      console.warn(`Welcome pack over ${MAX_ATTACHMENT_BYTES / 1024 / 1024} MB; skipping ${name}`)
      continue
    }
    attachments.push({ filename: name, path: filePath })
  }
  return attachments
}

const escape = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

export function buildWelcomeEmail({ name, plan, hasAttachments }: { name?: string | null; plan?: string | null; hasAttachments: boolean }) {
  const first = name?.trim().split(/\s+/)[0]
  const greeting = first ? `Hi ${first},` : 'Hi there,'
  const planName = (plan && PLAN_NAMES[plan]) || 'Pilot Crypto'
  const packLine = hasAttachments
    ? 'Your welcome pack is attached to this email. Start there: it walks you through everything step by step.'
    : 'Your welcome pack is on its way in a separate email shortly.'

  const subject = `Welcome to Pilot Crypto ${planName}`

  const text = `${greeting}

Thank you for joining Pilot Crypto ${planName}. Your payment is confirmed and your membership is active.

${packLine}

Next step: message us on WhatsApp so we can get you onboarded:
${WHATSAPP_URL}

If you have any questions, just reply to this email.

Welcome aboard,

The Pilot Crypto team
Guide. Invest. Grow.
${SITE_URL} · WhatsApp: ${WHATSAPP_URL}

Crypto assets are volatile and you can lose money. Nothing we share is personal financial advice.`

  const html = `<!doctype html>
<html>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif;color:#1a1f2b">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:24px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden">
        <tr><td align="center" style="background:#01040D;padding:24px 32px 20px">
          <img src="cid:${LOGO_CID}" width="170" height="156" alt="Pilot Crypto" style="display:block;border:0;width:170px;height:auto">
          <p style="margin:10px 0 0;font-size:12px;color:#F5B400;letter-spacing:2px;text-transform:uppercase">${escape(planName)} membership</p>
        </td></tr>
        <tr><td style="padding:32px">
          <p style="margin:0 0 16px;font-size:16px">${escape(greeting)}</p>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6">Thank you for joining <strong>Pilot Crypto ${escape(planName)}</strong>. Your payment is confirmed and your membership is active.</p>
          <p style="margin:0 0 24px;font-size:15px;line-height:1.6">${escape(packLine)}</p>
          <p style="margin:0 0 12px;font-size:15px;line-height:1.6"><strong>Next step:</strong> message us on WhatsApp so we can get you onboarded.</p>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 28px"><tr><td style="background:#F5B400;border-radius:8px">
            <a href="${WHATSAPP_URL}" style="display:inline-block;padding:13px 26px;font-size:15px;font-weight:bold;color:#050816;text-decoration:none">Start onboarding on WhatsApp</a>
          </td></tr></table>
          <p style="margin:0 0 4px;font-size:15px;line-height:1.6">Questions? Just reply to this email.</p>
          <p style="margin:24px 0 20px;font-size:15px">Welcome aboard,</p>
          <!-- Signature -->
          <table role="presentation" cellpadding="0" cellspacing="0" style="border-top:1px solid #eceef2;padding-top:18px">
            <tr>
              <td style="padding:18px 16px 0 0;vertical-align:middle">
                <img src="cid:${LOGO_CID}" width="64" height="59" alt="Pilot Crypto" style="display:block;border:0;border-radius:8px;width:64px;height:auto">
              </td>
              <td style="padding-top:18px;vertical-align:middle;font-size:13px;line-height:1.55;color:#6b7280">
                <strong style="font-size:14px;color:#1a1f2b">The Pilot Crypto team</strong><br>
                Guide. Invest. Grow.<br>
                <a href="${SITE_URL}" style="color:#0077c8;text-decoration:none">pilotcrytor.io</a>
                &nbsp;·&nbsp;
                <a href="${WHATSAPP_URL}" style="color:#0077c8;text-decoration:none">WhatsApp</a>
              </td>
            </tr>
          </table>
        </td></tr>
        <tr><td style="padding:20px 32px;background:#f8f9fb;border-top:1px solid #eceef2">
          <p style="margin:0;font-size:12px;line-height:1.5;color:#6b7280">Crypto assets are volatile and you can lose money. Nothing we share is personal financial advice.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  return { subject, text, html }
}

let transporter: Transporter | null = null
function getTransporter() {
  // Zoho Mail EU: smtp.zoho.eu, port 465 (SSL), app-specific password
  transporter ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? 'smtp.zoho.eu',
    port: Number(process.env.SMTP_PORT ?? 465),
    secure: Number(process.env.SMTP_PORT ?? 465) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  })
  return transporter
}

export async function sendWelcomeEmail(to: string, opts: { name?: string | null; plan?: string | null }) {
  const attachments = await loadWelcomePack()
  const { subject, text, html } = buildWelcomeEmail({ ...opts, hasAttachments: attachments.length > 0 })
  if (!attachments.length) console.warn('Welcome pack folder is empty; sending welcome email without attachments')

  return getTransporter().sendMail({
    from: process.env.MAIL_FROM ?? process.env.SMTP_USER,
    replyTo: process.env.MAIL_REPLY_TO || undefined,
    to,
    subject,
    text,
    html,
    attachments: [
      { filename: 'pilot-crypto-logo.jpg', path: LOGO_PATH, cid: LOGO_CID, contentDisposition: 'inline' },
      ...attachments,
    ],
  })
}
