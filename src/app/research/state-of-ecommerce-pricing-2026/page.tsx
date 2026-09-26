import { Navbar } from "@/components/marketing/Navbar";
import { Footer } from "@/components/marketing/Footer";

const BASE_URL = "https://www.tryzorin.com";
const PAGE_URL = `${BASE_URL}/research/state-of-ecommerce-pricing-2026`;
const FIRST_PUBLISHED = "2026-09-25";
const LAST_UPDATED = "2026-09-25";
const OG_IMAGE = "/og-default.png";

export const metadata = {
  title: "State of Ecommerce Pricing 2026 (Sourced Report) - Zorin",
  description:
    "How small online retailers price in 2026: tariff pass-through, price hikes, realization, discounts and returns, from NFIB, Boston Fed, NRF and more.",
  keywords: [
    "state of ecommerce pricing 2026",
    "ecommerce pricing statistics 2026",
    "small business price increases 2026",
    "tariff price pass-through small business",
  ],
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: "State of Ecommerce Pricing 2026",
    description:
      "A sourced roundup of how small online retailers are pricing in 2026, from tariff pass-through to discount depth and returns.",
    url: PAGE_URL,
    type: "article",
    publishedTime: FIRST_PUBLISHED,
    modifiedTime: LAST_UPDATED,
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: "State of Ecommerce Pricing 2026" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "State of Ecommerce Pricing 2026",
    description:
      "A sourced roundup of how small online retailers are pricing in 2026, from tariff pass-through to discount depth and returns.",
    images: [OG_IMAGE],
  },
};

type Source = { label: string; publisher: string; url: string };

const SOURCES = {
  nfib: {
    label: "Small Business Economic Trends, June 2026",
    publisher: "NFIB",
    url: "https://www.nfib.com/wp-content/uploads/2026/07/NFIB-June-2026-SBET-Report.pdf",
  },
  bostonFed: {
    label: "Who Will Pay for Tariffs? Businesses' Expectations about Costs and Prices",
    publisher: "Federal Reserve Bank of Boston",
    url: "https://www.bostonfed.org/publications/current-policy-perspectives/2025/who-pays-for-tariffs.aspx",
  },
  omnisend: {
    label: "54% of Online Retailers Impacted by Tariffs; 39% Hiked Prices",
    publisher: "Omnisend",
    url: "https://www.prnewswire.com/news-releases/54-of-online-retailers-impacted-by-tariffs-39-hiked-prices-with-plans-for-more-302638762.html",
  },
  simonKucher: {
    label: "Global Pricing Study 2025",
    publisher: "Simon-Kucher",
    url: "https://www.simon-kucher.com/en/insights/global-pricing-study-2025",
  },
  adobeDpi: {
    label: "Adobe Digital Price Index, October 2024",
    publisher: "Adobe",
    url: "https://news.adobe.com/news/2024/11/111224-adobe-digital-price-index",
  },
  adobeHoliday: {
    label: "Adobe Holiday Shopping Season 2025 Report",
    publisher: "Adobe",
    url: "https://news.adobe.com/news/2026/01/adobe-holiday-shopping-season",
  },
  nrf: {
    label: "2025 Retail Returns Landscape",
    publisher: "NRF & Happy Returns",
    url: "https://nrf.com/media-center/press-releases/consumers-expected-to-return-nearly-850-billion-in-merchandise-in-2025",
  },
} satisfies Record<string, Source>;

type Stat = { value: string; label: string; source: Source };

const HEADLINE_STATS: Stat[] = [
  { value: "38%", label: "Net share of U.S. small businesses raising average selling prices, June 2026", source: SOURCES.nfib },
  { value: "39%", label: "U.S. SMB online retailers that raised retail prices because of tariffs", source: SOURCES.omnisend },
  { value: "~50%", label: "Share of cost increases SMBs expect to pass into prices over 12 months", source: SOURCES.bostonFed },
  { value: "<50%", label: "Share of a planned price increase companies actually realize, on average", source: SOURCES.simonKucher },
  { value: "30.9%", label: "Peak Black Friday/Cyber Week 2025 discount on electronics, the deepest category", source: SOURCES.adobeHoliday },
  { value: "19.3%", label: "U.S. online sales returned in 2025", source: SOURCES.nrf },
];

