import { Navbar } from "@/components/marketing/Navbar";
import { Footer } from "@/components/marketing/Footer";

const BASE_URL = "https://www.tryzorin.com";
const PAGE_URL = `${BASE_URL}/research/discount-depth-by-product-category`;
const FIRST_PUBLISHED = "2026-09-20";
const LAST_UPDATED = "2026-09-20";
const OG_IMAGE = "/og-default.png";

export const metadata = {
  title: "Discount Depth by Product Category (Sourced Data) - Zorin",
  description:
    "Real peak promotional discount depth by product category during Black Friday/Cyber Week 2025, sourced from Adobe Analytics, with year-over-year comparison.",
  keywords: [
    "discount depth by category",
    "average discount percentage by category",
    "Black Friday discount percentage electronics apparel",
    "how deep should a discount be by category",
  ],
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: "Discount Depth by Ecommerce Product Category",
    description:
      "Real, sourced peak promotional discount depth across 8 ecommerce product categories, from Adobe Analytics' Holiday 2025 shopping report.",
    url: PAGE_URL,
    type: "article",
    publishedTime: FIRST_PUBLISHED,
    modifiedTime: LAST_UPDATED,
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: "Discount Depth by Ecommerce Product Category" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Discount Depth by Ecommerce Product Category",
    description:
      "Real, sourced peak promotional discount depth across 8 ecommerce product categories, from Adobe Analytics' Holiday 2025 shopping report.",
    images: [OG_IMAGE],
  },
};

type CategoryRow = {
  category: string;
  depth2025: number;
  depth2024: number;
  note?: string;
};

const ADOBE_SOURCE = {
  label: "Adobe Holiday Shopping Season 2025 Report",
  url: "https://news.adobe.com/news/2026/01/adobe-holiday-shopping-season",
  publisher: "Adobe Analytics / Adobe Digital Price Index",
};

const ROWS: CategoryRow[] = [
  { category: "Electronics", depth2025: 30.9, depth2024: 30.1 },
  { category: "Toys", depth2025: 29.6, depth2024: 28.0 },
  { category: "Apparel", depth2025: 25.1, depth2024: 23.2 },
  { category: "Televisions", depth2025: 24.3, depth2024: 24.2 },
  { category: "Computers", depth2025: 23.4, depth2024: 22.8 },
  { category: "Sporting Goods", depth2025: 20.3, depth2024: 19.5 },
  { category: "Appliances", depth2025: 20.2, depth2024: 19.2 },
  {
    category: "Furniture",
    depth2025: 18.8,
    depth2024: 19.0,
    note: "The one category that discounted slightly less deeply than the prior year.",
  },
];

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What's a typical discount depth by product category?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Based on Adobe Analytics' peak Black Friday/Cyber Week 2025 data, discount depth ranged from 18.8% (furniture) to 30.9% (electronics) off list price. Electronics, toys, and apparel discounted deepest; furniture and appliances discounted the least.",
      },
    },
    {
      "@type": "Question",
      name: "Which categories discount the most?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Electronics (30.9%), toys (29.6%), and apparel (25.1%) showed the deepest peak discounts during the 2025 holiday shopping season, per Adobe Analytics.",
      },
    },
    {
      "@type": "Question",
      name: "Which categories discount the least?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Furniture (18.8%) and appliances (20.2%) showed the shallowest peak discounts in the 2025 data. Furniture was also the only category in this dataset to discount slightly less deeply than the prior year (18.8% vs 19.0% in 2024).",
      },
    },
    {
      "@type": "Question",
      name: "Is this the same as the discount impact on margin research?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No, they measure different things. This page measures discount depth, the percentage taken off the list price during peak promotional periods, sourced from Adobe's industry-wide analytics. The companion discount impact on margin page measures the actual basis-point hit to a specific public company's gross margin from that discounting, sourced from individual SEC filings.",
      },
    },
    {
      "@type": "Question",
      name: "Does discount depth typically increase or decrease year over year?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "In the 2025 data, 7 of 8 categories discounted more deeply than in 2024, with electronics essentially flat and toys and apparel increasing the most (toys up 1.6 points, apparel up 1.9 points). Furniture was the only category to discount less deeply than the prior year.",
      },
    },
  ],
};

const datasetSchema = {
  "@context": "https://schema.org",
  "@type": "Dataset",
  name: "Discount Depth by Ecommerce Product Category",
  description:
    "Peak promotional discount depth (percentage off list price) by ecommerce product category during Black Friday/Cyber Week 2025, sourced from Adobe Analytics.",
  url: PAGE_URL,
  datePublished: FIRST_PUBLISHED,
  dateModified: LAST_UPDATED,
  creator: { "@type": "Organization", name: "Zorin", url: BASE_URL },
  publisher: { "@type": "Organization", name: "Zorin", url: BASE_URL },
  license: "https://www.tryzorin.com/terms",
  isAccessibleForFree: true,
  keywords: ["discount depth by category", "peak promotional discount percentage", "holiday discount benchmarks"],
  variableMeasured: "Peak promotional discount depth (percentage off list price)",
  spatialCoverage: "United States",
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
    { "@type": "ListItem", position: 2, name: "Research", item: `${BASE_URL}/research` },
    { "@type": "ListItem", position: 3, name: "Discount Depth by Category", item: PAGE_URL },
  ],
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

