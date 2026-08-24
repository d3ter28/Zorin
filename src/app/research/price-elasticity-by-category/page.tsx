import { Navbar } from "@/components/marketing/Navbar";
import { Footer } from "@/components/marketing/Footer";

const BASE_URL = "https://www.tryzorin.com";
const PAGE_URL = `${BASE_URL}/research/price-elasticity-by-category`;
const LAST_UPDATED = "2026-08-23";

export const metadata = {
  title: "Price Elasticity by Product Category (Sourced Data) - Zorin",
  description:
    "A sourced reference of real price elasticity of demand coefficients by ecommerce product category, compiled from peer-reviewed studies and government data. Updated periodically.",
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: "Price Elasticity of Demand by Product Category",
    description:
      "Real, sourced elasticity coefficients across 8 ecommerce categories, compiled from peer-reviewed research and government data.",
    url: PAGE_URL,
    type: "article",
  },
};

type CategoryRow = {
  category: string;
  coefficient: string;
  classification: string;
  note?: string;
  sources: { label: string; url: string; publisher: string }[];
};

const TIER_1: CategoryRow[] = [
  {
    category: "Food & grocery staples",
    coefficient: "Near 0 (flour, rice, pasta, biscuits); -1.10 (citrus)",
    classification: "Perfectly inelastic to elastic, varies sharply by staple vs. non-staple",
    note: "Staple grains and baked goods are almost perfectly inelastic; fresh citrus is the most elastic food category measured in this dataset.",
    sources: [
      {
        label: "The Demand for Disaggregated Food-Away-From-Home and Food-at-Home Products in the United States (ERR-139)",
        url: "https://www.ers.usda.gov/sites/default/files/_laserfiche/publications/45003/30438_err139.pdf",
        publisher: "USDA Economic Research Service",
      },
    ],
  },
  {
    category: "Alcohol (beer, wine, spirits)",
    coefficient: "Beer -0.17 to -0.30, wine -0.23 to -0.66, spirits -0.39 to -0.65",
    classification: "Inelastic, spirits somewhat more elastic than beer",
    note: "Three independent meta-analyses converge on the same ranking (beer least elastic, spirits most) even though absolute values differ by correction method.",
    sources: [
      {
        label: "Meta-analysis of alcohol price and income elasticities, with corrections for publication bias",
        url: "https://healtheconomicsreview.biomedcentral.com/articles/10.1186/2191-1991-3-17",
        publisher: "Health Economics Review",
      },
      {
        label: "Robust Demand Elasticities for Wine and Distilled Spirits",
        url: "https://www.researchgate.net/publication/259762127_Robust_Demand_Elasticities_for_Wine_and_Distilled_Spirits_Meta-Analysis_with_Corrections_for_Outliers_and_Publication_Bias",
        publisher: "Journal of Wine Economics (meta-analysis)",
      },
    ],
  },
  {
    category: "Soft drinks & sugar-sweetened beverages",
    coefficient: "-1.06 to -1.37",
    classification: "Elastic",
    note: "Consistent across two independent country-level studies (Mexico, Chile).",
    sources: [
      {
        label: "Price elasticity of the demand for soft drinks, other sugar-sweetened beverages and energy dense food in Chile",
        url: "https://bmcpublichealth.biomedcentral.com/articles/10.1186/s12889-017-4098-x",
        publisher: "BMC Public Health",
      },
    ],
  },
  {
    category: "Apparel & clothing",
    coefficient: "-1.17 (t-shirts) to -2.86 (casual/athletic wear)",
    classification: "Elastic, more so for casual/athletic than basics",
    note: "Wide range across sub-categories and studies; men's clothing measured somewhat more elastic than women's in one dataset (-2.83% vs -2.13% for a matched price change).",
    sources: [
      {
        label: "Demand Analysis of Clothing and Footwear: Price, Expenditure, and Economic Crisis Effects",
        url: "https://www.researchgate.net/publication/276219645_Demand_Analysis_of_Clothing_and_Footwear_The_Effects_of_Price_Total_Consumption_Expenditures_and_Economic_Crisis",
        publisher: "Academic study (peer-reviewed)",
      },
    ],
  },
  {
    category: "Household appliances",
    coefficient: "Refrigerators -0.40, clothes washers -0.31, dishwashers -0.32 (avg -0.35)",
    classification: "Inelastic",
    sources: [
      {
        label: "An Analysis of the Price Elasticity of Demand for Household Appliances",
        url: "https://www.osti.gov/servlets/purl/929429",
        publisher: "US Department of Energy / Office of Scientific and Technical Information",
      },
      {
        label: "Estimating Price Elasticity Using Market-Level Appliance Data",
        url: "https://eta.lbl.gov/publications/estimating-price-elasticity-using",
        publisher: "Lawrence Berkeley National Laboratory",
      },
    ],
  },
  {
    category: "Books",
    coefficient: "-1.4 aggregate; e-books -0.20 to -0.27 (trending less elastic over time)",
    classification: "Elastic, e-books notably less so and becoming more inelastic year over year",
    sources: [
      {
        label: "Retail Consolidation and the Price Elasticity of Demand for Books",
        url: "https://www.researchgate.net/publication/267713110_Retail_Consolidation_And_The_Price_Elasticity_Of_Demand_For_Books",
        publisher: "International Business & Economics Research Journal (peer-reviewed)",
      },
    ],
  },
];

