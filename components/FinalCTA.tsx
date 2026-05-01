'use client'

import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { MessageCircle, Crown, ArrowRight } from 'lucide-react'

function ParticlesBg() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    let animId: number

    const resize = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const particles = Array.from({ length: 80 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 2 + 0.5,
      dx: (Math.random() - 0.5) * 0.4,
      dy: (Math.random() - 0.5) * 0.4,
      alpha: Math.random() * 0.4 + 0.1,
      gold: Math.random() > 0.7,
    }))

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      for (const p of particles) {
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = p.gold
          ? `rgba(245,180,0,${p.alpha})`
          : `rgba(0,174,239,${p.alpha})`
        ctx.fill()
        p.x += p.dx
        p.y += p.dy
        if (p.x < 0 || p.x > canvas.width) p.dx *= -1
        if (p.y < 0 || p.y > canvas.height) p.dy *= -1
      }
      animId = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
}

export default function FinalCTA() {
  return (
    <section id="contact" className="relative overflow-hidden py-24 md:py-32">
      {/* Background */}
      <div className="absolute inset-0 bg-bg-secondary/40" />
      <div className="absolute inset-0" style={{
        background: 'radial-gradient(ellipse at 50% 50%, rgba(0,174,239,0.06) 0%, transparent 70%)',
      }} />
      <ParticlesBg />

      {/* Grid lines */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0,174,239,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,174,239,0.03) 1px, transparent 1px)
          `,
          backgroundSize: '80px 80px',
        }}
      />

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center gap-8">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="inline-flex items-center gap-2 px-5 py-2 rounded-full glass border border-[#F5B400]/25"
        >
          <span className="w-2 h-2 rounded-full bg-[#F5B400] animate-pulse" />
          <span className="text-xs font-semibold text-[#F5B400] tracking-wide uppercase">
            Limited VIP Spots — 3 Remaining
          </span>
        </motion.div>

        {/* Headline */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
        >
          <h2 className="font-heading font-bold text-4xl sm:text-5xl lg:text-6xl text-white leading-[1.1] mb-5">
            Start Your Crypto{' '}
            <br className="hidden sm:block" />
            <span className="gradient-text">Journey Today</span>
          </h2>
          <p className="text-muted text-lg max-w-xl mx-auto">
            Join over 100 investors across Europe who are building wealth with crypto the smart way — with real mentorship and a clear strategy.
          </p>
        </motion.div>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="flex flex-col sm:flex-row gap-4 w-full max-w-sm sm:max-w-none justify-center"
        >
          <motion.a
            href="https://wa.me/33662361149"
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center justify-center gap-2.5 px-8 py-4 rounded-full bg-blue-gradient font-bold text-white text-base shadow-glow-blue hover:shadow-glow-blue-lg animate-pulse-glow transition-all"
          >
            <MessageCircle className="w-5 h-5" />
            WhatsApp Now — Get Started
          </motion.a>

          <motion.a
            href="#services"
            onClick={(e) => { e.preventDefault(); document.querySelector('#services')?.scrollIntoView({ behavior: 'smooth' }) }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center justify-center gap-2.5 px-8 py-4 rounded-full bg-gold-gradient font-bold text-[#050816] text-base shadow-glow-gold hover:shadow-[0_0_50px_rgba(245,180,0,0.5)] transition-all"
          >
            <Crown className="w-5 h-5" />
            Join VIP Program
          </motion.a>
        </motion.div>

        {/* Trust bullets */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="flex flex-wrap justify-center gap-x-8 gap-y-2 text-xs text-muted/60"
        >
          {['✓ No spam', '✓ Cancel any time', '✓ Real human support', '✓ Secure & private'].map((t) => (
            <span key={t}>{t}</span>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
