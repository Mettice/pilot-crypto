'use client'

import { motion } from 'framer-motion'
import { Play, Sparkles, CheckCircle2, TrendingUp, ShieldCheck, Zap } from 'lucide-react'

const keyTakeaways = [
  {
    icon: TrendingUp,
    title: 'Why Crypto Is Booming Now',
    desc: 'Discover the macro trends driving modern cryptocurrency adoption and why timing is everything for savvy investors.',
    color: '#00AEEF',
  },
  {
    icon: ShieldCheck,
    title: 'Smart & Secure Positioning',
    desc: 'Learn how to approach the crypto market with disciplined risk management rather than impulsive speculation.',
    color: '#10b981',
  },
  {
    icon: Zap,
    title: 'The Pilot Crypto Edge',
    desc: 'See how personal mentorship, expert guidance, and community insights accelerate your journey from beginner to pro.',
    color: '#F5B400',
  },
]

export default function CryptoVideoSection() {
  return (
    <section id="watch-learn" className="section-pad relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-gradient-to-tr from-[#00AEEF]/10 via-purple-600/5 to-[#F5B400]/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-24 bg-gradient-to-b from-transparent via-[#00AEEF]/30 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12 sm:mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-blue mb-4 shadow-[0_0_20px_rgba(0,174,239,0.15)]">
            <Sparkles className="w-4 h-4 text-[#00AEEF] animate-pulse" />
            <span className="text-xs font-semibold text-[#00AEEF] tracking-widest uppercase">
              Watch & Learn
            </span>
          </div>
          <h2 className="font-heading font-bold text-3xl sm:text-4xl lg:text-5xl text-white mb-4">
            Master the Market with <span className="gradient-text-blue">Pilot Crypto</span>
          </h2>
          <p className="text-muted text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            Take a few minutes to dive deep into our philosophy, modern crypto opportunities, and how proper mentorship transforms your financial future.
          </p>
        </motion.div>

        {/* Content Grid (Video Player + Insights) */}
        <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Video Player Container (7 cols on Desktop) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, x: -30 }}
            whileInView={{ opacity: 1, scale: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className="lg:col-span-7 relative group"
          >
            {/* Glowing backdrop under player */}
            <div className="absolute -inset-1 rounded-[30px] bg-gradient-to-r from-[#00AEEF]/30 via-purple-500/20 to-[#F5B400]/30 blur-xl opacity-70 group-hover:opacity-100 transition duration-700 pointer-events-none" />
            
            {/* Glass frame */}
            <div className="relative glass-blue rounded-3xl p-2 sm:p-3 shadow-2xl border border-white/10 group-hover:border-[#00AEEF]/40 transition-all duration-500 bg-[#080d1a]/90">
              <div className="relative rounded-2xl overflow-hidden aspect-video bg-[#050812] flex items-center justify-center border border-white/5">
                <video
                  src="/video_2026-07-27_10-53-36.mp4"
                  controls
                  preload="metadata"
                  playsInline
                  className="w-full h-full object-cover rounded-xl shadow-inner focus:outline-none"
                >
                  Your browser does not support the video tag.
                </video>
              </div>

              {/* Subtle player badge below video inside frame */}
              <div className="px-4 py-2 sm:py-3 flex items-center justify-between text-xs text-muted sm:text-sm border-t border-white/5 mt-1">
                <span className="flex items-center gap-2 text-white font-heading font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  Featured Crypto Commentary
                </span>
                <span className="text-xs text-[#00AEEF] font-mono">2026 Strategy Overview</span>
              </div>
            </div>
          </motion.div>

          {/* Right Column: Key Takeaways (5 cols on Desktop) */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.15 } },
            }}
            className="lg:col-span-5 flex flex-col gap-4 sm:gap-5"
          >
            <div className="mb-2">
              <h3 className="font-heading font-semibold text-xl sm:text-2xl text-white">
                What You&apos;ll Discover
              </h3>
              <p className="text-muted text-sm mt-1">
                Key insights designed to elevate your crypto strategy today.
              </p>
            </div>

            {keyTakeaways.map((item, index) => {
              const Icon = item.icon
              return (
                <motion.div
                  key={item.title}
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
                  }}
                  whileHover={{ x: 6, transition: { duration: 0.2 } }}
                  className="glass rounded-2xl p-5 border border-white/5 hover:border-white/15 transition-all duration-300 relative overflow-hidden group"
                >
                  <div
                    className="absolute left-0 top-0 bottom-0 w-1 opacity-80 group-hover:opacity-100 transition-opacity duration-300"
                    style={{ backgroundColor: item.color }}
                  />
                  <div className="flex items-start gap-4">
                    <div
                      className="w-11 h-11 rounded-xl shrink-0 flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
                      style={{ background: `${item.color}15`, border: `1px solid ${item.color}30` }}
                    >
                      <Icon className="w-5 h-5" style={{ color: item.color }} />
                    </div>
                    <div>
                      <h4 className="font-heading font-semibold text-white text-base sm:text-lg group-hover:text-[#00AEEF] transition-colors duration-200">
                        {item.title}
                      </h4>
                      <p className="text-muted text-xs sm:text-sm leading-relaxed mt-1">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </motion.div>
        </div>
      </div>
    </section>
  )
}
