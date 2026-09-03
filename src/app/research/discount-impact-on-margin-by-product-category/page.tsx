import { Navbar } from "@/components/marketing/Navbar";
import { Footer } from "@/components/marketing/Footer";

const BASE_URL = "https://www.tryzorin.com";
const PAGE_URL = `${BASE_URL}/research/discount-impact-on-margin-by-product-category`;
const FIRST_PUBLISHED = "2026-09-01";
const LAST_UPDATED = "2026-09-01";
const OG_IMAGE = "/og-default.png";

export const metadata = {
  title: "Discount Margin Impact by Category (Sourced Data) - Zorin",
  description:
    "Real, quantified gross margin impact from promotional discounting by product category, sourced from public company SEC filings.",
  keywords: [
    "discount impact on margin by category",
    "promotional markdown gross margin impact",
    "how much do discounts cost margin",
    "markdown basis points ecommerce",
  ],
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: "How Much Discounting Costs Margin by Ecommerce Product Category",
    description:
      "Real, sourced gross margin impact from promotional discounting across 6 ecommerce categories, measured in basis points and pulled from public company filings.",
    url: PAGE_URL,
    type: "article",
    publishedTime: FIRST_PUBLISHED,
    modifiedTime: LAST_UPDATED,
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: "Discount Impact on Margin by Ecommerce Product Category" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "How Much Discounting Costs Margin by Ecommerce Product Category",
    description:
      "Real, sourced gross margin impact from promotional discounting across 6 ecommerce categories, measured in basis points and pulled from public company filings.",
    images: [OG_IMAGE],
  },
};

type CategoryRow = {
  category: string;
  impact: string;
  classification: string;
  explanation: string;
  note?: string;
  sources: { label: string; url: string; publisher: string }[];
};

