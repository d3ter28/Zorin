import { Navbar } from "@/components/marketing/Navbar";
import { Footer } from "@/components/marketing/Footer";

const BASE_URL = "https://www.tryzorin.com";
const PAGE_URL = `${BASE_URL}/research/return-rate-by-product-category`;
const FIRST_PUBLISHED = "2026-09-25";
const LAST_UPDATED = "2026-09-25";
const OG_IMAGE = "/og-default.png";

export const metadata = {
  title: "Ecommerce Return Rate by Category (Sourced Data) - Zorin",
  description:
    "Online return rates by product category, apparel to beauty, sourced from NRF, Coresight Research, Zalando and published industry benchmarks.",
  keywords: [
    "return rate by product category",
    "ecommerce return rate by category",
    "average apparel return rate",
    "online return rate benchmark",
  ],
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: "Ecommerce Return Rate by Product Category",
    description:
      "Sourced online return rates across 7 ecommerce product categories, anchored to NRF's 2025 Retail Returns Landscape.",
    url: PAGE_URL,
    type: "article",
    publishedTime: FIRST_PUBLISHED,
    modifiedTime: LAST_UPDATED,
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: "Ecommerce Return Rate by Product Category" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Ecommerce Return Rate by Product Category",
    description:
      "Sourced online return rates across 7 ecommerce product categories, anchored to NRF's 2025 Retail Returns Landscape.",
    images: [OG_IMAGE],
  },
};

type Source = { label: string; publisher: string; url: string };

const SOURCES = {
  nrf: {
    label: "2025 Retail Returns Landscape (press release)",
    publisher: "National Retail Federation & Happy Returns",
    url: "https://nrf.com/media-center/press-releases/consumers-expected-to-return-nearly-850-billion-in-merchandise-in-2025",
  },
  coresight: {
    label: "The True Cost of Apparel Returns",
    publisher: "Coresight Research",
    url: "https://coresight.com/research/alarming-return-rates-require-loss-minimization-solutions-key-insights-free-infographic/",
  },
  zalando: {
    label: "Returns at Zalando",
    publisher: "Zalando SE",
    url: "https://corporate.zalando.com/en/about-us/what-we-do/returns-zalando",
  },
  richpanel: {
    label: "Ecommerce Return Rates in 2026: Benchmarks by Category",
    publisher: "Richpanel",
    url: "https://www.richpanel.com/learn/ecommerce-return-rates",
  },
  shipnetwork: {
    label: "How Return Rates Vary by Industry",
    publisher: "ShipNetwork",
    url: "https://www.shipnetwork.com/post/return-rates-by-industry",
  },
} satisfies Record<string, Source>;

type AnchorRow = { figure: string; what: string; period: string; source: Source };

const ANCHORS: AnchorRow[] = [
  { figure: "15.8%", what: "All U.S. retail sales returned", period: "2025 (forecast)", source: SOURCES.nrf },
  { figure: "19.3%", what: "U.S. online sales returned", period: "2025 (forecast)", source: SOURCES.nrf },
  { figure: "24.4%", what: "U.S. online apparel return rate", period: "12 months to March 2023", source: SOURCES.coresight },
  { figure: "~50%", what: "Items ordered that are returned, Zalando (fashion marketplace, Europe)", period: "Current, all markets", source: SOURCES.zalando },
];

type CategoryRow = { category: string; richpanel: string; shipnetwork: string; note?: string };

