import { Navbar } from "@/components/marketing/Navbar";
import { Footer } from "@/components/marketing/Footer";

const BASE_URL = "https://www.tryzorin.com";
const PAGE_URL = `${BASE_URL}/research/inventory-turnover-by-product-category`;
const FIRST_PUBLISHED = "2026-09-01";
const LAST_UPDATED = "2026-09-01";
const OG_IMAGE = "/og-default.png";

export const metadata = {
  title: "Inventory Turnover by Product Category (Sourced Data) - Zorin",
  description:
    "Real inventory turnover ratios and days inventory outstanding by ecommerce product category, calculated from public company SEC filings. Citable, with links to every source.",
  keywords: [
    "inventory turnover by category",
    "days inventory outstanding ecommerce",
    "inventory turnover ratio benchmarks",
    "how fast does inventory sell by category",
  ],
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: "Inventory Turnover by Ecommerce Product Category",
    description:
      "Real, sourced inventory turnover ratios and days inventory outstanding across 7 ecommerce categories, calculated from public company financial filings.",
    url: PAGE_URL,
    type: "article",
    publishedTime: FIRST_PUBLISHED,
    modifiedTime: LAST_UPDATED,
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: "Inventory Turnover by Ecommerce Product Category" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Inventory Turnover by Ecommerce Product Category",
    description:
      "Real, sourced inventory turnover ratios and days inventory outstanding across 7 ecommerce categories, calculated from public company financial filings.",
    images: [OG_IMAGE],
  },
};

type CategoryRow = {
  category: string;
  turnover: string;
  days: string;
  classification: string;
  explanation: string;
  note?: string;
  sources: { label: string; url: string; publisher: string }[];
};

