'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, X } from 'lucide-react'

export default function FloatingWhatsApp() {
  const [showTooltip, setShowTooltip] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!dismissed) setShowTooltip(true)
    }, 4000)
    return () => clearTimeout(timer)
  }, [dismissed])

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Tooltip bubble */}
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            transition={{ duration: 0.25 }}
            className="glass rounded-2xl p-4 max-w-[220px] relative"
            style={{ border: '1px solid rgba(37,211,102,0.2)' }}
          >
            <button
              onClick={() => { setShowTooltip(false); setDismissed(true) }}
              className="absolute top-2 right-2 text-muted hover:text-white transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
            <p className="text-white text-xs font-semibold mb-1 pr-4">
              👋 Ready to start?
            </p>
            <p className="text-muted text-xs leading-relaxed">
              Message us on WhatsApp for free guidance today.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Button */}
      <motion.a
        href="https://wa.me/33662361149"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat on WhatsApp"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 1, type: 'spring', stiffness: 260, damping: 20 }}
        whileHover={{ scale: 1.12 }}
        whileTap={{ scale: 0.92 }}
        className="relative w-14 h-14 rounded-full flex items-center justify-center shadow-[0_4px_24px_rgba(37,211,102,0.4)]"
        style={{ background: '#25d366' }}
        onClick={() => { setShowTooltip(false); setDismissed(true) }}
      >
        {/* Pulse rings */}
        <span className="absolute inset-0 rounded-full animate-ping opacity-20" style={{ background: '#25d366' }} />
        <span className="absolute inset-[-6px] rounded-full border border-[#25d366]/20 animate-breathe" />
        <MessageCircle className="w-7 h-7 text-white relative z-10" fill="white" />
      </motion.a>
    </div>
  )
}
