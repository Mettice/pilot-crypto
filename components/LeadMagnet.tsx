'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Download, Mail, CheckCircle, BookOpen, Zap, Shield, TrendingUp } from 'lucide-react'

const included = [
  { icon: BookOpen, text: 'Crypto basics explained simply' },
  { icon: Zap, text: 'Top 5 beginner mistakes to avoid' },
  { icon: Shield, text: 'Safe wallet & exchange setup' },
  { icon: TrendingUp, text: 'How to read your first chart' },
]

export default function LeadMagnet() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      
      if (res.ok) {
        setSubmitted(true)
      } else {
        // Handle error gracefully
        console.error('Failed to subscribe')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section id="guide" className="section-pad relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[300px] rounded-full bg-[#00AEEF] opacity-[0.04] blur-[120px] pointer-events-none" />

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="glass-blue rounded-3xl overflow-hidden"
        >
          <div className="grid md:grid-cols-2 gap-0">
            {/* Left */}
            <div className="p-8 md:p-12 flex flex-col gap-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#00AEEF]/10 border border-[#00AEEF]/20 w-fit">
                <Download className="w-3.5 h-3.5 text-[#00AEEF]" />
                <span className="text-xs font-semibold text-[#00AEEF] uppercase tracking-wide">Free Download</span>
              </div>

              <div>
                <h2 className="font-heading font-bold text-2xl sm:text-3xl text-white mb-3 leading-tight">
                  Get Your Free{' '}
                  <span className="gradient-text-blue">Crypto Beginner</span>{' '}
                  Starter Guide
                </h2>
                <p className="text-muted text-sm leading-relaxed">
                  Everything you need to start your crypto journey safely — in plain English. No jargon, no hype.
                </p>
              </div>

              <ul className="flex flex-col gap-3">
                {included.map((item) => (
                  <li key={item.text} className="flex items-center gap-3 text-sm">
                    <div className="w-7 h-7 rounded-lg bg-[#00AEEF]/10 flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-3.5 h-3.5 text-[#00AEEF]" />
                    </div>
                    <span className="text-muted">{item.text}</span>
                  </li>
                ))}
              </ul>

              <p className="text-xs text-muted/50 flex items-center gap-1.5">
                <Shield className="w-3 h-3" />
                No spam. Unsubscribe any time. Your email is safe.
              </p>
            </div>

            {/* Right */}
            <div
              className="flex flex-col justify-center p-8 md:p-12"
              style={{ background: 'rgba(0,174,239,0.04)' }}
            >
              {!submitted ? (
                <motion.form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  <div>
                    <h3 className="font-heading font-semibold text-white text-lg mb-1">
                      Get Instant Access
                    </h3>
                    <p className="text-muted text-sm">Enter your email to receive the guide.</p>
                  </div>

                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-muted/50 focus:border-[#00AEEF]/50 transition-all"
                    />
                  </div>

                  <motion.button
                    type="submit"
                    disabled={loading}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className="flex items-center justify-center gap-2.5 py-3.5 rounded-xl bg-blue-gradient font-semibold text-white shadow-glow-blue disabled:opacity-70 transition-all"
                  >
                    {loading ? (
                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.37 0 0 5.37 0 12h4z" />
                      </svg>
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    {loading ? 'Sending…' : 'Get Free Guide →'}
                  </motion.button>

                  <p className="text-xs text-center text-muted/50">
                    Delivered to your inbox within 60 seconds.
                  </p>
                </motion.form>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center gap-4 text-center"
                >
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                    <CheckCircle className="w-8 h-8 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-white text-lg mb-1">You&apos;re in!</h3>
                    <p className="text-muted text-sm">Check your inbox. Your Starter Guide is on its way.</p>
                  </div>
                  <a
                    href="https://wa.me/33662361149"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#00AEEF] text-sm font-semibold hover:underline"
                  >
                    Want personalised help? Message us on WhatsApp →
                  </a>
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
