import { Navbar } from "@/components/marketing/Navbar";
import { Footer } from "@/components/marketing/Footer";
import Link from "next/link";
import { buildBreadcrumbSchema } from "@/lib/seo/toolSchema";

export const metadata = {
  title: "Competitor Price Tracking for Shopify & WooCommerce - Zorin",
  description:
    "Track competitor prices per product, see min/median/max market stats, and feed live competitive data into your pricing recommendations — without manual spreadsheets.",
  alternates: { canonical: "https://www.tryzorin.com/features/competitor-price-tracking" },
};

const breadcrumbSchema = buildBreadcrumbSchema([
  { name: "Features", path: "/features" },
  { name: "Competitor Price Tracking", path: "/features/competitor-price-tracking" },
]);

export default function CompetitorPriceTrackingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <Navbar />
      <main className="flex-1">
        <section className="py-20 px-6 max-w-4xl mx-auto">
          <p className="text-sm font-semibold text-blue-600 uppercase tracking-wide mb-3">
            Feature
          </p>
          <h1 className="text-4xl font-bold text-zinc-900 mb-6">
            Competitor Price Tracking for Shopify & WooCommerce
          </h1>
          <p className="text-xl text-zinc-600 mb-10 leading-relaxed">
            Know where your prices stand in the market. Zorin lets you record
            competitor prices per product, see min, median, and max stats at a
            glance, and use that data to inform your launch and campaign
            decisions — all without leaving your dashboard.
          </p>
          <Link
            href="/signup"
            className="inline-block bg-blue-600 text-white font-semibold px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Start free trial
          </Link>
        </section>

        <section className="py-16 px-6 bg-zinc-50">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-zinc-900 mb-8">
              How it works
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div>
                <div className="text-2xl font-bold text-blue-600 mb-2">1</div>
                <h3 className="font-semibold text-zinc-900 mb-2">
                  Add competitor prices
                </h3>
                <p className="text-zinc-600 text-sm">
                  On any product page, add a competitor name, their price, and
                  an optional URL. As many competitors as you need, per product.
                </p>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600 mb-2">2</div>
                <h3 className="font-semibold text-zinc-900 mb-2">
                  See market stats instantly
                </h3>
                <p className="text-zinc-600 text-sm">
                  Zorin calculates the minimum, median, and maximum price across
                  all competitors you have entered for that product.
                </p>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600 mb-2">3</div>
                <h3 className="font-semibold text-zinc-900 mb-2">
                  Feed into Launch Planner
                </h3>
                <p className="text-zinc-600 text-sm">
                  Competitor prices prefill the Launch Planner automatically
                  when you open it for that product — no copy-pasting.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 px-6 max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-zinc-900 mb-8">
            Why it matters
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                title: "Stop guessing your market position",
                body: "Most merchants have a rough idea of what competitors charge. Recording it makes it exact, comparable, and actionable.",
              },
              {
                title: "No separate spreadsheet needed",
                body: "Competitor data lives alongside your elasticity model and recommendations — one place, not three.",
              },
              {
                title: "Better launch pricing",
                body: "When you are pricing a new product with no sales history yet, competitor prices are often your best signal. Zorin connects them to your launch plan automatically.",
              },
              {
                title: "Works alongside your demand curve",
                body: "Competitor benchmarks inform context. Your own elasticity model tells you what your specific customers will tolerate. Zorin shows you both.",
              },
            ].map((item) => (
              <div key={item.title} className="bg-zinc-50 rounded-xl p-6">
                <h3 className="font-semibold text-zinc-900 mb-2">
                  {item.title}
                </h3>
                <p className="text-zinc-600 text-sm">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="py-20 px-6 bg-blue-600">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              Know your market. Price with confidence.
            </h2>
            <p className="text-blue-100 mb-8">
              7-day free trial. No credit card required.
            </p>
            <Link
              href="/signup"
              className="inline-block bg-white text-blue-600 font-semibold px-8 py-3 rounded-lg hover:bg-blue-50 transition-colors"
            >
              Start free trial
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