const TIER_1: CategoryRow[] = [
  {
    category: "Consumer Electronics",
    impact: "GoPro: 760 bps of gross margin, isolated to promotional activity (Q1 FY2025)",
    classification: "Highest isolated promotional drag measured",
    explanation:
      "GoPro's own reporting isolates the promotional line more cleanly than almost any other company in this dataset: in the first quarter of fiscal 2025, higher promotional activity, explicitly including discounting slower-moving products, cost 760 basis points of gross margin on its own, before other factors were netted in. Subscription and service revenue (up 270 bps) and lower operating costs (up 290 bps) partly offset that hit, leaving the quarter's overall gross margin decline at a smaller 200 bps. That gap between the isolated promotional cost and the smaller net decline is itself informative: the promotional line was doing more damage than the headline number suggests, other parts of the business were quietly absorbing it. This lines up with our companion research on inventory turnover, where GoPro's inventory fell 16% year over year over the same stretch. Discounting slow-moving stock is very likely how that inventory reduction actually happened.",
    sources: [
      {
        label: "GoPro, Inc. Form 10-Q (Q1 FY2025)",
        url: "https://www.sec.gov/Archives/edgar/data/1500435/000150043525000034/gpro-20250331.htm",
        publisher: "SEC EDGAR",
      },
    ],
  },
  {
    category: "Toys & Games",
    impact: "Mattel: 480 bps of adjusted gross margin (Q4 FY2025)",
    classification: "Second-highest, concentrated in the holiday clearance window",
    explanation:
      "Mattel's adjusted gross margin fell to 46% in the fourth quarter of fiscal 2025, a 480 basis point decline the company attributed primarily to higher discounting, alongside inflation and foreign exchange, as it accelerated promotional activity to manage inventory and support retail partners heading into 2026. For the full year, adjusted gross margin was down a smaller 200 bps, meaning the promotional hit was heavily front-loaded into the fourth quarter specifically. That timing tracks exactly with what our companion research on inventory turnover found: toy inventory builds through the year ahead of the holiday season, then sells down sharply in Q4. This is the margin cost of that same liquidation window, not a change in Mattel's underlying pricing discipline.",
    note: "Mattel's disclosure names discounting as the primary driver but blends it with inflation and foreign exchange in the same figure, so treat this as directional rather than a pure discount-only isolate.",
    sources: [
      {
        label: "Mattel Reports Fourth Quarter and Full Year 2025 Financial Results",
        url: "https://investors.mattel.com/news/news-details/2026/Mattel-Reports-Fourth-Quarter-and-Full-Year-2025-Financial-Results/default.aspx",
        publisher: "Mattel investor relations",
      },
    ],
  },
  {
    category: "Apparel & Footwear",
    impact: "Nike: approximately 180 of 190 bps total FY2025 gross margin decline",
    classification: "Moderate-high, and worsening quarter over quarter",
    explanation:
      "Nike's gross margin fell 190 basis points to 42.7% in fiscal 2025, and the company's own disclosure attributes roughly 180 of those basis points to a lower average selling price driven primarily by higher discounts and channel mix. That's an unusually clean isolation for a company this size: almost the entire margin decline traces back to discounting rather than cost inflation or other factors. The pressure didn't ease afterward either, Nike's fourth quarter alone saw a steeper 440 bps decline, again attributed to higher discounts and channel mix. Read alongside our companion research on inventory turnover, where Nike's roughly 103-day inventory cycle is the slowest of the non-outlier categories measured, a longer hold time before a unit sells is exactly the kind of pressure that pushes a retailer toward deeper, more frequent discounting to keep inventory moving.",
    sources: [
      {
        label: "NIKE, Inc. Form 10-K (FY2025)",
        url: "https://www.sec.gov/Archives/edgar/data/320187/000032018725000047/nke-20250531.htm",
        publisher: "SEC EDGAR",
      },
      {
        label: "NIKE, Inc. Reports Fiscal 2025 Fourth Quarter and Full Year Results",
        url: "https://investors.nike.com/investors/news-events-and-reports/investor-news/investor-news-details/2025/NIKE-Inc--Reports-Fiscal-2025-Fourth-Quarter-and-Full-Year-Results/default.aspx",
        publisher: "Nike investor relations",
      },
    ],
  },
  {
    category: "Jewelry",
    impact: "Signet Jewelers: 80 bps of margin gained by pulling back on promotions (Q2 FY2026)",
    classification: "Smallest measured impact, and it runs in both directions",
    explanation:
      "Signet Jewelers is the one company in this dataset that shows the promotional lever working in reverse. A refined, more disciplined promotional and assortment strategy added approximately 80 basis points of merchandise margin expansion in the second quarter of fiscal 2026. The company then flagged the opposite move for the fourth quarter: a planned pivot back to broader promotions to meet consumer expectations, expected to cost some of that margin back. Both directions point at the same underlying number, discipline around promotions is worth roughly 80 bps either way for a jewelry retailer, which is a meaningfully smaller lever than what electronics, toys, or apparel showed above. That smaller number is consistent with jewelry's role in our companion inventory turnover research, where Signet's roughly 172-day inventory cycle reflects considered, infrequent purchases that are less responsive to a short-term markdown than an impulse category would be.",
    sources: [
      {
        label: "Signet Jewelers Reports Second Quarter Fiscal 2026 Results",
        url: "https://www.signetjewelers.com/investors/financial-news-releases/financial-news-release/2025/Signet-Jewelers-Reports-Second-Quarter-Fiscal-2026-Results/default.aspx",
        publisher: "Signet Jewelers investor relations",
      },
      {
        label: "Signet Jewelers Reports Fourth Quarter and Full Year Fiscal 2026 Results",
        url: "https://www.signetjewelers.com/investors/financial-news-releases/financial-news-release/2026/Signet-Jewelers-Reports-Fourth-Quarter-and-Full-Year-Fiscal-2026-Results/default.aspx",
        publisher: "Signet Jewelers investor relations",
      },
    ],
  },
  {
    category: "Furniture & Home Goods",
    impact: "Wayfair: gross margin held near 30-31% despite expanded promotions",
    classification: "Not comparable, promotions are largely supplier-funded",
    explanation:
      "Wayfair doesn't fit the pattern above at all, and the reason is structural rather than a difference in discipline. Reporting on Wayfair's promotional strategy describes a model where much of the cost of a discount is funded by the roughly 20,000 suppliers on its marketplace rather than absorbed directly by Wayfair itself, with about 70% of revenue during promotional periods still coming from full-price items as customers browse past the discounted listings. Wayfair's own reporting confirms the outcome: gross margin has held steady in the low end of a 30-31% range even as promotional activity expanded. This is the same asset-light structure our companion research on inventory turnover flagged for Wayfair's extreme (and similarly not-comparable) turnover ratio: a company that doesn't hold much of its own inventory also doesn't absorb much of the direct cost of discounting it.",
    note: "The supplier-funded discount mechanism is drawn from industry reporting on Wayfair's promotional strategy, corroborated by Wayfair's own disclosed gross margin range holding steady through the same period. Not a company-stated basis-point figure like the other rows above.",
    sources: [
      {
        label: "Wayfair ramps up promotions while maintaining margins with supplier-backed discounts",
        url: "https://www.lesprom.com/en/news/Wayfair_ramps_up_promotions_while_maintaining_margins_with_supplier-backed_discounts_115908/",
        publisher: "Lesprom (industry reporting)",
      },
      {
        label: "Wayfair Inc. Form 10-K (FY2025)",
        url: "https://www.sec.gov/Archives/edgar/data/1616707/000161670726000027/w-20251231.htm",
        publisher: "SEC EDGAR",
      },
    ],
  },
];

