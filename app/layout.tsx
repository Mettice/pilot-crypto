import type { Metadata } from 'next'
import { Inter, Space_Grotesk } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: 'Pilot Crypto | Build Wealth With Crypto, The Smart Way',
  description: 'Learn, invest, and grow with expert crypto guidance built for beginners and serious investors. Get real human mentorship, portfolio support, and access to the Pilot Crypto VIP community.',
  keywords: ['crypto', 'cryptocurrency', 'bitcoin', 'ethereum', 'CRO', 'crypto mentorship', 'crypto investment', 'beginner crypto'],
  openGraph: {
    title: 'Pilot Crypto | Build Wealth With Crypto, The Smart Way',
    description: 'Learn, invest, and grow with expert guidance built for beginners and serious investors.',
    type: 'website',
    locale: 'en_EU',
  },
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body className={`${inter.className} overflow-x-hidden`}>{children}</body>
    </html>
  )
}
