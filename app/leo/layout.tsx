import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Leo',
  robots: { index: false, follow: false },
}

export default function LeoLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-bg text-white">{children}</div>
}