const TIER_2: CategoryRow[] = [
  {
    category: "Furniture & home goods",
    coefficient: "-0.42 (moderate price increases) to -0.56 (larger increases); -1.3 is the commonly-cited textbook figure",
    classification: "Inelastic to unitary, depending on methodology",
    note: "Real-market industry-cycle analysis and the standard textbook estimate disagree meaningfully. We show both rather than picking one.",
    sources: [
      {
        label: "Furniture Demand Faces the Elasticity Test",
        url: "https://www.zelmanassociates.com/resources/zelman-insights/2026-02-(1)/furniture-demand-faces-the-elasticity-test,-but-ho",
        publisher: "Zelman & Associates (industry research)",
      },
    ],
  },
  {
    category: "Footwear",
    coefficient: "-0.7 general market; premium/branded footwear notably more elastic",
    classification: "Inelastic overall, elastic at the premium-brand tier",
    sources: [
      {
        label: "Price elasticity estimate for US footwear market",
        url: "https://homework.study.com/explanation/according-to-a-study-the-price-elasticity-of-shoes-in-the-united-states-is-0-7-and-the-income-elasticity-is-0-9-a-would-you-suggest-that-the-brown-shoe-company-cut-its-prices-to-increase-its-reven.html",
        publisher: "Cited academic estimate (secondary source, single figure)",
      },
    ],
  },
];

const NOT_VERIFIED = [
  {
    category: "Skincare & cosmetics",
    reason:
      "Despite being a common ecommerce vertical, we could not find a real, numeric elasticity coefficient anywhere in the published literature, only vague directional claims (asymmetric response to price cuts vs. increases). We'd rather flag the gap than fabricate a number.",
  },
  {
    category: "Jewelry & luxury goods",
    reason:
      "Sources actively contradict each other on whether luxury demand is elastic or inelastic, with no empirical coefficient we could verify.",
  },
  {
    category: "Dietary supplements",
    reason: "No category-specific published research found.",
  },
  {
    category: "Toys",
    reason:
      "The only numeric figure we found (-1.2 to -1.5) is for video game consoles specifically, arguably an electronics category, not general toys. General toy claims in circulation are qualitative only.",
  },
  {
    category: "Sporting goods",
    reason: "No category-specific published research found.",
  },
  {
    category: "Pet products",
    reason:
      "The one figure commonly repeated online (a 0.8 coefficient for dog food) traces back to a textbook homework exercise, not empirical research, and does not belong in a sourced dataset.",
  },
];

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is price elasticity of demand?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Price elasticity of demand measures how much the quantity of a product sold changes in response to a change in its price. A coefficient below 1 (in absolute value) means demand is inelastic, customers keep buying even if price moves. Above 1 means demand is elastic, customers are highly price-sensitive.",
      },
    },
    {
      "@type": "Question",
      name: "Which ecommerce product categories have the most inelastic demand?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Based on the sourced data on this page, staple food and grocery items (flour, rice, pasta) and household appliances are the most inelastic categories, meaning demand barely moves even when price does.",
      },
    },
    {
      "@type": "Question",
      name: "Which ecommerce product categories have the most elastic demand?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Books, apparel (especially casual and athletic wear), and sugar-sweetened beverages show the most elastic demand in the sourced studies on this page, meaning a price change produces a proportionally larger change in units sold.",
      },
    },
    {
      "@type": "Question",
      name: "Can I use these category averages to set my own store's prices?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Treat these as a starting reference point, not a substitute for your own data. A category average blends many brands, price points, and customer bases together. Your specific product's elasticity, calculated from your own sales history, is a more reliable signal for an actual pricing decision than a market-wide average.",
      },
    },
    {
      "@type": "Question",
      name: "Why are some categories missing from this page?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "We only publish a coefficient when we found real, sourced research behind it. Several common ecommerce categories, including skincare, jewelry, and supplements, don't have verifiable published elasticity data yet, so we've listed them separately as gaps rather than filling them with a guess.",
      },
    },
    {
      "@type": "Question",
      name: "How often is this page updated?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "We revisit this page periodically to add newly published research and fill gaps in currently unverified categories. The page shows a last-updated date at the top.",
      },
    },
  ],
};

