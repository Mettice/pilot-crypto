'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { MessageCircle, Crown, TrendingUp, Shield, Users } from 'lucide-react'

// ── Animated mini-chart SVG ──────────────────────────────────────────────────
function MiniChart({ color, data, animated }: { color: string; data: number[]; animated: boolean }) {
  const w = 120
  const h = 48
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const pts = data.map((v, i) => ({
    x: (i / (data.length - 1)) * w,
    y: h - ((v - min) / range) * (h - 8) - 4,
  }))
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const fill = `${path} L${w},${h} L0,${h} Z`
  const isUp = data[data.length - 1] > data[0]

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none">
      <defs>
        <linearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fill} fill={`url(#grad-${color})`} />
      <motion.path
        d={path}
        stroke={color}
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        initial={animated ? { pathLength: 0 } : { pathLength: 1 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.5, ease: 'easeOut', delay: 0.3 }}
      />
    </svg>
  )
}

// ── Crypto price card ────────────────────────────────────────────────────────
function CryptoCard({
  symbol, name, price, change, color, data, delay, image
}: {
  symbol: string; name: string; price: string; change: string;
  color: string; data: number[]; delay: number; image?: string;
}) {
  const isPos = !change.startsWith('-')
  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, delay, ease: 'easeOut' }}
      className="glass rounded-2xl p-4 flex-1 min-w-[140px]"
      style={{ border: `1px solid ${color}22` }}
    >
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-xs text-muted font-body">{name}</p>
          <p className="font-heading font-bold text-white text-sm">{symbol}</p>
        </div>
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt={name} className="w-8 h-8 rounded-full" />
        ) : (
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold font-heading"
            style={{ background: `${color}20`, color }}
          >
            {symbol[0]}
          </div>
        )}
      </div>
      <p className="font-heading font-bold text-white text-lg">{price}</p>
      <p className={`text-xs font-semibold mt-0.5 ${isPos ? 'text-emerald-400' : 'text-red-400'}`}>
        {isPos ? '▲' : '▼'} {change}
      </p>
      <div className="mt-2">
        <MiniChart color={color} data={data} animated={true} />
      </div>
    </motion.div>
  )
}

// ── Portfolio growth line ────────────────────────────────────────────────────
function PortfolioGrowth() {
  const data = [100, 108, 104, 115, 112, 128, 124, 140, 138, 158, 155, 175, 180, 200]
  const w = 280
  const h = 80
  const max = Math.max(...data)
  const min = Math.min(...data)
  const pts = data.map((v, i) => ({
    x: (i / (data.length - 1)) * w,
    y: h - ((v - min) / (max - min)) * (h - 10) - 5,
  }))
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const fill = `${path} L${w},${h} L0,${h} Z`

  return (
    <div className="glass rounded-2xl p-4 mt-3">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs text-muted font-body">Portfolio Growth</p>
          <p className="font-heading font-bold text-white">€24,500</p>
        </div>
        <span className="text-xs font-semibold text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-full">+100% YTD</span>
      </div>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none" className="w-full">
        <defs>
          <linearGradient id="port-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F5B400" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#F5B400" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={fill} fill="url(#port-grad)" />
        <motion.path
          d={path}
          stroke="#F5B400"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 2, ease: 'easeOut', delay: 0.8 }}
        />
        {pts.slice(-1).map((p, i) => (
          <motion.circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={4}
            fill="#F5B400"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 2.8 }}
          />
        ))}
      </svg>
    </div>
  )
}

