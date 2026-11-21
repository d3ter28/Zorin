import { Navbar } from "@/components/marketing/Navbar";
import { Footer } from "@/components/marketing/Footer";

export const metadata = {
  title: "About Zorin: Pricing Guides for Online Sellers",
  description:
    "Zorin publishes practical pricing guides for Shopify and WooCommerce sellers: price elasticity, discounting, margins and strategy, with the math worked out.",
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
            Zorin publishes practical pricing guides for Shopify and WooCommerce sellers.
            Each article works through the numbers (elasticity, margins, discount depth,
            price testing) so you can see how a pricing decision plays out before you
            make it.
          </p>

          <h2 className="mt-10 text-xl font-semibold text-zinc-900">Why we write this</h2>
          <p>
            Most small and mid-sized ecommerce sellers price by gut feel, by matching
            competitors, or by setting a number once and never revisiting it. We think
            pricing deserves the same care as product and marketing, and that the
            underlying math is simpler than it looks once it&apos;s laid out with real
            examples.
          </p>

          <h2 className="mt-10 text-xl font-semibold text-zinc-900">Where this came from</h2>
          <p>
            Zorin began as a pricing-analysis tool that fit a demand model to a store&apos;s
            own sales history. We&apos;ve retired the software and now focus on publishing
            what we learned building it, along with free calculators and templates.
          </p>

          <h2 className="mt-10 text-xl font-semibold text-zinc-900">Who&apos;s behind it</h2>
          <p>Zorin is written by Dexter.</p>

          <h2 className="mt-10 text-xl font-semibold text-zinc-900">Get in touch</h2>
          <p>
            Questions, corrections or topic ideas? Email{" "}
            <a href="mailto:support@tryzorin.com" className="text-blue-600 hover:underline">
              support@tryzorin.com
            </a>
            .
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
