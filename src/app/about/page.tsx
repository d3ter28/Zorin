import { Navbar } from "@/components/marketing/Navbar";
import { Footer } from "@/components/marketing/Footer";

export const metadata = {
  title: "About Zorin",
  description:
    "Zorin is built by a small team focused on one problem: helping Shopify and WooCommerce merchants price with data instead of guesswork.",
  alternates: { canonical: "https://www.tryzorin.com/about" },
};

export default function AboutPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-2xl px-6 pb-24 pt-32 md:pb-32">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 md:text-4xl">
          About Zorin
        </h1>

        <div className="prose prose-zinc mt-10 max-w-none text-zinc-600">
          <p>
            Zorin is a pricing intelligence tool for Shopify and WooCommerce merchants.
            It reads your own sales history and tells you the price that maximizes your
            profit for each product - not a generic rule, and not a black-box &ldquo;AI&rdquo;
            claim you have to take on faith.
          </p>

          <h2 className="mt-10 text-xl font-semibold text-zinc-900">Why we built this</h2>
          <p>
            Most small and mid-sized ecommerce sellers price by gut feel, by matching
            competitors, or by setting a number once and never revisiting it. All three
            approaches ignore the one dataset that actually knows how your specific
            customers respond to price: your own order history. Zorin exists to make
            that data usable without requiring a data science background.
          </p>

          <h2 className="mt-10 text-xl font-semibold text-zinc-900">
            How the model works
          </h2>
          <p>
            Zorin fits a log-log OLS (ordinary least squares) regression per product from
            your sales history, the same class of elasticity model used in academic
            economics research, applied to your store&apos;s own transaction data. It
            returns a raise, lower, or hold recommendation with a confidence score based
            on the model&apos;s fit (R²) and how much data backs it. Promotional sales
            spikes are automatically detected via z-score analysis and excluded from
            model fitting, so a flash sale doesn&apos;t quietly convince the model your
            customers are more price-sensitive than they really are.
          </p>
          <p>
            We show the demand curve and the fit score behind every recommendation. If
            you can&apos;t see why a tool is telling you to change a price, you shouldn&apos;t
            have to trust it blindly - and we don&apos;t think you should have to trust us
            blindly either.
          </p>

          <h2 className="mt-10 text-xl font-semibold text-zinc-900">Where we are today</h2>
          <p>
            Zorin is an independent, early-stage product. We&apos;re building it in the
            open with real merchants, which means the roadmap is shaped directly by
            feedback rather than a fixed release plan. Every plan starts with a 7-day
            free trial and no credit card is required to try it.
          </p>

          <h2 className="mt-10 text-xl font-semibold text-zinc-900">Who&apos;s behind it</h2>
          <p>
            Zorin is built by Dexter and a small team, focused on one problem: helping
            ecommerce merchants price with data instead of guesswork.
          </p>

          <h2 className="mt-10 text-xl font-semibold text-zinc-900">Get in touch</h2>
          <p>
            Questions, feedback, or just want to talk through whether Zorin fits your
            store? Email{" "}
            <a href="mailto:support@tryzorin.com" className="text-blue-600 hover:underline">
              support@tryzorin.com
            </a>{" "}
            - a real person reads every message, no ticket queue.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
