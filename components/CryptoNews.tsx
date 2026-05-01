'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Newspaper, ExternalLink, Clock } from 'lucide-react'

interface NewsItem {
  title: string
  link: string
  pubDate: string
  thumbnail: string
  description: string
  enclosure?: {
    link?: string
    type?: string
  }
}

export default function CryptoNews() {
  const [news, setNews] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Fetch live news from CoinDesk via RSS2JSON API
    fetch('https://api.rss2json.com/v1/api.json?rss_url=https://www.coindesk.com/arc/outboundfeeds/rss/')
      .then(res => res.json())
      .then(data => {
        if (data && data.items) {
          setNews(data.items.slice(0, 3))
        }
      })
      .catch(err => console.error('Error fetching news:', err))
      .finally(() => setLoading(false))
  }, [])

  return (
    <section id="news" className="section-pad relative overflow-hidden bg-bg-secondary/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-[#a855f7]/20 w-fit mb-4">
            <Newspaper className="w-3.5 h-3.5 text-[#a855f7]" />
            <span className="text-xs font-semibold text-[#a855f7] tracking-wide uppercase">
              Market Updates
            </span>
          </div>
          <h2 className="font-heading font-bold text-3xl sm:text-4xl lg:text-5xl text-white mb-5">
            Latest Crypto <span className="text-[#a855f7]">News</span>
          </h2>
          <p className="text-muted text-lg max-w-2xl mx-auto">
            Stay informed with the latest market-moving headlines from top sources.
          </p>
        </motion.div>

        {loading ? (
          <div className="grid md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="glass rounded-2xl h-[380px] animate-pulse border border-white/5" />
            ))}
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {news.map((item, i) => (
              <motion.a
                key={item.link}
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.15 }}
                className="group flex flex-col glass rounded-2xl overflow-hidden border border-white/5 hover:border-[#a855f7]/30 transition-all hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(168,85,247,0.15)]"
              >
                {item.thumbnail || item.enclosure?.link ? (
                  <div className="h-48 overflow-hidden relative bg-[#0b1220]">
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0d1626] to-transparent z-10 opacity-60" />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={item.thumbnail || item.enclosure?.link} 
                      alt={item.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                    />
                  </div>
                ) : (
                  <div className="h-48 bg-[#0b1220] flex items-center justify-center border-b border-white/5">
                    <Newspaper className="w-10 h-10 text-muted/30" />
                  </div>
                )}
                
                <div className="p-6 flex flex-col flex-1">
                  <div className="flex items-center gap-2 text-xs text-muted mb-3">
                    <Clock className="w-3.5 h-3.5" />
                    {new Date(item.pubDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                  <h3 className="font-heading font-semibold text-white text-lg leading-snug mb-3 group-hover:text-[#a855f7] transition-colors line-clamp-3">
                    {item.title}
                  </h3>
                  <div className="mt-auto pt-4 flex items-center gap-2 text-sm font-semibold text-[#a855f7]">
                    Read Article <ExternalLink className="w-3.5 h-3.5" />
                  </div>
                </div>
              </motion.a>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