const PRICE_INCREASE_SIZES = [
  { band: "Up to 5%", share: 27 },
  { band: "5–10%", share: 52 },
  { band: "More than 10%", share: 20 },
];

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Are small online retailers raising prices in 2026?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. NFIB's June 2026 survey found a net 38% of U.S. small businesses raised average selling prices, the highest level since January 2023. Among SMB online retailers specifically, Omnisend found 39% had raised retail prices because of tariffs.",
      },
    },
    {
      "@type": "Question",
      name: "How much are online retailers raising prices by?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Among SMB online retailers that raised prices in Omnisend's November 2025 survey, 52% raised them by 5-10%, 27% by up to 5%, and 20% by more than 10%.",
      },
    },
    {
      "@type": "Question",
      name: "How much of tariff costs are businesses passing on to customers?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "In the Federal Reserve Bank of Boston's August 2025 survey wave, small and medium-sized businesses expected to pass about half of their cost increases into prices over the next 12 months. Firms expecting tariffs to last longer planned to pass through far more.",
      },
    },
    {
      "@type": "Question",
      name: "Do price increases actually stick?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Often not in full. Simon-Kucher's Global Pricing Study 2025, a survey of more than 2,200 business leaders, found companies realize less than half of their planned price increases on average.",
      },
    },
    {
      "@type": "Question",
      name: "Is this report based on Zorin's own merchant data?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. This edition is compiled entirely from public third-party sources, each linked on the page. A future edition will add anonymized, aggregated data from stores connected to Zorin once there is enough of it to be meaningful.",
      },
    },
  ],
};

const reportSchema = {
  "@context": "https://schema.org",
  "@type": "Report",
  name: "State of Ecommerce Pricing 2026",
  description:
    "A sourced roundup of pricing conditions for small online retailers in 2026: tariff pass-through, price increases, price realization, discount depth and returns.",
  url: PAGE_URL,
  datePublished: FIRST_PUBLISHED,
  dateModified: LAST_UPDATED,
  author: { "@type": "Organization", name: "Zorin", url: BASE_URL },
  publisher: { "@type": "Organization", name: "Zorin", url: BASE_URL },
  isAccessibleForFree: true,
  citation: Object.values(SOURCES).map((s) => s.url),
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
    { "@type": "ListItem", position: 2, name: "Research", item: `${BASE_URL}/research` },
    { "@type": "ListItem", position: 3, name: "State of Ecommerce Pricing 2026", item: PAGE_URL },
  ],
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function Cite({ source }: { source: Source }) {
  return (
    <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
      {source.publisher}
    </a>
  );
}