export default function DiscountDepthByProductCategoryPage() {
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
          Discount Depth by Ecommerce Product Category
        </h1>
        <p className="mt-3 text-sm text-zinc-400">Last updated {formatDate(LAST_UPDATED)}</p>

        <p className="mt-6 text-lg leading-relaxed text-zinc-600">
          A sourced reference of real peak promotional discount depth, the percentage taken off
          list price, across 8 ecommerce product categories during Black Friday/Cyber Week 2025,
          with a year-over-year comparison. Every figure below traces to Adobe Analytics&apos;
          official holiday shopping report.
        </p>
        <p className="mt-4 text-sm leading-relaxed text-zinc-600">
          This is a companion to{" "}
          <a href="/research/discount-impact-on-margin-by-product-category" className="text-blue-600 hover:underline">
            discount impact on margin by category
          </a>
          , but it measures a different thing: how deep the discount actually goes, not what that
          discount costs a specific company&apos;s gross margin. Read together, one tells you what
          &ldquo;typical&rdquo; looks like, the other tells you what it costs.
        </p>

        <div className="mt-10 rounded-xl border border-zinc-200 bg-zinc-50 p-6">
          <h2 className="text-sm font-semibold text-zinc-900">Methodology</h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600">
            Figures are peak discount percentages off list price during the Black Friday/Cyber
            Week 2025 window, as reported by Adobe Analytics across billions of dollars in tracked
            U.S. online transactions. Unlike our other category research pages, which draw on
            individual public companies&apos; SEC filings, this page uses a single industry-wide
            analytics source, since no small set of companies discloses discount depth as a clean,
            comparable percentage the way they disclose gross margin or inventory metrics.
          </p>
        </div>

        <h2 className="mt-12 text-xl font-semibold text-zinc-900">Peak Discount Depth by Category</h2>
        <p className="mt-2 text-sm text-zinc-500">
          Percentage off list price at peak, Black Friday/Cyber Week 2025 vs. 2024.
        </p>

        <div className="mt-6 overflow-x-auto rounded-xl border border-zinc-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">2025 Peak Discount</th>
                <th className="px-4 py-3">2024 Peak Discount</th>
                <th className="px-4 py-3">Change</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => {
                const change = row.depth2025 - row.depth2024;
                return (
                  <tr key={row.category} className="border-t border-zinc-100">
                    <td className="px-4 py-3 font-medium text-zinc-900">{row.category}</td>
                    <td className="px-4 py-3 font-mono text-zinc-700">{row.depth2025.toFixed(1)}%</td>
                    <td className="px-4 py-3 font-mono text-zinc-500">{row.depth2024.toFixed(1)}%</td>
                    <td className={`px-4 py-3 font-mono ${change >= 0 ? "text-red-600" : "text-emerald-600"}`}>
                      {change >= 0 ? "+" : ""}
                      {change.toFixed(1)} pts
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {ROWS.filter((r) => r.note).map((r) => (
          <p key={r.category} className="mt-3 text-xs italic leading-relaxed text-zinc-500">
            {r.category}: {r.note}
          </p>
        ))}
        <a
          href={ADOBE_SOURCE.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-block text-xs text-blue-600 hover:underline"
        >
          {ADOBE_SOURCE.label}, {ADOBE_SOURCE.publisher}
        </a>

        <h2 className="mt-12 text-xl font-semibold text-zinc-900">Limitations</h2>
        <p className="mt-3 text-sm leading-relaxed text-zinc-600">
          These are peak, headline discount figures from the single deepest promotional window of
          the year, Black Friday/Cyber Week, not a year-round baseline discount rate. A store
          running discounts more conservatively or more frequently outside the holiday window
          would see very different numbers. The data also reflects an aggregate across many
          retailers of very different sizes and margin structures, a small independent store&apos;s
          sustainable discount depth depends on its own margin, not just what the category
          average did during the single most competitive shopping window of the year.
        </p>

        <h2 className="mt-12 text-xl font-semibold text-zinc-900">What This Means for Your Own Store</h2>
        <p className="mt-3 text-sm leading-relaxed text-zinc-600">
          These figures are a useful sanity check, not a target to match. If your category&apos;s
          peak discount depth is 25-30%, that tells you what shoppers expect to see during a major
          sale, but whether your own margin can actually absorb that depth is a separate question
          entirely. <a href="/blog/how-to-price-a-discount-without-losing-your-margin" className="text-blue-600 hover:underline">
            Our guide to pricing a discount without losing your margin
          </a>{" "}
          covers how to size a discount against your own cost structure, and{" "}
          <a href="/blog/which-products-actually-deserve-a-discount" className="text-blue-600 hover:underline">
            which products actually deserve a discount
          </a>{" "}
          covers picking the right candidates before you decide how deep to go.{" "}
          <a href="/features/price-elasticity-modeling" className="text-blue-600 hover:underline">
            Zorin reads your own sales history
          </a>{" "}
          to tell you how a specific product responds to a price move, instead of borrowing an
          industry average that may not fit your catalog at all.
        </p>

        <div className="mt-8 rounded-xl border border-blue-100 bg-blue-50 p-6 text-center">
          <p className="text-sm font-semibold text-zinc-900">
            See what discount depth your own products can actually support.
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
            Zorin. &ldquo;Discount Depth by Ecommerce Product Category.&rdquo; Updated{" "}
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
