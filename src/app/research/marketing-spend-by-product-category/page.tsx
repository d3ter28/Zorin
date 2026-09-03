import { Navbar } from "@/components/marketing/Navbar";
import { Footer } from "@/components/marketing/Footer";

const BASE_URL = "https://www.tryzorin.com";
const PAGE_URL = `${BASE_URL}/research/marketing-spend-by-product-category`;
const FIRST_PUBLISHED = "2026-08-26";
const LAST_UPDATED = "2026-08-26";
const OG_IMAGE = "/og-default.png";

export const metadata = {
  title: "Marketing Spend by Product Category (Sourced Data) - Zorin",
  description:
    "Real advertising and marketing spend as a percentage of revenue by product category, sourced from public company SEC filings, citable.",
  keywords: [
    "marketing spend by category",
    "advertising expense percent of revenue",
    "ecommerce marketing budget benchmarks",
    "customer acquisition cost by category",
  ],
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: "Marketing Spend by Ecommerce Product Category",
    description:
      "Real, sourced advertising and marketing spend as a percentage of revenue across 7 ecommerce categories, compiled from public company financial filings.",
    url: PAGE_URL,
    type: "article",
    publishedTime: FIRST_PUBLISHED,
    modifiedTime: LAST_UPDATED,
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: "Marketing Spend by Ecommerce Product Category" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Marketing Spend by Ecommerce Product Category",
    description:
      "Real, sourced advertising and marketing spend as a percentage of revenue across 7 ecommerce categories, compiled from public company financial filings.",
    images: [OG_IMAGE],
  },
};

type CategoryRow = {
  category: string;
  spend: string;
  classification: string;
  explanation: string;
  note?: string;
  sources: { label: string; url: string; publisher: string }[];
};