const ROWS: CategoryRow[] = [
  { category: "Apparel", richpanel: "20–40%", shipnetwork: "30–40%", note: "Coresight's measured 24.4% sits at the low end of both ranges; Zalando's ~50% item-level rate shows how high fashion-marketplace bracketing can push it." },
  { category: "Footwear", richpanel: "17–30%", shipnetwork: "25–35%" },
  { category: "Home & furniture", richpanel: "15–23%", shipnetwork: "15–20% (home goods), 15–25% (furniture)" },
  { category: "Auto parts", richpanel: "~19%", shipnetwork: "Not reported" },
  { category: "Accessories & jewelry", richpanel: "12–15%", shipnetwork: "Grouped with apparel" },
  { category: "Electronics", richpanel: "8–15%", shipnetwork: "8–10%" },
  { category: "Beauty & personal care", richpanel: "4–12%", shipnetwork: "4–10%" },
];

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is the average ecommerce return rate?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "The National Retail Federation and Happy Returns estimate that 19.3% of U.S. online sales will be returned in 2025, compared with 15.8% of all retail sales.",
      },
    },
    {
      "@type": "Question",
      name: "Which product category has the highest return rate?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Apparel. Published benchmarks put it at 20-40%, Coresight Research measured 24.4% for U.S. online apparel, and fashion marketplace Zalando reports that around 50% of items ordered are returned. Footwear is close behind at roughly 17-35%.",
      },
    },
    {
      "@type": "Question",
      name: "Which product category has the lowest return rate?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Beauty and personal care, at roughly 4-12% in published benchmarks, partly because opened products usually can't be resold and many stores restrict those returns. Electronics is also low at roughly 8-15%.",
      },
    },
    {
      "@type": "Question",
      name: "Why do apparel and footwear have such high return rates?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Fit. Shoppers often order several sizes and send back the ones that don't fit (known as bracketing). In Coresight Research's U.S. apparel survey, size and fit was the top reason for online apparel returns.",
      },
    },
    {
      "@type": "Question",
      name: "How do returns affect pricing?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "A returned sale earns no revenue but still costs shipping and handling, so your effective margin is lower than your sticker margin. A category with a 30% return rate needs more headroom in its price than one with a 5% rate before a discount becomes safe.",
      },
    },
  ],
};

const datasetSchema = {
  "@context": "https://schema.org",
  "@type": "Dataset",
  name: "Ecommerce Return Rate by Product Category",
  description:
    "Online return rates by ecommerce product category, compiled from the NRF 2025 Retail Returns Landscape, Coresight Research, Zalando and two published industry benchmark compilations.",
  url: PAGE_URL,
  datePublished: FIRST_PUBLISHED,
  dateModified: LAST_UPDATED,
  creator: { "@type": "Organization", name: "Zorin", url: BASE_URL },
  publisher: { "@type": "Organization", name: "Zorin", url: BASE_URL },
  license: "https://www.tryzorin.com/terms",
  isAccessibleForFree: true,
  keywords: ["return rate by category", "ecommerce return rate", "apparel return rate", "online returns benchmark"],
  variableMeasured: "Share of online sales or items returned",
  spatialCoverage: "United States, Europe",
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
    { "@type": "ListItem", position: 2, name: "Research", item: `${BASE_URL}/research` },
    { "@type": "ListItem", position: 3, name: "Return Rate by Category", item: PAGE_URL },
  ],
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function SourceLink({ source }: { source: Source }) {
  return (
    <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
      {source.publisher}
    </a>
  );
}

export default function ReturnRateByProductCategoryPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(datasetSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <Navbar />
      <main className="mx-auto max-w-3xl px-6 pb-24 pt-32 md:pb-32">
        <a href="/research" className="mb-6 inline-flex items-center gap-1.5 text-sm text-zinc-400 transition-colors hover:text-zinc-600">
          ← Research
        </a>

        <span className="inline-flex w-fit rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-600">
          Research
        </span>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-zinc-900 md:text-4xl">
          Ecommerce Return Rate by Product Category
        </h1>
        <p className="mt-3 text-sm text-zinc-400">Last updated {formatDate(LAST_UPDATED)}</p>

        <p className="mt-6 text-lg leading-relaxed text-zinc-600">
          A sourced reference of online return rates across 7 ecommerce product categories. Roughly
          one in five online sales comes back, but the spread by category is wide, from single
          digits in beauty to 30% and more in apparel. Every figure below links to where it came
          from.
        </p>

        <div className="mt-10 rounded-xl border border-zinc-200 bg-zinc-50 p-6">
          <h2 className="text-sm font-semibold text-zinc-900">Methodology</h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600">
            Few retailers disclose return rates by category, so this page works in two layers. The
            first is a small set of measured anchor figures from named primary sources: the NRF and
            Happy Returns annual returns survey, Coresight Research&apos;s apparel study, and
            Zalando&apos;s own disclosure. The second is the category ranges published by two
            ecommerce operations companies, Richpanel and ShipNetwork, shown side by side so you
            can see where they agree and where they don&apos;t. Treat the ranges as benchmarks, not
            precise measurements.
          </p>
        </div>

        <h2 className="mt-12 text-xl font-semibold text-zinc-900">Anchor Figures from Primary Sources</h2>
        <div className="mt-6 overflow-x-auto rounded-xl border border-zinc-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-3">Figure</th>
                <th className="px-4 py-3">What it measures</th>
                <th className="px-4 py-3">Period</th>
                <th className="px-4 py-3">Source</th>
              </tr>
            </thead>
            <tbody>
              {ANCHORS.map((row) => (
                <tr key={row.what} className="border-t border-zinc-100">
                  <td className="px-4 py-3 font-mono font-medium text-zinc-900">{row.figure}</td>
                  <td className="px-4 py-3 text-zinc-700">{row.what}</td>
                  <td className="px-4 py-3 text-zinc-500">{row.period}</td>
                  <td className="px-4 py-3"><SourceLink source={row.source} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 className="mt-12 text-xl font-semibold text-zinc-900">Return Rate by Category</h2>
        <p className="mt-2 text-sm text-zinc-500">
          Typical share of online orders returned, as published by each source (2026 editions).
        </p>
        <div className="mt-6 overflow-x-auto rounded-xl border border-zinc-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Richpanel</th>
                <th className="px-4 py-3">ShipNetwork</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row.category} className="border-t border-zinc-100">
                  <td className="px-4 py-3 font-medium text-zinc-900">{row.category}</td>
                  <td className="px-4 py-3 font-mono text-zinc-700">{row.richpanel}</td>
                  <td className="px-4 py-3 font-mono text-zinc-700">{row.shipnetwork}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {ROWS.filter((r) => r.note).map((r) => (
          <p key={r.category} className="mt-3 text-xs italic leading-relaxed text-zinc-500">
            {r.category}: {r.note}
          </p>
        ))}
        <p className="mt-4 text-xs text-zinc-500">
          Sources:{" "}
          <a href={SOURCES.richpanel.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
            {SOURCES.richpanel.label}, {SOURCES.richpanel.publisher}
          </a>
          ;{" "}
          <a href={SOURCES.shipnetwork.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
            {SOURCES.shipnetwork.label}, {SOURCES.shipnetwork.publisher}
          </a>
          .
        </p>

        <h2 className="mt-12 text-xl font-semibold text-zinc-900">Limitations</h2>
        <p className="mt-3 text-sm leading-relaxed text-zinc-600">
          The category ranges are compilations. Neither publisher states a single underlying
          sample, so they&apos;re useful for seeing roughly where a category sits, not for measuring
          your store to the decimal point. The anchor figures measure different things: NRF and
          Coresight report a share of sales value, while Zalando reports a share of items ordered,
          which runs higher when shoppers order several sizes. Return rates also depend heavily
          on your own policy. Free returns and long return windows push the rate up.
        </p>

        <h2 className="mt-12 text-xl font-semibold text-zinc-900">What This Means for Your Own Store</h2>
        <p className="mt-3 text-sm leading-relaxed text-zinc-600">
          Returns come straight out of margin. Say you sell a $60 jacket with a 50% gross margin
          and a 30% return rate. If each return costs you $8 in shipping and handling, then out of
          every 10 sales, 3 come back. That leaves 7 × $30 = $210 in gross profit, minus 3 × $8 =
          $24 in return costs, or $186. That&apos;s $18.60 per sale sent, not the $30 on the
          sticker. That lower number is the margin a discount actually has to fit inside. The{" "}
          <a href="/research/profit-margins-by-product-category" className="text-blue-600 hover:underline">
            gross margins by category
          </a>{" "}
          page gives the other half of this calculation, and{" "}
          <a href="/blog/how-to-price-a-discount-without-losing-your-margin" className="text-blue-600 hover:underline">
            how much you can discount without killing your margin
          </a>{" "}
          walks through sizing a discount against it.{" "}
          <a href="/features/price-elasticity-modeling" className="text-blue-600 hover:underline">
            Zorin reads your own sales history
          </a>{" "}
          to show how each product responds to a price change, so you can price against your real
          margin rather than a category average.
        </p>

        <div className="mt-8 rounded-xl border border-blue-100 bg-blue-50 p-6 text-center">
          <p className="text-sm font-semibold text-zinc-900">
            Find the price your products can actually hold, after returns.
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
            Zorin. &ldquo;Ecommerce Return Rate by Product Category.&rdquo; Updated{" "}
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
