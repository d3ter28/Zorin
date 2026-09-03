import { research } from "@/lib/research";
import { Navbar } from "@/components/marketing/Navbar";
import { Footer } from "@/components/marketing/Footer";

const BASE_URL = "https://www.tryzorin.com";
const PAGE_URL = `${BASE_URL}/research`;

export const metadata = {
  title: "Ecommerce Pricing Research (Sourced Data) - Zorin",
  description:
    "Sourced, citable reference data on ecommerce pricing: price elasticity and profit margins by category, from peer-reviewed research and filings.",
  keywords: [
    "ecommerce pricing research",
    "ecommerce pricing statistics",
    "price elasticity data",
    "profit margin data",
  ],
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: "Ecommerce Pricing Research - Zorin",
    description:
      "Sourced, citable reference data on ecommerce pricing: price elasticity and profit margins by product category.",
    url: PAGE_URL,
    type: "website",
    images: [{ url: "/og-default.png", width: 1200, height: 630, alt: "Ecommerce Pricing Research - Zorin" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Ecommerce Pricing Research - Zorin",
    description:
      "Sourced, citable reference data on ecommerce pricing: price elasticity and profit margins by product category.",
    images: ["/og-default.png"],
  },
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
    { "@type": "ListItem", position: 2, name: "Research", item: PAGE_URL },
  ],
};

const collectionSchema = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Ecommerce Pricing Research",
  description:
    "Sourced, citable reference data on ecommerce pricing, compiled from peer-reviewed research and public company financial filings.",
  url: PAGE_URL,
  isPartOf: { "@type": "WebSite", name: "Zorin", url: BASE_URL },
  hasPart: research.map((item) => ({
    "@type": "Dataset",
    name: item.title,
    description: item.description,
    url: `${BASE_URL}/research/${item.slug}`,
  })),
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function ResearchIndexPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }} />
      <Navbar />
      <main className="mx-auto max-w-3xl px-6 pb-24 pt-32 md:pb-32">
        <a href="/blog" className="mb-6 inline-flex items-center gap-1.5 text-sm text-zinc-400 transition-colors hover:text-zinc-600">
          ← Blog
        </a>

        <span className="inline-flex w-fit rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-600">
          Research
        </span>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-zinc-900 md:text-4xl">
          Ecommerce Pricing Research
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-zinc-600">
          Sourced, citable reference data on ecommerce pricing. No product walkthroughs, no
          opinion pieces, just numbers with links back to where they actually came from:
          peer-reviewed academic research, government economic data, and public company
          financial filings. Every page below names exactly what we found, what we couldn&apos;t
          verify, and where to check the source yourself.
        </p>

        <div className="mt-10 flex flex-col gap-4">
          {research.map((item) => (
            <a
              key={item.slug}
              href={`/research/${item.slug}`}
              className="group flex flex-col rounded-xl border border-zinc-200 bg-white p-6 transition-shadow hover:shadow-md"
            >
              <span className="inline-flex w-fit rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                Research
              </span>
              <h2 className="mt-3 text-lg font-semibold leading-snug text-zinc-900 group-hover:text-blue-600">
                {item.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-zinc-500">{item.description}</p>
              <p className="mt-4 text-xs text-zinc-400">
                Updated {formatDate(item.updatedDate ?? item.date)}
              </p>
            </a>
          ))}
        </div>

        <div className="mt-12 rounded-xl border border-zinc-200 bg-zinc-50 p-6">
          <h2 className="text-sm font-semibold text-zinc-900">How to cite these pages</h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600">
            Each research page has its own citation block at the bottom with the direct URL and
            last-updated date. Link directly to the specific page rather than this index, since
            each one is versioned and dated independently.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
