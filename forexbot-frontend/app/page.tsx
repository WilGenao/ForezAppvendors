import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import Hero from '@/components/sections/Hero';
import FeaturedBots from '@/components/sections/FeaturedBots';
import HowItWorks from '@/components/sections/HowItWorks';
import CTA from '@/components/sections/CTA';

export default function Home() {
  return (
    <main className="min-h-screen bg-navy-950">
      <Navbar />
      <Hero />
      <FeaturedBots />
      <HowItWorks />
      <CTA />
      <Footer />
    </main>
  );
}
