import { Navbar } from "@/components/marketing/Navbar";
import { Footer } from "@/components/marketing/Footer";

export const metadata = {
  title: "Privacy Policy - Zorin",
  description: "What Zorin collects when you read the site or subscribe to the newsletter, in plain English.",
  alternates: { canonical: "https://www.tryzorin.com/privacy" },
};

export default function PrivacyPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-2xl px-6 pb-24 pt-32 md:pb-32">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 md:text-4xl">
          Privacy Policy
        </h1>
        <p className="mt-3 text-sm text-zinc-500">Last updated November 21, 2026</p>

        <div className="prose prose-zinc mt-10 max-w-none text-zinc-600">
          <p>
            Zorin is a pricing publication. This page explains, in plain English, what
            we collect when you read the site or subscribe to the newsletter.
          </p>

          <h2 className="mt-10 text-xl font-semibold text-zinc-900">Newsletter</h2>
          <p>
            If you subscribe, we store your email address with Resend, the service that
            sends our emails. We use it only to send you new articles. Every email has
            an unsubscribe link, and you can also ask us to delete your address at any
            time by emailing{" "}
            <a href="mailto:support@tryzorin.com" className="text-blue-600 hover:underline">
              support@tryzorin.com
            </a>
            . We don&apos;t sell or share your email address.
          </p>

          <h2 className="mt-10 text-xl font-semibold text-zinc-900">Analytics</h2>
          <p>
            We use Google Analytics to understand which pages are read and how people
            find the site. It sets cookies and collects usage data such as pages viewed,
            device type and approximate location. You can opt out with a browser
            extension such as the Google Analytics opt-out add-on, or by blocking
            cookies in your browser.
          </p>

          <h2 className="mt-10 text-xl font-semibold text-zinc-900">Calculators and templates</h2>
          <p>
            The calculators on this site run in your browser. The numbers you type into
            them are not sent to us or stored.
          </p>

          <h2 className="mt-10 text-xl font-semibold text-zinc-900">Contact</h2>
          <p>
            Questions about your data? Email{" "}
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