const TIER_1: CategoryRow[] = [
  {
    category: "Beauty & Skincare",
    spend: "e.l.f. Beauty: 21.4% of net sales (FY2025)",
    classification: "Highest marketing intensity measured",
    explanation:
      "e.l.f. Beauty spent 21.4% of net sales on sales and marketing in its most recent fiscal year, the highest ratio in this dataset. That figure has climbed sharply over the company's history, from under 3% of net sales in 2016, tracking the shift from a mass-retail-led distribution model toward a DTC and social-media-driven growth strategy that requires continuous paid acquisition rather than relying on shelf placement alone. High marketing intensity here isn't a sign of inefficiency, e.l.f. also posts one of the highest gross margins in our companion research on category margins, which is exactly what allows a beauty brand to sustain this level of acquisition spend and still post a healthy operating margin.",
    sources: [
      {
        label: "e.l.f. Beauty, Inc. Form 10-K (FY2025)",
        url: "https://www.sec.gov/Archives/edgar/data/1600033/000160003325000016/elf-20250331.htm",
        publisher: "SEC EDGAR",
      },
      {
        label: "How e.l.f. Beauty Earns 12% Operating Margin Selling $10 Lipstick",
        url: "https://eightx.co/blog/why-elf-beauty-outperforms-2026",
        publisher: "Eightx (industry analysis, corroborating the SEC filing)",
      },
    ],
  },
  {
    category: "Consumer Electronics",
    spend: "GoPro: 16.9% of revenue (FY2023)",
    classification: "High, reflecting a crowded, brand-dependent category",
    explanation:
      "GoPro spent 16.9% of revenue on sales and marketing in its most recently detailed fiscal disclosure, up from 13.5% just two years earlier. That upward trend matters more than the single-year number: consumer electronics is a category where a specific brand competes against both direct rivals and general commodity alternatives on nearly identical specs, which pushes acquisition costs up over time as differentiation gets harder to communicate through the product alone. This is a useful category to compare against apparel below: both sit in a similar marketing-intensity band, but for different reasons, apparel spends to build brand identity, consumer electronics spends to defend a shrinking differentiation gap.",
    sources: [
      {
        label: "GoPro, Inc. Form 10-K (FY2023)",
        url: "https://www.sec.gov/Archives/edgar/data/1500435/000150043524000021/gpro-20231231.htm",
        publisher: "SEC EDGAR",
      },
    ],
  },
  {
    category: "Furniture & Home Goods",
    spend: "Wayfair: 11.4% of net revenue (FY2025)",
    classification: "Moderate, and declining",
    explanation:
      "Wayfair spent 11.4% of net revenue on advertising in its most recent fiscal year, down from 12.4% the year before. That decline is worth noting on its own: it came alongside Wayfair reporting its strongest profitability in several years, suggesting the company found real efficiency gains in acquisition rather than simply cutting spend and losing share. Furniture and home goods carry a naturally high average order value, which gives a marketplace like Wayfair more room to spend on acquisition per order than a low-ticket category could sustain, while still keeping that spend to a moderate share of revenue.",
    sources: [
      {
        label: "Wayfair Announces Fourth Quarter and Full Year 2025 Results",
        url: "https://investor.wayfair.com/news/news-details/2026/Wayfair-Announces-Fourth-Quarter-and-Full-Year-2025-Results-Reports-Further-Share-Capture-and-Strong-Profitability/default.aspx",
        publisher: "Wayfair investor relations",
      },
    ],
  },
  {
    category: "Toys & Games",
    spend: "Mattel: 9.8% of net sales (FY2025)",
    classification: "Moderate",
    explanation:
      "Mattel spent $522.0 million on advertising and promotion in its most recent fiscal year, 9.8% of net sales. Toy marketing carries a distinct seasonal shape most categories don't share as sharply: a large share of that spend concentrates into the fourth quarter ahead of the holiday season, when a toy line either becomes a must-have gift or largely misses its annual sales window entirely. That concentration makes toys a useful contrast with a category like pet products below, where demand is steady and predictable year-round rather than compressed into a single seasonal push.",
    sources: [
      {
        label: "Mattel Reports Fourth Quarter and Full Year 2025 Financial Results",
        url: "https://investors.mattel.com/news/news-details/2026/Mattel-Reports-Fourth-Quarter-and-Full-Year-2025-Financial-Results/default.aspx",
        publisher: "Mattel investor relations",
      },
    ],
  },
  {
    category: "Jewelry",
    spend: "Signet Jewelers: 8.1% of sales (FY2026)",
    classification: "Moderate, split heavily by geography",
    explanation:
      "Signet Jewelers spent $555.0 million on advertising in its most recent fiscal year, 8.1% of sales overall, but that figure hides a sharp geographic split: North America advertising ran 8.4% of North America sales, while international advertising ran only 4.6% of international sales. That gap likely reflects Signet's brand maturity and store density differing meaningfully between its home market and newer international operations, a mature, well-known retail brand in its core market can convert on brand recognition alone more often than a newer entrant can.",
    note: "The North America/international split (8.4% vs 4.6%) is a larger internal variance than most single-category figures in this dataset show.",
    sources: [
      {
        label: "Signet Jewelers Ltd. Form 10-K (FY2026)",
        url: "https://www.sec.gov/Archives/edgar/data/832988/000083298826000055/sig-20260131.htm",
        publisher: "SEC EDGAR",
      },
    ],
  },
  {
    category: "Apparel & Footwear",
    spend: "Nike: approximately 10.1% of revenue (FY2025, calculated)",
    classification: "Moderate, historically trending down",
    explanation:
      "Nike's demand creation expense (the company's own term for brand and sports marketing spend combined) ran $4,689 million against $46,300 million in total revenue for fiscal 2025, which works out to roughly 10.1% of revenue. This figure isn't stated as a percentage directly in Nike's own disclosures, we calculated it from the two dollar figures the company does report, so treat it as directionally accurate rather than a number Nike itself published as a ratio. That said, the trend behind it is real and independently documented: Nike's demand creation expense fell from 10.9% of sales in 2014 to 7.9% in 2023, a decade-long decline reflecting the company's shift toward direct digital channels that convert more efficiently than the wholesale and traditional-media-driven model it relied on previously.",
    note: "This percentage is calculated from two separately disclosed dollar figures (demand creation expense and total revenue), not stated directly by Nike as a ratio.",
    sources: [
      {
        label: "NIKE, Inc. Form 10-K (FY2026, contains FY2025 comparatives)",
        url: "https://www.sec.gov/Archives/edgar/data/0000320187/000032018726000088/nke-20260531.htm",
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
    category: "Pet Products",
    spend: "Chewy: 6.5% of net sales (FY2025)",
    classification: "Lowest marketing intensity measured",
    explanation:
      "Chewy spent $825 million on advertising and marketing in its most recent fiscal year, 6.5% of net sales, the lowest ratio in this dataset and well inside the company's own stated long-term target range of 6% to 7%. Pet products benefit from a structural advantage most categories on this page don't share: high repeat-purchase frequency (pet food and supplies are consumable, not one-time purchases) means a large share of Chewy's revenue comes from existing customers who required no fresh acquisition spend that period, pulling the blended marketing ratio down even as the company continues acquiring new customers.",
    sources: [
      {
        label: "Chewy Announces Fiscal Fourth Quarter and Full Year 2025 Financial Results",
        url: "https://investor.chewy.com/news-and-events/news/news-details/2026/Chewy-Announces-Fiscal-Fourth-Quarter-and-Full-Year-2025-Financial-Results/default.aspx",
        publisher: "Chewy investor relations",
      },
    ],
  },
];

const NOT_VERIFIED = [
  {
    category: "Dietary supplements",
    reason:
      "The largest publicly traded supplement companies we researched for the companion margin page (USANA, Nature's Sunshine) sell primarily through direct-selling and multi-level distribution models, where customer acquisition happens through distributor commissions rather than a conventional advertising line item. Their filings don't break out a comparable \"marketing expense as a percent of revenue\" figure, since the spend that would occupy that role in a conventional retailer is structured as sales commissions instead. Applying a marketing-spend ratio from a conventional DTC supplement brand would misrepresent a business model that doesn't actually work that way.",
  },
  {
    category: "Packaged food & grocery",
    reason:
      "General Mills and Conagra, the companies used in our companion margin research, report advertising spend folded into a broader SG&A line rather than as a clean, consistently reported standalone percentage across recent fiscal years. Conagra specifically changed its own internal calculation methodology for this metric in fiscal 2025 and restated prior periods, which makes a clean multi-year comparison unreliable using public disclosures alone. We could not find a figure for either company we were confident enough in to publish here.",
  },
];

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What percentage of revenue should an ecommerce store spend on marketing?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Based on the sourced data on this page, publicly traded companies across categories spend roughly 6.5% to 21.4% of revenue on advertising and marketing. There's no single right number, it depends heavily on category, repeat-purchase frequency, and how differentiated the product is from alternatives.",
      },
    },
    {
      "@type": "Question",
      name: "Which ecommerce categories spend the most on marketing?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Based on the sourced data on this page, beauty and skincare (e.l.f. Beauty, 21.4% of net sales) and consumer electronics (GoPro, 16.9% of revenue) show the highest marketing intensity, both categories where differentiation is hard to communicate and paid acquisition or brand-building spend does much of that work instead.",
      },
    },
    {
      "@type": "Question",
      name: "Which ecommerce categories spend the least on marketing?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Pet products (Chewy, 6.5% of net sales) show the lowest marketing intensity in the sourced data on this page, largely because high repeat-purchase frequency means a large share of revenue comes from existing customers who don't require fresh acquisition spend.",
      },
    },
    {
      "@type": "Question",
      name: "Is this the same as customer acquisition cost (CAC)?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Related but not identical. CAC is typically expressed as a dollar cost per new customer acquired, which requires a company to disclose both marketing spend and new customer counts, data most public companies don't report cleanly or consistently. Marketing spend as a percentage of revenue is a cleaner, more consistently disclosed ratio across public filings, which is why we used it as the basis for this page instead of CAC figures we could not verify.",
      },
    },
    {
      "@type": "Question",
      name: "Why are some categories missing from this page?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "We only publish a figure when a public company's own financial disclosures support it. Dietary supplements and packaged food are listed separately as categories where the public companies we researched either use a fundamentally different acquisition model (direct-selling commissions) or don't report a clean, comparable marketing-expense percentage.",
      },
    },
    {
      "@type": "Question",
      name: "How often is this page updated?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "We revisit this page periodically to refresh figures as companies report new annual results, and to add categories as verifiable disclosures become available. The page shows a last-updated date at the top.",
      },
    },
  ],
};

