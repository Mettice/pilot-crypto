import { NextResponse } from 'next/server'
import Stripe from 'stripe'

// Must match the prices shown in components/ServicesSection.tsx.
// If a STRIPE_PRICE_* env var is set, that Stripe Price is used instead
// of the inline amount (recommended once products exist in the dashboard).
const PLANS = {
  starter: { name: 'Pilot Crypto — Starter', amount: 999, priceId: process.env.STRIPE_PRICE_STARTER },
  community: { name: 'Pilot Crypto — Community', amount: 2900, priceId: process.env.STRIPE_PRICE_COMMUNITY },
  vip: { name: 'Pilot Crypto — VIP Elite', amount: 14900, priceId: process.env.STRIPE_PRICE_VIP },
} as const

type PlanId = keyof typeof PLANS

export async function POST(request: Request) {
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) {
    return NextResponse.json({ error: 'Payments are not configured yet' }, { status: 500 })
  }

  try {
    const { plan } = await request.json()
    if (!plan || !(plan in PLANS)) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    const selected = PLANS[plan as PlanId]
    const stripe = new Stripe(secretKey)
    const origin = request.headers.get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [
        selected.priceId
          ? { price: selected.priceId, quantity: 1 }
          : {
              price_data: {
                currency: 'eur',
                unit_amount: selected.amount,
                recurring: { interval: 'month' },
                product_data: { name: selected.name },
              },
              quantity: 1,
            },
      ],
      allow_promotion_codes: true,
      metadata: { plan },
      subscription_data: { metadata: { plan } },
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/#services`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Stripe checkout error:', error)
    return NextResponse.json({ error: 'Could not start checkout' }, { status: 500 })
  }
}
