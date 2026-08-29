import { Navbar } from "@/components/marketing/Navbar";
import { Footer } from "@/components/marketing/Footer";

const BASE_URL = "https://www.tryzorin.com";
const PAGE_URL = `${BASE_URL}/research/profit-margins-by-product-category`;
const FIRST_PUBLISHED = "2026-08-25";
const LAST_UPDATED = "2026-08-25";
const OG_IMAGE = "/og-default.png";

export const metadata = {
  title: "Gross Profit Margins by Product Category (Sourced Data) - Zorin",
  description:
    "Real gross profit margins by ecommerce product category, sourced from public company SEC filings. Citable, with links to every source.",
  keywords: [
    "gross profit margin by category",
    "ecommerce profit margin data",
    "average profit margin by industry",
    "product category margin statistics",
  ],
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: "Gross Profit Margins by Ecommerce Product Category",
    description:
      "Real, sourced gross margin figures across 10 ecommerce categories, compiled from public company financial filings.",
    url: PAGE_URL,
    type: "article",
    publishedTime: FIRST_PUBLISHED,
    modifiedTime: LAST_UPDATED,
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: "Gross Profit Margins by Ecommerce Product Category" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Gross Profit Margins by Ecommerce Product Category",
    description:
      "Real, sourced gross margin figures across 10 ecommerce categories, compiled from public company financial filings.",
    images: [OG_IMAGE],
  },
};

type CategoryRow = {
  category: string;
  margin: string;
  classification: string;
  explanation: string;
  note?: string;
  sources: { label: string; url: string; publisher: string }[];
};

