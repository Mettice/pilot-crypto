import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Simple in-memory cache for fallback when rate-limited
let lastKnownPrices: any = null

export async function GET() {
  try {
    const ids = 'bitcoin,ethereum,crypto-com-chain,solana,binancecoin,cardano,polkadot,matic-network'
    const res = await fetch(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}&order=market_cap_desc&per_page=10&page=1&sparkline=false&price_change_percentage=24h`,
      {
        headers: {
          'Accept': 'application/json',
        },
        next: { revalidate: 300 } // Cache for 5 minutes
      }
    )

    if (res.status === 429) {
      console.warn('CoinGecko Rate Limit hit (429). Returning last known prices.')
      if (lastKnownPrices) {
        return NextResponse.json(lastKnownPrices)
      }
      return NextResponse.json({ error: 'Rate limit hit', fallback: true }, { status: 429 })
    }

    if (!res.ok) {
      throw new Error(`CoinGecko API responded with ${res.status}`)
    }

    const data = await res.json()
    lastKnownPrices = data
    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Price fetch error:', error)
    
    // Return stale data if available instead of a 500 error
    if (lastKnownPrices) {
      return NextResponse.json(lastKnownPrices)
    }
    
    return NextResponse.json({ error: 'Failed to fetch prices' }, { status: 500 })
  }
}
