import { Navbar } from "@/components/marketing/Navbar";
import { Footer } from "@/components/marketing/Footer";
import { WooCommerceProfitMarginCalculator } from "@/components/marketing/WooCommerceProfitMarginCalculator";
import { buildCalculatorSchema, buildFaqSchema } from "@/lib/seo/toolSchema";

export const metadata = {
  title: "WooCommerce Profit Margin Calculator (Free) - Zorin",
  description:
    "Calculate your exact net profit margin per unit in seconds. Enter your selling price, unit cost, shipping, payment fees, and ad spend, free, no signup.",
  alternates: { canonical: "https://www.tryzorin.com/woocommerce-profit-margin-calculator" },
};

const { webApplicationSchema, breadcrumbSchema } = buildCalculatorSchema({
  name: "WooCommerce Profit Margin Calculator",
  path: "/woocommerce-profit-margin-calculator",
  description: metadata.description,
});

const faqs = [
  {
    question: "Which payment processor should I pick if I use more than one?",
    answer:
      "Pick whichever one handles the majority of your orders for the most representative estimate, then rerun the calculation with a different processor selected if you want to compare. Each preset fills in a typical rate, which you can edit if your actual negotiated rate differs.",
  },
  {
    question: "What counts as unit cost?",
    answer:
      "The cost of goods sold for one unit: manufacturing or wholesale cost, packaging, and any per-unit fulfillment cost. It shouldn't include fixed costs like hosting or staff time, which aren't tied to a single unit sold.",
  },
  {
    question: "Why does WooCommerce need a processor picker when Shopify doesn't?",
    answer:
      "WooCommerce doesn't lock you into one payment gateway the way Shopify does with Shopify Payments, so a WooCommerce store's actual processing fee depends entirely on which gateway (WooPayments, Stripe, PayPal, Square, Authorize.net) is connected, each with a different typical rate.",
  },
  {
    question: "Is this the same as the margin Zorin shows in the dashboard?",
    answer:
      "The math is the same, but this calculator is a manual, per-order snapshot you run yourself. Zorin's profit tracking dashboard computes this automatically across your whole catalog from your connected WooCommerce store, updated as new orders come in, alongside a price recommendation for each product.",
  },
  {
    question: "What's a healthy profit margin for a WooCommerce store?",
    answer:
      "It depends heavily on category, a supplement or skincare brand often runs 60-80% gross margin, while consumer electronics can run closer to 25-40%. There's no single universal target; see the category benchmarks in Zorin's research reference for real, sourced figures by product type.",
  },
];

const faqSchema = buildFaqSchema(faqs);

export default function WooCommerceProfitMarginCalculatorPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webApplicationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <Navbar />
      <main className="mx-auto max-w-2xl px-6 pb-24 pt-32 md:pb-32">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 md:text-4xl">
          WooCommerce Profit Margin Calculator
        </h1>
        <p className="mt-4 max-w-[55ch] text-base leading-relaxed text-zinc-500">
          Enter your selling price, unit cost, and shipping cost - plus your payment
          processor&apos;s fee and ad spend per order - to see your exact net profit and margin.
          Free, no signup required.
        </p>

        <div className="mt-10">
          <WooCommerceProfitMarginCalculator />
        </div>

        <div className="mt-16 border-t border-zinc-100 pt-10">
          <h2 className="text-xl font-semibold text-zinc-900">What&apos;s included</h2>
          <ul className="mt-4 space-y-3 text-sm leading-relaxed text-zinc-500">
            <li className="flex gap-3">
              <span className="text-blue-600 font-bold mt-0.5">—</span>
              <span>
                <span className="font-medium text-zinc-700">
                  Processor-specific payment fees
                </span>{" "}
                - WooCommerce doesn&apos;t lock you into one payment gateway, so pick
                WooPayments, Stripe, PayPal, Square, or Authorize.net and a typical rate
                prefills automatically. Edit either field if your actual negotiated rate
                differs.
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
            does that from your connected WooCommerce or Shopify store, alongside price
            recommendations for every SKU.{" "}
            <a href="/signup" className="font-semibold text-blue-600 hover:text-blue-700">
              Start your free trial →
            </a>
          </p>
        </div>

        <div className="mt-16 border-t border-zinc-100 pt-10">
          <h2 className="text-xl font-semibold text-zinc-900">Worked example</h2>
          <p className="mt-4 text-sm leading-relaxed text-zinc-500">
            A product sells for $50, costs $18 to make, and $4 to ship. On Stripe&apos;s typical
            rate (2.9% + $0.30), the processing fee is about $1.75. If you spend $8 on ads per
            order, net profit is $50 &minus; $18 &minus; $4 &minus; $1.75 &minus; $8 = $18.25,
            a net margin of about 36.5%. Drop the ad spend and gross margin (before marketing)
            comes out to roughly 52.5%, the figure worth comparing against category benchmarks,
            since ad spend varies by channel and campaign rather than by product.
          </p>
        </div>

        <div className="mt-16 space-y-6 border-t border-zinc-100 pt-10">
          <h2 className="text-xl font-semibold text-zinc-900">Frequently asked questions</h2>
          <div className="space-y-5">
            {faqs.map((faq) => (
              <div key={faq.question}>
                <h3 className="text-sm font-semibold text-zinc-900">{faq.question}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