const NOT_VERIFIED = [
  {
    category: "Beauty & Skincare",
    reason:
      "e.l.f. Beauty, the company we used for this category in our companion margin and marketing-spend research, posted gross margin gains in every quarter of fiscal 2025, but its own disclosures attribute those gains to cost savings, favorable foreign exchange on goods purchased from China, and international price increases, not to promotional discipline. We couldn't find a quarter where e.l.f. isolated a promotional or discount impact on margin the way GoPro, Mattel, Nike, and Signet did, so there's no comparable figure to publish for this category.",
  },
  {
    category: "Pet Products",
    reason:
      "Chewy, the company used for this category across our other research pages, reported gross margin expansion in fiscal 2025 that its own disclosures attribute to sponsored ad growth, a shift toward higher-margin categories like health and wellness, and what the company called a more rational promotional environment, all blended into one explanation rather than broken out separately. Without an isolated discount or promotional figure, we're not comfortable publishing a number for this category.",
  },
];

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "How much does discounting actually cost gross margin?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Based on the sourced data on this page, publicly traded companies report promotional or discount-driven gross margin impact ranging from roughly 80 to 760 basis points in a given quarter, depending on category and how aggressively they were discounting that period. The range is wide because the underlying categories behave very differently, not because the measurement is imprecise.",
      },
    },
    {
      "@type": "Question",
      name: "Which ecommerce categories lose the most margin to discounting?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Based on the sourced data on this page, consumer electronics (GoPro, 760 basis points isolated to promotional activity in a single quarter) and toys and games (Mattel, 480 basis points concentrated in the holiday clearance quarter) show the largest measured promotional impact on margin.",
      },
    },
    {
      "@type": "Question",
      name: "Which ecommerce categories lose the least margin to discounting?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Jewelry (Signet Jewelers, roughly 80 basis points) shows the smallest measured impact in the sourced data on this page. That tracks with jewelry's considered, infrequent purchase pattern, documented in our companion inventory turnover research, which makes it less responsive to short-term markdowns than an impulse-purchase category.",
      },
    },
    {
      "@type": "Question",
      name: "Why is Wayfair not comparable to the other categories on this page?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Wayfair's promotional discounts are largely funded by its suppliers rather than absorbed directly by Wayfair, so expanded promotions haven't compressed its own gross margin the way discounting compresses margin for a company that buys and holds its own inventory. It's the same asset-light, drop-ship structure that also makes Wayfair's inventory turnover figure not comparable in our companion research.",
      },
    },
    {
      "@type": "Question",
      name: "Is a bigger basis-point impact from discounting always a bad sign?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Not necessarily. GoPro's largest promotional hit coincided with a deliberate inventory reduction, and Mattel's coincided with planned holiday-season clearance. A large, temporary promotional impact tied to a specific inventory or seasonal goal reads differently than the same number showing up as a permanent, unexplained margin decline.",
      },
    },
    {
      "@type": "Question",
      name: "How often is this page updated?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "We revisit this page periodically to refresh figures as companies report new quarterly and annual results, and to add categories once a company discloses a clean, comparable promotional or discount impact figure. The page shows a last-updated date at the top.",
      },
    },
  ],
};

