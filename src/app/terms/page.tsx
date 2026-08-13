import { Navbar } from "@/components/marketing/Navbar";
import { Footer } from "@/components/marketing/Footer";

export const metadata = {
  title: "Terms of Service - Zorin",
  description: "The terms for using Zorin's pricing tool, in plain English.",
};

export default function TermsPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-2xl px-6 pb-24 pt-32 md:pb-32">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 md:text-4xl">
          Terms of Service
        </h1>
        <p className="mt-3 text-sm text-zinc-500">Last updated August 14, 2026</p>

        <div className="prose prose-zinc mt-10 max-w-none text-zinc-600">
          <p>
            These are the terms for using Zorin. We&apos;ve kept them short and in plain
            English on purpose - see our{" "}
            <a href="/privacy" className="text-blue-600 hover:underline">
              Privacy Policy
            </a>{" "}
            for how we handle your data specifically. By creating an account or using
            Zorin, you&apos;re agreeing to what&apos;s below.
          </p>

          <h2 className="mt-10 text-xl font-semibold text-zinc-900">What Zorin is</h2>
          <p>
            Zorin analyzes your store&apos;s sales history (and, optionally, survey and
            competitor data) to recommend prices for your products. You choose whether
            to apply any recommendation - Zorin never changes a price without you
            clicking apply, and any campaign you schedule runs only on the products and
            dates you configure.
          </p>

          <h2 className="mt-10 text-xl font-semibold text-zinc-900">
            Recommendations aren&apos;t guarantees
          </h2>
          <p>
            Price and profit figures Zorin shows you - elasticity estimates, expected
            profit lift, survey results, campaign projections - are statistical
            estimates based on the data you&apos;ve given us. They&apos;re a decision-support
            tool, not a promise of any particular sales or profit outcome. You&apos;re
            responsible for the prices you actually apply to your store.
          </p>

          <h2 className="mt-10 text-xl font-semibold text-zinc-900">Your account</h2>
          <p>
            You need an account to use Zorin. Every account starts with a 7-day free
            trial - no card required. An account can have one Owner and any number of
            invited Members; the Owner is responsible for billing and for who has
            access. Keep your password secure - you&apos;re responsible for activity that
            happens under your login.
          </p>

          <h2 className="mt-10 text-xl font-semibold text-zinc-900">Billing</h2>
          <p>
            Paid plans (Starter, Growth, Scale) are billed monthly through Stripe. You
            can upgrade, downgrade, or cancel at any time from Settings → Billing -
            cancelling stops future charges. If your trial ends without a payment
            method on file, or a payment fails, your account is locked until you add
            billing details; your data isn&apos;t deleted while it&apos;s locked.
          </p>

          <h2 className="mt-10 text-xl font-semibold text-zinc-900">Your data</h2>
          <p>
            Your product catalog, sales history, and pricing decisions are yours. We
            store them to run the service and don&apos;t sell or share them - the full
            details are in our{" "}
            <a href="/privacy" className="text-blue-600 hover:underline">
              Privacy Policy
            </a>
            . If you connect Shopify or WooCommerce, you&apos;re responsible for having the
            right to share that store&apos;s data with us.
          </p>

          <h2 className="mt-10 text-xl font-semibold text-zinc-900">Acceptable use</h2>
          <p>
            Use Zorin for your own store&apos;s pricing - not to scrape, resell, or
            reverse-engineer the service, and not in any way that disrupts it for other
            merchants or attempts to bypass its security. We can suspend an account
            that abuses the service.
          </p>

          <h2 className="mt-10 text-xl font-semibold text-zinc-900">
            Service availability
          </h2>
          <p>
            We work to keep Zorin running reliably, but we don&apos;t currently offer a
            formal uptime guarantee. We&apos;ll do our best to give notice before any
            planned downtime or major change that affects your data.
          </p>

          <h2 className="mt-10 text-xl font-semibold text-zinc-900">
            Changes to these terms
          </h2>
          <p>
            If we make a meaningful change to these terms, we&apos;ll update the date at
            the top of this page and, for significant changes, let you know directly.
            Continuing to use Zorin after a change means you accept the updated terms.
          </p>

          <h2 className="mt-10 text-xl font-semibold text-zinc-900">Questions</h2>
          <p>
            Email us at{" "}
            <a href="mailto:support@tryzorin.com" className="text-blue-600 hover:underline">
              support@tryzorin.com
            </a>{" "}
            and we&apos;ll answer directly - no ticket queue.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
