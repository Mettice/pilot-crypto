import Link from 'next/link'
import { CheckCircle, MessageCircle } from 'lucide-react'

export const metadata = { title: 'Welcome aboard — Pilot Crypto' }

export default function SuccessPage() {
  return (
    <main className="bg-bg min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center rounded-2xl p-8 bg-bg-card border border-[#F5B400]/30">
        <CheckCircle className="w-14 h-14 text-[#F5B400] mx-auto mb-5" />
        <h1 className="font-heading font-bold text-3xl text-white mb-3">Payment confirmed</h1>
        <p className="text-muted mb-8">
          Thank you for joining Pilot Crypto. A receipt has been sent to your email.
          Message us on WhatsApp to get onboarded.
        </p>
        <a
          href="https://wa.me/33662361149"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-semibold text-sm bg-gold-gradient text-[#050816] mb-3"
        >
          <MessageCircle className="w-5 h-5" />
          Start onboarding on WhatsApp
        </a>
        <Link href="/" className="text-muted text-sm hover:text-white transition-colors">
          Back to home
        </Link>
      </div>
    </main>
  )
}
