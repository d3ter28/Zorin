import { Navbar } from "@/components/marketing/Navbar";
import { Blog } from "@/components/marketing/Blog";
import { Footer } from "@/components/marketing/Footer";

export const metadata = {
  title: "Zorin - Pricing Guides for Online Sellers",
  description:
    "Practical pricing articles for Shopify and WooCommerce sellers: price elasticity, discounts, margins and pricing strategy, with the math worked out.",
  alternates: { canonical: "https://www.tryzorin.com" },
};

const tools = [
  {
    href: "/price-elasticity-calculator",
    title: "Price elasticity calculator",
    body: "Work out how sensitive demand is to a price change from two price and quantity points.",
  },
  {
    href: "/shopify-profit-margin-calculator",
    title: "Shopify profit margin calculator",
    body: "Include Shopify and payment fees to see the margin you actually keep per order.",
  },
  {
    href: "/woocommerce-profit-margin-calculator",
    title: "WooCommerce profit margin calculator",
    body: "The same margin math with WooCommerce and payment gateway fees built in.",
  },
  {
    href: "/van-westendorp-survey-template",
    title: "Van Westendorp survey template",
    body: "Ready-to-send questions for finding the price range your customers accept.",
  },
  {
    href: "/price-increase-email-template",
    title: "Price increase email template",
    body: "Tell customers about a price rise clearly and without losing their goodwill.",
  },
  {
    href: "/markdown-clearance-spreadsheet",
    title: "Markdown & clearance spreadsheet",
    body: "Plan markdown depth and timing to clear stock without wrecking margin.",
  },
];

export default function LandingPage() {
  return (
    <>
      <Navbar />
      <main>
        <section className="pt-16">
          <div className="mx-auto max-w-[1400px] px-6 py-16 md:py-24">
            <h1 className="max-w-[20ch] text-4xl font-bold tracking-tight text-zinc-900 md:text-6xl">
              Pricing, explained for online sellers.
            </h1>
            <p className="mt-6 max-w-[55ch] text-lg leading-relaxed text-zinc-500">
              Guides on price elasticity, discounting, margins and pricing strategy for Shopify and WooCommerce stores, written with worked numbers instead of rules of thumb.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a
                href="/blog"
                className="inline-flex h-11 items-center rounded-lg bg-blue-600 px-6 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700 active:scale-[0.98]"
              >
                Read the articles
              </a>
            </div>
          </div>
        </section>

        <Blog />

        <section id="tools" className="scroll-mt-20">
          <div className="mx-auto max-w-[1400px] px-6 py-10 md:py-16">
            <h2 className="text-3xl font-bold tracking-tight text-zinc-900 md:text-4xl">
              Free calculators and templates
            </h2>
            <p className="mt-3 max-w-[50ch] text-base leading-relaxed text-zinc-500">
              Small tools for the pricing questions that come up most.
            </p>
            <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {tools.map((t) => (
                <a
                  key={t.href}
                  href={t.href}
                  className="group flex flex-col rounded-xl border border-zinc-200 bg-white p-6 transition-shadow hover:shadow-md"
                >
                  <h3 className="text-base font-semibold text-zinc-900 group-hover:text-blue-600">
                    {t.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-500">{t.body}</p>
                </a>
              ))}
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </>
  );
}