export default function StateOfEcommercePricing2026Page() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(reportSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <Navbar />
      <main className="mx-auto max-w-3xl px-6 pb-24 pt-32 md:pb-32">
        <a href="/research" className="mb-6 inline-flex items-center gap-1.5 text-sm text-zinc-400 transition-colors hover:text-zinc-600">
          ← Research
        </a>

        <span className="inline-flex w-fit rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-600">
          Report
        </span>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-zinc-900 md:text-4xl">
          State of Ecommerce Pricing 2026
        </h1>
        <p className="mt-3 text-sm text-zinc-400">Last updated {formatDate(LAST_UPDATED)}</p>

        <p className="mt-6 text-lg leading-relaxed text-zinc-600">
          Costs went up, and small online retailers are passing more of them on to customers. But
          price increases don&apos;t stick as well as planned, discounting is getting deeper, and
          about a fifth of online sales still come back as returns. This report pulls the most
          recent public data on each of those into one place, with every figure linked to its
          source.
        </p>

        <div className="mt-10 rounded-xl border border-zinc-200 bg-zinc-50 p-6">
          <h2 className="text-sm font-semibold text-zinc-900">About this edition</h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600">
            This edition is built entirely from public third-party research: NFIB&apos;s monthly
            small business survey, the Federal Reserve Bank of Boston, Simon-Kucher, Adobe
            Analytics, the National Retail Federation and Omnisend. None of it comes from Zorin
            customer data. We&apos;ll add anonymized, aggregated data from connected stores in a
            future edition, once there&apos;s enough of it to be meaningful.
          </p>
        </div>

        <h2 className="mt-12 text-xl font-semibold text-zinc-900">Key Numbers</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {HEADLINE_STATS.map((s) => (
            <div key={s.label} className="rounded-xl border border-zinc-200 p-5">
              <p className="font-mono text-2xl font-bold text-zinc-900">{s.value}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-zinc-600">{s.label}</p>
              <p className="mt-2 text-xs"><Cite source={s.source} /></p>
            </div>
          ))}
        </div>

        <h2 className="mt-12 text-xl font-semibold text-zinc-900">1. Costs Are Rising, and Tariffs Are a Big Part of It</h2>
        <p className="mt-3 text-sm leading-relaxed text-zinc-600">
          The <Cite source={SOURCES.bostonFed} /> surveyed 500 to 600 small and medium-sized
          businesses in each of four waves between December 2024 and August 2025. Among firms
          whose costs were hit by the new tariffs, the average tariff rate they paid nearly doubled,
          from 6.5% in January 2025 to 11.4% in July 2025. In August, firms expected to pass about
          half of their cost increases into their prices over the following 12 months. How long
          they expected tariffs to last mattered a lot: firms expecting tariffs to stick around for
          a year or more planned pass-through of up to 70%, compared with under 20% for those
          expecting them to be short-lived.
        </p>

        <h2 className="mt-12 text-xl font-semibold text-zinc-900">2. Small Businesses Are Raising Prices at a Pace Not Seen Since Early 2023</h2>
        <p className="mt-3 text-sm leading-relaxed text-zinc-600">
          In <Cite source={SOURCES.nfib} />&apos;s June 2026 survey, a net 38% of small business
          owners raised their average selling prices (seasonally adjusted), up 2 points from May.
          That was the highest reading since January 2023. Before seasonal adjustment, 47% reported
          higher average prices and 7% reported lower ones. The share planning further increases
          fell, which suggests many owners had already made their move.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-zinc-600">
          Online retailers specifically follow the same pattern. In a November 2025 survey of 170
          U.S. SMB ecommerce owners by <Cite source={SOURCES.omnisend} />, 54% said tariffs had
          forced significant changes. 39% raised retail prices, 29% switched suppliers and 19% cut
          the number of products they sell. Most of the increases were moderate:
        </p>
        <div className="mt-6 overflow-x-auto rounded-xl border border-zinc-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-3">Size of price increase</th>
                <th className="px-4 py-3">Share of retailers that raised prices</th>
              </tr>
            </thead>
            <tbody>
              {PRICE_INCREASE_SIZES.map((row) => (
                <tr key={row.band} className="border-t border-zinc-100">
                  <td className="px-4 py-3 font-medium text-zinc-900">{row.band}</td>
                  <td className="px-4 py-3 font-mono text-zinc-700">{row.share}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-zinc-500">
          Source: <Cite source={SOURCES.omnisend} />, November 2025. Shares don&apos;t total 100% due to rounding.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-zinc-600">
          In the same survey, if costs rose 10% overnight, 46% of these retailers said they would
          raise product prices, 16% would add or raise shipping fees and 16% would cut discounts.
        </p>

        <h2 className="mt-12 text-xl font-semibold text-zinc-900">3. Most Price Increases Don&apos;t Fully Stick</h2>
        <p className="mt-3 text-sm leading-relaxed text-zinc-600">
          Deciding on a price increase is easier than keeping it. <Cite source={SOURCES.simonKucher} />&apos;s
          Global Pricing Study 2025 surveyed more than 2,200 business leaders across 28 countries
          and 39 industries. It found companies realize less than half of their planned price
          increases on average. The rest leaks away through discounts, exceptions and lost volume.
          For a small store, the usual cause is raising prices across the board, including on
          products whose buyers are highly price-sensitive. More on that in{" "}
          <a href="/blog/price-increase-killed-your-sales-heres-the-real-reason" className="text-blue-600 hover:underline">
            why sales drop after a price increase
          </a>
          .
        </p>

        <h2 className="mt-12 text-xl font-semibold text-zinc-900">4. Discounting Got Deeper</h2>
        <p className="mt-3 text-sm leading-relaxed text-zinc-600">
          Over Black Friday/Cyber Week 2025, <Cite source={SOURCES.adobeHoliday} /> recorded peak
          discounts of 30.9% on electronics, 29.6% on toys and 25.1% on apparel. 7 of the 8
          categories it tracks discounted more deeply than in 2024. Our{" "}
          <a href="/research/discount-depth-by-product-category" className="text-blue-600 hover:underline">
            discount depth by category
          </a>{" "}
          page has the full breakdown. Deeper discounts on top of higher costs is exactly the
          combination that squeezes margin from both sides.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-zinc-600">
          Online prices had been falling for a while before this. The last public release of the{" "}
          <Cite source={SOURCES.adobeDpi} /> Digital Price Index, for October 2024, showed online
          prices down 2.9% year over year, the 26th straight month of annual declines. Apparel was
          down 9.9%, toys 4.4% and computers 3.8%, while electronics rose 0.3%. It&apos;s the most
          recent public release of the index we could find, so treat it as background rather than
          a current reading.
        </p>

        <h2 className="mt-12 text-xl font-semibold text-zinc-900">5. Returns Still Take a Fifth of Online Sales</h2>
        <p className="mt-3 text-sm leading-relaxed text-zinc-600">
          The <Cite source={SOURCES.nrf} /> estimate that 19.3% of U.S. online sales will be
          returned in 2025, against 15.8% for retail overall, or $849.9 billion in merchandise.
          82% of consumers call free returns a major factor when deciding to buy, and 9% of all
          returns are fraudulent. Return rates vary widely by category, from single digits in
          beauty to 30% and more in apparel. See{" "}
          <a href="/research/return-rate-by-product-category" className="text-blue-600 hover:underline">
            return rate by product category
          </a>
          .
        </p>

        <h2 className="mt-12 text-xl font-semibold text-zinc-900">What This Means for Your Store</h2>
        <p className="mt-3 text-sm leading-relaxed text-zinc-600">
          Put the five findings together and you get the 2026 pricing problem for a small online
          store. Costs are up, competitors are raising prices too, and shoppers still expect deep
          sale discounts and free returns. A flat increase across your whole catalog is the
          easiest move, and it&apos;s also the one most likely to fall into the &ldquo;less than
          half realized&rdquo; bucket. Raising prices on products whose demand barely reacts to
          price, while holding prices on the sensitive ones, keeps more of the increase.{" "}
          <a href="/blog/how-to-raise-prices-without-losing-customers" className="text-blue-600 hover:underline">
            Should you raise prices to cover rising costs?
          </a>{" "}
          walks through that decision, and{" "}
          <a href="/features/price-elasticity-modeling" className="text-blue-600 hover:underline">
            Zorin measures each product&apos;s price sensitivity
          </a>{" "}
          from your own Shopify or WooCommerce sales history, so you know which products can take
          an increase.
        </p>

        <div className="mt-8 rounded-xl border border-blue-100 bg-blue-50 p-6 text-center">
          <p className="text-sm font-semibold text-zinc-900">
            See which of your products can absorb a price increase.
          </p>
          <a
            href="/signup"
            className="mt-3 inline-flex h-10 items-center rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700 active:scale-[0.98]"
          >
            Start free trial
          </a>
        </div>

        <h2 className="mt-12 text-xl font-semibold text-zinc-900">Sources</h2>
        <ul className="mt-4 flex flex-col gap-2 text-sm">
          {Object.values(SOURCES).map((s) => (
            <li key={s.url} className="text-zinc-600">
              {s.publisher},{" "}
              <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                {s.label}
              </a>
            </li>
          ))}
        </ul>

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
          <h2 className="text-sm font-semibold text-zinc-900">How to Cite This Report</h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-500">
            Zorin. &ldquo;State of Ecommerce Pricing 2026.&rdquo; Updated {formatDate(LAST_UPDATED)}.{" "}
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
