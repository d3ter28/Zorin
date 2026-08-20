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
const DataGuarantee = dynamic(() => import("@/components/marketing/DataGuarantee").then(m => m.DataGuarantee));

export const metadata = {
  title: "Zorin - Pricing Intelligence for E-Commerce Sellers",
  description:
    "Turn your sales history into profit-maximizing price recommendations. Upload, model, optimize.",
  alternates: { canonical: "https://www.tryzorin.com" },
};

// Plain-text mirror of the FAQ component's Q&A, for FAQPage schema — the
// component itself renders answers behind a client-side accordion, which
// non-JS crawlers (AI citation bots) can't expand.
const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Do I need a developer or data scientist to use this?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. You upload a CSV of your past sales, the same spreadsheet you already export from Shopify or your order system. Zorin does everything else. No code, no configuration, no technical background required.",
      },
    },
    {
      "@type": "Question",
      name: "How much sales data do I need before it works?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Around 50-100 sales records per product gives reliable results. If you have less than that for a product, Zorin will tell you the model is weak and flag it. You'll never get a confident-sounding recommendation from thin data.",
      },
    },
    {
      "@type": "Question",
      name: "What's the difference between this and just checking what my competitors charge?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Competitor prices tell you what works for their customers in their market. Your customers (their price sensitivity, their income bracket, the reason they found you) are different. Zorin learns from how your buyers actually respond to price, not someone else's.",
      },
    },
    {
      "@type": "Question",
      name: "Will it work if my sales are seasonal?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Zorin builds a model from the data you give it, so if you upload a full year of history, it learns patterns across seasons. For highly seasonal products, we recommend uploading data from the relevant period when you want a recommendation.",
      },
    },
    {
      "@type": "Question",
      name: "What happens to my sales data?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Your data is stored in your account only and is never shared, sold, or used to train models for other merchants. Each merchant's data is fully isolated.",
      },
    },
    {
      "@type": "Question",
      name: "What if I disagree with a recommendation?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "You always apply prices manually. Nothing changes automatically. Every recommendation comes with a confidence score and the underlying model stats, so you can judge whether to act on it or not.",
      },
    },
    {
      "@type": "Question",
      name: "Why not just ask ChatGPT or Claude to analyze my pricing?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Their advice is generic: LLMs can't see your sales data, so they give pricing opinions based on general knowledge, not recommendations built from your actual demand curve. The numbers are made up: if you paste in a spreadsheet and ask for an elasticity number, they'll give you one confidently, and it will be fabricated. Zorin fits a real statistical model to your data and shows you an R-squared score so you know exactly how much to trust it. The answer changes every time: ask an LLM the same question twice and you get two different answers, while Zorin is deterministic, same data, same result, every time. They miss promotional spikes: if you ran a sale last November, an LLM won't know to exclude those orders from the model, but Zorin detects them automatically so they don't skew your recommendations. The workflow doesn't scale: you'd need to export your data, paste it in, engineer a prompt, interpret the output, and repeat for every product every time, while Zorin does it in one place for your whole catalog.",
      },
    },
    {
      "@type": "Question",
      name: "Is there a free trial?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes, every plan includes a 7-day free trial, no credit card required. This trial is only available while Zorin is in beta; once beta ends, new signups start billing immediately with no trial period. Early access users also get locked-in pricing when we launch paid plans.",
      },
    },
  ],
};

export default function LandingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
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
        <DataGuarantee />
      </main>
      <Footer />
    </>
  );
}
