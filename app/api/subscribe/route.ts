import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { email } = await request.json()
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // TODO: Integrate with your email provider here (e.g. Resend, Mailchimp, ConvertKit)
    console.log('New subscriber:', email)

    return NextResponse.json({ success: true, message: 'Subscribed successfully' })
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
