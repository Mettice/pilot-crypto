'use client'

import { useEffect, useState } from 'react'

// Ticking clock: local time large, UTC below (markets and the bot run on UTC)
export default function HudClock() {
  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => {
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  if (!now) return <div className="w-[120px]" />
  const two = (n: number) => String(n).padStart(2, '0')
  return (
    <div className="font-hud text-right leading-tight">
      <p className="text-lg text-[#9fdcf5] hud-glow-text tabular-nums">
        {two(now.getHours())}:{two(now.getMinutes())}
        <span className="text-[#00AEEF]/70">:{two(now.getSeconds())}</span>
      </p>
      <p className="text-[10px] tracking-widest text-[#00AEEF]/60 tabular-nums">
        UTC {two(now.getUTCHours())}:{two(now.getUTCMinutes())} ·{' '}
        {now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toUpperCase()}
      </p>
    </div>
  )
}
