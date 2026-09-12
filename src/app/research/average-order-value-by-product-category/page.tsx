import { Navbar } from "@/components/marketing/Navbar";
import { Footer } from "@/components/marketing/Footer";

const BASE_URL = "https://www.tryzorin.com";
const PAGE_URL = `${BASE_URL}/research/average-order-value-by-product-category`;
const FIRST_PUBLISHED = "2026-09-12";
const LAST_UPDATED = "2026-09-12";
const OG_IMAGE = "/og-default.png";

export const metadata = {
  title: "Average Order Value by Product Category (Sourced Data) - Zorin",
  description:
    "Real average order value figures by ecommerce product category, sourced directly from public company filings and investor disclosures, citable.",
  keywords: [
    "average order value by category",
    "AOV benchmarks ecommerce",
    "ecommerce average order value",
    "AOV by industry",
  ],
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: "Average Order Value by Ecommerce Product Category",
    description:
      "Real, sourced average order value figures across ecommerce product categories, compiled directly from public company financial disclosures.",
    url: PAGE_URL,
    type: "article",
    publishedTime: FIRST_PUBLISHED,
    modifiedTime: LAST_UPDATED,
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: "Average Order Value by Ecommerce Product Category" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Average Order Value by Ecommerce Product Category",
    description:
      "Real, sourced average order value figures across ecommerce product categories, compiled directly from public company financial disclosures.",
    images: [OG_IMAGE],
  },
};

type CategoryRow = {
  category: string;
  aov: string;
  classification: string;
  explanation: string;
  note?: string;
  sources: { label: string; url: string; publisher: string }[];
};

const TIER_1: CategoryRow[] = [
  {
    category: "Luxury Resale",
    aov: "The RealReal: $641 (FY2025)",
    classification: "Highest AOV measured",
    explanation:
      "The RealReal's average order value rose 11% to $641 for full year 2025, continuing a multi-year climb driven by a mix shift into higher-value categories including watches, jewelry, and handbags. Luxury resale carries a structurally higher AOV than nearly any other ecommerce category because the underlying goods themselves, authenticated luxury items, carry a high per-unit price even at a resale discount to original retail. The trend itself is worth noting alongside the number: AOV growth here has come from customers buying pricier categories, not just paying more for the same mix of goods.",
    sources: [
      {
        label: "The RealReal, Inc. Q2 2026 results coverage",
        url: "https://pulse2.com/the-realreal-average-order-value-jumps-13-to-659-as-active-buyers-top-1-1-million/",
        publisher: "Pulse2 (reporting on The RealReal's own disclosed figures)",
      },
      {
        label: "The RealReal's 2025 Resale Report",
        url: "https://investor.therealreal.com/news-releases/news-release-details/realreals-2025-resale-report",
        publisher: "The RealReal investor relations",
      },
    ],
  },
  {
    category: "Furniture & Home Goods",
    aov: "Wayfair: $312 (FY2025)",
    classification: "High, and growing",
    explanation:
      "Wayfair's average order value ran $312 for full year 2025, up from $300 in 2024, and $301 in the fourth quarter of 2025 specifically, up from $290 a year earlier. Furniture and large home goods carry a naturally high AOV because individual items are expensive and customers often buy multiple pieces in a single order to furnish a room or complete a set, a very different purchase pattern than a single-item impulse buy in a lower-ticket category.",
    sources: [
      {
        label: "Wayfair Announces Fourth Quarter and Full Year 2025 Results",
        url: "https://www.prnewswire.com/news-releases/wayfair-announces-fourth-quarter-and-full-year-2025-results-reports-further-share-capture-and-strong-profitability-302691976.html",
        publisher: "PR Newswire (Wayfair press release)",
      },
    ],
  },
  {
    category: "General Merchandise & Home Essentials",
    aov: "Beyond, Inc.: $219 (Q2 2025)",
    classification: "Moderate, recovering",
    explanation:
      "Beyond, Inc., which owns Overstock and Bed Bath & Beyond, reported average order value of $219 in Q2 2025, up 7.2% from $204 in Q2 2024 and up 13% sequentially from $194 in Q1 2025. Management attributed the sequential improvement to seasonal AOV gains alongside order-volume growth. This category sits meaningfully below furniture-specific retailers like Wayfair despite overlapping categories, reflecting a broader mix that includes lower-ticket kitchen and bedding items alongside furniture.",
    sources: [
      {
        label: "Beyond, Inc. Reports Second Quarter Results with Sequential Revenue Growth and Significant Profitability Gains",
        url: "https://investors.beyond.com/news-events/press-releases/news-details/2025/Beyond-Inc--Reports-Second-Quarter-Results-with-Sequential-Revenue-Growth-and-Significant-Profitability-Gains/default.aspx",
        publisher: "Beyond, Inc. investor relations",
      },
    ],
  },
  {
    category: "Meal Kits & Food Subscription",
    aov: "Blue Apron: $62.99 (Q1 2022)",
    classification: "Lowest AOV measured",
    explanation:
      "Blue Apron formally defined and reported Average Order Value in its own SEC filings, calculated as net revenue from meal, wine, and market products divided by the number of orders. The company's last publicly reported figure, $62.99 in Q1 2022, up from $61.63 a year earlier, reflects a subscription box model built around a fixed number of meals per delivery rather than an open-ended cart a customer fills themselves, which structurally caps how high a single order's value can climb. Blue Apron was acquired by HelloFresh in 2023 and delisted, so this is the most recent SEC-filed figure available for this category rather than a current one, flagged honestly as dated rather than presented as current.",
    note: "Blue Apron was acquired by HelloFresh in 2023 and no longer files separately with the SEC, so this figure is from the company's last available public filing, not a current-year number.",
    sources: [
      {
        label: "Blue Apron Holdings, Inc. Q1 2022 Results (SEC filing)",
        url: "https://www.sec.gov/Archives/edgar/data/1701114/000155837022007697/aprn-20220509xex99d1.htm",
        publisher: "SEC EDGAR",
      },
    ],
  },
];

