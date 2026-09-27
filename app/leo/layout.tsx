import type { Metadata } from 'next'
import { JetBrains_Mono } from 'next/font/google'

export const metadata: Metadata = {
  title: 'Leo',
  robots: { index: false, follow: false },
}

// Monospace for HUD readouts, loaded only on Leo pages
const hud = JetBrains_Mono({ subsets: ['latin'], variable: '--font-hud', display: 'swap' })

export default function LeoLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${hud.variable} leo-hud-bg min-h-screen text-white`}>{children}</div>
}
