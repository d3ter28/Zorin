import { Navbar } from "@/components/marketing/Navbar";
import { Footer } from "@/components/marketing/Footer";
import Link from "next/link";
import { buildBreadcrumbSchema } from "@/lib/seo/toolSchema";

export const metadata = {
  title: "Promotion Detection for Ecommerce Pricing - Zorin",
  description:
    "Zorin automatically identifies promotional sales spikes in your order history using z-score analysis and excludes them from elasticity model fitting, so your price recommendations reflect real demand — not sale-day noise.",
  alternates: { canonical: "https://www.tryzorin.com/features/promotion-detection" },
};

const breadcrumbSchema = buildBreadcrumbSchema([
  { name: "Features", path: "/features" },
  { name: "Promotion Detection", path: "/features/promotion-detection" },
]);

export default function PromotionDetectionPage() {
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
            Automatic Promotion Detection for Ecommerce Pricing
          </h1>
          <p className="text-xl text-zinc-600 mb-10 leading-relaxed">
            Running a sale creates a spike in units sold at a lower price. If
            that data goes into your elasticity model, it makes your customers
            look far more price-sensitive than they actually are — and Zorin
            will recommend prices that are too low. Promotion detection fixes
            this automatically.
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
            <h2 className="text-2xl font-bold text-zinc-900 mb-4">
              The problem with promotional data
            </h2>
            <p className="text-zinc-600 mb-6">
              Price elasticity is estimated from the relationship between price
              and units sold. When you run a promotion, sales spike — not
              because your customers suddenly became more price-sensitive, but
              because of marketing, urgency, and the temporary discount itself.
              Including those data points tells the model the wrong story.
            </p>
            <p className="text-zinc-600">
              The result: a model that overestimates price sensitivity and
              recommends you lower prices further than your actual customers
              require.
            </p>
          </div>
        </section>

        <section className="py-16 px-6 max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-zinc-900 mb-8">
            How Zorin handles it
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <div className="text-2xl font-bold text-blue-600 mb-2">1</div>
              <h3 className="font-semibold text-zinc-900 mb-2">
                Z-score detection
              </h3>
              <p className="text-zinc-600 text-sm">
                Zorin calculates the residuals between your actual sales records
                and the fitted log-log demand curve. Records where the z-score
                exceeds 2.0 are flagged as statistical outliers — likely
                promotional periods.
              </p>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600 mb-2">2</div>
              <h3 className="font-semibold text-zinc-900 mb-2">
                Automatic or manual
              </h3>
              <p className="text-zinc-600 text-sm">
                Run auto-detection with one click, or toggle individual records
                manually. You stay in control — if Zorin flags something that
                was not a promotion, you can unflag it.
              </p>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600 mb-2">3</div>
              <h3 className="font-semibold text-zinc-900 mb-2">
                Excluded from model fitting
              </h3>
              <p className="text-zinc-600 text-sm">
                Flagged records are automatically excluded when you fit or
                re-fit the elasticity model. The underlying data is preserved —
                only the model training ignores it.
              </p>
            </div>
          </div>
        </section>

        <section className="py-16 px-6 bg-zinc-50">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-zinc-900 mb-8">
              Why this matters for your recommendations
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              {[
                {
                  title: "More accurate elasticity estimates",
                  body: "Removing promotional noise gives the model a cleaner view of how your customers respond to price at normal trading conditions.",
                },
                {
                  title: "Prevents artificially low price recommendations",
                  body: "Without promotion detection, the model may recommend lower prices than your customers actually require to buy at normal demand.",
                },
                {
                  title: "Especially important for seasonal stores",
                  body: "If your store runs regular promotions — seasonal sales, flash discounts, clearance events — this data would otherwise dominate your model and skew every recommendation.",
                },
                {
                  title: "Your promotion data is not deleted",
                  body: "Flagged records are only excluded from model training. Your full order history remains intact for reporting and profit tracking.",
                },
              ].map((item) => (
                <div key={item.title} className="bg-white rounded-xl p-6 border border-zinc-200">
                  <h3 className="font-semibold text-zinc-900 mb-2">
                    {item.title}
                  </h3>
                  <p className="text-zinc-600 text-sm">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 px-6 bg-blue-600">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              Price recommendations that reflect real demand.
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
