import { Navbar } from "@/components/marketing/Navbar";
import { Footer } from "@/components/marketing/Footer";
import { buildBreadcrumbSchema } from "@/lib/seo/toolSchema";

export const metadata = {
  title: "Ecommerce Pricing Glossary - Zorin",
  description:
    "Plain-English definitions for price elasticity, Van Westendorp, charm pricing, MAP, and 20+ other ecommerce pricing terms.",
  alternates: { canonical: "https://www.tryzorin.com/glossary" },
};

const breadcrumbSchema = buildBreadcrumbSchema([{ name: "Glossary", path: "/glossary" }]);

type Term = {
  id: string;
  name: string;
  definition: string;
  learnMore?: { href: string; label: string };
};

const terms: Term[] = [
  {
    id: "price-elasticity-of-demand",
    name: "Price Elasticity of Demand",
    definition:
      "A measure of how much the quantity sold of a product changes when its price changes, expressed as a coefficient (percentage change in quantity divided by percentage change in price). A coefficient near zero means demand barely reacts to price. A coefficient further from zero means demand is more price-sensitive.",
    learnMore: {
      href: "/blog/what-does-price-elasticity-actually-mean",
      label: "Price Elasticity Explained",
    },
  },
  {
    id: "elastic-demand",
    name: "Elastic Demand",
    definition:
      "Demand where the elasticity coefficient's absolute value is greater than 1, meaning quantity sold changes by a larger percentage than the price change that caused it. A 10% price increase on an elastic product might cost 15-20% of unit sales.",
    learnMore: {
      href: "/blog/elastic-vs-inelastic-demand-whats-the-difference",
      label: "Elastic vs Inelastic Demand",
    },
  },
  {
    id: "inelastic-demand",
    name: "Inelastic Demand",
    definition:
      "Demand where the elasticity coefficient's absolute value is less than 1, meaning quantity sold barely responds to a price change. A price increase on an inelastic product often raises total revenue, since the percentage of lost sales is smaller than the percentage price gain.",
    learnMore: {
      href: "/blog/elastic-vs-inelastic-demand-whats-the-difference",
      label: "Elastic vs Inelastic Demand",
    },
  },
  {
    id: "elasticity-coefficient",
    name: "Elasticity Coefficient",
    definition:
      "The numeric output of an elasticity calculation, typically negative for ordinary goods since demand falls as price rises. A coefficient of -1.2 means a 1% price increase is associated with roughly a 1.2% drop in units sold.",
  },
  {
    id: "confidence-score",
    name: "Confidence Score",
    definition:
      "A rating attached to a pricing recommendation reflecting how much real sales history and price variation actually support it, rather than presenting every recommendation with equal certainty. A thin-data product should carry a lower confidence label than a well-established bestseller with years of price movement behind it.",
  },
  {
    id: "van-westendorp-price-sensitivity-meter",
    name: "Van Westendorp Price Sensitivity Meter",
    definition:
      "A survey method developed by economist Peter van Westendorp in 1976 that asks four price-perception questions (too cheap, a bargain, getting expensive, too expensive) and turns the answers into an acceptable price range and an optimal price point, without requiring any existing sales data.",
    learnMore: {
      href: "/blog/how-do-i-know-what-price-my-customers-are-willing-to-pay",
      label: "How Do I Know What Price Customers Will Pay",
    },
  },
  {
    id: "pmc",
    name: "PMC (Point of Marginal Cheapness)",
    definition:
      "In a Van Westendorp analysis, the lower bound of the acceptable price range, the price below which too many respondents start questioning the product's quality.",
    learnMore: {
      href: "/blog/van-westendorp-calculation-a-worked-example",
      label: "Van Westendorp Calculation: A Worked Example",
    },
  },
  {
    id: "pme",
    name: "PME (Point of Marginal Expensiveness)",
    definition:
      "In a Van Westendorp analysis, the upper bound of the acceptable price range, the price above which rejection on cost grounds accelerates sharply.",
    learnMore: {
      href: "/blog/van-westendorp-calculation-a-worked-example",
      label: "Van Westendorp Calculation: A Worked Example",
    },
  },
  {
    id: "opp",
    name: "OPP (Optimal Price Point)",
    definition:
      "In a Van Westendorp analysis, the price where the fewest respondents object on either extreme, too cheap or too expensive, at the same time.",
    learnMore: {
      href: "/blog/van-westendorp-calculation-a-worked-example",
      label: "Van Westendorp Calculation: A Worked Example",
    },
  },
  {
    id: "ipp",
    name: "IPP (Indifference Price Point)",
    definition:
      "In a Van Westendorp analysis, the psychological midpoint where an equal share of respondents see the price as a bargain and as getting expensive.",
    learnMore: {
      href: "/blog/van-westendorp-calculation-a-worked-example",
      label: "Van Westendorp Calculation: A Worked Example",
    },
  },
  {
    id: "cost-plus-pricing",
    name: "Cost-Plus Pricing",
    definition:
      "Setting a price by adding a fixed markup percentage on top of a product's unit cost. Simple and defensible, but it ignores what customers are actually willing to pay and what competitors charge.",
  },
  {
    id: "value-based-pricing",
    name: "Value-Based Pricing",
    definition:
      "Setting a price based on the value a customer receives from the product rather than what it cost to make. Requires understanding the customer's willingness to pay, often through a method like a Van Westendorp survey.",
  },
  {
    id: "competitive-pricing",
    name: "Competitive Pricing",
    definition:
      "Setting a price by anchoring to what competitors charge for similar products. Easy to research, but it inherits competitors' margin structure and can trigger a race to the bottom if used as the sole strategy.",
  },
  {
    id: "penetration-pricing",
    name: "Penetration Pricing",
    definition:
      "Launching a new product at a deliberately low price to win market share quickly, with the intent to raise prices later once demand and loyalty are established.",
  },
  {
    id: "price-skimming",
    name: "Price Skimming",
    definition:
      "Launching a new product at a high price to capture early adopters who are less price-sensitive, then gradually lowering the price to reach more price-sensitive segments over time.",
  },
  {
    id: "dynamic-pricing",
    name: "Dynamic Pricing",
    definition:
      "An ongoing rule or model that adjusts a product's price automatically in response to a signal, demand, inventory level, competitor moves, or timing, rather than a fixed price changed manually.",
    learnMore: {
      href: "/blog/dynamic-pricing-explained-definition-example-legal-risks",
      label: "Dynamic Pricing Explained",
    },
  },
  {
    id: "rule-based-pricing",
    name: "Rule-Based Pricing",
    definition:
      "A pricing approach that executes an if/then configuration a merchant sets manually, such as a quantity discount tier or a role-based wholesale price, rather than calculating a price from demand data.",
    learnMore: {
      href: "/blog/rule-based-vs-algorithmic-pricing-which-fits-your-store",
      label: "Rule-Based vs Algorithmic Pricing",
    },
  },
  {
    id: "algorithmic-pricing",
    name: "Algorithmic Pricing",
    definition:
      "A pricing approach that calculates a price from data, competitor prices, inventory, or a store's own sales history, rather than following a fixed rule a person configured.",
    learnMore: {
      href: "/blog/rule-based-vs-algorithmic-pricing-which-fits-your-store",
      label: "Rule-Based vs Algorithmic Pricing",
    },
  },
  {
    id: "repricing-software",
    name: "Repricing Software",
    definition:
      "A tool that tracks competitor prices and automatically adjusts a merchant's own prices to match or beat them, based on rules the merchant configures. Reads external market data rather than the merchant's own sales history.",
    learnMore: {
      href: "/blog/price-elasticity-vs-repricing-software",
      label: "Price Elasticity vs Repricing Software",
    },
  },
  {
    id: "charm-pricing",
    name: "Charm Pricing",
    definition:
      "Ending a price just below a round number, like $19.99 instead of $20, a psychological pricing tactic based on customers perceiving the price as meaningfully lower than it actually is.",
    learnMore: {
      href: "/blog/does-charm-pricing-999-actually-work",
      label: "Does Charm Pricing Actually Work",
    },
  },
  {
    id: "price-anchoring",
    name: "Price Anchoring",
    definition:
      "A psychological tactic where showing a higher reference price (like a crossed-out original price) shifts a customer's perception of what a lower, actual price represents in value.",
  },
  {
    id: "map",
    name: "MAP (Minimum Advertised Price)",
    definition:
      "A policy, usually set by a manufacturer or brand, restricting the lowest price a retailer can publicly advertise for a product. It restricts what can be advertised, not the actual price a customer pays through a private discount.",
    learnMore: {
      href: "/blog/minimum-advertised-price-what-sellers-need-to-know",
      label: "Minimum Advertised Price: What Sellers Need to Know",
    },
  },
  {
    id: "msrp",
    name: "MSRP (Manufacturer's Suggested Retail Price)",
    definition:
      "A non-binding price a manufacturer recommends retailers charge. Unlike MAP, there's typically no enforcement mechanism if a retailer sells below MSRP.",
  },
  {
    id: "markup-vs-margin",
    name: "Markup vs Margin",
    definition:
      "Markup is the amount added to a product's cost to set its price, expressed as a percentage of cost. Margin is profit expressed as a percentage of the selling price. A 50% markup on a $20 cost item ($30 price) is only a 33% margin, the two numbers are frequently confused.",
  },
  {
    id: "gross-margin",
    name: "Gross Margin",
    definition:
      "Revenue minus cost of goods sold, divided by revenue, expressed as a percentage. It measures how much of each sale remains after covering the direct cost of the product, before other operating expenses.",
  },
  {
    id: "discount-depth",
    name: "Discount Depth",
    definition:
      "How large a discount is, typically expressed as a percentage off the regular price. Discount depth should generally track a product's gross margin rather than an arbitrary round number.",
    learnMore: {
      href: "/blog/how-to-price-a-discount-without-losing-your-margin",
      label: "How to Price a Discount Without Losing Your Margin",
    },
  },
  {
    id: "bundle-pricing",
    name: "Bundle Pricing",
    definition:
      "Selling two or more products together at a combined price, usually lower than buying each item separately, to raise average order value or move slower-selling inventory alongside a bestseller.",
    learnMore: {
      href: "/blog/how-to-price-product-bundles-without-giving-away-your-margin",
      label: "How to Price Product Bundles Without Giving Away Your Margin",
    },
  },
];