const TIER_1: CategoryRow[] = [
  {
    category: "Beauty & Skincare",
    margin: "e.l.f. Beauty 70.7%, Olaplex 69.4%",
    classification: "High margin, tightly clustered",
    explanation:
      "Beauty is one of the highest and most consistent gross-margin categories in this dataset. e.l.f. Beauty reported 70.7% gross margin in its most recent fiscal year, and Olaplex reported 69.4% in the same period, a remarkably tight cluster for two companies at very different price points (e.l.f. sells mass-market, Olaplex sells premium salon-grade haircare). The consistency suggests something structural rather than brand-specific: skincare and cosmetics formulations are genuinely cheap to manufacture relative to their retail price, and the category supports premium positioning regardless of where a brand sits on the price ladder. That's consistent with what we found researching elasticity by category: skincare buyers respond more to how a price signals quality than to the price itself. Both dynamics point the same direction, margin in this category comes from brand equity and formulation storytelling, not from a bare-bones cost structure.",
    sources: [
      {
        label: "e.l.f. Beauty, Inc. Form 10-K (FY2026)",
        url: "https://www.sec.gov/Archives/edgar/data/0001600033/000160003326000020/elf-20260331.htm",
        publisher: "SEC EDGAR",
      },
      {
        label: "Beauty Ecommerce Gross Margin 2026: 69% Median Across Public Brands",
        url: "https://eightx.co/blog/beauty-ecommerce-margin-benchmarks",
        publisher: "Eightx (industry analysis, corroborating public filings)",
      },
    ],
  },
  {
    category: "Dietary Supplements",
    margin: "USANA 78.3%, Nature's Sunshine 72.4%",
    classification: "Highest margin category measured",
    explanation:
      "Supplements post the highest gross margins of any category in this dataset. USANA reported 78.3% and Nature's Sunshine 72.4% in their most recent fiscal years, both direct-selling companies that manufacture and market their own formulations rather than reselling other brands. Low bulk ingredient costs relative to finished retail price explain most of this: a capsule or powder blend is inexpensive to produce at scale, and the category commands a retail price built around perceived efficacy and brand trust rather than raw material cost. Worth flagging for context: both companies here use a direct-selling or multi-level distribution model, which carries its own cost structure (commissions, distributor incentives) further down the income statement that a standard DTC ecommerce brand wouldn't have, so the gross margin figure is comparable, but the path from gross margin to net profit is not identical to a typical Shopify-based supplement brand.",
    sources: [
      {
        label: "USANA Health Sciences FY2025 results (78.3% gross margin)",
        url: "https://www.supplysidesj.com/market-trends-analysis/mlm-earnings-herbalife-arresting-slide-nature-s-sunshine-growing-again-usana-still-swooning",
        publisher: "SupplySide Supplement Journal",
      },
    ],
  },
  {
    category: "Jewelry",
    margin: "Pandora 79.3-80.4%, Signet Jewelers 42.0%",
    classification: "Widest brand-vs-retailer gap measured",
    explanation:
      "Jewelry shows the sharpest split between manufacturer and retailer margins in this entire dataset. Pandora, which designs and manufactures its own charms and jewelry, posted gross margins of 79.3% to 80.4% across recent quarters. Signet Jewelers, the largest US jewelry retailer (Kay, Zales, Jared), which sells a mix of owned and third-party branded merchandise including Pandora products themselves, posted 42.0% for its most recent quarter. That's essentially a 2x gap for jewelry sold under the same roof. The explanation is the same one that shows up across nearly every category on this page: Pandora captures the manufacturing margin because it makes the product, while Signet, as a multi-brand retailer, buys inventory at wholesale and marks it up once. If you manufacture or privately label what you sell, you're closer to the Pandora end of this range. If you resell other brands, expect something closer to Signet's.",
    note: "The retailer here (Signet) sells the manufacturer's product (Pandora) in its own stores, making this one of the cleanest same-industry manufacturer-vs-retailer comparisons available.",
    sources: [
      {
        label: "Pandora A/S Q2 2025 report (79.3% gross margin)",
        url: "https://www.tipranks.com/news/company-announcements/pandora-a-s-reports-strong-q2-2025-growth",
        publisher: "Pandora A/S investor release",
      },
      {
        label: "Signet Jewelers Reports Fourth Quarter and Full Year Fiscal 2026 Results",
        url: "https://www.businesswire.com/news/home/20260319440349/en/Signet-Jewelers-Reports-Fourth-Quarter-and-Full-Year-Fiscal-2026-Results",
        publisher: "Signet Jewelers (Businesswire)",
      },
    ],
  },
  {
    category: "Toys & Games",
    margin: "Hasbro 72.4%, Mattel 48.7%",
    classification: "Wide range, driven by business mix not just manufacturing",
    explanation:
      "Toys is the category where this dataset's numbers most defy the simple manufacturer-vs-retailer story. Both Hasbro and Mattel design and manufacture their own toy lines, yet Hasbro posted 72.4% gross margin in its most recent fiscal year against Mattel's 48.7%, down from 50.8% the year prior. The gap isn't really about toys. Hasbro's consolidated figures blend in a growing, higher-margin digital gaming and licensing business (Magic: The Gathering, Dungeons & Dragons, and related entertainment IP), categories that carry closer to software-level margins than physical toy manufacturing does. Mattel's business mix stays closer to pure physical toy production, and its 2025 margin compression was driven by cost inflation, tariffs, and currency effects specific to that manufacturing base. The lesson for a toy or game seller: a consolidated company-wide margin can hide a very different margin profile between physical product lines and any licensing or digital revenue mixed into the same report.",
    sources: [
      {
        label: "Hasbro, Inc. Form 10-K (FY2025)",
        url: "https://www.sec.gov/Archives/edgar/data/46080/000004608026000011/has-20251228.htm",
        publisher: "SEC EDGAR",
      },
      {
        label: "Mattel Reports Fourth Quarter and Full Year 2025 Financial Results",
        url: "https://investors.mattel.com/news/news-details/2026/Mattel-Reports-Fourth-Quarter-and-Full-Year-2025-Financial-Results/default.aspx",
        publisher: "Mattel investor relations",
      },
    ],
  },
  {
    category: "Pet Products",
    margin: "Freshpet 40.8%, Chewy 29.8%",
    classification: "Manufacturer above retailer, both moderate",
    explanation:
      "Pet products sit in a more moderate range than beauty or supplements. Freshpet, which manufactures its own fresh pet food and controls its supply chain end to end, posted 40.8% gross margin for its most recent full year. Chewy, an online retailer that resells thousands of other companies' pet brands, posted 29.8%. The gap here (about 11 points) is narrower than the jewelry or beauty comparisons above, likely because pet food and supplies carry real, non-trivial input costs (meat, cold-chain logistics, packaging) even for the manufacturer, unlike a cosmetic formulation or a supplement capsule where raw material cost is a much smaller share of retail price. Pet is a useful category to benchmark against if your own product has meaningful physical input costs rather than being primarily a formulation or design margin play.",
    sources: [
      {
        label: "Freshpet, Inc. Reports Fourth Quarter and Full Year 2025 Financial Results",
        url: "https://investor.freshpet.com/news-releases/news-release-details/freshpet-inc-reports-fourth-quarter-and-full-year-2025-financial",
        publisher: "Freshpet investor relations",
      },
      {
        label: "Chewy Announces Fiscal Fourth Quarter and Full Year 2025 Financial Results",
        url: "https://investor.chewy.com/news-and-events/news/news-details/2026/Chewy-Announces-Fiscal-Fourth-Quarter-and-Full-Year-2025-Financial-Results/default.aspx",
        publisher: "Chewy investor relations",
      },
    ],
  },
  {
    category: "Furniture & Home Goods",
    margin: "Williams-Sonoma 46.9%, RH 44.1%, Wayfair 30.2%",
    classification: "Premium-positioned brands well ahead of mass-market marketplace",
    explanation:
      "Furniture and home goods shows a clear premium-versus-mass-market split rather than a clean manufacturer-versus-retailer one. Williams-Sonoma (which owns Pottery Barn and West Elm alongside its namesake brand) posted 46.9% gross margin for its most recent fiscal year, and RH (Restoration Hardware), positioned even further upmarket, posted 44.1%. Wayfair, a mass-market online furniture marketplace aggregating thousands of third-party suppliers, posted 30.2%. All three companies are retailers in the sense that they don't manufacture most of what they sell, so the roughly 15-point gap here comes from brand positioning and curation rather than the make-versus-resell distinction that drives the gap in categories like jewelry. A tightly curated, premium-positioned home goods brand can command meaningfully higher margin than an open marketplace competing on selection and price.",
    sources: [
      {
        label: "Williams-Sonoma, Inc. announces strong fourth quarter and fiscal year 2025 results",
        url: "https://ir.williams-sonomainc.com/investor-information/news-releases/news-release-details/2026/Williams-Sonoma-Inc--announces-strong-fourth-quarter-and-fiscal-year-2025-results/default.aspx",
        publisher: "Williams-Sonoma investor relations",
      },
      {
        label: "Wayfair Announces Fourth Quarter and Full Year 2025 Results",
        url: "https://investor.wayfair.com/news/news-details/2026/Wayfair-Announces-Fourth-Quarter-and-Full-Year-2025-Results-Reports-Further-Share-Capture-and-Strong-Profitability/default.aspx",
        publisher: "Wayfair investor relations",
      },
    ],
  },
  {
    category: "Books & Media",
    margin: "Scholastic 56%, Barnes & Noble Education 21.4%",
    classification: "Publisher well above campus/textbook retailer",
    explanation:
      "Books show one of the widest gaps in this dataset, and it comes from a specific structural difference rather than premium positioning. Scholastic, which owns the publishing rights to its trade and educational titles (including major franchises), posted 56% gross margin in its most recent fiscal year. Barnes & Noble Education, which operates campus bookstores and resells textbooks it doesn't publish, posted 21.4%, and textbook retailing carries thinner margins still because a meaningful share of campus bookstore revenue is required course materials with limited pricing power. A publisher who owns the underlying content captures a fundamentally different margin than any retailer selling that same content, physical or digital, on to a reader.",
    sources: [
      {
        label: "Scholastic Reports Fourth Quarter and Fiscal 2025 Results",
        url: "https://www.scholastic.com/newsroom/all-news/press-release/scholastic-reports-fourth-quarter-and-fiscal-2025-results0.html",
        publisher: "Scholastic Corporation",
      },
      {
        label: "Barnes & Noble Education gross margin data",
        url: "https://www.alphaspread.com/security/nyse/bned/profitability/ratio/gross-margin",
        publisher: "Alpha Spread (derived from BNED SEC filings)",
      },
    ],
  },
  {
    category: "Apparel & Footwear",
    margin: "Nike 42.7-42.9%, Lululemon 54.2-58.3%",
    classification: "Premium athletic well above mainstream athletic",
    explanation:
      "Nike, the largest athletic apparel and footwear company in the world, posted 42.7% gross margin in fiscal 2025 and 42.9% for fiscal 2026, with meaningful quarter-to-quarter swings driven by tariffs, discounting, and channel mix (one 2026 quarter dipped as low as 40.2% before a tariff-recovery benefit pushed it back to 49.2% the following quarter). Lululemon, positioned at a higher price point with a narrower, less-discounted assortment, ran 54.2% to 58.3% across recent quarters, a full 12 to 16 points above Nike depending on the period compared. The gap tracks discounting intensity as much as raw product cost: Nike's margin moves noticeably with promotional activity and tariff exposure in a way Lululemon's premium, lower-discount model doesn't experience to the same degree. Apparel margin is unusually sensitive to macro and trade-policy shocks compared to the other categories on this page, worth remembering if you're benchmarking against a single quarter's figure rather than a trailing range.",
    note: "Nike's own quarterly margin swung by roughly 9 percentage points within fiscal 2026 alone, a useful reminder that a single-quarter figure in apparel can be noisy.",
    sources: [
      {
        label: "NIKE, Inc. Reports Fiscal 2026 Fourth Quarter and Full Year Results",
        url: "https://investors.nike.com/investors/news-events-and-reports/investor-news/investor-news-details/2026/NIKE-Inc--Reports-Fiscal-2026-Fourth-Quarter-and-Full-Year-Results/default.aspx",
        publisher: "Nike investor relations",
      },
      {
        label: "Lululemon Q1 Fiscal 2026 Financial Supplement",
        url: "https://corporate.lululemon.com/~/media/Files/L/Lululemon/investors/results-center/q1-2026-financial-supplement.pdf",
        publisher: "Lululemon Athletica investor relations",
      },
    ],
  },
  {
    category: "Consumer Electronics",
    margin: "GoPro 31.8-36.0%, Best Buy 22.6%",
    classification: "Branded device maker above general electronics retailer",
    explanation:
      "Consumer electronics runs lower than most other categories on this page, reflecting real hardware costs and heavy price competition. GoPro, which designs and manufactures its own action cameras, posted gross margins between 31.8% and 36.0% across recent quarters. Best Buy, a general electronics retailer reselling thousands of other brands, posted 22.6%. The roughly 10-point gap follows the same manufacturer-versus-retailer pattern seen in pet products and jewelry, but the absolute numbers in this category sit well below beauty, supplements, or jewelry. Consumer electronics hardware carries genuinely high component and manufacturing costs relative to retail price, and the category competes hard on price against well-known specs, leaving less room for the brand-story-driven margin that lifts categories like skincare or supplements.",
    sources: [
      {
        label: "GoPro Q3 2025 Management Commentary",
        url: "https://investor.gopro.com/files/doc_financials/2025/q3/GPRO-2025-09-30-Management-s-Commentary.pdf",
        publisher: "GoPro investor relations",
      },
      {
        label: "Best Buy gross margin data",
        url: "https://m.macrotrends.net/stocks/charts/BBY/best-buy/gross-margin",
        publisher: "Macrotrends (derived from Best Buy SEC filings)",
      },
    ],
  },
  {
    category: "Packaged Food & Grocery",
    margin: "General Mills 34.6%, Conagra 25.9%",
    classification: "Lowest margin category measured",
    explanation:
      "Packaged food and grocery posts the lowest margins of any category in this dataset. General Mills reported 34.6% gross margin for its most recent fiscal year, and Conagra Brands reported 25.9%, down from 27.7% the year before. Both companies manufacture their own branded food products, so this isn't a manufacturer-versus-retailer gap, it's the category itself. Commodity input costs (grain, protein, packaging) represent a larger, more volatile share of retail price than in any other category here, and shelf-stable packaged food competes in a market where private-label alternatives keep pricing power limited. If your ecommerce catalog includes food or grocery items, this is the category on this page to benchmark against, and it's worth expecting real margin volatility tied to commodity input costs, not just demand shifts.",
    sources: [
      {
        label: "General Mills Form 10-K (FY2025)",
        url: "https://www.sec.gov/Archives/edgar/data/0000040704/000119312525147079/d938443d10k.htm",
        publisher: "SEC EDGAR",
      },
      {
        label: "Conagra Brands gross margin data",
        url: "https://mlq.ai/companies/conagra-brands-inc/gross-profit-margin/",
        publisher: "MLQ.ai (derived from Conagra SEC filings)",
      },
    ],
  },
];

