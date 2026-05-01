'use client'

import { motion } from 'framer-motion'
import { Zap, MessageCircle, Instagram, Send, ExternalLink } from 'lucide-react'

const quickLinks = [
  { label: 'Home', href: '#hero' },
  { label: 'Why Pilot Crypto', href: '#why' },
  { label: 'Services', href: '#services' },
  { label: 'CRO Strategy', href: '#cro' },
  { label: 'Calculator', href: '#calculator' },
  { label: 'Testimonials', href: '#testimonials' },
  { label: 'FAQ', href: '#faq' },
]

const social = [
  { icon: MessageCircle, label: 'WhatsApp', href: 'https://wa.me/message/YOUR_WHATSAPP', color: '#25d366' },
  { icon: Instagram, label: 'Instagram', href: '#', color: '#e1306c' },
  { icon: Send, label: 'Telegram', href: '#', color: '#0088cc' },
]

export default function Footer() {
  const handleNav = (href: string) => {
    const el = document.querySelector(href)
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <footer className="bg-bg-secondary border-t border-white/5 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div className="md:col-span-2 flex flex-col gap-5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-gradient flex items-center justify-center shadow-glow-blue">
                <Zap className="w-4 h-4 text-white" fill="white" />
              </div>
              <span className="font-heading font-bold text-xl text-white">
                Pilot<span className="text-[#00AEEF]">Crypto</span>
              </span>
            </div>
            <p className="text-muted text-sm leading-relaxed max-w-xs">
              Building a generation of smarter, safer crypto investors across Europe. Real mentorship. Real results.
            </p>
            <div className="flex gap-3">
              {social.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="w-10 h-10 rounded-xl glass border border-white/5 flex items-center justify-center hover:border-white/20 transition-all group"
                >
                  <s.icon className="w-4 h-4 text-muted group-hover:text-white transition-colors" />
                </a>
              ))}
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="font-heading font-semibold text-white text-sm mb-5 uppercase tracking-wide">
              Quick Links
            </h4>
            <ul className="flex flex-col gap-2.5">
              {quickLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    onClick={(e) => { e.preventDefault(); handleNav(link.href) }}
                    className="text-muted text-sm hover:text-white transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-heading font-semibold text-white text-sm mb-5 uppercase tracking-wide">
              Get In Touch
            </h4>
            <div className="flex flex-col gap-3">
              <a
                href="https://wa.me/message/YOUR_WHATSAPP"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 text-sm text-muted hover:text-white transition-colors group"
              >
                <MessageCircle className="w-4 h-4 text-[#25d366] flex-shrink-0" />
                WhatsApp Support
                <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity" />
              </a>
              <p className="text-xs text-muted/50">
                Avg. response: under 4 hours
              </p>
              <div className="mt-3 p-3 rounded-xl bg-[#00AEEF]/5 border border-[#00AEEF]/15">
                <p className="text-xs text-[#00AEEF] font-semibold mb-1">VIP Spots Available</p>
                <p className="text-xs text-muted">3 of 10 spots remaining. Apply now before they fill.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/5 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted/50 text-center sm:text-left">
            © {new Date().getFullYear()} PilotCrypto. All rights reserved.
          </p>
          <p className="text-xs text-muted/40 text-center max-w-md">
            <strong className="text-muted/60">Disclaimer:</strong> Cryptocurrency investments carry significant risk. Nothing on this website constitutes financial advice. Always conduct your own research and never invest more than you can afford to lose.
          </p>
        </div>
      </div>
    </footer>
  )
}
