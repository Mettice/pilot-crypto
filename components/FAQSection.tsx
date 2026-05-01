'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Minus } from 'lucide-react'

const faqs = [
  {
    q: 'Is this suitable for complete beginners?',
    a: "Absolutely. Pilot Crypto was built with beginners in mind. You don't need any prior knowledge of crypto, finance, or technology. We start from the very basics — what a wallet is, how to buy your first coin, and how to stay safe. Our structured roadmap walks you through everything step by step.",
  },
  {
    q: 'How much money do I need to start?',
    a: "You can start with as little as €50. Crypto is highly divisible, meaning you don't need to buy a full Bitcoin or Ethereum. We actually recommend starting small while you learn, and gradually increasing your position as your confidence and knowledge grow.",
  },
  {
    q: 'Is crypto investing risky?',
    a: 'Yes — all investing carries risk, and crypto can be volatile. That\'s exactly why we focus so heavily on risk management from day one. We teach you how to size positions correctly, diversify intelligently, and never invest more than you can afford to lose. Our philosophy is "protect first, grow second."',
  },
  {
    q: 'Why is CRO worth considering?',
    a: "CRO is the native token of Crypto.com, one of the world's largest crypto platforms with 80M+ users. Holding CRO unlocks real benefits: Visa cards with cashback up to 8%, staking rewards, exchange fee discounts, and access to the growing Crypto.com DeFi ecosystem. It's a utility token with genuine real-world use cases.",
  },
  {
    q: 'How does the VIP mentorship work?',
    a: 'VIP mentorship gives you direct 1-to-1 access to your assigned mentor via WhatsApp. You get personalised portfolio planning, entry/exit guidance, weekly strategy reviews, and priority responses within 4 hours. Spots are limited to maintain quality — we currently have 3 spots available.',
  },
  {
    q: 'Can I join if I live outside the UK or France?',
    a: "Yes! We work with investors from across Europe and beyond — France, Belgium, Spain, Netherlands, Germany, Italy, Portugal, and more. Everything is done remotely via WhatsApp and our private community platform. Time zones have never been an issue.",
  },
  {
    q: 'What if I want to cancel my subscription?',
    a: "No contracts, no lock-ins. You can cancel any plan at any time with a simple message. We believe our value should keep you here — not a contract. Your access continues until the end of your billing period.",
  },
]

export default function FAQSection() {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <section id="faq" className="section-pad relative overflow-hidden">
      <div className="absolute inset-0 bg-bg-secondary/15" />

      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <span className="inline-block text-xs font-semibold tracking-widest uppercase text-[#00AEEF] mb-4">
            FAQ
          </span>
          <h2 className="font-heading font-bold text-3xl sm:text-4xl lg:text-5xl text-white mb-5">
            Common{' '}
            <span className="gradient-text-blue">Questions</span>
          </h2>
          <p className="text-muted text-lg">
            Everything you need to know before getting started.
          </p>
        </motion.div>

        {/* Accordion */}
        <div className="flex flex-col gap-3">
          {faqs.map((faq, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07 }}
              className={`glass rounded-2xl overflow-hidden transition-all duration-300 ${
                open === i ? 'border-[#00AEEF]/25 shadow-[0_0_20px_rgba(0,174,239,0.08)]' : 'border-white/5'
              }`}
            >
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between gap-4 p-5 text-left"
              >
                <span className={`font-semibold text-sm md:text-base transition-colors ${open === i ? 'text-white' : 'text-muted'}`}>
                  {faq.q}
                </span>
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                    open === i ? 'bg-[#00AEEF] rotate-0' : 'bg-white/5 rotate-0'
                  }`}
                >
                  {open === i
                    ? <Minus className="w-4 h-4 text-white" />
                    : <Plus className="w-4 h-4 text-muted" />
                  }
                </div>
              </button>

              <AnimatePresence>
                {open === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <p className="text-muted text-sm leading-relaxed px-5 pb-5">
                      {faq.a}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>

        {/* Still have questions */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
          className="text-center mt-10"
        >
          <p className="text-muted text-sm mb-4">Still have questions?</p>
          <a
            href="https://wa.me/message/YOUR_WHATSAPP"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-[#00AEEF]/30 text-[#00AEEF] text-sm font-semibold hover:bg-[#00AEEF]/10 transition-all"
          >
            Ask us on WhatsApp
          </a>
        </motion.div>
      </div>
    </section>
  )
}