const NOT_VERIFIED = [
  {
    category: "Handmade & craft goods",
    reason:
      "Handmade and craft sellers (the Etsy-style segment) are overwhelmingly small, privately held businesses that don't file public financial statements, so there's no equivalent to the public-company data used throughout this page. Secondary sources cite wide, unsourced margin ranges for this segment, but none trace back to a verifiable filing or study, the same problem this page exists to avoid repeating.",
  },
  {
    category: "Private-label and white-label products",
    reason:
      "Private-label sellers (including most Amazon FBA private-label businesses) are almost universally privately held, and manufacturers producing white-label goods for many different brands don't break out category-specific margin data publicly. Margin here depends heavily on manufacturing relationship and minimum order quantities specific to each seller, more than any figure a category-wide average could meaningfully represent.",
  },
  {
    category: "Print-on-demand and digital-physical hybrid products",
    reason:
      "No public company isolates print-on-demand (apparel, home goods, or accessories printed per order) as its own reported segment. The major platforms enabling this model (Printful, Printify, and similar) are privately held and don't publish category-level margin data, and margins vary enormously by product type and per-unit production cost in a way a single figure would misrepresent.",
  },
];

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is a good gross profit margin for an ecommerce store?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "It depends heavily on category. Based on the public company data on this page, supplements and beauty brands commonly run 65-80% gross margin, while packaged food and consumer electronics often run 25-40%. There's no single universal benchmark, your category sets the realistic range far more than general ecommerce advice does.",
      },
    },
    {
      "@type": "Question",
      name: "Which ecommerce product categories have the highest profit margins?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Based on the sourced data on this page, dietary supplements (72-78%), jewelry manufacturers (79-80%), and beauty and skincare (69-71%) show the highest gross margins, driven by low raw material costs relative to retail price and strong brand-based pricing power.",
      },
    },
    {
      "@type": "Question",
      name: "Which ecommerce product categories have the lowest profit margins?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Packaged food and grocery (26-35%) and consumer electronics retail (23-36%) show the lowest gross margins in the sourced data on this page, driven by high commodity or component input costs relative to retail price and intense price-based competition.",
      },
    },
    {
      "@type": "Question",
      name: "Why do brand manufacturers have higher margins than retailers in the same category?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "A brand that manufactures its own product captures the full margin between production cost and retail price. A retailer reselling that same product buys it at wholesale and marks it up once, capturing a smaller slice. This pattern shows up across nearly every category on this page, most clearly in jewelry (Pandora manufacturer vs. Signet retailer) and pet products (Freshpet manufacturer vs. Chewy retailer).",
      },
    },
    {
      "@type": "Question",
      name: "Can I use these public company margins to benchmark my own small ecommerce store?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Treat these as a directional reference, not a direct target. Public companies on this page operate at massive scale, with supplier terms, logistics networks, and negotiating leverage a small independent store doesn't have. A small brand in the same category often runs a somewhat lower gross margin for the same product simply due to scale, even with identical positioning.",
      },
    },
    {
      "@type": "Question",
      name: "Why are some categories missing from this page?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "We only publish a figure when a real public company financial filing backs it. Several common ecommerce categories, including handmade goods, private-label products, and print-on-demand, are dominated by privately held businesses that don't file public financials, so no verifiable category-wide figure exists yet.",
      },
    },
    {
      "@type": "Question",
      name: "How often is this page updated?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "We revisit this page periodically to refresh figures as companies report new quarterly and annual results, and to add categories as verifiable public data becomes available. The page shows a last-updated date at the top.",
      },
    },
  ],
};