const datasetSchema = {
  "@context": "https://schema.org",
  "@type": "Dataset",
  name: "Marketing Spend by Ecommerce Product Category",
  description:
    "A sourced compilation of advertising and marketing expense as a percentage of revenue across ecommerce-relevant product categories, drawn from public company SEC filings and investor relations disclosures.",
  url: PAGE_URL,
  datePublished: FIRST_PUBLISHED,
  dateModified: LAST_UPDATED,
  creator: { "@type": "Organization", name: "Zorin", url: BASE_URL },
  publisher: { "@type": "Organization", name: "Zorin", url: BASE_URL },
  license: "https://www.tryzorin.com/terms",
  isAccessibleForFree: true,
  keywords: [
    "marketing spend by category",
    "advertising expense percent of revenue",
    "customer acquisition cost by category",
    "ecommerce marketing budget",
  ],
  variableMeasured: "Advertising/marketing expense as a percentage of revenue",
  spatialCoverage: "United States and select international public companies",
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
    { "@type": "ListItem", position: 2, name: "Research", item: `${BASE_URL}/research` },
    { "@type": "ListItem", position: 3, name: "Marketing Spend by Category", item: PAGE_URL },
  ],
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function MarketingSpendByProductCategoryPage() {
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
          Marketing Spend by Ecommerce Product Category
        </h1>
        <p className="mt-3 text-sm text-zinc-400">Last updated {formatDate(LAST_UPDATED)}</p>

        <p className="mt-6 text-lg leading-relaxed text-zinc-600">
          A sourced reference of real advertising and marketing spend as a percentage of revenue
          across ecommerce product categories, compiled from public company SEC filings and
          investor relations disclosures. Every figure below links to its original source.
          Categories where no comparable public disclosure exists are listed separately rather
          than filled in with a guess.
        </p>
        <p className="mt-4 text-sm leading-relaxed text-zinc-600">
          We set out to build this page around customer acquisition cost (CAC) by category, the
          figure most merchants actually want. It turned out to be the wrong metric to chase: CAC
          requires a company to disclose both marketing spend and new customer counts, and almost
          no public company reports both cleanly enough to calculate a reliable per-customer
          figure, every &ldquo;CAC by category&rdquo; number we found in wider circulation traced
          back to marketing-agency blog estimates that disagreed with each other by 2 to 3 times
          for the same category, with no verifiable underlying data. Marketing spend as a
          percentage of revenue is the closest available proxy that public companies actually
          report consistently, so that's what this page compiles instead.
        </p>

        <div className="mt-10 rounded-xl border border-zinc-200 bg-zinc-50 p-6">
          <h2 className="text-sm font-semibold text-zinc-900">Methodology</h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600">
            We identified a publicly traded company representative of each category and pulled
            its advertising or marketing expense, and that figure&apos;s share of revenue, directly
            from its most recent SEC 10-K filing or official investor relations release. Where a
            company discloses the ratio itself, we quote it directly. Where a company only
            discloses the two underlying dollar figures separately, we calculated the ratio
            ourselves and flagged it as calculated rather than company-stated.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-zinc-600">
            Company terminology for this line varies: Nike calls it &ldquo;demand creation
            expense,&rdquo; others call it &ldquo;advertising expense&rdquo; or &ldquo;sales and
            marketing expense,&rdquo; and the exact scope of what each company includes (personnel
            costs, sponsorships, digital ad spend, traditional media) isn&apos;t always identical.
            Treat cross-company comparisons as directionally reliable rather than precisely
            equivalent accounting, the same caveat that applies to our companion page on gross
            margin by category.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-zinc-600">
            Categories where the representative public companies use a fundamentally different
            acquisition model (direct-selling commissions instead of conventional advertising) or
            don&apos;t report a clean, comparable percentage are listed separately as unverified
            rather than estimated from an unreliable proxy.
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
              <p className="mt-2 font-mono text-sm text-zinc-700">{row.spend}</p>
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
          These categories are represented by public companies whose disclosures don&apos;t
          support a clean, comparable marketing-spend percentage.
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
          marketing efficiency, brand recognition, and negotiating leverage with ad platforms a
          small independent store won&apos;t have access to at the same scale. A small brand in
          the same category often needs to spend a higher percentage of revenue to acquire the
          same customer, not a lower one, since it lacks the brand recognition that lets an
          established company convert some customers without fresh paid spend. This is one
          category on this page where the direction of the small-business adjustment runs opposite
          to what our companion margin research found, there, small stores typically run lower
          margins than public companies; here, small stores often need to run higher marketing
          spend as a share of revenue, not lower.
        </p>

        <h2 className="mt-12 text-xl font-semibold text-zinc-900">What This Means for Your Own Store</h2>
        <p className="mt-3 text-sm leading-relaxed text-zinc-600">
          Use the category your product sits in as a directional range, then expect your own ratio
          to run higher rather than lower, since you likely don&apos;t yet have the brand
          recognition that keeps a public company&apos;s blended figure down. The more useful
          question once you know roughly what marketing costs in your category is whether your
          margin can actually support that spend and still leave real profit. <a href="/research/profit-margins-by-product-category" className="text-blue-600 hover:underline">Our companion page on gross margin by category</a> covers
          the other half of that equation, and <a href="/research/inventory-turnover-by-product-category" className="text-blue-600 hover:underline">our page on inventory turnover by category</a> covers
          a third factor that shapes both: how long a product sits unsold before it moves, and{" "}
          <a href="/research/discount-impact-on-margin-by-product-category" className="text-blue-600 hover:underline">our page on discount impact on margin by category</a> covers
          what it costs to clear that stock once it's time to move it. <a href="/features/price-elasticity-modeling" className="text-blue-600 hover:underline">Zorin fits a demand model to your own sales history</a> so
          you can see which of your products can support a price increase, room that could fund
          more acquisition spend without eroding the margin you actually need to keep.
        </p>

        <div className="mt-8 rounded-xl border border-blue-100 bg-blue-50 p-6 text-center">
          <p className="text-sm font-semibold text-zinc-900">
            See your own margin and pricing headroom, not a category average.
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
            Zorin. &ldquo;Marketing Spend by Ecommerce Product Category.&rdquo; Updated{" "}
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