const NOT_VERIFIED = [
  {
    category: "Pet Products",
    reason:
      "Chewy does not disclose a per-order average order value. Its comparable disclosed metric is Net Sales Per Active Customer (NSPAC), an annual per-customer spending figure driven heavily by its Autoship subscription program (83.3% of fiscal 2025 net sales), not a per-transaction number. Reporting NSPAC as if it were AOV would conflate an annual spend metric with a per-order one, a meaningfully different thing for a subscription-heavy business.",
  },
  {
    category: "Handmade & Marketplace Goods",
    reason:
      "Etsy discloses Gross Merchandise Sales (GMS) per active buyer on a trailing-twelve-month basis ($125, down 3.5% year over year), an annual per-buyer figure across a buyer's total purchases, not a per-order AOV. Etsy does not separately break out a per-transaction average order value in its investor disclosures.",
  },
  {
    category: "Apparel (Subscription Styling)",
    reason:
      "Stitch Fix reports Average Order Value growth only as a percentage (\"rose nearly 10% year over year\") without disclosing the underlying dollar figure in recent earnings materials, and separately reports Net Revenue Per Active Client (RPAC, $559 in Q1 FY2026), an annual per-client metric, not a per-order one. Without a disclosed base dollar amount, the percentage change alone isn't enough to publish a reliable figure here.",
  },
  {
    category: "Apparel (Specialty Retail)",
    reason:
      "Torrid discloses Net Sales Per Active Customer ($306 for the fiscal year ended February 3, 2024), an annual metric, alongside units-per-transaction as a basket-size indicator, but does not separately disclose a per-order average order value in dollars.",
  },
  {
    category: "Eyewear & Health",
    reason:
      "Warby Parker discloses Average Revenue Per Customer ($324 for fiscal 2025, up from $263 in fiscal 2022), explicitly defined as a per-customer figure reflecting purchases like eye exams and lens upgrades bundled together, not a per-order average order value.",
  },
  {
    category: "General Apparel (Workwear)",
    reason:
      "Duluth Trading reports average order value change only as a percentage (\"rose 2.4% in the direct ecommerce channel\" in Q2 2026) without disclosing the underlying dollar base in its public earnings materials, so no reliable current dollar figure could be sourced.",
  },
  {
    category: "Gifting & Flowers",
    reason:
      "1-800-Flowers reports average order value change only as a percentage (\"a 5.5% increase in average order value\" for fiscal 2026) without disclosing the underlying dollar figure in its earnings call materials or press releases we reviewed.",
  },
];

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is a good average order value for an ecommerce store?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "It depends entirely on category. Based on the sourced data on this page, public companies report AOV ranging from about $63 (meal kit subscriptions) to $641 (luxury resale). A single-item, low-ticket category will always show a lower AOV than a category where customers routinely buy multiple expensive items per order, that difference reflects the product category, not store quality.",
      },
    },
    {
      "@type": "Question",
      name: "Which ecommerce categories have the highest average order value?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Based on the sourced data on this page, luxury resale (The RealReal, $641) and furniture and home goods (Wayfair, $312) show the highest average order values, both categories where individual items are expensive and customers often purchase multiple items per order.",
      },
    },
    {
      "@type": "Question",
      name: "Does every company report average order value the same way?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. Several companies we researched (Chewy, Etsy, Stitch Fix, Torrid, Warby Parker) report a related but different metric, an annual per-customer spending figure, rather than a per-order AOV. Others (Duluth Trading, 1-800-Flowers) disclose only a percentage change without the underlying dollar figure. We list these separately rather than treating a different metric as if it were AOV.",
      },
    },
    {
      "@type": "Question",
      name: "Why is Blue Apron's figure from 2022?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Blue Apron was acquired by HelloFresh in 2023 and stopped filing separately with the SEC. Its Q1 2022 figure is the most recent publicly available, SEC-sourced average order value disclosure for the meal-kit category, flagged honestly as dated rather than presented as current.",
      },
    },
    {
      "@type": "Question",
      name: "How often is this page updated?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "We revisit this page periodically to refresh figures as companies report new quarterly or annual results, and to add categories as verifiable per-order AOV disclosures become available. The page shows a last-updated date at the top.",
      },
    },
  ],
};

