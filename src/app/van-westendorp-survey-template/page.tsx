import { Navbar } from "@/components/marketing/Navbar";
import { Footer } from "@/components/marketing/Footer";
import { CopyBlock } from "@/components/marketing/CopyBlock";
import { buildFaqSchema, buildBreadcrumbSchema } from "@/lib/seo/toolSchema";

export const metadata = {
  title: "Free Van Westendorp Survey Template - Zorin",
  description:
    "Copy-paste the exact 4-question Van Westendorp price sensitivity survey script. Free template, works for any product, no signup required.",
  alternates: { canonical: "https://www.tryzorin.com/van-westendorp-survey-template" },
};

const breadcrumbSchema = buildBreadcrumbSchema([
  { name: "Van Westendorp Survey Template", path: "/van-westendorp-survey-template" },
]);

const scriptLines = [
  "At what price would this [PRODUCT] be so cheap that you'd question its quality?",
  "At what price would this [PRODUCT] be a bargain, a great value for the money?",
  "At what price would this [PRODUCT] start to feel expensive, but you'd still consider buying it?",
  "At what price would this [PRODUCT] be too expensive to consider buying at all?",
];

const scriptText = scriptLines.map((line, i) => `${i + 1}. ${line}`).join("\n");

const faqs = [
  {
    question: "Do I need to ask these four questions in this exact order?",
    answer:
      "Yes. The order matters because each question anchors the respondent's thinking for the next one, too cheap, then bargain, then expensive, then too expensive. Reordering them changes how people answer and breaks the standard cumulative-curve calculation the method depends on.",
  },
  {
    question: "Who should I send this survey to?",
    answer:
      "Past customers who've actually bought the product or something similar, plus warm prospects, an email list, a post-purchase message, or a social audience who already knows your brand. Cold, unqualified traffic tends to produce noisier answers since respondents have no real frame of reference for what they'd pay.",
  },
  {
    question: "How many responses do I need before I can trust the results?",
    answer:
      "Most practitioners treat 100 or more responses as the practical floor for a defensible result, with 150 to 200 preferred if you plan to segment by customer type. Below roughly 20 responses, treat any range as directional only, not final.",
  },
  {
    question: "What do I do with the answers once I have them?",
    answer:
      "Plot each question's answers as a cumulative percentage curve and find where they intersect to get your acceptable price range and optimal price point. See the full worked example linked below for the exact calculation, or connect your product to Zorin and it's calculated automatically.",
  },
  {
    question: "Can I use this template for a service instead of a physical product?",
    answer:
      "Yes. Replace [PRODUCT] with a short description of the service or plan being priced, the four questions work the same way for a subscription tier, a service package, or a physical product.",
  },
];

const faqSchema = buildFaqSchema(faqs);

export default function VanWestendorpSurveyTemplatePage() {
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
          Van Westendorp Survey Template
        </h1>
        <p className="mt-4 max-w-[55ch] text-base leading-relaxed text-zinc-500">
          The exact four-question script behind the Van Westendorp Price Sensitivity Meter,
          ready to copy into an email, a form, or a survey tool. Free, no signup required.
        </p>

        <div className="mt-10">
          <CopyBlock text={scriptText} lines={scriptLines} />
          <p className="mt-3 text-xs text-zinc-400">
            Replace <code>[PRODUCT]</code> with your product name before sending, e.g. &ldquo;this
            weighted blanket&rdquo; or &ldquo;this subscription plan.&rdquo;
          </p>
        </div>

        <div className="mt-16 space-y-6 border-t border-zinc-100 pt-10">
          <h2 className="text-xl font-semibold text-zinc-900">How to use this template</h2>
          <p className="text-sm leading-relaxed text-zinc-500">
            Send all four questions together, in this order, to each respondent about a single
            product. Keep the wording open-ended, a specific dollar figure, not a multiple-choice
            range, since the method depends on respondents supplying their own number rather than
            picking from options you set. Send it to past customers or warm prospects who have a
            real frame of reference for what the product is worth, not cold traffic.
          </p>
          <h2 className="text-xl font-semibold text-zinc-900">What each question measures</h2>
          <ul className="space-y-2 text-sm leading-relaxed text-zinc-500">
            <li>
              <span className="font-medium text-zinc-700">Question 1 (too cheap):</span> the price
              below which quality concerns start to outweigh the deal.
            </li>
            <li>
              <span className="font-medium text-zinc-700">Question 2 (bargain):</span> the price
              respondents see as a genuinely good deal.
            </li>
            <li>
              <span className="font-medium text-zinc-700">Question 3 (getting expensive):</span> the
              price where hesitation starts, but a purchase is still plausible.
            </li>
            <li>
              <span className="font-medium text-zinc-700">Question 4 (too expensive):</span> the
              price that rules out a purchase entirely.
            </li>
          </ul>
          <p className="text-sm leading-relaxed text-zinc-500">
            Once responses come in, each question becomes a cumulative percentage curve, and
            where they intersect defines your acceptable price range, optimal price point, and
            indifference point. The full step-by-step calculation, worked through on a real
            sample dataset, is covered in{" "}
            <a
              href="/blog/van-westendorp-calculation-a-worked-example"
              className="font-medium text-emerald-700 underline underline-offset-2"
            >
              Van Westendorp Calculation: A Worked Example
            </a>
            , and how to read the result once you have it is covered in{" "}
            <a
              href="/blog/how-to-interpret-van-westendorp-results"
              className="font-medium text-emerald-700 underline underline-offset-2"
            >
              How to Interpret Van Westendorp Results
            </a>
            .
          </p>
          <p className="text-sm leading-relaxed text-zinc-500">
            Running this manually means building your own form, collecting responses in a
            spreadsheet, and calculating the curves by hand. Zorin runs this exact survey
            natively for any product in your catalog, a shareable no-login link goes out to
            customers, and the acceptable range, optimal price point, and a response-count
            confidence tier are calculated automatically once responses come in. See{" "}
            <a
              href="/blog/how-to-run-a-price-sensitivity-survey"
              className="font-medium text-emerald-700 underline underline-offset-2"
            >
              How to Run a Van Westendorp Survey
            </a>{" "}
            for the full walkthrough, or{" "}
            <a href="/signup" className="font-medium text-emerald-700 underline underline-offset-2">
              generate a survey link in Zorin
            </a>{" "}
            directly.
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
      </main>
      <Footer />
    </>
  );
}
