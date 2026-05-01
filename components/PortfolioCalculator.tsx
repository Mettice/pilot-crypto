'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Calculator, TrendingUp, MessageCircle } from 'lucide-react'

type Risk = 'conservative' | 'balanced' | 'aggressive'

const riskRates: Record<Risk, { monthly: number; label: string; color: string }> = {
  conservative: { monthly: 0.025, label: 'Conservative (±2.5%/mo)', color: '#10b981' },
  balanced:     { monthly: 0.05,  label: 'Balanced (±5%/mo)',       color: '#00AEEF' },
  aggressive:   { monthly: 0.10,  label: 'Aggressive (±10%/mo)',    color: '#F5B400' },
}

function calcGrowth(monthly: number, months: number, rate: number) {
  const points: number[] = []
  let total = 0
  for (let m = 1; m <= months; m++) {
    total = total * (1 + rate) + monthly
    points.push(Math.round(total))
  }
  return points
}

function GrowthChart({ data, color }: { data: number[]; color: string }) {
  const w = 500
  const h = 200
  const max = Math.max(...data, 1)
  const pts = data.map((v, i) => ({
    x: (i / (data.length - 1)) * w,
    y: h - (v / max) * (h - 20) - 10,
  }))
  const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const fillD = `${pathD} L${w},${h} L0,${h} Z`

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: 180 }}>
      <defs>
        <linearGradient id="calc-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Grid lines */}
      {[0.25, 0.5, 0.75].map((r) => (
        <line
          key={r}
          x1={0} y1={h - r * h}
          x2={w} y2={h - r * h}
          stroke="rgba(255,255,255,0.04)"
          strokeWidth="1"
        />
      ))}

      <motion.path
        key={pathD}
        d={fillD}
        fill="url(#calc-fill)"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      />
      <motion.path
        key={`line-${pathD}`}
        d={pathD}
        stroke={color}
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />

      {/* End dot */}
      {pts.length > 0 && (
        <motion.circle
          cx={pts[pts.length - 1].x}
          cy={pts[pts.length - 1].y}
          r={5}
          fill={color}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.8 }}
        />
      )}
    </svg>
  )
}

function CountUp({ value, prefix = '€' }: { value: number; prefix?: string }) {
  return (
    <motion.span
      key={value}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="font-heading font-bold text-3xl text-white"
    >
      {prefix}{value.toLocaleString('en-EU')}
    </motion.span>
  )
}

export default function PortfolioCalculator() {
  const [monthly, setMonthly] = useState(500)
  const [months, setMonths] = useState(12)
  const [risk, setRisk] = useState<Risk>('balanced')

  const { data, totalInvested, projectedValue, profit } = useMemo(() => {
    const rate = riskRates[risk].monthly
    const d = calcGrowth(monthly, months, rate)
    const totalInvested = monthly * months
    const projectedValue = d[d.length - 1] ?? 0
    const profit = projectedValue - totalInvested
    return { data: d, totalInvested, projectedValue, profit }
  }, [monthly, months, risk])

  const { color, label } = riskRates[risk]

  return (
    <section id="calculator" className="section-pad relative overflow-hidden">
      <div className="absolute inset-0 bg-bg-secondary/20" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] rounded-full bg-[#00AEEF] opacity-[0.03] blur-[120px] pointer-events-none" />

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <span className="inline-block text-xs font-semibold tracking-widest uppercase text-[#00AEEF] mb-4">
            Growth Simulator
          </span>
          <h2 className="font-heading font-bold text-3xl sm:text-4xl lg:text-5xl text-white mb-5">
            See What Consistency{' '}
            <span className="gradient-text">Can Build</span>
          </h2>
          <p className="text-muted text-lg max-w-xl mx-auto">
            Adjust your parameters and watch your potential portfolio grow.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="glass rounded-3xl p-6 md:p-10"
        >
          <div className="grid md:grid-cols-2 gap-8">
            {/* Controls */}
            <div className="flex flex-col gap-7">
              {/* Monthly amount */}
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-semibold text-white">Monthly Investment</label>
                  <span className="text-sm font-bold text-[#00AEEF]">€{monthly.toLocaleString()}</span>
                </div>
                <input
                  type="range" min={50} max={5000} step={50}
                  value={monthly}
                  onChange={(e) => setMonthly(Number(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #00AEEF ${((monthly - 50) / 4950) * 100}%, rgba(255,255,255,0.1) ${((monthly - 50) / 4950) * 100}%)`,
                  }}
                />
                <div className="flex justify-between mt-1 text-xs text-muted/60">
                  <span>€50</span><span>€5,000</span>
                </div>
              </div>

              {/* Duration */}
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-semibold text-white">Duration</label>
                  <span className="text-sm font-bold text-[#00AEEF]">{months} months</span>
                </div>
                <input
                  type="range" min={3} max={60} step={1}
                  value={months}
                  onChange={(e) => setMonths(Number(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #00AEEF ${((months - 3) / 57) * 100}%, rgba(255,255,255,0.1) ${((months - 3) / 57) * 100}%)`,
                  }}
                />
                <div className="flex justify-between mt-1 text-xs text-muted/60">
                  <span>3 mo</span><span>60 mo</span>
                </div>
              </div>

              {/* Risk level */}
              <div>
                <label className="text-sm font-semibold text-white mb-3 block">Risk Level</label>
                <div className="flex flex-col gap-2">
                  {(Object.entries(riskRates) as [Risk, typeof riskRates[Risk]][]).map(([key, val]) => (
                    <button
                      key={key}
                      onClick={() => setRisk(key)}
                      className={`flex items-center gap-3 p-3 rounded-xl border text-sm font-medium transition-all ${
                        risk === key
                          ? 'bg-white/5 text-white'
                          : 'border-white/5 text-muted hover:border-white/10'
                      }`}
                      style={risk === key ? { borderColor: `${val.color}40` } : {}}
                    >
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ background: risk === key ? val.color : 'rgba(255,255,255,0.15)' }}
                      />
                      {val.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Results */}
              <div className="grid grid-cols-1 xs:grid-cols-3 gap-3">
                {[
                  { label: 'Invested', value: totalInvested },
                  { label: 'Projected', value: projectedValue },
                  { label: 'Profit', value: profit },
                ].map((item) => (
                  <div key={item.label} className="glass rounded-xl p-3 text-center">
                    <p className="text-xs text-muted mb-1">{item.label}</p>
                    <CountUp value={item.value} />
                  </div>
                ))}
              </div>
            </div>

            {/* Chart + CTA */}
            <div className="flex flex-col gap-5">
              <div className="flex-1 glass rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-white">Growth Projection</span>
                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ color, background: `${color}15` }}>
                    {label.split('(')[0].trim()}
                  </span>
                </div>
                <GrowthChart data={data} color={color} />
                <p className="text-xs text-muted/50 mt-2 text-center">
                  * Simulated returns — not financial advice
                </p>
              </div>

              <motion.a
                href="https://wa.me/33662361149"
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="flex items-center justify-center gap-2.5 py-4 rounded-xl bg-blue-gradient font-semibold text-white shadow-glow-blue hover:shadow-glow-blue-lg transition-all"
              >
                <MessageCircle className="w-5 h-5" />
                Get Personal Plan on WhatsApp
              </motion.a>

              <p className="text-center text-xs text-muted/50">
                We&apos;ll build a custom strategy matched to your goals and risk tolerance.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