const datasetSchema = {
  "@context": "https://schema.org",
  "@type": "Dataset",
  name: "Average Order Value by Ecommerce Product Category",
  description:
    "A sourced compilation of average order value figures across ecommerce-relevant product categories, drawn from public company SEC filings and investor relations disclosures.",
  url: PAGE_URL,
  datePublished: FIRST_PUBLISHED,
  dateModified: LAST_UPDATED,
  creator: { "@type": "Organization", name: "Zorin", url: BASE_URL },
  publisher: { "@type": "Organization", name: "Zorin", url: BASE_URL },
  license: "https://www.tryzorin.com/terms",
  isAccessibleForFree: true,
  keywords: ["average order value by category", "AOV benchmarks", "ecommerce AOV", "AOV by industry"],
  variableMeasured: "Average order value (net revenue per order, in USD)",
  spatialCoverage: "United States and select international public companies",
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
    { "@type": "ListItem", position: 2, name: "Research", item: `${BASE_URL}/research` },
    { "@type": "ListItem", position: 3, name: "Average Order Value by Category", item: PAGE_URL },
  ],
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function AverageOrderValueByProductCategoryPage() {
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
          Average Order Value by Ecommerce Product Category
        </h1>
        <p className="mt-3 text-sm text-zinc-400">Last updated {formatDate(LAST_UPDATED)}</p>

        <p className="mt-6 text-lg leading-relaxed text-zinc-600">
          A sourced reference of real average order value (AOV) figures across ecommerce product
          categories, compiled directly from public company SEC filings, investor releases, and
          earnings calls. Every figure below links to its original source. Categories where the
          representative public company reports a different metric, or only a percentage change
          without a dollar base, are listed separately rather than substituted in as if they were
          the same thing.
        </p>
        <p className="mt-4 text-sm leading-relaxed text-zinc-600">
          &ldquo;Average order value&rdquo; turned out to be a less consistently disclosed metric
          than expected. Several well-known public companies report a related but genuinely
          different number, an annual per-customer spending figure driven by repeat purchases or
          subscriptions, rather than a per-order AOV. We treat that distinction as real rather than
          cosmetic: an annual per-customer figure and a per-order figure answer different
          questions, and blending them into one number would misrepresent both.
        </p>

        <div className="mt-10 rounded-xl border border-zinc-200 bg-zinc-50 p-6">
          <h2 className="text-sm font-semibold text-zinc-900">Methodology</h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600">
            We identified a publicly traded company representative of each category and pulled a
            disclosed average order value figure, defined as net revenue divided by number of
            orders in a given period, directly from its most recent SEC filing, investor press
            release, or earnings call transcript. We only published a figure where the company
            itself disclosed a dollar amount, not a percentage change alone.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-zinc-600">
            Categories where the representative company discloses a different metric entirely
            (typically an annual per-customer spending figure, since several public ecommerce
            companies now report engagement and repeat-purchase data instead of per-order AOV) are
            listed separately as unverified for this specific metric, rather than having that
            different number relabeled as AOV.
          </p>
        </div>

        <h2 className="mt-12 text-xl font-semibold text-zinc-900">Verified Categories</h2>
        <p className="mt-2 text-sm text-zinc-500">
          Each figure traces to a public company&apos;s own disclosed dollar amount for average
          order value.
        </p>

        <div className="mt-6 flex flex-col gap-4">
          {TIER_1.map((row) => (
            <div key={row.category} className="rounded-xl border border-zinc-200 p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-base font-semibold text-zinc-900">{row.category}</h3>
                <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-600">
                  {row.classification}
                </span>
              </div>
              <p className="mt-2 font-mono text-sm text-zinc-700">{row.aov}</p>
              <p className="mt-3 text-sm leading-relaxed text-zinc-600">{row.explanation}</p>
              {row.note && (
                <p className="mt-3 text-xs italic leading-relaxed text-zinc-500">{row.note}</p>
              )}
              <div className="mt-4 flex flex-col gap-1">
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
          These categories are represented by public companies that either disclose a different
          metric (an annual per-customer figure rather than per-order AOV) or only a percentage
          change without a dollar base.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          {NOT_VERIFIED.map((row) => (
            <div key={row.category} className="rounded-xl border border-zinc-300 bg-zinc-100 p-4">
              <h3 className="text-sm font-semibold text-zinc-700">{row.category}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">{row.reason}</p>
            </div>
          ))}
        </div>

        <h2 className="mt-12 text-xl font-semibold text-zinc-900">Limitations</h2>
        <p className="mt-3 text-sm leading-relaxed text-zinc-600">
          Every figure on this page comes from a company large enough to be publicly traded, with
          a broader catalog, more established brand recognition, and different customer behavior
          than a small independent store selling in the same category. AOV is also highly sensitive
          to a store&apos;s specific product mix and price points, two stores in the same broad
          category can have very different AOVs depending on whether they sell primarily entry-level
          or premium items. Treat these figures as a directional reference point, not a target to
          match.
        </p>

        <h2 className="mt-12 text-xl font-semibold text-zinc-900">What This Means for Your Own Store</h2>
        <p className="mt-3 text-sm leading-relaxed text-zinc-600">
          AOV by itself doesn&apos;t tell you whether a price is right, a higher AOV isn&apos;t
          automatically better if it came from raising prices past what customers will actually
          bear. The more useful question is whether your current prices, and the average order value
          they produce, are backed by evidence of what your specific customers will actually pay.{" "}
          <a href="/research/profit-margins-by-product-category" className="text-blue-600 hover:underline">
            Our companion page on gross margin by category
          </a>{" "}
          covers the profitability side of that same order, and{" "}
          <a href="/research/price-elasticity-by-category" className="text-blue-600 hover:underline">
            our page on price elasticity by category
          </a>{" "}
          covers how sensitive customer demand actually is to a price change in your specific
          category. <a href="/features/price-elasticity-modeling" className="text-blue-600 hover:underline">
            Zorin fits a demand model to your own sales history
          </a>{" "}
          so a price change is grounded in your own customers&apos; behavior rather than a category
          average.
        </p>

        <div className="mt-8 rounded-xl border border-blue-100 bg-blue-50 p-6 text-center">
          <p className="text-sm font-semibold text-zinc-900">
            See what your own customers actually pay, not a category average.
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
            Zorin. &ldquo;Average Order Value by Ecommerce Product Category.&rdquo; Updated{" "}
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
