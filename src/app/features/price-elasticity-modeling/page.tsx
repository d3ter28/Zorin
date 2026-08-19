import { Navbar } from "@/components/marketing/Navbar";
import { Footer } from "@/components/marketing/Footer";
import Link from "next/link";

export const metadata = {
  title: "Price Elasticity Modeling for Shopify & WooCommerce - Zorin",
  description:
    "Zorin fits a per-SKU demand curve from your sales history using log-log OLS regression and returns raise/lower/hold recommendations with estimated profit lift — no data science background required.",
};

export default function PriceElasticityModelingPage() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <section className="py-20 px-6 max-w-4xl mx-auto">
          <p className="text-sm font-semibold text-blue-600 uppercase tracking-wide mb-3">
            Feature
          </p>
          <h1 className="text-4xl font-bold text-zinc-900 mb-6">
            Price Elasticity Modeling for Shopify & WooCommerce
          </h1>
          <p className="text-xl text-zinc-600 mb-10 leading-relaxed">
            Your sales history already contains the answer to &ldquo;what should
            I charge?&rdquo; Zorin extracts it. For each product, it fits a
            demand curve from your order data and identifies the price that
            maximises your gross profit — not just your revenue.
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
              The model, explained plainly
            </h2>
            <p className="text-zinc-600 mb-8">
              Zorin uses log-log OLS (ordinary least squares) regression — the
              same elasticity model used in academic economics research, applied
              to your store&apos;s own data. It is transparent: you can see the
              demand curve, the R² fit score, and exactly why Zorin recommends
              raising or lowering your price.
            </p>
            <div className="grid md:grid-cols-3 gap-8">
              <div>
                <div className="text-2xl font-bold text-blue-600 mb-2">1</div>
                <h3 className="font-semibold text-zinc-900 mb-2">
                  Upload your sales history
                </h3>
                <p className="text-zinc-600 text-sm">
                  Import via CSV or connect Shopify or WooCommerce directly.
                  Orders sync automatically from that point on.
                </p>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600 mb-2">2</div>
                <h3 className="font-semibold text-zinc-900 mb-2">
                  Fit the model
                </h3>
                <p className="text-zinc-600 text-sm">
                  One click per product. Zorin fits the demand curve and returns
                  a model health score (Strong / Fair / Weak) based on R² and
                  data-point count.
                </p>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600 mb-2">3</div>
                <h3 className="font-semibold text-zinc-900 mb-2">
                  Get a recommendation
                </h3>
                <p className="text-zinc-600 text-sm">
                  RAISE, LOWER, or HOLD — with a specific target price,
                  estimated profit lift percentage, and a demand curve you can
                  inspect.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 px-6 max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-zinc-900 mb-8">
            What makes this different from other pricing tools
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                title: "Per-SKU, not catalog-wide rules",
                body: "Every product gets its own demand curve fitted from its own data. A rule like \"10% above cost\" applies the same logic to everything. Elasticity modeling finds the profit-maximising point for each product individually.",
              },
              {
                title: "Transparent, not a black box",
                body: "Zorin shows you the demand curve and the R² fit score. You can see how confident the model is and why the recommendation is what it is — not just \"our AI says raise it.\"",
              },
              {
                title: "Profit-maximising, not revenue-maximising",
                body: "The model optimises for gross profit, accounting for your COGS. Chasing revenue without margin context is how stores end up busy and unprofitable.",
              },
              {
                title: "Promotion-aware",
                body: "Promotional sales spikes are automatically detected and excluded from model fitting. Including them would skew your elasticity estimate upward and produce bad recommendations.",
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

        <section className="py-16 px-6 bg-zinc-50">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-zinc-900 mb-4">
              Requirements
            </h2>
            <ul className="space-y-3 text-zinc-600">
              <li className="flex gap-3">
                <span className="text-blue-600 font-bold mt-0.5">—</span>
                At least 6 months of sales history for the product
              </li>
              <li className="flex gap-3">
                <span className="text-blue-600 font-bold mt-0.5">—</span>
                Price variation in that history (the model cannot estimate
                elasticity if the price never changed)
              </li>
              <li className="flex gap-3">
                <span className="text-blue-600 font-bold mt-0.5">—</span>
                COGS entered for the product (required to optimise for profit,
                not just revenue)
              </li>
            </ul>
            <p className="mt-6 text-zinc-500 text-sm">
              No sales history yet?{" "}
              <Link href="/launch-planner" className="text-blue-600 underline">
                Launch Planner
              </Link>{" "}
              provides deterministic pricing from cost and competitor inputs
              while you build your data.
            </p>
          </div>
        </section>

        <section className="py-20 px-6 bg-blue-600">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              Find the profit-maximising price for every product.
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
