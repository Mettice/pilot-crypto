import Header from '@/components/Header'
import HeroSection from '@/components/HeroSection'
import LiveTicker from '@/components/LiveTicker'
import WhyPilotCrypto from '@/components/WhyPilotCrypto'
import CROSpotlight from '@/components/CROSpotlight'
import CryptoNews from '@/components/CryptoNews'
import ServicesSection from '@/components/ServicesSection'
import PortfolioCalculator from '@/components/PortfolioCalculator'
import Testimonials from '@/components/Testimonials'
import LeadMagnet from '@/components/LeadMagnet'
import HowItWorks from '@/components/HowItWorks'
import FAQSection from '@/components/FAQSection'
import FinalCTA from '@/components/FinalCTA'
import Footer from '@/components/Footer'
import FloatingWhatsApp from '@/components/FloatingWhatsApp'

export default function Home() {
  return (
    <main className="bg-bg min-h-screen">
      <Header />
      <HeroSection />
      <LiveTicker />
      <WhyPilotCrypto />
      <CROSpotlight />
      <CryptoNews />
      <ServicesSection />
      <PortfolioCalculator />
      <Testimonials />
      <LeadMagnet />
      <HowItWorks />
      <FAQSection />
      <FinalCTA />
      <Footer />
      <FloatingWhatsApp />
    </main>
  )
}
