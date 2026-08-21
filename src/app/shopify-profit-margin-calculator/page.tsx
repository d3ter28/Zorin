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
          Enter your selling price, unit cost, and shipping cost to see your exact profit
          per unit and margin. Free, no signup required.
        </p>

        <div className="mt-10">
          <ProfitMarginCalculator />
        </div>

        <div className="mt-16 border-t border-zinc-100 pt-10">
          <h2 className="text-xl font-semibold text-zinc-900">
            What this calculator doesn&apos;t do (yet)
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-zinc-500">
            This is a simple three-input calculator, on purpose - price, cost, and shipping.
            Some other margin tools go further with fields this one doesn&apos;t have:
          </p>

          <div className="mt-6 overflow-x-auto rounded-xl border border-zinc-200">
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50">
                  <th className="px-4 py-3 font-semibold text-zinc-700">Feature</th>
                  <th className="px-4 py-3 font-semibold text-zinc-700">Who has it</th>
                  <th className="px-4 py-3 font-semibold text-zinc-700">What it does</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                <tr>
                  <td className="px-4 py-3 align-top font-medium text-zinc-900">
                    Transaction / payment processing fee field
                  </td>
                  <td className="px-4 py-3 align-top text-zinc-500">
                    Craftshift, AMZ Prep, Reportgenix
                  </td>
                  <td className="px-4 py-3 align-top text-zinc-500">
                    Lets you factor in Shopify&apos;s 2.9% (or plan-specific rate) directly,
                    rather than needing to fold it into &ldquo;unit cost&rdquo; manually.
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 align-top font-medium text-zinc-900">
                    Country / region-specific fee rates
                  </td>
                  <td className="px-4 py-3 align-top text-zinc-500">AMZ Prep</td>
                  <td className="px-4 py-3 align-top text-zinc-500">
                    Different Shopify fee rates for US, UK, EU, Canada, Australia.
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 align-top font-medium text-zinc-900">
                    Ad spend / CAC input
                  </td>
                  <td className="px-4 py-3 align-top text-zinc-500">
                    TrueProfit, Reportgenix, Hubfluence
                  </td>
                  <td className="px-4 py-3 align-top text-zinc-500">
                    Shows net profit after marketing cost per order, not just gross-of-marketing
                    margin.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="mt-6 text-sm leading-relaxed text-zinc-500">
            If you need per-order net profit after ad spend and payment fees - not just a
            per-unit margin estimate - Zorin&apos;s{" "}
            <a href="/features" className="text-blue-600 hover:underline">
              full profit tracking dashboard
            </a>{" "}
            computes that automatically from your connected Shopify or WooCommerce store, alongside
            price recommendations for your whole catalog.{" "}
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
