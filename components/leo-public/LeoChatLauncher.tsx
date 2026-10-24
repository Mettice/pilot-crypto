'use client'

import { useCallback, useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { Sparkles } from 'lucide-react'

// The chat window (and its markdown renderer) loads only when someone opens it
const LeoChatPanel = dynamic(() => import('./LeoChatPanel'), { ssr: false })

export default function LeoChatLauncher() {
  const [open, setOpen] = useState(false)
  const [teaser, setTeaser] = useState(false)

  // A gentle nudge after a while on the page, once per browser
  useEffect(() => {
    try {
      if (localStorage.getItem('pc-leo-teaser-seen')) return
    } catch {}
    const id = setTimeout(() => setTeaser(true), 12_000)
    return () => clearTimeout(id)
  }, [])

  function openChat() {
    setOpen(true)
    setTeaser(false)
    try {
      localStorage.setItem('pc-leo-teaser-seen', '1')
    } catch {}
  }

  const close = useCallback(() => setOpen(false), [])

  if (open) return <LeoChatPanel onClose={close} />

  return (
    <div className="fixed bottom-5 left-4 sm:bottom-6 sm:left-6 z-50 flex flex-col items-start gap-3">
      {teaser && (
        <button
          onClick={openChat}
          className="max-w-[230px] text-left rounded-2xl rounded-bl-md border border-[#00AEEF]/25 bg-[#0b1220]/95 backdrop-blur px-4 py-3 text-sm text-white/90 shadow-lg animate-[fadeIn_0.4s_ease-out]"
        >
          <span className="font-semibold text-white">Questions about crypto?</span>
          <br />
          Ask Leo, our AI guide. It&apos;s free.
        </button>
      )}
      <button
        onClick={openChat}
        aria-label="Chat with Leo, our AI guide"
        className="group flex items-center gap-2 rounded-full bg-gradient-to-r from-[#00AEEF] to-[#0077c8] pl-2.5 pr-3.5 py-2.5 sm:pl-3 sm:pr-4 sm:py-3 font-semibold text-white shadow-[0_0_24px_rgba(0,174,239,0.45)] hover:shadow-[0_0_36px_rgba(0,174,239,0.65)] transition-shadow"
      >
        <span className="relative flex h-7 w-7 items-center justify-center rounded-full bg-white/15">
          <Sparkles className="w-4 h-4" />
          <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-[#0090d4]" />
        </span>
        <span className="text-sm">Ask Leo</span>
      </button>
    </div>
  )
}