const datasetSchema = {
  "@context": "https://schema.org",
  "@type": "Dataset",
  name: "Price Elasticity of Demand by Ecommerce Product Category",
  description:
    "A sourced compilation of published price elasticity of demand coefficients across ecommerce-relevant product categories, drawn from peer-reviewed academic research and government economic data.",
  url: PAGE_URL,
  dateModified: LAST_UPDATED,
  creator: { "@type": "Organization", name: "Zorin", url: BASE_URL },
  license: "https://www.tryzorin.com/terms",
  variableMeasured: "Price elasticity of demand coefficient",
  spatialCoverage: "United States (primary), with some international study data",
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
    { "@type": "ListItem", position: 2, name: "Research", item: `${BASE_URL}/research` },
    { "@type": "ListItem", position: 3, name: "Price Elasticity by Category", item: PAGE_URL },
  ],
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function PriceElasticityByCategoryPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(datasetSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <Navbar />
      <main className="mx-auto max-w-3xl px-6 pb-24 pt-32 md:pb-32">
        <a href="/blog/cluster/price-elasticity" className="mb-6 inline-flex items-center gap-1.5 text-sm text-zinc-400 transition-colors hover:text-zinc-600">
          ← Price Elasticity cluster
        </a>

        <span className="inline-flex w-fit rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-600">
          Research
        </span>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-zinc-900 md:text-4xl">
          Price Elasticity of Demand by Product Category
        </h1>
        <p className="mt-3 text-sm text-zinc-400">Last updated {formatDate(LAST_UPDATED)}</p>

        <p className="mt-6 max-w-[65ch] text-lg leading-relaxed text-zinc-600">
          A sourced reference of real price elasticity of demand coefficients across ecommerce
          product categories, compiled from peer-reviewed academic research and government
          economic data. Every figure below links to its original source. Categories where we
          could not find verifiable data are listed separately rather than filled in with a guess.
        </p>

        <div className="mt-10 rounded-xl border border-zinc-200 bg-zinc-50 p-6">
          <h2 className="text-sm font-semibold text-zinc-900">Methodology</h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600">
            We searched for published elasticity estimates across ecommerce-relevant categories,
            prioritizing peer-reviewed academic studies, government economic data (USDA, US
            Department of Energy), and multi-study meta-analyses over single blog posts or
            secondary summaries. Where multiple credible studies disagree, we show the range
            rather than averaging them into one number. Categories are split into two tiers based
            on source strength, and a third list names categories we searched for but could not
            verify. This page does not include any of Zorin&apos;s own merchant data, only
            independently published third-party research.
          </p>
        </div>

        <h2 className="mt-12 text-xl font-semibold text-zinc-900">Strongly Sourced Categories</h2>
        <p className="mt-2 text-sm text-zinc-500">Multiple corroborating peer-reviewed or government sources.</p>

        <div className="mt-6 flex flex-col gap-4">
          {TIER_1.map((row) => (
            <div key={row.category} className="rounded-xl border border-zinc-200 p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-base font-semibold text-zinc-900">{row.category}</h3>
                <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-600">
                  {row.classification}
                </span>
              </div>
              <p className="mt-2 font-mono text-sm text-zinc-700">{row.coefficient}</p>
              {row.note && <p className="mt-2 text-sm leading-relaxed text-zinc-500">{row.note}</p>}
              <div className="mt-3 flex flex-col gap-1">
                {row.sources.map((s) => (
                  <a
                    key={s.url}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline"
                  >
                    {s.label}, {s.publisher}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>

        <h2 className="mt-12 text-xl font-semibold text-zinc-900">Moderately Sourced Categories</h2>
        <p className="mt-2 text-sm text-zinc-500">
          A usable figure exists, but from thinner or conflicting sources. Included with caveats
          rather than excluded.
        </p>

        <div className="mt-6 flex flex-col gap-4">
          {TIER_2.map((row) => (
            <div key={row.category} className="rounded-xl border border-zinc-200 p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-base font-semibold text-zinc-900">{row.category}</h3>
                <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                  {row.classification}
                </span>
              </div>
              <p className="mt-2 font-mono text-sm text-zinc-700">{row.coefficient}</p>
              {row.note && <p className="mt-2 text-sm leading-relaxed text-zinc-500">{row.note}</p>}
              <div className="mt-3 flex flex-col gap-1">
                {row.sources.map((s) => (
                  <a
                    key={s.url}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline"
                  >
                    {s.label}, {s.publisher}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>

        <h2 className="mt-12 text-xl font-semibold text-zinc-900">Categories We Couldn&apos;t Verify Yet</h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-500">
          We searched for each of these and either found no empirical data, or found numbers we
          judged unreliable enough to exclude. Listed here for transparency, not as a promise
          they&apos;ll never be filled in.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          {NOT_VERIFIED.map((row) => (
            <div key={row.category} className="rounded-xl border border-zinc-100 bg-zinc-50 p-4">
              <h3 className="text-sm font-semibold text-zinc-700">{row.category}</h3>
              <p className="mt-1 text-sm leading-relaxed text-zinc-500">{row.reason}</p>
            </div>
          ))}
        </div>

        <h2 className="mt-12 text-xl font-semibold text-zinc-900">What This Means for Your Own Store</h2>
        <p className="mt-3 max-w-[65ch] text-sm leading-relaxed text-zinc-600">
          These are market-wide averages, blended across many brands, price points, and customer
          bases. They&apos;re a useful starting reference, not a substitute for your own data. A
          specific product in your catalog can behave very differently from its category average
          depending on your brand positioning, your customers, and your competitive set. <a href="/features/price-elasticity-modeling" className="text-blue-600 hover:underline">Zorin fits an elasticity model directly to your own sales history</a>,
          per SKU, so the number you act on reflects your actual customers rather than a category-wide
          blend. If you want the mechanics of running that calculation yourself first, <a href="/blog/how-to-calculate-price-elasticity-for-your-shopify-store" className="text-blue-600 hover:underline">the Shopify walkthrough</a> and <a href="/blog/how-to-calculate-price-elasticity-for-your-woocommerce-store" className="text-blue-600 hover:underline">the WooCommerce walkthrough</a> cover
          the same formula used to produce the figures above.
        </p>

        <div className="mt-8 rounded-xl border border-blue-100 bg-blue-50 p-6 text-center">
          <p className="text-sm font-semibold text-zinc-900">
            See your own catalog&apos;s elasticity, not a category average.
          </p>
          <a
            href="/signup"
            className="mt-3 inline-flex h-10 items-center rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700 active:scale-[0.98]"
          >
            Start free trial
          </a>
        </div>

        <h2 className="mt-12 text-xl font-semibold text-zinc-900">Frequently Asked Questions</h2>
        <div className="mt-4 flex flex-col gap-5">
          {faqSchema.mainEntity.map((q) => (
            <div key={q.name}>
              <h3 className="text-sm font-semibold text-zinc-900">{q.name}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">{q.acceptedAnswer.text}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-xl border border-zinc-200 p-5">
          <h2 className="text-sm font-semibold text-zinc-900">How to Cite This Page</h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-500">
            Zorin. &ldquo;Price Elasticity of Demand by Product Category.&rdquo; Updated{" "}
            {formatDate(LAST_UPDATED)}.{" "}
            <a href={PAGE_URL} className="text-blue-600 hover:underline">
              {PAGE_URL}
            </a>
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
