import { Navbar } from "@/components/marketing/Navbar";
import { Footer } from "@/components/marketing/Footer";
import { PriceElasticityCalculator } from "@/components/marketing/PriceElasticityCalculator";
import { buildCalculatorSchema, buildFaqSchema } from "@/lib/seo/toolSchema";

export const metadata = {
  title: "Free Price Elasticity Calculator - Zorin",
  description:
    "Calculate your price elasticity of demand in seconds. Enter two price and unit-sold data points to see your elasticity coefficient and revenue impact - free, no signup required.",
  alternates: { canonical: "https://www.tryzorin.com/price-elasticity-calculator" },
};

const { webApplicationSchema, breadcrumbSchema } = buildCalculatorSchema({
  name: "Price Elasticity Calculator",
  path: "/price-elasticity-calculator",
  description: metadata.description,
});

const faqs = [
  {
    question: "What formula does this calculator use?",
    answer:
      "The midpoint (arc elasticity) method: percentage change in quantity divided by percentage change in price, where both percentage changes are calculated against the average of the two values rather than the starting value. This gives the same result whether the price went up or down, unlike a simple before/after percentage calculation.",
  },
  {
    question: "What counts as a good number of units sold to compare?",
    answer:
      "There's no strict minimum, but a few weeks to a couple of months of sales at each price gives a steadier read than a day or two, which can be skewed by normal day-to-day variance. If either period included a sale, promotion, or stockout, the result will reflect that distortion, not price sensitivity alone.",
  },
  {
    question: "Why does my elasticity number come out positive instead of negative?",
    answer:
      "Demand curves slope downward for almost all products, so a properly calculated elasticity is negative: price up, quantity down. If your result comes out positive, double check that Price A and Price B (and their matching unit counts) weren't swapped when entering the data.",
  },
  {
    question: "Can I use this for a product that's never had a price change?",
    answer:
      "No. Elasticity measures how quantity responds to a price change, so you need at least one instance of an actual price change in your sales history. Without that, a Van Westendorp survey is a better starting point for a launch price than a calculator that needs price variation to work.",
  },
  {
    question: "Is a two-point calculation as reliable as a full regression?",
    answer:
      "No, and this calculator is meant as a quick sanity check, not a final answer. A two-point calculation can't separate the effect of the price change from other things happening at the same time (seasonality, promotions, competitor moves), and it has no way to tell you how much to trust the result. A regression fit across many price points, run automatically per SKU, does both.",
  },
];

const faqSchema = buildFaqSchema(faqs);

export default function PriceElasticityCalculatorPage() {
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
          Price Elasticity Calculator
        </h1>
        <p className="mt-4 max-w-[55ch] text-base leading-relaxed text-zinc-500">
          Enter two price points and how many units you sold at each to calculate your price
          elasticity of demand and estimated revenue impact. Free, no signup required.
        </p>

        <div className="mt-10">
          <PriceElasticityCalculator />
        </div>

        <div className="mt-16 space-y-6 border-t border-zinc-100 pt-10">
          <h2 className="text-xl font-semibold text-zinc-900">
            How to use this calculator
          </h2>
          <p className="text-sm leading-relaxed text-zinc-500">
            Find a product where you changed the price at some point and know roughly how many
            units sold before and after. Enter the original price and units sold as &ldquo;Price A&rdquo;
            and the new price and units sold as &ldquo;Price B.&rdquo; The calculator uses the midpoint
            (arc elasticity) method, which gives a consistent result regardless of whether the
            price went up or down.
          </p>
          <h2 className="text-xl font-semibold text-zinc-900">
            Worked example
          </h2>
          <p className="text-sm leading-relaxed text-zinc-500">
            Say a product sold 100 units per month at $20 (Price A), and after raising the price
            to $24 (Price B), it sold 88 units per month. Percentage change in quantity, using the
            midpoint method: (88 &minus; 100) / ((88 + 100) / 2) = &minus;12.8%. Percentage change
            in price: (24 &minus; 20) / ((24 + 20) / 2) = 18.2%. Elasticity = &minus;12.8% / 18.2% =
            &minus;0.70. Since |&minus;0.70| is below 1, demand is inelastic: the price increase
            grew revenue even though unit sales dropped a little.
          </p>
          <h2 className="text-xl font-semibold text-zinc-900">
            What the elasticity coefficient means
          </h2>
          <ul className="space-y-2 text-sm leading-relaxed text-zinc-500">
            <li>
              <span className="font-medium text-zinc-700">Elastic (|E| &gt; 1):</span> your
              customers are price-sensitive. A price increase reduces units sold by more than the
              percentage increase - revenue may fall.
            </li>
            <li>
              <span className="font-medium text-zinc-700">Inelastic (|E| &lt; 1):</span> your
              customers are relatively price-insensitive. There may be room to raise prices
              without losing many sales.
            </li>
            <li>
              <span className="font-medium text-zinc-700">Unit elastic (|E| ≈ 1):</span> demand
              moves proportionally with price - revenue stays roughly flat as price changes.
            </li>
          </ul>
          <p className="text-sm leading-relaxed text-zinc-500">
            This two-point calculation is a useful sanity check, but it only reflects one price
            change. Zorin fits a full demand curve from your complete order history, automatically
            excludes promotional sales spikes that would skew the result, and tells you the exact
            price that maximizes profit for every product in your catalog.
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