// ── Particle canvas background ───────────────────────────────────────────────
function ParticleField() {
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

    const particles = Array.from({ length: 60 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.5 + 0.5,
      dx: (Math.random() - 0.5) * 0.3,
      dy: (Math.random() - 0.5) * 0.3,
      alpha: Math.random() * 0.5 + 0.1,
    }))

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      for (const p of particles) {
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(0, 174, 239, ${p.alpha})`
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

// ── Stats bar ────────────────────────────────────────────────────────────────
function StatsBadge({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <Icon className="w-4 h-4 text-[#00AEEF]" />
      <span className="text-muted">{label}</span>
      <span className="font-semibold text-white">{value}</span>
    </div>
  )
}

// ── Main Hero ────────────────────────────────────────────────────────────────
export default function HeroSection() {
  const btcData = [42100, 43500, 43000, 44800, 44200, 45600, 45100, 46200, 46800, 47500]
  const ethData = [2400, 2520, 2480, 2610, 2580, 2700, 2660, 2750, 2800, 2860]
  const croData = [0.085, 0.091, 0.089, 0.096, 0.094, 0.102, 0.098, 0.108, 0.106, 0.112]

  const [prices, setPrices] = useState({
    btc: { price: '---', change: '---', image: 'https://coin-images.coingecko.com/coins/images/1/large/bitcoin.png' },
    eth: { price: '---', change: '---', image: 'https://coin-images.coingecko.com/coins/images/279/large/ethereum.png' },
    cro: { price: '---', change: '---', image: 'https://coin-images.coingecko.com/coins/images/7310/large/cro_token_logo.png' }
  })

  useEffect(() => {
    const fetchPrices = () => {
      fetch('/api/prices')
        .then(res => res.json())
        .then((data: any) => {
          if (!Array.isArray(data)) return; // Handle rate limit response

          const formatPrice = (val?: number) => {
            if (!val) return '$0.00'
            return val < 1 ? `$${val.toPrecision(3)}` : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val)
          }
          const formatChange = (val?: number) => {
            if (!val) return '+0.0%'
            return `${val >= 0 ? '+' : ''}${val.toFixed(1)}%`
          }

          const btc = data.find((d: any) => d.id === 'bitcoin')
          const eth = data.find((d: any) => d.id === 'ethereum')
          const cro = data.find((d: any) => d.id === 'crypto-com-chain')

          if (btc && eth && cro) {
            setPrices(prev => ({
              btc: { price: formatPrice(btc.current_price), change: formatChange(btc.price_change_percentage_24h), image: btc.image || prev.btc.image },
              eth: { price: formatPrice(eth.current_price), change: formatChange(eth.price_change_percentage_24h), image: eth.image || prev.eth.image },
              cro: { price: formatPrice(cro.current_price), change: formatChange(cro.price_change_percentage_24h), image: cro.image || prev.cro.image }
            }))
          }
        })
        .catch(err => console.error('Failed to fetch CoinGecko prices:', err))
    };

    // Stagger fetch to avoid colliding with LiveTicker rate limits
    const timer = setTimeout(fetchPrices, 1500);
    const interval = setInterval(fetchPrices, 180000); // Fetch every 3 minutes

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [])

  return (
    <section
      id="hero"
      className="relative min-h-screen flex items-center overflow-hidden bg-bg bg-hero-mesh bg-grid-pattern"
    >
      <ParticleField />

      {/* Glow orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-[#00AEEF] opacity-[0.04] blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-[#F5B400] opacity-[0.03] blur-[100px] pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-16 md:pt-32 md:pb-20">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          {/* ── LEFT ─────────────────────────────────────── */}
          <div className="flex flex-col gap-6">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-[#00AEEF]/20 w-fit"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-semibold text-[#00AEEF] tracking-wide uppercase text-center sm:text-left">
                100+ Investors Guided Across Europe
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="font-heading font-bold text-[2.5rem] sm:text-5xl lg:text-[3.5rem] xl:text-[4rem] leading-[1.1] text-white"
            >
              Build Wealth With{' '}
              <span className="gradient-text">Crypto,</span>
              <br />
              The Smart Way
            </motion.h1>

            {/* Subtext */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-muted text-lg leading-relaxed max-w-lg"
            >
              Learn crypto with confidence. Get expert guidance, portfolio support, and real mentorship built for beginners and serious investors.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4"
            >
              <motion.a
                href="https://wa.me/33662361149"
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                className="flex items-center justify-center gap-2.5 px-7 py-4 rounded-full font-semibold text-white bg-gradient-to-r from-[#00AEEF] to-[#0090d4] shadow-glow-blue hover:shadow-glow-blue-lg animate-pulse-glow transition-all text-base"
              >
                <MessageCircle className="w-5 h-5" />
                Start on WhatsApp
              </motion.a>

              <motion.a
                href="#services"
                onClick={(e) => { e.preventDefault(); document.querySelector('#services')?.scrollIntoView({ behavior: 'smooth' }) }}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                className="flex items-center justify-center gap-2.5 px-7 py-4 rounded-full font-semibold text-[#050816] bg-gold-gradient shadow-glow-gold hover:shadow-[0_0_50px_rgba(245,180,0,0.5)] transition-all text-base"
              >
                <Crown className="w-5 h-5" />
                Join VIP Mentorship
              </motion.a>
            </motion.div>

            {/* Trust badges */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="flex flex-wrap gap-x-6 gap-y-2 pt-2"
            >
              <StatsBadge icon={Users} label="Members" value="100+" />
              <StatsBadge icon={Shield} label="Risk-Focused" value="Strategy" />
              <StatsBadge icon={TrendingUp} label="Avg Return" value="+68% YTD" />
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-xs text-muted/60 flex items-center gap-1.5"
            >
              <span className="w-3 h-3 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex-shrink-0" />
              Trusted by growing crypto learners across Europe — No spam, ever.
            </motion.p>
          </div>

          {/* ── RIGHT — Crypto Dashboard ─────────────────── */}
          <div className="relative flex flex-col gap-3 lg:pl-6 overflow-hidden sm:overflow-visible">
            {/* Glow ring */}
            <div className="absolute inset-0 rounded-3xl bg-[#00AEEF] opacity-[0.03] blur-3xl pointer-events-none" />

            {/* Price cards row */}
            <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0 scroll-smooth">
              <CryptoCard
                symbol="BTC" name="Bitcoin"
                price={prices.btc.price} change={prices.btc.change} image={prices.btc.image}
                color="#F7931A"
                data={btcData} delay={0.4}
              />
              <CryptoCard
                symbol="ETH" name="Ethereum"
                price={prices.eth.price} change={prices.eth.change} image={prices.eth.image}
                color="#627EEA"
                data={ethData} delay={0.5}
              />
              <CryptoCard
                symbol="CRO" name="Cronos"
                price={prices.cro.price} change={prices.cro.change} image={prices.cro.image}
                color="#00AEEF"
                data={croData} delay={0.6}
              />
            </div>

            {/* Portfolio growth */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
              className="animate-float-delay"
            >
              <PortfolioGrowth />
            </motion.div>

            {/* Live indicator */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
              className="flex items-center justify-end gap-2 pr-2"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-muted">Live market data</span>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1"
      >
        <span className="text-xs text-muted/50">Scroll to explore</span>
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="w-5 h-8 rounded-full border border-white/10 flex items-start justify-center pt-1.5"
        >
          <div className="w-1 h-2 rounded-full bg-[#00AEEF]/60" />
        </motion.div>
      </motion.div>
    </section>
  )
}
