/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#050816',
        'bg-secondary': '#0b1220',
        'bg-card': '#0d1626',
        blue: {
          primary: '#00AEEF',
          glow: 'rgba(0, 174, 239, 0.15)',
        },
        gold: {
          primary: '#F5B400',
          glow: 'rgba(245, 180, 0, 0.15)',
        },
        muted: '#9aa4b2',
      },
      fontFamily: {
        heading: ['var(--font-space-grotesk)', 'sans-serif'],
        body: ['var(--font-inter)', 'sans-serif'],
      },
      animation: {
        ticker: 'ticker 35s linear infinite',
        'pulse-glow': 'pulseGlow 2.5s ease-in-out infinite',
        float: 'float 4s ease-in-out infinite',
        'float-delay': 'float 4s ease-in-out 1.5s infinite',
        shimmer: 'shimmer 2.5s linear infinite',
        'spin-slow': 'spin 8s linear infinite',
        breathe: 'breathe 3s ease-in-out infinite',
      },
      keyframes: {
        ticker: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(0,174,239,0.25), 0 0 40px rgba(0,174,239,0.1)' },
          '50%': { boxShadow: '0 0 40px rgba(0,174,239,0.5), 0 0 80px rgba(0,174,239,0.2)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        breathe: {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
      },
      boxShadow: {
        'glow-blue': '0 0 30px rgba(0,174,239,0.3)',
        'glow-gold': '0 0 30px rgba(245,180,0,0.3)',
        'glow-blue-lg': '0 0 60px rgba(0,174,239,0.4)',
        card: '0 4px 24px rgba(0,0,0,0.4)',
        'card-hover': '0 8px 40px rgba(0,174,239,0.15)',
      },
      backgroundImage: {
        'hero-mesh': 'radial-gradient(ellipse at 20% 50%, rgba(0,174,239,0.08) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(245,180,0,0.05) 0%, transparent 60%)',
        'card-gradient': 'linear-gradient(135deg, rgba(13,22,38,0.8) 0%, rgba(11,18,32,0.9) 100%)',
        'gold-gradient': 'linear-gradient(135deg, #F5B400 0%, #e6a800 100%)',
        'blue-gradient': 'linear-gradient(135deg, #00AEEF 0%, #0090d4 100%)',
        'grid-pattern': "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2300AEEF' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
      },
    },
  },
  plugins: [],
}
