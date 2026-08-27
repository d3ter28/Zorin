import { Navbar } from "@/components/marketing/Navbar";
import { Footer } from "@/components/marketing/Footer";
import { ProfitMarginCalculator } from "@/components/marketing/ProfitMarginCalculator";
import { buildCalculatorSchema, buildFaqSchema } from "@/lib/seo/toolSchema";

export const metadata = {
  title: "Shopify Profit Margin Calculator (Free) - Zorin",
  description:
    "Calculate your exact profit margin per unit in seconds. Enter your selling price, unit cost, and shipping cost - free, no signup required.",
  alternates: { canonical: "https://www.tryzorin.com/shopify-profit-margin-calculator" },
};

const { webApplicationSchema, breadcrumbSchema } = buildCalculatorSchema({
  name: "Shopify Profit Margin Calculator",
  path: "/shopify-profit-margin-calculator",
  description: metadata.description,
});

const faqs = [
  {
    question: "What counts as unit cost?",
    answer:
      "The cost of goods sold for one unit: manufacturing or wholesale cost, packaging, and any per-unit fulfillment cost you pay regardless of order volume. It shouldn't include fixed costs like rent or salaries, which aren't tied to a single unit sold.",
  },
  {
    question: "Why does the calculator ask for a region?",
    answer:
      "Shopify Payments rates and fixed per-transaction fees vary by country. Picking your region prefills a typical rate so you don't have to look it up, but you can edit either field if your actual negotiated rate or plan differs from the default.",
  },
  {
    question: "Should I include ad spend in every calculation?",
    answer:
      "Include it if you want net profit after marketing, the number that actually matters for whether a sale was worth making. Leave it at zero if you want gross-of-marketing margin instead, useful for comparing raw product economics across SKUs regardless of how each one is advertised.",
  },
  {
    question: "Is this the same as the margin Zorin shows in the dashboard?",
    answer:
      "The math is the same, but this calculator is a manual, per-order snapshot you run yourself. Zorin's profit tracking dashboard computes this automatically across your whole catalog from your connected store, updates as new orders come in, and pairs it with a price recommendation for each product.",
  },
  {
    question: "What's a healthy profit margin for a Shopify store?",
    answer:
      "It depends heavily on category, a supplement or skincare brand often runs 60-80% gross margin, while consumer electronics can run closer to 25-40%. There's no single universal target; see the category benchmarks in Zorin's research reference for real, sourced figures by product type.",
  },
];

const faqSchema = buildFaqSchema(faqs);

export default function ProfitMarginCalculatorPage() {
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

        <div className="mt-16 border-t border-zinc-100 pt-10">
          <h2 className="text-xl font-semibold text-zinc-900">Worked example</h2>
          <p className="mt-4 text-sm leading-relaxed text-zinc-500">
            A product sells for $40, costs $14 to make, and $3 to ship. On a US Shopify Payments
            plan (2.9% + $0.30), the processing fee is about $1.46. If you spend $6 on ads per
            order, net profit is $40 &minus; $14 &minus; $3 &minus; $1.46 &minus; $6 = $15.54,
            a net margin of about 38.9%. Drop the ad spend and gross margin (before marketing)
            comes out to roughly 53.9%, the number worth comparing against category benchmarks
            rather than the net figure, since ad spend varies by channel and campaign.
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
