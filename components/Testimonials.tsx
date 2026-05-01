'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Quote, Star } from 'lucide-react'

const testimonials = [
  {
    name: 'James M.',
    location: 'Paris, France',
    role: 'Freelance Designer',
    avatar: 'JM',
    stars: 5,
    text: "Before Pilot Crypto I had no idea where to start. Within two weeks I had my wallet set up, bought my first BTC, and actually understood what I was doing. The mentorship completely changed my approach to building wealth.",
    highlight: 'First investment in 2 weeks',
    color: '#00AEEF',
  },
  {
    name: 'Sarah K.',
    location: 'London, UK',
    role: 'Marketing Manager',
    avatar: 'SK',
    stars: 5,
    text: "The CRO strategy alone was worth every penny. I had CRO sitting in my wallet doing nothing. Now it's staked, I have a Visa card, and I'm earning cashback while my portfolio grows. Genuinely life-changing guidance.",
    highlight: 'CRO staking & Visa card rewards',
    color: '#F5B400',
  },
  {
    name: 'Daniel V.',
    location: 'Brussels, Belgium',
    role: 'Software Engineer',
    avatar: 'DV',
    stars: 5,
    text: "I was skeptical of crypto mentorship but the VIP program is different. Direct WhatsApp access means I get real answers fast. My portfolio is up 68% in 8 months following the risk-focused strategy. Worth every euro.",
    highlight: '+68% portfolio in 8 months',
    color: '#a855f7',
  },
  {
    name: 'Maria S.',
    location: 'Madrid, Spain',
    role: 'Teacher',
    avatar: 'MS',
    stars: 5,
    text: "As a complete beginner I was scared of making costly mistakes. The step-by-step guidance, the private community, and the weekly updates gave me the confidence to actually invest. I wish I found this a year earlier.",
    highlight: 'From beginner to confident investor',
    color: '#10b981',
  },
  {
    name: 'Lucas P.',
    location: 'Amsterdam, Netherlands',
    role: 'Entrepreneur',
    avatar: 'LP',
    stars: 5,
    text: "The weekly market calls are exceptional. I&apos;ve been in crypto for years but the structured approach here is something else. The community is full of serious people, no noise, just real strategy.",
    highlight: 'High-quality weekly market calls',
    color: '#f97316',
  },
]

export default function Testimonials() {
  const [current, setCurrent] = useState(0)
  const total = testimonials.length

  const prev = () => setCurrent((c) => (c - 1 + total) % total)
  const next = () => setCurrent((c) => (c + 1) % total)

  const visible = [
    testimonials[(current - 1 + total) % total],
    testimonials[current],
    testimonials[(current + 1) % total],
  ]

  return (
    <section id="testimonials" className="section-pad relative overflow-hidden">
      <div className="absolute inset-0 bg-bg-secondary/20" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="inline-block text-xs font-semibold tracking-widest uppercase text-[#00AEEF] mb-4">
            Social Proof
          </span>
          <h2 className="font-heading font-bold text-3xl sm:text-4xl lg:text-5xl text-white mb-5">
            Real People,{' '}
            <span className="gradient-text">Real Results</span>
          </h2>
          <p className="text-muted text-lg max-w-xl mx-auto">
            Over 100 investors guided. Here&apos;s what they say.
          </p>
        </motion.div>

        {/* Carousel */}
        <div className="relative">
          {/* Desktop: 3 cards */}
          <div className="hidden md:grid md:grid-cols-3 gap-5">
            {visible.map((t, i) => {
              const isCenter = i === 1
              return (
                <motion.div
                  key={t.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className={`glass rounded-2xl p-6 flex flex-col gap-4 transition-all duration-300 ${
                    isCenter
                      ? 'border-[#00AEEF]/25 shadow-glow-blue scale-[1.02]'
                      : 'border-white/5 opacity-70'
                  }`}
                >
                  <Quote className="w-8 h-8 opacity-20" style={{ color: t.color }} />

                  <p className="text-muted text-sm leading-relaxed flex-1">&ldquo;{t.text}&rdquo;</p>

                  {/* Highlight badge */}
                  <div
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full w-fit"
                    style={{ background: `${t.color}15`, color: t.color }}
                  >
                    <Star className="w-3 h-3" fill="currentColor" />
                    {t.highlight}
                  </div>

                  {/* Author */}
                  <div className="flex items-center gap-3 pt-2 border-t border-white/5">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white"
                      style={{ background: `linear-gradient(135deg, ${t.color}40, ${t.color}20)`, border: `1px solid ${t.color}30` }}
                    >
                      {t.avatar}
                    </div>
                    <div>
                      <p className="text-white text-sm font-semibold">{t.name}</p>
                      <p className="text-muted text-xs">{t.role} · {t.location}</p>
                    </div>
                    <div className="ml-auto flex gap-0.5">
                      {Array.from({ length: t.stars }).map((_, j) => (
                        <Star key={j} className="w-3 h-3 text-[#F5B400]" fill="#F5B400" />
                      ))}
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>

          {/* Mobile: single card */}
          <div className="md:hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={current}
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.3 }}
                className="glass rounded-2xl p-6 flex flex-col gap-4 border-[#00AEEF]/20"
              >
                <Quote className="w-8 h-8 opacity-20 text-[#00AEEF]" />
                <p className="text-muted text-sm leading-relaxed">&ldquo;{testimonials[current].text}&rdquo;</p>
                <div
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full w-fit"
                  style={{ background: `${testimonials[current].color}15`, color: testimonials[current].color }}
                >
                  <Star className="w-3 h-3" fill="currentColor" />
                  {testimonials[current].highlight}
                </div>
                <div className="flex items-center gap-3 pt-2 border-t border-white/5">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white"
                    style={{ background: `${testimonials[current].color}30` }}
                  >
                    {testimonials[current].avatar}
                  </div>
                  <div>
                    <p className="text-white text-sm font-semibold">{testimonials[current].name}</p>
                    <p className="text-muted text-xs">{testimonials[current].role} · {testimonials[current].location}</p>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Nav buttons */}
          <div className="flex items-center justify-center gap-4 mt-8">
            <button
              onClick={prev}
              className="w-10 h-10 rounded-full glass border border-white/10 flex items-center justify-center text-muted hover:text-white hover:border-[#00AEEF]/40 transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex gap-2">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className={`rounded-full transition-all duration-300 ${
                    i === current ? 'w-6 h-2 bg-[#00AEEF]' : 'w-2 h-2 bg-white/20 hover:bg-white/40'
                  }`}
                />
              ))}
            </div>

            <button
              onClick={next}
              className="w-10 h-10 rounded-full glass border border-white/10 flex items-center justify-center text-muted hover:text-white hover:border-[#00AEEF]/40 transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-3 gap-4 mt-12 max-w-lg mx-auto"
        >
          {[
            { value: '100+', label: 'Investors Guided' },
            { value: '4.9★', label: 'Average Rating' },
            { value: '8+', label: 'Countries' },
          ].map((stat) => (
            <div key={stat.label} className="text-center glass rounded-2xl py-4 px-3">
              <p className="font-heading font-bold text-2xl gradient-text-blue">{stat.value}</p>
              <p className="text-xs text-muted mt-1">{stat.label}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
