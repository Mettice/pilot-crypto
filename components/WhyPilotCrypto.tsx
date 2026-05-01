'use client'

import { motion } from 'framer-motion'
import { GraduationCap, Users, Shield, Bell, Target, Coins } from 'lucide-react'

const features = [
  {
    icon: GraduationCap,
    title: 'Beginner Friendly',
    desc: 'No experience needed. We guide you step by step from wallet setup to your first investment.',
    color: '#00AEEF',
    glow: 'rgba(0,174,239,0.15)',
  },
  {
    icon: Users,
    title: 'Real Human Mentorship',
    desc: 'Talk with real experts, not bots. Get answers when you need them most.',
    color: '#F5B400',
    glow: 'rgba(245,180,0,0.12)',
  },
  {
    icon: Shield,
    title: 'Risk-Focused Strategy',
    desc: 'Build smarter portfolios with proper risk management principles from day one.',
    color: '#a855f7',
    glow: 'rgba(168,85,247,0.12)',
  },
  {
    icon: Bell,
    title: 'Weekly Market Updates',
    desc: 'Stay ahead with curated weekly updates, opportunities, and trend analysis.',
    color: '#10b981',
    glow: 'rgba(16,185,129,0.12)',
  },
  {
    icon: Target,
    title: 'Private Community',
    desc: 'Join an exclusive circle of investors learning, growing, and sharing insights together.',
    color: '#f97316',
    glow: 'rgba(249,115,22,0.12)',
  },
  {
    icon: Coins,
    title: 'CRO Opportunities',
    desc: 'Unlock the full Crypto.com ecosystem — staking, Visa cards, and exchange utility explained.',
    color: '#00AEEF',
    glow: 'rgba(0,174,239,0.15)',
  },
]

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
}

const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
}

export default function WhyPilotCrypto() {
  return (
    <section id="why" className="section-pad relative overflow-hidden">
      {/* Background accent */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-24 bg-gradient-to-b from-[#00AEEF]/20 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block text-xs font-semibold tracking-widest uppercase text-[#00AEEF] mb-4">
            Why Choose Us
          </span>
          <h2 className="font-heading font-bold text-3xl sm:text-4xl lg:text-5xl text-white mb-5">
            Why Trust{' '}
            <span className="gradient-text-blue">Pilot Crypto</span>
          </h2>
          <p className="text-muted text-lg max-w-2xl mx-auto">
            We built Pilot Crypto on one principle — your financial growth should never be left to chance or confusion.
          </p>
        </motion.div>

        {/* Cards grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          {features.map((f) => (
            <motion.div
              key={f.title}
              variants={cardVariants}
              whileHover={{ y: -8, transition: { duration: 0.25 } }}
              className="group glass rounded-2xl p-6 cursor-default relative overflow-hidden"
              style={{ borderColor: `${f.color}18` }}
            >
              {/* Hover glow */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"
                style={{ background: `radial-gradient(ellipse at 50% 0%, ${f.glow}, transparent 70%)` }}
              />

              <div
                className="relative w-12 h-12 rounded-xl flex items-center justify-center mb-5 transition-all duration-300 group-hover:scale-110"
                style={{ background: `${f.color}15`, border: `1px solid ${f.color}25` }}
              >
                <f.icon className="w-6 h-6" style={{ color: f.color }} />
              </div>

              <h3 className="relative font-heading font-semibold text-white text-lg mb-2">{f.title}</h3>
              <p className="relative text-muted text-sm leading-relaxed">{f.desc}</p>

              {/* Bottom border accent */}
              <div
                className="absolute bottom-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ background: `linear-gradient(90deg, transparent, ${f.color}40, transparent)` }}
              />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
