import type { Metadata } from "next";
import { Navbar } from "@/components/marketing/Navbar";
import { Footer } from "@/components/marketing/Footer";
import { FeaturesGrid } from "@/components/marketing/FeaturesGrid";

export const metadata: Metadata = {
  title: "Features - Zorin",
  description:
    "Everything Zorin does: elasticity modeling, price sensitivity surveys, bulk pricing, profit tracking, and team tools for Shopify and WooCommerce merchants.",
  alternates: { canonical: "https://www.tryzorin.com/features" },
};

export default function FeaturesPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-5xl px-6 pb-24 pt-32 md:pb-32">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 md:text-4xl">
            Everything Zorin does
          </h1>
          <p className="mt-4 text-base leading-relaxed text-zinc-500">
            One tool for every pricing decision: what to charge, what to change first, how to
            roll it out, and whether it actually paid off.
          </p>
        </div>

        <FeaturesGrid />

        <div className="mt-16 border-t border-zinc-100 pt-12">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">Learn more</p>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-zinc-500">
            <a href="/shopify-profit-margin-calculator" className="hover:text-zinc-900 hover:underline">Shopify profit margin calculator</a>
            <a href="/blog/what-does-price-elasticity-actually-mean" className="hover:text-zinc-900 hover:underline">What price elasticity means</a>
            <a href="/blog/best-pricing-optimization-tools-for-shopify-stores-2026" className="hover:text-zinc-900 hover:underline">Best Shopify pricing tools (2026)</a>
            <a href="/blog/ecommerce-profit-margins-what-to-target-and-how-to-track-them" className="hover:text-zinc-900 hover:underline">Ecommerce profit margin benchmarks</a>
          </div>
        </div>

        <div className="mt-20 flex flex-col items-center rounded-2xl border border-zinc-200 bg-zinc-50/70 px-6 py-12 text-center">
          <h2 className="text-xl font-bold tracking-tight text-zinc-900">
            See it on your own catalog
          </h2>
          <p className="mt-2 max-w-md text-sm text-zinc-500">
            7-day free trial, no credit card required.
          </p>
          <a
            href="/signup"
            className="mt-6 inline-flex h-10 items-center rounded-lg bg-blue-600 px-5 text-sm font-medium text-white transition-all hover:bg-blue-700 active:scale-[0.98]"
          >
            Start free trial
          </a>
        </div>
      </main>
      <Footer />
    </>
  );
}
