'use client'

import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { CreditCard, BarChart3, Layers, Globe, ChevronRight, Zap } from 'lucide-react'

const croFeatures = [
  { icon: CreditCard, label: 'Crypto.com Visa Cards', desc: 'Up to 8% cashback on all spending' },
  { icon: BarChart3, label: 'Exchange Utility', desc: 'Fee discounts and staking rewards' },
  { icon: Layers, label: 'DeFi & Staking', desc: 'Earn passive income through Earn program' },
  { icon: Globe, label: 'Growing Ecosystem', desc: 'NFTs, DeFi, GameFi, and Web3 integration' },
]

function TradingViewWidget() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return
    
    if (containerRef.current.querySelector('script')) return

    containerRef.current.innerHTML = ''

    const script = document.createElement('script')
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js'
    script.type = 'text/javascript'
    script.async = true
    script.innerHTML = JSON.stringify({
      width: "100%",
      height: 400,
      symbol: 'CRYPTOCOM:CROUSD',
      interval: 'D',
      timezone: 'Etc/UTC',
      theme: 'dark',
      style: '1',
      locale: 'en',
      backgroundColor: '#0b1220',
      gridColor: 'rgba(255,255,255,0.03)',
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: false,
      calendar: false,
      hide_volume: true,
      support_host: 'https://www.tradingview.com',
    })
    containerRef.current.appendChild(script)
  }, [])

  return (
    <div
      ref={containerRef}
      className="tradingview-widget-container w-full h-[400px] rounded-2xl overflow-hidden"
      style={{ background: '#0b1220' }}
    />
  )
}

export default function CROSpotlight() {
  return (
    <section id="cro" className="section-pad relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-bg-secondary/30" />
      <div className="absolute top-1/2 left-0 -translate-y-1/2 w-96 h-96 rounded-full bg-[#00AEEF] opacity-[0.04] blur-[120px] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* LEFT */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="flex flex-col gap-6"
          >
            {/* Label */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-[#00AEEF]/20 w-fit">
              <Zap className="w-3.5 h-3.5 text-[#00AEEF]" fill="#00AEEF" />
              <span className="text-xs font-semibold text-[#00AEEF] tracking-wide uppercase">
                CRO Spotlight
              </span>
            </div>

            <h2 className="font-heading font-bold text-3xl sm:text-4xl lg:text-[2.6rem] leading-tight text-white">
              Why CRO Is{' '}
              <span className="gradient-text-blue">Worth Watching</span>{' '}
              in 2026
            </h2>

            <p className="text-muted text-base leading-relaxed">
              Crypto.com&apos;s native token CRO powers one of the largest crypto ecosystems globally — with real-world utility that most tokens simply don&apos;t have. Staking, Visa cards, exchange discounts, and a rapidly growing DeFi layer make CRO a strategic long-term hold.
            </p>

            {/* Feature list */}
            <div className="flex flex-col gap-3">
              {croFeatures.map((f, i) => (
                <motion.div
                  key={f.label}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-start gap-3 p-3.5 rounded-xl glass border border-white/5 hover:border-[#00AEEF]/20 transition-all group"
                >
                  <div className="w-9 h-9 rounded-lg bg-[#00AEEF]/10 flex items-center justify-center flex-shrink-0 group-hover:bg-[#00AEEF]/20 transition-colors">
                    <f.icon className="w-4 h-4 text-[#00AEEF]" />
                  </div>
                  <div>
                    <p className="font-semibold text-white text-sm">{f.label}</p>
                    <p className="text-muted text-xs mt-0.5">{f.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* CTA */}
            <motion.a
              href="https://wa.me/33662361149"
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              className="flex items-center gap-2 w-fit px-7 py-3.5 rounded-full font-semibold text-[#050816] bg-blue-gradient shadow-glow-blue hover:shadow-glow-blue-lg transition-all text-sm"
            >
              Learn CRO Strategy
              <ChevronRight className="w-4 h-4" />
            </motion.a>
          </motion.div>

          {/* RIGHT — Chart */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            <div className="absolute -inset-4 rounded-3xl bg-[#00AEEF] opacity-[0.04] blur-2xl pointer-events-none" />
            <div className="relative glass-blue rounded-2xl p-1 shadow-glow-blue">
              <TradingViewWidget />
            </div>
            <p className="text-center text-xs text-muted/50 mt-3">
              Chart powered by TradingView — CRO/USD Daily
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
