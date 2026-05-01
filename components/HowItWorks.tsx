'use client'

import { motion } from 'framer-motion'
import { BookOpen, BarChart2, Users, ArrowRight } from 'lucide-react'

const steps = [
  {
    number: '01',
    icon: BookOpen,
    title: 'Learn the Basics',
    desc: 'Start with our structured beginner roadmap. Understand wallets, exchanges, how assets work, and how to stay safe — at your own pace.',
    color: '#00AEEF',
  },
  {
    number: '02',
    icon: BarChart2,
    title: 'Build Your Strategy',
    desc: 'Work with your mentor to define your goals, risk tolerance, and portfolio plan. No generic advice — this is tailored to you.',
    color: '#F5B400',
  },
  {
    number: '03',
    icon: Users,
    title: 'Grow With Support',
    desc: 'Execute with confidence inside a community of real investors. Get weekly updates, live Q&As, and direct mentor access when it matters.',
    color: '#a855f7',
  },
]

export default function HowItWorks() {
  return (
    <section id="how" className="section-pad relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="inline-block text-xs font-semibold tracking-widest uppercase text-[#F5B400] mb-4">
            How It Works
          </span>
          <h2 className="font-heading font-bold text-3xl sm:text-4xl lg:text-5xl text-white mb-5">
            Your Journey,{' '}
            <span className="gradient-text-gold">Three Clear Steps</span>
          </h2>
          <p className="text-muted text-lg max-w-xl mx-auto">
            No overwhelm. No confusion. Just a clear path from beginner to confident investor.
          </p>
        </motion.div>

        {/* Steps */}
        <div className="relative">
          {/* Connector line (desktop) */}
          <div className="hidden lg:block absolute top-16 left-[calc(16.67%+2rem)] right-[calc(16.67%+2rem)] h-px bg-gradient-to-r from-[#00AEEF]/20 via-[#F5B400]/20 to-[#a855f7]/20" />

          <div className="grid md:grid-cols-3 gap-8 relative">
            {steps.map((step, i) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="flex flex-col items-center text-center gap-5"
              >
                {/* Icon circle */}
                <div className="relative">
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center relative z-10 transition-all duration-300 group-hover:scale-110"
                    style={{
                      background: `linear-gradient(135deg, ${step.color}20, ${step.color}10)`,
                      border: `1.5px solid ${step.color}30`,
                      boxShadow: `0 0 30px ${step.color}15`,
                    }}
                  >
                    <step.icon className="w-7 h-7" style={{ color: step.color }} />
                  </div>
                  {/* Number badge */}
                  <div
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center"
                    style={{ background: step.color, color: '#050816' }}
                  >
                    {i + 1}
                  </div>
                </div>

                {/* Arrow (mobile) */}
                {i < steps.length - 1 && (
                  <ArrowRight
                    className="hidden md:hidden text-white/10 rotate-90"
                    style={{ color: step.color + '40' }}
                  />
                )}

                <div>
                  <p className="text-xs font-semibold tracking-widest mb-2" style={{ color: step.color }}>
                    STEP {step.number}
                  </p>
                  <h3 className="font-heading font-bold text-white text-xl mb-3">{step.title}</h3>
                  <p className="text-muted text-sm leading-relaxed max-w-xs mx-auto">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
          className="text-center mt-14"
        >
          <a
            href="https://wa.me/message/YOUR_WHATSAPP"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-blue-gradient font-semibold text-white shadow-glow-blue hover:shadow-glow-blue-lg transition-all text-sm"
          >
            Start Your Journey Today
            <ArrowRight className="w-4 h-4" />
          </a>
        </motion.div>
      </div>
    </section>
  )
}
