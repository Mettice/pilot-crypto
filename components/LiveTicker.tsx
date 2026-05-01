'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'

const initialCoins = [
  { id: 'bitcoin', symbol: 'BTC', price: '$47,520', change: '+2.1%', positive: true, image: 'https://coin-images.coingecko.com/coins/images/1/large/bitcoin.png' },
  { id: 'ethereum', symbol: 'ETH', price: '$2,864', change: '+1.8%', positive: true, image: 'https://coin-images.coingecko.com/coins/images/279/large/ethereum.png' },
  { id: 'crypto-com-chain', symbol: 'CRO', price: '$0.112', change: '+4.3%', positive: true, image: 'https://coin-images.coingecko.com/coins/images/7310/large/cro_token_logo.png' },
  { id: 'solana', symbol: 'SOL', price: '$178.50', change: '+5.1%', positive: true, image: 'https://coin-images.coingecko.com/coins/images/4128/large/solana.png' },
  { id: 'binancecoin', symbol: 'BNB', price: '$412.30', change: '+0.9%', positive: true, image: 'https://coin-images.coingecko.com/coins/images/825/large/bnb-icon2_2x.png' },
  { id: 'cardano', symbol: 'ADA', price: '$0.464', change: '-0.7%', positive: false, image: 'https://coin-images.coingecko.com/coins/images/975/large/cardano.png' },
  { id: 'polkadot', symbol: 'DOT', price: '$7.82', change: '+2.4%', positive: true, image: 'https://coin-images.coingecko.com/coins/images/12171/large/polkadot.jpg' },
  { id: 'matic-network', symbol: 'MATIC', price: '$0.893', change: '+3.2%', positive: true, image: 'https://coin-images.coingecko.com/coins/images/4713/large/polygon.png' },
  { id: 'avalanche-2', symbol: 'AVAX', price: '$38.20', change: '+6.1%', positive: true, image: 'https://coin-images.coingecko.com/coins/images/12559/large/Avalanche_Circle_RedWhite_Trans.png' },
  { id: 'chainlink', symbol: 'LINK', price: '$14.70', change: '+1.5%', positive: true, image: 'https://coin-images.coingecko.com/coins/images/877/large/Chainlink_Logo_500.png' },
]

export default function LiveTicker() {
  const [coins, setCoins] = useState(initialCoins)
  const [flash, setFlash] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const interval = setInterval(() => {
      const idx = Math.floor(Math.random() * coins.length)
      const sym = coins[idx].symbol
      setFlash((f) => ({ ...f, [sym]: true }))
      setTimeout(() => setFlash((f) => ({ ...f, [sym]: false })), 400)
    }, 1200)

    // Fetch real data from CoinGecko markets API to get images too
    const fetchPrices = async () => {
      try {
        const res = await fetch('/api/prices')
        const data: any = await res.json()

        if (!Array.isArray(data)) return; // Handle rate limiting smoothly

        setCoins(prev => prev.map(coin => {
          const coinData = data.find(d => d.id === coin.id)
          if (!coinData) return coin

          const currentPrice = coinData.current_price || 0
          const price = currentPrice > 0 && currentPrice < 1
            ? `$${currentPrice.toPrecision(3)}`
            : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(currentPrice)
          const changeVal = coinData.price_change_percentage_24h || 0

          return {
            ...coin,
            price,
            change: `${changeVal >= 0 ? '+' : ''}${changeVal.toFixed(1)}%`,
            positive: changeVal >= 0,
            image: coinData.image || coin.image
          }
        }))
      } catch (err) {
        console.error('Failed to fetch CoinGecko prices:', err)
      }
    }

    fetchPrices()
    const priceInterval = setInterval(fetchPrices, 60000) // Update every minute

    return () => {
      clearInterval(interval)
      clearInterval(priceInterval)
    }
  }, [coins.length])

  const doubled = [...coins, ...coins]

  return (
    <div className="bg-bg-secondary border-y border-white/5 overflow-hidden py-3 relative z-20">
      {/* Fade edges */}
      <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-bg-secondary to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-bg-secondary to-transparent z-10 pointer-events-none" />

      <div className="flex animate-ticker whitespace-nowrap gap-0">
        {doubled.map((coin, i) => (
          <div
            key={`${coin.symbol}-${i}`}
            className={`flex items-center gap-3 px-6 shrink-0 transition-all duration-300 ${flash[coin.symbol] ? 'opacity-100' : 'opacity-80 hover:opacity-100'
              }`}
          >
            <div className="flex items-center gap-2">
              {coin.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={coin.image} alt={coin.symbol} className="w-5 h-5 rounded-full shrink-0" />
              )}
              <span
                className={`font-heading font-bold text-sm whitespace-nowrap transition-colors duration-300 ${flash[coin.symbol] ? 'text-[#F5B400]' : 'text-white'
                  }`}
              >
                {coin.symbol}
              </span>
            </div>
            <span className="text-muted text-sm whitespace-nowrap">{coin.price}</span>
            <span
              className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded whitespace-nowrap transition-all duration-300 ${coin.positive
                  ? `text-emerald-400 ${flash[coin.symbol] ? 'bg-emerald-400/20' : 'bg-emerald-400/10'}`
                  : `text-red-400 ${flash[coin.symbol] ? 'bg-red-400/20' : 'bg-red-400/10'}`
                }`}
            >
              {coin.positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {coin.change}
            </span>
            <span className="text-white/10">|</span>
          </div>
        ))}
      </div>
    </div>
  )
}