const datasetSchema = {
  "@context": "https://schema.org",
  "@type": "Dataset",
  name: "Discount Impact on Margin by Ecommerce Product Category",
  description:
    "A sourced compilation of gross margin impact from promotional discounting, measured in basis points, across ecommerce-relevant product categories, drawn from public company SEC filings and earnings releases.",
  url: PAGE_URL,
  datePublished: FIRST_PUBLISHED,
  dateModified: LAST_UPDATED,
  creator: { "@type": "Organization", name: "Zorin", url: BASE_URL },
  publisher: { "@type": "Organization", name: "Zorin", url: BASE_URL },
  license: "https://www.tryzorin.com/terms",
  isAccessibleForFree: true,
  keywords: [
    "discount impact on margin",
    "promotional markdown basis points",
    "gross margin discounting impact",
    "ecommerce promotional benchmarks",
  ],
  variableMeasured: "Gross margin impact (in basis points) attributable to promotional discounting",
  spatialCoverage: "United States public companies",
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
    { "@type": "ListItem", position: 2, name: "Research", item: `${BASE_URL}/research` },
    { "@type": "ListItem", position: 3, name: "Discount Impact on Margin by Category", item: PAGE_URL },
  ],
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function DiscountImpactOnMarginByProductCategoryPage() {
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
          How Much Discounting Costs Margin by Ecommerce Product Category
        </h1>
        <p className="mt-3 text-sm text-zinc-400">Last updated {formatDate(LAST_UPDATED)}</p>

        <p className="mt-6 text-lg leading-relaxed text-zinc-600">
          A sourced reference of real gross margin impact from promotional discounting, measured
          in basis points, across ecommerce product categories, drawn from public company SEC
          filings and earnings releases. Every figure below links to its original source.
          Categories where no company isolates a clean, comparable discount impact are listed
          separately rather than filled in with a guess.
        </p>
        <p className="mt-4 text-sm leading-relaxed text-zinc-600">
          This is the fourth page in a series that started with{" "}
          <a href="/research/profit-margins-by-product-category" className="text-blue-600 hover:underline">gross margin by category</a>,{" "}
          <a href="/research/marketing-spend-by-product-category" className="text-blue-600 hover:underline">marketing spend by category</a>,
          and{" "}
          <a href="/research/inventory-turnover-by-product-category" className="text-blue-600 hover:underline">inventory turnover by category</a>.
          This page closes a loop the others only implied: discounting is one of the main levers
          companies actually pull to move slow-turning inventory, and here's what public companies
          say that lever costs them, in their own numbers.
        </p>

        <div className="mt-10 rounded-xl border border-zinc-200 bg-zinc-50 p-6">
          <h2 className="text-sm font-semibold text-zinc-900">Methodology</h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600">
            We looked for quarters or fiscal years where a public company's own earnings release
            or SEC filing explicitly isolated a basis-point gross margin impact attributable to
            promotional activity or discounting, distinct from cost inflation, foreign exchange, or
            channel mix. Where a company blends discounting with other factors in the same
            disclosed figure (as Mattel does), we used the number anyway but flagged it explicitly
            as a blended, directional figure rather than a pure isolate.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-zinc-600">
            We matched companies to the same categories used in our companion margin, marketing
            spend, and inventory turnover research wherever a company disclosed a usable figure, to
            keep the cross-page comparisons in this series consistent. Categories where the
            representative company's disclosures don't isolate a comparable discount or promotional
            impact are listed separately as unverified.
          </p>
        </div>

        <h2 className="mt-12 text-xl font-semibold text-zinc-900">Verified Categories</h2>
        <p className="mt-2 text-sm text-zinc-500">
          Each figure traces to a public company SEC filing or official investor release.
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
              <p className="mt-2 font-mono text-sm text-zinc-700">{row.impact}</p>
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
          These categories are represented by public companies whose disclosures don&apos;t isolate a
          clean, comparable discount impact figure.
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
          Every figure on this page describes a specific quarter or fiscal year for one large,
          publicly traded company. Promotional impact swings quarter to quarter even for the same
          company, GoPro's own figure moved from a 760 bps hit in one quarter to a much smaller
          drag across the full year, so treat these as a snapshot of what a real discounting
          decision cost a real retailer in a specific period, not a fixed, permanent category
          benchmark. A small store's own promotional cost will also depend heavily on category-specific
          factors these large companies don't fully represent, thinner margin cushion, less
          negotiating leverage with suppliers, and no comparable ad-revenue or subscription-revenue
          line to offset a bad quarter the way GoPro's did.
        </p>

        <h2 className="mt-12 text-xl font-semibold text-zinc-900">What This Means for Your Own Store</h2>
        <p className="mt-3 text-sm leading-relaxed text-zinc-600">
          The honest takeaway from this page is that discounting has a real, quantifiable cost, and
          the companies that measure it best also seem to use it most deliberately, tied to a
          specific inventory or seasonal goal rather than a reflexive response to slow sales. <a href="/research/inventory-turnover-by-product-category" className="text-blue-600 hover:underline">Our companion page on inventory turnover by category</a> covers
          which categories tend to need that lever most often, and{" "}
          <a href="/blog/how-to-run-a-sale-without-wrecking-your-margin" className="text-blue-600 hover:underline">our guide to running a sale without wrecking your margin</a> covers
          how to size a discount instead of guessing at one. <a href="/features/price-elasticity-modeling" className="text-blue-600 hover:underline">Zorin fits a demand model to your own sales history</a> so
          a discount decision is based on how your specific products actually respond to price, not
          a basis-point average pulled from a company many times your size.
        </p>

        <div className="mt-8 rounded-xl border border-blue-100 bg-blue-50 p-6 text-center">
          <p className="text-sm font-semibold text-zinc-900">
            See what a discount would actually cost your own margin before you run it.
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
            Zorin. &ldquo;Discount Impact on Margin by Ecommerce Product Category.&rdquo; Updated{" "}
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
