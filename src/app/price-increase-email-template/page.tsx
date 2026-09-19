import { Navbar } from "@/components/marketing/Navbar";
import { Footer } from "@/components/marketing/Footer";
import { EmailCopyBlock } from "@/components/marketing/EmailCopyBlock";
import { buildFaqSchema, buildBreadcrumbSchema } from "@/lib/seo/toolSchema";

export const metadata = {
  title: "Free Price Increase Email Template - Zorin",
  description:
    "Copy-paste email template for announcing a price increase without losing customer trust. Includes a grandfathering option. Free, no signup required.",
  alternates: { canonical: "https://www.tryzorin.com/price-increase-email-template" },
};

const breadcrumbSchema = buildBreadcrumbSchema([
  { name: "Price Increase Email Template", path: "/price-increase-email-template" },
]);

const subject = "A heads-up about a price change coming to [PRODUCT NAME]";

const paragraphs = [
  "Hi [FIRST NAME],",
  "[REASON FOR THE CHANGE, e.g. \"As we've grown, our production costs have gone up\" or \"Now that we have real volume behind us, we're able to invest more in [X], and this reflects that.\"] Starting [EFFECTIVE DATE], the price of [PRODUCT NAME] will move from [OLD PRICE] to [NEW PRICE].",
  "If you'd like to lock in the current price, you're welcome to reorder before [EFFECTIVE DATE] at [OLD PRICE]. [OPTIONAL: Add a small loyalty discount code here if you're offering one instead of a reorder window.]",
  "Thanks for being one of our earliest customers, it genuinely means a lot. If you have any questions about this, just reply to this email.",
  "[YOUR NAME]",
];

const faqs = [
  {
    question: "How much advance notice should I give before a price increase?",
    answer:
      "Slack's widely cited 2021 price adjustment gave customers 90 days' notice, and pricing research aggregating multiple SaaS benchmarks generally points to 60 or more days as the range where increases land well. An ecommerce product doesn't need to match that exactly, but a silent, same-day price jump feels very different from one a customer saw coming.",
  },
  {
    question: "Should I offer to grandfather existing customers at the old price?",
    answer:
      "Where it's practical, yes. A short window where existing customers can reorder at the old price, or a small loyalty discount that offsets part of the increase, converts \"the price went up on me\" into \"I got a fair heads-up and a way to lock in the old price if I acted.\" Not every margin structure can support this, but where it's possible, it's the single most effective goodwill move available.",
  },
  {
    question: "Should I explain why the price is going up?",
    answer:
      "Yes. Lead with what's changed, not with the fact that it costs more. A short, factual reason, rising ingredient costs, more production volume, added features, gives the increase a reason a customer can accept rather than question.",
  },
  {
    question: "What's the biggest mistake sellers make when announcing a price increase?",
    answer:
      "Going silent. The price increase itself rarely causes the damage. An increase that arrives with no notice and no explanation is what erodes trust, because it reads as opportunistic rather than planned, even when it isn't.",
  },
  {
    question: "Should this go out as an email, or is a website banner enough?",
    answer:
      "Email reaches customers directly rather than relying on them noticing a banner on their next visit, which matters most for existing customers who might otherwise feel blindsided at checkout. A banner is a reasonable addition, not a replacement, for direct notice to your existing customer list.",
  },
];

const faqSchema = buildFaqSchema(faqs);

export default function PriceIncreaseEmailTemplatePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <Navbar />
      <main className="mx-auto max-w-2xl px-6 pb-24 pt-32 md:pb-32">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 md:text-4xl">
          Price Increase Email Template
        </h1>
        <p className="mt-4 max-w-[55ch] text-base leading-relaxed text-zinc-500">
          A copy-paste email for announcing a price increase without losing customer trust,
          built around advance notice and an optional grandfathering offer. Free, no signup
          required.
        </p>

        <div className="mt-10">
          <EmailCopyBlock subject={subject} paragraphs={paragraphs} />
          <p className="mt-3 text-xs text-zinc-400">
            Replace every <code>[BRACKETED]</code> field before sending. The grandfathering line
            is optional, delete it if your margin can&apos;t support a reorder window.
          </p>
        </div>

        <div className="mt-16 space-y-6 border-t border-zinc-100 pt-10">
          <h2 className="text-xl font-semibold text-zinc-900">Why this structure works</h2>
          <p className="text-sm leading-relaxed text-zinc-500">
            The price increase itself rarely causes the damage. An increase that arrives with no
            notice and no explanation is what erodes trust, because it reads as opportunistic
            rather than planned, even when it isn&apos;t. This template fixes that with three
            things: a real reason for the change, enough advance notice to not feel sudden, and
            an optional way for loyal customers to lock in the old price before it changes.
          </p>
          <h2 className="text-xl font-semibold text-zinc-900">How far in advance to send it</h2>
          <p className="text-sm leading-relaxed text-zinc-500">
            Slack&apos;s widely cited 2021 price adjustment gave customers 90 days&apos; notice,
            and pricing research aggregating multiple SaaS benchmarks generally points to 60 or
            more days as the range where increases land well. An ecommerce product doesn&apos;t
            need to match that exactly, but the underlying principle holds: give customers real
            lead time rather than announcing the change the same day it takes effect. For the
            full reasoning behind timing a launch-price increase specifically,{" "}
            <a
              href="/blog/how-to-raise-your-price-after-a-product-launch"
              className="font-medium text-emerald-700 underline underline-offset-2"
            >
              How to Raise Your Price After a Product Launch
            </a>{" "}
            covers the decision end to end.
          </p>
        </div>

        <div className="mt-16 space-y-6 border-t border-zinc-100 pt-10">
          <h2 className="text-xl font-semibold text-zinc-900">Frequently asked questions</h2>
          <div className="space-y-5">
            {faqs.map((faq) => (
              <div key={faq.question}>
                <h3 className="text-sm font-semibold text-zinc-900">{faq.question}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-16 border-t border-zinc-100 pt-10">
          <p className="text-sm leading-relaxed text-zinc-500">
            Not sure whether your product can actually absorb a price increase yet?{" "}
            <a href="/signup" className="font-medium text-emerald-700 underline underline-offset-2">
              See your elasticity read in Zorin
            </a>{" "}
            before you decide how much to raise it.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
