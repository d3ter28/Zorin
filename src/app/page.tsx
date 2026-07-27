import { Navbar } from "@/components/marketing/Navbar";
import { Hero } from "@/components/marketing/Hero";
import { MetricsStrip } from "@/components/marketing/MetricsStrip";
import { LogoWall } from "@/components/marketing/LogoWall";
import { WhyZorin } from "@/components/marketing/WhyZorin";
import { HowItWorks } from "@/components/marketing/HowItWorks";
import { Features } from "@/components/marketing/Features";
import { Pricing } from "@/components/marketing/Pricing";
import { Blog } from "@/components/marketing/Blog";
import { FAQ } from "@/components/marketing/FAQ";
import { EarlyAccess } from "@/components/marketing/EarlyAccess";
import { Footer } from "@/components/marketing/Footer";

export const metadata = {
  title: "Zorin - ML-powered pricing intelligence for online merchants",
  description:
    "Turn your sales history into profit-maximizing price recommendations. Upload, model, optimize.",
};

export default function LandingPage() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <MetricsStrip />
        <LogoWall />
        <WhyZorin />
        <HowItWorks />
        <Features />
        <Pricing />
        <Blog />
        <FAQ />
        <EarlyAccess />
      </main>
      <Footer />
    </>
  );
}
