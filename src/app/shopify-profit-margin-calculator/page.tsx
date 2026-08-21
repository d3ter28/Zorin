import { Navbar } from "@/components/marketing/Navbar";
import { Footer } from "@/components/marketing/Footer";
import { ProfitMarginCalculator } from "@/components/marketing/ProfitMarginCalculator";

export const metadata = {
  title: "Shopify Profit Margin Calculator (Free) - Zorin",
  description:
    "Calculate your exact profit margin per unit in seconds. Enter your selling price, unit cost, and shipping cost - free, no signup required.",
  alternates: { canonical: "https://www.tryzorin.com/shopify-profit-margin-calculator" },
};

export default function ProfitMarginCalculatorPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-2xl px-6 pb-24 pt-32 md:pb-32">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 md:text-4xl">
          Shopify Profit Margin Calculator
        </h1>
        <p className="mt-4 max-w-[55ch] text-base leading-relaxed text-zinc-500">
          Enter your selling price, unit cost, and shipping cost - plus your region&apos;s
          payment processing fee and ad spend per order - to see your exact net profit and
          margin. Free, no signup required.
        </p>

        <div className="mt-10">
          <ProfitMarginCalculator />
        </div>

        <div className="mt-16 border-t border-zinc-100 pt-10">
          <h2 className="text-xl font-semibold text-zinc-900">What&apos;s included</h2>
          <ul className="mt-4 space-y-3 text-sm leading-relaxed text-zinc-500">
            <li className="flex gap-3">
              <span className="text-blue-600 font-bold mt-0.5">—</span>
              <span>
                <span className="font-medium text-zinc-700">
                  Region-specific payment fees
                </span>{" "}
                - pick US, UK, EU, Canada, or Australia and the typical Shopify Payments
                rate and fixed fee prefill automatically. Edit either if your plan or
                processor differs.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-blue-600 font-bold mt-0.5">—</span>
              <span>
                <span className="font-medium text-zinc-700">Ad spend per order</span> -
                add your customer acquisition cost to see net profit after marketing, not
                just gross-of-marketing margin.
              </span>
            </li>
          </ul>
          <p className="mt-6 text-sm leading-relaxed text-zinc-500">
            This calculator is a per-order snapshot. If you want this computed automatically
            across your whole catalog, updated as new orders come in, Zorin&apos;s{" "}
            <a href="/features" className="text-blue-600 hover:underline">
              full profit tracking dashboard
            </a>{" "}
            does that from your connected Shopify or WooCommerce store, alongside price
            recommendations for every SKU.{" "}
            <a href="/signup" className="font-semibold text-blue-600 hover:text-blue-700">
              Start your free trial →
            </a>
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
