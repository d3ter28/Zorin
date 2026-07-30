import dynamic from "next/dynamic";
import { Navbar } from "@/components/marketing/Navbar";
import { Hero } from "@/components/marketing/Hero";
import { MetricsStrip } from "@/components/marketing/MetricsStrip";
import { LogoWall } from "@/components/marketing/LogoWall";
import { WhyZorin } from "@/components/marketing/WhyZorin";
import { HowItWorks } from "@/components/marketing/HowItWorks";
import { Features } from "@/components/marketing/Features";
import { Footer } from "@/components/marketing/Footer";

// Below-the-fold sections: still server-rendered for content/SEO (ssr stays
// true, the default), but split into separate chunks so their client-side
// JS (mostly motion/react entrance animations) doesn't add to the initial
// bundle every visitor downloads and parses before first paint.
const Pricing = dynamic(() => import("@/components/marketing/Pricing").then(m => m.Pricing));
const Blog = dynamic(() => import("@/components/marketing/Blog").then(m => m.Blog));
const FAQ = dynamic(() => import("@/components/marketing/FAQ").then(m => m.FAQ));
const EarlyAccess = dynamic(() => import("@/components/marketing/EarlyAccess").then(m => m.EarlyAccess));

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
