import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { sendWelcomeEmail } from '@/lib/email/welcome'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Stripe calls this after each checkout. The signature check proves the
// request really came from Stripe, so nobody can trigger emails by hand.
export async function POST(req: Request) {
  const secretKey = process.env.STRIPE_SECRET_KEY
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secretKey || !webhookSecret) {
    console.error('Stripe webhook not configured')
    return NextResponse.json({ error: 'Not configured' }, { status: 500 })
  }

  const stripe = new Stripe(secretKey)
  const signature = req.headers.get('stripe-signature')
  const body = await req.text() // raw body is required for signature verification

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature ?? '', webhookSecret)
  } catch (err) {
    console.warn('Stripe webhook signature check failed:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type !== 'checkout.session.completed') return NextResponse.json({ received: true })

  const session = event.data.object as Stripe.Checkout.Session
  const email = session.customer_details?.email ?? session.customer_email
  if (!email || session.payment_status === 'unpaid') return NextResponse.json({ received: true })

  // Stripe retries webhooks; the flag on the session makes sending idempotent
  const current = await stripe.checkout.sessions.retrieve(session.id)
  if (current.metadata?.welcome_email_sent === 'true') return NextResponse.json({ received: true, duplicate: true })

  try {
    await sendWelcomeEmail(email, { name: session.customer_details?.name, plan: session.metadata?.plan })
  } catch (err) {
    console.error('Welcome email failed:', err)
    // A 5xx makes Stripe retry later
    return NextResponse.json({ error: 'Email failed' }, { status: 500 })
  }

  await stripe.checkout.sessions.update(session.id, {
    metadata: { ...current.metadata, welcome_email_sent: 'true' },
  })
  return NextResponse.json({ received: true })
}