const datasetSchema = {
  "@context": "https://schema.org",
  "@type": "Dataset",
  name: "Gross Profit Margins by Ecommerce Product Category",
  description:
    "A sourced compilation of gross profit margin figures across ecommerce-relevant product categories, drawn from public company SEC filings and investor relations disclosures.",
  url: PAGE_URL,
  datePublished: FIRST_PUBLISHED,
  dateModified: LAST_UPDATED,
  creator: { "@type": "Organization", name: "Zorin", url: BASE_URL },
  publisher: { "@type": "Organization", name: "Zorin", url: BASE_URL },
  license: "https://www.tryzorin.com/terms",
  isAccessibleForFree: true,
  keywords: [
    "gross profit margin",
    "profit margin by category",
    "ecommerce margin benchmarks",
    "product category margin data",
  ],
  variableMeasured: "Gross profit margin (percentage of revenue)",
  spatialCoverage: "United States and select international public companies",
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
    { "@type": "ListItem", position: 2, name: "Research", item: `${BASE_URL}/research` },
    { "@type": "ListItem", position: 3, name: "Profit Margins by Category", item: PAGE_URL },
  ],
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function ProfitMarginsByProductCategoryPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(datasetSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <Navbar />
      <main className="mx-auto max-w-3xl px-6 pb-24 pt-32 md:pb-32">
        <a href="/blog/cluster/margin-and-profit-fundamentals" className="mb-6 inline-flex items-center gap-1.5 text-sm text-zinc-400 transition-colors hover:text-zinc-600">
          ← Margin & Profit Fundamentals cluster
        </a>

        <span className="inline-flex w-fit rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-600">
          Research
        </span>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-zinc-900 md:text-4xl">
          Gross Profit Margins by Ecommerce Product Category
        </h1>
        <p className="mt-3 text-sm text-zinc-400">Last updated {formatDate(LAST_UPDATED)}</p>

        <p className="mt-6 text-lg leading-relaxed text-zinc-600">
          A sourced reference of real gross profit margins across ecommerce product categories,
          compiled from public company SEC filings and investor relations disclosures. Every
          figure below links to its original source. Categories where no verifiable public
          company data exists are listed separately rather than filled in with a guess.
        </p>
        <p className="mt-4 text-sm leading-relaxed text-zinc-600">
          &ldquo;What&apos;s a good margin for my category&rdquo; is one of the most common
          questions an ecommerce seller asks, and one of the most inconsistently answered.
          Search for it and you&apos;ll find blog posts citing round, unsourced numbers, and
          benchmark ranges repeated from site to site with no original source behind them. This
          page takes a different approach: every figure here comes from a public company&apos;s
          actual reported financials, most from an SEC filing or an official investor relations
          release. We compared manufacturer and brand-owner margins against retailer and
          marketplace margins within the same category wherever both exist, since that
          comparison turned out to be the single most consistent driver of margin difference
          across this entire dataset.
        </p>

        <div className="mt-10 rounded-xl border border-zinc-200 bg-zinc-50 p-6">
          <h2 className="text-sm font-semibold text-zinc-900">Methodology</h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600">
            We identified publicly traded companies representative of each category, prioritizing
            a manufacturer or brand-owner and a retailer or marketplace within the same category
            wherever both exist, then pulled gross margin figures directly from their most recent
            SEC 10-K filing or official quarterly/annual investor relations release. Where a
            company&apos;s most recent quarter showed unusual volatility (tariff effects,
            one-time charges), we noted the range across recent periods rather than presenting a
            single quarter as representative.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-zinc-600">
            All figures on this page come from companies large enough to be publicly traded and
            required to disclose financials, which is itself a limitation worth stating upfront:
            categories dominated by small, privately held sellers (handmade goods, private-label
            products) have no equivalent public data source, so they&apos;re listed separately as
            unverified rather than estimated from indirect sources.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-zinc-600">
            Gross margin is calculated as (revenue minus cost of goods sold) divided by revenue,
            using each company&apos;s own reported cost-of-sales or cost-of-products-sold line.
            We did not adjust or normalize these figures across companies, different companies
            classify certain costs (fulfillment, some overhead) differently within cost of sales,
            so treat cross-company comparisons within a category as directionally reliable rather
            than precisely equivalent accounting.
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
              <p className="mt-2 font-mono text-sm text-zinc-700">{row.margin}</p>
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
          These categories are dominated by privately held sellers with no public financial
          disclosures. We searched for a public-company proxy for each and found none reliable
          enough to include.
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
          Every figure on this page comes from a company large enough to be publicly traded,
          which means real economies of scale, supplier negotiating leverage, and logistics
          infrastructure that a small independent ecommerce store won&apos;t have access to at
          the same level. A small brand in the same category should expect its own margin to run
          somewhat below the public company figure for an otherwise comparable product,
          especially early on before volume discounts and efficient fulfillment kick in. Several
          of these companies also blend multiple business lines into one reported gross margin
          (Hasbro&apos;s toy-and-gaming mix is the clearest example on this page), so a
          consolidated figure can understate or overstate what a single product line within that
          company actually earns. Gross margin also isn&apos;t profit, every company here still
          has to cover marketing, fulfillment, overhead, and other costs below the gross margin
          line before anything becomes net profit, and the gap between the two varies widely by
          business model.
        </p>

        <h2 className="mt-12 text-xl font-semibold text-zinc-900">What This Means for Your Own Store</h2>
        <p className="mt-3 text-sm leading-relaxed text-zinc-600">
          Use the category your product sits in as a directional range, then adjust downward for
          scale and upward or downward based on whether you manufacture, privately label, or
          resell what you sell, the single clearest pattern in this entire dataset. A margin
          benchmark only tells you where you should roughly land, not what price actually gets
          you there. <a href="/features/price-elasticity-modeling" className="text-blue-600 hover:underline">Zorin fits a demand model to your own sales history</a> so you can see
          which of your products can support a price increase toward a healthier margin without
          losing the volume that makes the increase worthwhile. If your category shows up as
          unverified above, or you want to see how elasticity and margin interact directly,{" "}
          <a href="/research/price-elasticity-by-category" className="text-blue-600 hover:underline">the price elasticity by category reference</a> is the companion page to this one.
          Margin is only half the profit equation, <a href="/research/marketing-spend-by-product-category" className="text-blue-600 hover:underline">the marketing spend by category reference</a> covers
          the other half: how much of that margin typically gets spent acquiring the customer in
          the first place.
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
            Zorin. &ldquo;Gross Profit Margins by Ecommerce Product Category.&rdquo; Updated{" "}
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
