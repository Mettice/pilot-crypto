/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['api.coingecko.com', 'assets.coingecko.com', 'coin-images.coingecko.com', 'cdn.sanity.io'],
  },
  experimental: {
    // Ship the welcome pack and email assets (logo) with the Stripe webhook function
    outputFileTracingIncludes: {
      '/api/stripe/webhook': ['./emails/welcome-pack/**/*', './emails/assets/**/*'],
    },
  },
}

module.exports = nextConfig
