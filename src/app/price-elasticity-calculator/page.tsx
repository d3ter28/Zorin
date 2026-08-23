import { Navbar } from "@/components/marketing/Navbar";
import { Footer } from "@/components/marketing/Footer";
import { PriceElasticityCalculator } from "@/components/marketing/PriceElasticityCalculator";
import { buildCalculatorSchema } from "@/lib/seo/toolSchema";

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
      </main>
      <Footer />
    </>
  );
}