const TIER_1: CategoryRow[] = [
  {
    category: "Pet Products",
    turnover: "Chewy: 10.4x (FY2025)",
    days: "~35 days",
    classification: "Fastest turnover measured",
    explanation:
      "Chewy turned its inventory 10.4 times in its most recent fiscal year, calculated from $8,847.6 million in cost of goods sold against average inventory of $850.75 million. That works out to roughly 35 days between when a unit of stock arrives and when it's sold, the fastest cycle in this dataset. This is the same structural advantage that shows up in our companion research on marketing spend by category, where Chewy posted the lowest marketing-spend ratio measured: pet food and supplies are consumable, not one-time purchases, so a large share of what moves off the shelf is a repeat order from an existing customer rather than new stock waiting on a first-time buyer.",
    sources: [
      {
        label: "Chewy Announces Fiscal Fourth Quarter and Full Year 2025 Financial Results",
        url: "https://investor.chewy.com/news-and-events/news/news-details/2026/Chewy-Announces-Fiscal-Fourth-Quarter-and-Full-Year-2025-Financial-Results/default.aspx",
        publisher: "Chewy investor relations",
      },
      {
        label: "Chewy, Inc. Form 10-K (FY2025)",
        url: "https://www.sec.gov/Archives/edgar/data/1766502/000176650225000014/chwy-20250202.htm",
        publisher: "SEC EDGAR",
      },
    ],
  },
  {
    category: "Consumer Electronics",
    turnover: "GoPro: 5.8x (FY2023)",
    days: "~63 days",
    classification: "Fast, shaped by a shrinking base",
    explanation:
      "GoPro turned its inventory 5.8 times in its most recently detailed fiscal year, calculated from $680.0 million in cost of revenue against average inventory of $116.7 million. Inventory itself fell 16% year over year, from $127.1 million to $106.3 million, alongside declining revenue, so part of this turnover figure reflects a company deliberately shrinking its stock position to match softening demand rather than pure sell-through efficiency. Worth reading alongside our companion research on marketing spend, where GoPro's marketing intensity ran high and rising over the same stretch: a company can be moving inventory reasonably fast while still fighting to convert that movement into growth.",
    sources: [
      {
        label: "GoPro, Inc. Form 10-K (FY2023)",
        url: "https://www.sec.gov/Archives/edgar/data/1500435/000150043524000021/gpro-20231231.htm",
        publisher: "SEC EDGAR",
      },
    ],
  },
  {
    category: "Toys & Games",
    turnover: "Mattel: 5.2x (FY2025)",
    days: "~71 days",
    classification: "Moderate-fast, shaped by one seasonal peak",
    explanation:
      "Mattel turned its inventory 5.2 times in its most recent fiscal year, calculated from $2,742.0 million in cost of sales against average inventory of $532.4 million, up from $501.7 million the year before. That average figure hides more than it shows for a toy company specifically: inventory builds through the second and third quarters ahead of the holiday season, then sells down sharply in the fourth, so the annual turnover ratio blends a slow accumulation phase with a fast liquidation phase rather than reflecting steady, even sell-through across the year the way a category like pet products does.",
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
    turnover: "Nike: 3.5x (FY2025)",
    days: "~103 days",
    classification: "Moderate",
    explanation:
      "Nike turned its inventory 3.5 times in its most recent fiscal year, calculated from $26,519 million in cost of sales against average inventory of $7,504 million, essentially flat year over year ($7,519 million to $7,489 million). A three-and-a-half-month cycle between production and sale is typical for a company managing seasonal apparel lines and wholesale-plus-DTC distribution simultaneously, stock has to sit in the system long enough to reach both retail partners and Nike's own channels before it clears. That's a slower cycle than the toy or electronics categories above despite Nike's scale, which points to apparel's longer supply chain lead times rather than weak demand.",
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
    turnover: "Signet Jewelers: 2.1x (FY2026, calculated)",
    days: "~172 days",
    classification: "Slow, tied to high unit value",
    explanation:
      "Signet Jewelers turned its inventory roughly 2.1 times in its most recent fiscal year, calculated from an estimated $4,122 million in cost of sales (derived from $6,813.6 million in sales and a disclosed 39.5% gross margin) against average inventory of $1,938.7 million, which sat almost exactly flat year over year. Nearly six months of inventory on hand is expensive to finance, but it's structural to the category: a jewelry retailer has to hold a wide enough spread of price points and styles in each store for a customer to find the specific piece they're there for, and that piece often represents a considered, infrequent purchase rather than an impulse buy.",
    note: "This cost-of-sales figure is calculated from two disclosed numbers (total sales and gross margin percentage), not a line item Signet reports directly as a dollar figure.",
    sources: [
      {
        label: "SIGNET JEWELERS LTD Form 10-K (FY2026)",
        url: "https://www.sec.gov/Archives/edgar/data/832988/000083298826000055/sig-20260131.htm",
        publisher: "SEC EDGAR",
      },
      {
        label: "Signet Jewelers Reports Fourth Quarter and Full Year Fiscal 2026 Results",
        url: "https://www.signetjewelers.com/investors/financial-news-releases/financial-news-release/2026/Signet-Jewelers-Reports-Fourth-Quarter-and-Full-Year-Fiscal-2026-Results/default.aspx",
        publisher: "Signet Jewelers investor relations",
      },
    ],
  },
  {
    category: "Beauty & Skincare",
    turnover: "e.l.f. Beauty: 2.0x (FY2025)",
    days: "~183 days",
    classification: "Slowest among conventional retailers measured",
    explanation:
      "e.l.f. Beauty turned its inventory exactly 2.0 times in its most recent fiscal year, calculated from $377.8 million in cost of sales against average inventory of $189.3 million, which actually declined slightly year over year even as the company's revenue grew. Roughly six months of stock on hand is the slowest cycle among conventional retailers in this dataset, and it lines up with what our companion research found on both margin and marketing spend: e.l.f. posts the highest gross margin (71.2%) and the highest marketing-spend ratio (21.4% of net sales) measured across all three pages. A slow-turning product needs that margin cushion to cover the carrying cost of sitting in inventory for half a year, and needs continuous paid acquisition spend precisely because a wide catalog of SKUs sitting on shelves doesn't sell itself the way a narrow, high-repeat catalog does.",
    sources: [
      {
        label: "e.l.f. Beauty, Inc. Form 10-K (FY2025)",
        url: "https://www.sec.gov/Archives/edgar/data/1600033/000160003325000016/elf-20250331.htm",
        publisher: "SEC EDGAR",
      },
    ],
  },
  {
    category: "Furniture & Home Goods",
    turnover: "Wayfair: 109.6x (FY2024)",
    days: "~3 days",
    classification: "Not comparable to a traditional retailer",
    explanation:
      "Wayfair's reported inventory turnover works out to roughly 110 times a year, calculated from $8,277 million in cost of goods sold against average inventory of just $75.5 million. That number is real, but it doesn't mean what it would mean for any other company on this page: Wayfair runs an asset-light model where most orders drop-ship directly from the manufacturer or supplier to the customer, so the company itself barely touches physical inventory at all. The figure measures how little furniture Wayfair warehouses on its own books, not how efficiently a piece of furniture actually moves from a factory floor to a customer's home, which is a fundamentally different question a small furniture retailer holding its own stock would need to answer differently.",
    note: "Not a meaningful comparison point for a merchant who holds their own inventory. Include only if you understand why the number is this extreme.",
    sources: [
      {
        label: "Wayfair Inc. Form 10-K (FY2024)",
        url: "https://www.sec.gov/Archives/edgar/data/1616707/000161670725000022/w-20241231.htm",
        publisher: "SEC EDGAR",
      },
      {
        label: "Wayfair Announces Fourth Quarter and Full Year 2024 Results",
        url: "https://investor.wayfair.com/news/news-details/2025/Wayfair-Announces-Fourth-Quarter-and-Full-Year-2024-Results-Reports-Positive-Year-Over-Year-Growth-with-Strong-Profitability/default.aspx",
        publisher: "Wayfair investor relations",
      },
    ],
  },
];

