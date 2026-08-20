import { Navbar } from "@/components/marketing/Navbar";
import { Footer } from "@/components/marketing/Footer";

export const metadata = {
  title: "Privacy Policy - Zorin",
  description: "How Zorin handles your store's sales data, in plain English.",
  alternates: { canonical: "https://www.tryzorin.com/privacy" },
};

export default function PrivacyPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-2xl px-6 pb-24 pt-32 md:pb-32">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 md:text-4xl">
          Privacy Policy
        </h1>
        <p className="mt-3 text-sm text-zinc-500">Last updated August 5, 2026</p>

        <div className="prose prose-zinc mt-10 max-w-none text-zinc-600">
          <p>
            Zorin is a pricing tool for online merchants. This page explains, in plain
            English, what happens to your sales data when you use it - no legal
            filler.
          </p>

          <h2 className="mt-10 text-xl font-semibold text-zinc-900">What we collect</h2>
          <p>
            When you upload a CSV of your products and sales, or connect a Shopify or
            WooCommerce store, we store the product, pricing, and order data needed to
            calculate price recommendations: product names, SKUs, prices, cost of goods,
            and unit sales. If you connect a store, we also store an encrypted API
            credential so we can keep that data in sync.
          </p>
          <p>
            We don&apos;t ask for or store your customers&apos; personal information. Your
            sales data is tied to your account only.
          </p>

          <h2 className="mt-10 text-xl font-semibold text-zinc-900">What we don&apos;t do</h2>
          <p>
            We never sell your store data, and we never share it with other merchants or
            third parties for marketing or any other purpose. Your catalog and sales
            numbers are used for exactly one thing: generating your own price
            recommendations.
          </p>

          <h2 className="mt-10 text-xl font-semibold text-zinc-900">How it&apos;s stored</h2>
          <p>
            Every merchant&apos;s data is isolated from every other merchant&apos;s -
            there&apos;s no shared or pooled dataset. When you upload a CSV, we parse it
            and store the resulting product and order records; we don&apos;t keep the
            original file. Store credentials (Shopify/WooCommerce API keys) are encrypted
            at rest.
          </p>

          <h2 className="mt-10 text-xl font-semibold text-zinc-900">How long we keep it</h2>
          <p>
            We keep your data for as long as your account is active, so your price
            recommendations stay accurate as new sales come in. If you want your data
            deleted - whether you&apos;re closing your account or just changed your
            mind - email{" "}
            <a href="mailto:support@tryzorin.com" className="text-blue-600 hover:underline">
              support@tryzorin.com
            </a>{" "}
            and we&apos;ll remove it.
          </p>

          <h2 className="mt-10 text-xl font-semibold text-zinc-900">Analytics</h2>
          <p>
            We use Google Analytics on our marketing site to understand traffic. This
            doesn&apos;t touch your store or sales data in any way.
          </p>

          <h2 className="mt-10 text-xl font-semibold text-zinc-900">Questions</h2>
          <p>
            If anything here is unclear, email us at{" "}
            <a href="mailto:support@tryzorin.com" className="text-blue-600 hover:underline">
              support@tryzorin.com
            </a>{" "}
            and we&apos;ll answer directly - no ticket queue.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