const glossarySchema = {
  "@context": "https://schema.org",
  "@type": "DefinedTermSet",
  name: "Ecommerce Pricing Glossary",
  description: metadata.description,
  url: "https://www.tryzorin.com/glossary",
  hasDefinedTerm: terms.map((t) => ({
    "@type": "DefinedTerm",
    "@id": `https://www.tryzorin.com/glossary#${t.id}`,
    name: t.name,
    description: t.definition,
    inDefinedTermSet: "https://www.tryzorin.com/glossary",
  })),
};

export default function GlossaryPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(glossarySchema) }}
      />
      <Navbar />
      <main className="mx-auto max-w-2xl px-6 pb-24 pt-32 md:pb-32">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 md:text-4xl">
          Ecommerce Pricing Glossary
        </h1>
        <p className="mt-4 max-w-[60ch] text-base leading-relaxed text-zinc-500">
          Plain-English definitions for the pricing terms that come up most for Shopify and
          WooCommerce sellers, from price elasticity to Van Westendorp to MAP policies. Click any
          term to link directly to it.
        </p>

        <h2 className="mt-10 text-sm font-semibold uppercase tracking-wide text-zinc-400">
          Jump to a term
        </h2>
        <nav className="mt-3 flex flex-wrap gap-x-3 gap-y-2 border-y border-zinc-100 py-5 text-sm">
          {terms.map((t) => (
            <a
              key={t.id}
              href={`#${t.id}`}
              className="text-zinc-500 underline decoration-zinc-300 underline-offset-4 hover:text-emerald-700 hover:decoration-emerald-400"
            >
              {t.name}
            </a>
          ))}
        </nav>

        <dl className="mt-10 space-y-10">
          {terms.map((t) => (
            <div key={t.id} id={t.id} className="scroll-mt-28 border-b border-zinc-100 pb-8">
              <dt>
                <a
                  href={`#${t.id}`}
                  className="text-lg font-semibold text-zinc-900 hover:text-emerald-700"
                >
                  {t.name}
                </a>
              </dt>
              <dd className="mt-2 text-sm leading-relaxed text-zinc-500">
                {t.definition}
                {t.learnMore && (
                  <>
                    {" "}
                    <a
                      href={t.learnMore.href}
                      className="font-medium text-emerald-700 underline underline-offset-2"
                    >
                      {t.learnMore.label}
                    </a>
                  </>
                )}
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-16 border-t border-zinc-100 pt-10">
          <p className="text-sm leading-relaxed text-zinc-500">
            Curious what your own elasticity and confidence scores look like on real products?{" "}
            <a href="/signup" className="font-medium text-emerald-700 underline underline-offset-2">
              Connect your store and see your first recommendation in Zorin
            </a>
            .
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
