'use client'

import { LogOut } from 'lucide-react'

export default function SignOutButton() {
  return (
    <button
      onClick={async () => {
        await fetch('/api/leo/logout', { method: 'POST' })
        window.location.href = '/login'
      }}
      className="flex items-center gap-1.5 text-xs text-muted hover:text-white transition-colors whitespace-nowrap"
    >
      <LogOut className="w-3.5 h-3.5" />
      <span className="hidden sm:inline">Sign out</span>
    </button>
  )
}