const NOT_VERIFIED = [
  {
    category: "Books & Media",
    reason:
      "Scholastic, the publisher we used for this category in our companion margin research, discloses cost of goods sold broken out separately by segment (Children's Book Publishing and Distribution, Education Solutions, Trade, International) rather than as a single consolidated figure on its income statement. Pairing one segment's cost of goods sold with the company's total consolidated inventory would understate turnover in a way we couldn't correct for without access to segment-level inventory data the 10-K doesn't provide, so we're leaving this category out rather than publish a ratio built on mismatched numbers.",
  },
];

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is a good inventory turnover ratio for ecommerce?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Based on the sourced data on this page, publicly traded companies across conventional (non-dropship) categories turn inventory between roughly 2.0x and 5.8x a year, meaning stock sits for anywhere from about two months to six months before it sells. There's no single right number: it depends heavily on repeat-purchase frequency, seasonality, and how many SKUs and price points a category needs to stock at once.",
      },
    },
    {
      "@type": "Question",
      name: "Which ecommerce categories turn inventory fastest?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Based on the sourced data on this page, pet products (Chewy, 10.4x a year) turn inventory fastest among conventional retailers, driven by high repeat-purchase frequency on consumable goods. Wayfair's furniture and home goods figure (109.6x) is faster still but isn't a meaningful comparison, it reflects an asset-light dropship model rather than genuinely efficient physical inventory movement.",
      },
    },
    {
      "@type": "Question",
      name: "Which ecommerce categories turn inventory slowest?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Beauty and skincare (e.l.f. Beauty, 2.0x a year, roughly 183 days) and jewelry (Signet Jewelers, 2.1x a year, roughly 172 days) show the slowest inventory turnover in the sourced data on this page. Both categories need to stock a wide spread of SKUs, shades, or price points for a customer to find the specific item they want, which naturally slows how fast any single unit sells.",
      },
    },
    {
      "@type": "Question",
      name: "How is inventory turnover calculated?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Inventory turnover equals cost of goods sold for a period divided by average inventory over that same period (typically the average of the beginning and ending balance). Days inventory outstanding, which is often more intuitive, equals 365 divided by the turnover ratio. Both figures on this page are calculated from the two underlying dollar amounts each company discloses separately in its SEC filings.",
      },
    },
    {
      "@type": "Question",
      name: "Why is Wayfair's inventory turnover so much higher than every other category?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Wayfair operates a largely asset-light, drop-ship model, meaning most orders ship directly from the manufacturer or supplier to the customer rather than sitting in Wayfair's own warehouses first. Its reported turnover of roughly 110x a year reflects how little inventory the company itself holds, not how efficiently a piece of furniture moves through a supply chain. It's not a comparable benchmark for a merchant who buys and holds their own stock.",
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
  name: "Inventory Turnover by Ecommerce Product Category",
  description:
    "A sourced compilation of inventory turnover ratios and days inventory outstanding across ecommerce-relevant product categories, calculated from public company SEC filings and investor relations disclosures.",
  url: PAGE_URL,
  datePublished: FIRST_PUBLISHED,
  dateModified: LAST_UPDATED,
  creator: { "@type": "Organization", name: "Zorin", url: BASE_URL },
  publisher: { "@type": "Organization", name: "Zorin", url: BASE_URL },
  license: "https://www.tryzorin.com/terms",
  isAccessibleForFree: true,
  keywords: [
    "inventory turnover by category",
    "days inventory outstanding",
    "inventory turnover ratio",
    "ecommerce inventory benchmarks",
  ],
  variableMeasured: "Inventory turnover ratio (cost of goods sold / average inventory) and days inventory outstanding",
  spatialCoverage: "United States public companies",
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
    { "@type": "ListItem", position: 2, name: "Research", item: `${BASE_URL}/research` },
    { "@type": "ListItem", position: 3, name: "Inventory Turnover by Category", item: PAGE_URL },
  ],
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function InventoryTurnoverByProductCategoryPage() {
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
          Inventory Turnover by Ecommerce Product Category
        </h1>
        <p className="mt-3 text-sm text-zinc-400">Last updated {formatDate(LAST_UPDATED)}</p>

        <p className="mt-6 text-lg leading-relaxed text-zinc-600">
          A sourced reference of real inventory turnover ratios and days inventory outstanding
          across ecommerce product categories, calculated from public company SEC filings and
          investor relations disclosures. Every figure below links to its original source.
          Categories where no comparable public disclosure exists are listed separately rather
          than filled in with a guess.
        </p>
        <p className="mt-4 text-sm leading-relaxed text-zinc-600">
          This is the third page in a series that started with our research on{" "}
          <a href="/research/profit-margins-by-product-category" className="text-blue-600 hover:underline">gross margin by category</a>{" "}
          and{" "}
          <a href="/research/marketing-spend-by-product-category" className="text-blue-600 hover:underline">marketing spend by category</a>.
          Turnover completes a picture those two pages only hinted at: how long a product actually
          sits on the shelf shapes both how much margin cushion a category needs and how much
          acquisition spend it can justify per unit sold.
        </p>

        <div className="mt-10 rounded-xl border border-zinc-200 bg-zinc-50 p-6">
          <h2 className="text-sm font-semibold text-zinc-900">Methodology</h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600">
            We identified a publicly traded company representative of each category, matching the
            same companies used in our companion margin and marketing-spend research wherever
            possible, and pulled its cost of goods sold (or cost of sales) alongside beginning and
            ending inventory balances directly from its most recent SEC 10-K filing or official
            investor relations release. Inventory turnover is calculated as cost of goods sold
            divided by average inventory (the mean of the beginning and ending balance). Days
            inventory outstanding is calculated as 365 divided by the turnover ratio.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-zinc-600">
            Where a company discloses cost of goods sold directly as a line item, we use that
            figure as reported. Where we had to derive it from two other disclosed numbers (as
            with Signet Jewelers below), we flag that calculation explicitly rather than present it
            as a company-stated figure.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-zinc-600">
            One company in this dataset, Wayfair, is included with a significant caveat rather than
            excluded outright: its asset-light drop-ship model produces a turnover figure so
            extreme that it measures something different from what the ratio measures for every
            other company here. We kept it in because the reason behind the number is itself useful
            context, not because the raw figure is a fair comparison point.
          </p>
        </div>

        <h2 className="mt-12 text-xl font-semibold text-zinc-900">Verified Categories</h2>
        <p className="mt-2 text-sm text-zinc-500">
          Each figure is calculated from numbers disclosed in a public company SEC filing or official investor release.
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
              <p className="mt-2 font-mono text-sm text-zinc-700">{row.turnover} · {row.days}</p>
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
          This category is represented by a public company whose disclosures don&apos;t support a
          clean, comparable turnover calculation.
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
          Every figure on this page comes from a company large enough to run a sophisticated supply
          chain and demand-forecasting operation, resources most small stores don&apos;t have.
          A small independent merchant in the same category often turns inventory slower than the
          public company benchmark, not faster, since it can't spread purchase order minimums or
          warehousing costs across the same volume. The direction of that adjustment matches what
          we found researching gross margin by category: small stores tend to run behind the public
          company benchmark on efficiency metrics generally, not just margin specifically.
        </p>

        <h2 className="mt-12 text-xl font-semibold text-zinc-900">What This Means for Your Own Store</h2>
        <p className="mt-3 text-sm leading-relaxed text-zinc-600">
          Slow-turning inventory and pricing decisions are directly connected: stock that sits for
          months is tying up cash and carrying real holding cost the whole time it's unsold, which
          is exactly the situation a well-timed discount is meant to solve, moving product before it
          becomes a deeper problem, without guessing at how much of a price cut is actually needed. <a href="/research/profit-margins-by-product-category" className="text-blue-600 hover:underline">Our companion page on gross margin by category</a> covers
          how much room a discount has to work with, <a href="/research/discount-impact-on-margin-by-product-category" className="text-blue-600 hover:underline">our page on discount impact on margin by category</a> covers
          what public companies actually report that markdown costing them, and{" "}
          <a href="/blog/how-to-run-a-sale-without-wrecking-your-margin" className="text-blue-600 hover:underline">our guide to running a sale without wrecking your margin</a> covers
          how to size one. <a href="/features/price-elasticity-modeling" className="text-blue-600 hover:underline">Zorin fits a demand model to your own sales history</a> so
          you can see exactly how a specific product responds to a price change, rather than
          applying a category-wide average to your own slow-moving stock.
        </p>

        <div className="mt-8 rounded-xl border border-blue-100 bg-blue-50 p-6 text-center">
          <p className="text-sm font-semibold text-zinc-900">
            See which of your own products are actually moving too slowly to price this way.
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
            Zorin. &ldquo;Inventory Turnover by Ecommerce Product Category.&rdquo; Updated{" "}
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
