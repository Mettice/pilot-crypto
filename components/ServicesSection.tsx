'use client'

import { motion } from 'framer-motion'
import { Check, MessageCircle, Crown, Rocket, Star } from 'lucide-react'

const plans = [
  {
    id: 'starter',
    name: 'Starter',
    price: '€9.99',
    priceSub: '/month',
    sub: 'Perfect to begin',
    icon: Rocket,
    color: '#00AEEF',
    borderColor: 'rgba(0,174,239,0.2)',
    glowColor: 'rgba(0,174,239,0.06)',
    cta: 'Start Now',
    ctaStyle: 'border border-[#00AEEF]/40 text-[#00AEEF] hover:bg-[#00AEEF]/10',
    features: [
      'Wallet setup walkthrough',
      'Exchange guidance',
      'Beginner roadmap PDF',
      'Basic market vocabulary',
      'Community access (read-only)',
      'Weekly newsletter',
    ],
  },
  {
    id: 'community',
    name: 'Community',
    price: '€29',
    priceSub: '/month',
    sub: 'For active learners',
    icon: Star,
    color: '#F5B400',
    borderColor: 'rgba(245,180,0,0.3)',
    glowColor: 'rgba(245,180,0,0.08)',
    featured: false,
    cta: 'Join Community',
    ctaStyle: 'border border-[#F5B400]/40 text-[#F5B400] hover:bg-[#F5B400]/10',
    features: [
      'Everything in Starter',
      'Private member community',
      'Weekly market analysis calls',
      'Trade idea discussions',
      'CRO strategy deep-dives',
      'Q&A with mentors',
    ],
  },
  {
    id: 'vip',
    name: 'VIP Elite',
    price: '€149',
    priceSub: '/month',
    sub: 'Maximum support',
    icon: Crown,
    color: '#F5B400',
    borderColor: 'rgba(245,180,0,0.5)',
    glowColor: 'rgba(245,180,0,0.12)',
    featured: true,
    cta: 'Apply for VIP',
    ctaStyle: 'bg-gold-gradient text-[#050816] font-bold hover:shadow-glow-gold',
    features: [
      'Everything in Community',
      '1-to-1 mentorship sessions',
      'Personal portfolio planning',
      'Direct WhatsApp access',
      'Priority response (≤4h)',
      'Entry & exit alerts',
      'Monthly strategy review',
      'Limited spots available',
    ],
  },
]

export default function ServicesSection() {
  return (
    <section id="services" className="section-pad relative overflow-hidden">
      {/* Background */}
      <div className="absolute top-1/2 right-0 -translate-y-1/2 w-80 h-80 rounded-full bg-[#F5B400] opacity-[0.03] blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block text-xs font-semibold tracking-widest uppercase text-[#F5B400] mb-4">
            Pricing Plans
          </span>
          <h2 className="font-heading font-bold text-3xl sm:text-4xl lg:text-5xl text-white mb-5">
            Choose Your{' '}
            <span className="gradient-text-gold">Growth Path</span>
          </h2>
          <p className="text-muted text-lg max-w-xl mx-auto">
            Start your journey, grow with community, or accelerate with elite 1-to-1 mentorship.
          </p>
        </motion.div>

        {/* Cards */}
        <div className="grid md:grid-cols-3 gap-6 items-start">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.12 }}
              whileHover={{ y: plan.featured ? -4 : -6 }}
              className={`relative rounded-2xl flex flex-col ${
                plan.featured
                  ? 'md:-mt-4 md:mb-0 shadow-glow-gold'
                  : ''
              }`}
              style={{
                background: plan.featured
                  ? 'linear-gradient(135deg, #0d1626 0%, #111a2e 100%)'
                  : 'rgba(13,22,38,0.6)',
                border: `1px solid ${plan.borderColor}`,
                boxShadow: plan.featured ? `0 0 60px ${plan.glowColor}` : undefined,
              }}
            >
              {/* Most popular badge */}
              {plan.featured && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-5 py-1.5 rounded-full bg-gold-gradient text-[#050816] text-xs font-bold tracking-wide shadow-glow-gold">
                  ⭐ Most Popular
                </div>
              )}

              {/* Glow overlay */}
              <div
                className="absolute inset-0 rounded-2xl pointer-events-none"
                style={{ background: `radial-gradient(ellipse at 50% 0%, ${plan.glowColor} 0%, transparent 70%)` }}
              />

              <div className="relative p-7 flex flex-col flex-1">
                {/* Plan header */}
                <div className="flex items-center gap-3 mb-6">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center"
                    style={{ background: `${plan.color}15`, border: `1px solid ${plan.color}25` }}
                  >
                    <plan.icon className="w-5 h-5" style={{ color: plan.color }} />
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-white text-lg">{plan.name}</h3>
                    <p className="text-muted text-xs">{plan.sub}</p>
                  </div>
                </div>

                {/* Price */}
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="font-heading font-bold text-4xl text-white">{plan.price}</span>
                  {plan.priceSub && <span className="text-muted text-sm">{plan.priceSub}</span>}
                </div>

                {/* Features */}
                <ul className="flex flex-col gap-2.5 mb-8 flex-1">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2.5 text-sm">
                      <Check
                        className="w-4 h-4 flex-shrink-0 mt-0.5"
                        style={{ color: plan.color }}
                      />
                      <span className={feat === 'Limited spots available' ? 'text-[#F5B400] font-semibold' : 'text-muted'}>
                        {feat}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <motion.a
                  href={plan.id === 'vip' ? '#contact' : 'https://wa.me/33662361149'}
                  target={plan.id !== 'vip' ? '_blank' : undefined}
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className={`flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-semibold text-sm transition-all ${plan.ctaStyle}`}
                >
                  {plan.id === 'vip' && <Crown className="w-4 h-4" />}
                  {plan.id !== 'vip' && <MessageCircle className="w-5 h-5" />}
                  {plan.id !== 'vip' ? 'Start on WhatsApp' : plan.cta}
                </motion.a>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Urgency */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
          className="text-center text-muted text-sm mt-10 flex items-center justify-center gap-2"
        >
          <span className="w-2 h-2 rounded-full bg-[#F5B400] animate-pulse" />
          VIP mentorship slots are limited — currently{' '}
          <span className="text-[#F5B400] font-semibold">3 spots remaining</span>
        </motion.p>
      </div>
    </section>
  )
}
