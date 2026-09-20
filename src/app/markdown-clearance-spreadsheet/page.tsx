import { Navbar } from "@/components/marketing/Navbar";
import { Footer } from "@/components/marketing/Footer";
import { buildFaqSchema, buildBreadcrumbSchema } from "@/lib/seo/toolSchema";

export const metadata = {
  title: "Free Markdown & Clearance Price Curve Spreadsheet - Zorin",
  description:
    "Free downloadable spreadsheet that plans a markdown/clearance schedule with formulas: stage, day, discount %, price, and margin. No signup required.",
  alternates: { canonical: "https://www.tryzorin.com/markdown-clearance-spreadsheet" },
};

const breadcrumbSchema = buildBreadcrumbSchema([
  { name: "Markdown & Clearance Price Curve Spreadsheet", path: "/markdown-clearance-spreadsheet" },
]);

const faqs = [
  {
    question: "How does the markdown schedule get calculated?",
    answer:
      "The discount percentage steps evenly from 0% at Stage 1 (full price) to the maximum discount implied by your floor price at the final stage, spread evenly across however many stages you set. The spreadsheet computes price and margin at each stage automatically from that discount curve.",
  },
  {
    question: "What if I only want 2 or 3 markdown stages instead of 4?",
    answer:
      "Change the \"Number of Markdown Stages\" input cell. The table supports up to 10 stages, any stage beyond the number you set is left blank automatically.",
  },
  {
    question: "Does this account for my actual product cost?",
    answer:
      "Yes. Enter your cost of goods (COGS) in the inputs, and the Margin % and Margin $ columns update automatically at every stage, including the final clearance price, so you can see exactly how much margin you're giving up at each step.",
  },
  {
    question: "Can I use this in Excel and Google Sheets?",
    answer:
      "Yes, it's a standard .xlsx file with formulas, not a macro or add-in, so it opens and recalculates normally in both.",
  },
  {
    question: "How do I decide how deep the final clearance price should go?",
    answer:
      "That depends on your margin structure and how urgently the stock needs to move. Our guide to running a sale without wrecking your margin covers how to size a discount against your own cost structure before you commit to a floor price.",
  },
];

const faqSchema = buildFaqSchema(faqs);

export default function MarkdownClearanceSpreadsheetPage() {
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
          Markdown &amp; Clearance Price Curve Spreadsheet
        </h1>
        <p className="mt-4 max-w-[55ch] text-base leading-relaxed text-zinc-500">
          A free spreadsheet that plans a full markdown schedule from launch price down to your
          clearance floor, with the price and margin at every stage calculated automatically.
          Free, no signup required.
        </p>

        <div className="mt-10 rounded-lg border border-zinc-200 bg-zinc-50 p-6">
          <p className="text-sm font-medium text-zinc-900">What&apos;s inside</p>
          <ul className="mt-3 space-y-1.5 text-sm text-zinc-600">
            <li>5 input cells: starting price, clearance floor, cost of goods, number of stages, days between stages</li>
            <li>An auto-calculating table: stage, day, discount %, price, margin %, margin $</li>
            <li>Formulas throughout, not hardcoded numbers, edit any input and the table updates</li>
          </ul>
          <a
            href="/downloads/markdown-clearance-price-curve-template.xlsx"
            className="mt-5 inline-flex h-10 items-center rounded-lg bg-emerald-600 px-5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-emerald-700 active:scale-[0.98]"
          >
            Download the spreadsheet (.xlsx)
          </a>
        </div>

        <div className="mt-10">
          <p className="text-sm font-medium text-zinc-900">Preview: what the sheet calculates</p>
          <p className="mt-1.5 text-sm text-zinc-500">
            Example inputs: $60 starting price, $24 clearance floor, $18 cost of goods, 4 stages,
            14 days apart. Everything below is a live formula in the actual file, not typed in.
          </p>
          <div className="mt-4 overflow-x-auto rounded-lg border border-zinc-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-4 py-2.5">Stage</th>
                  <th className="px-4 py-2.5">Day</th>
                  <th className="px-4 py-2.5">Discount %</th>
                  <th className="px-4 py-2.5">Price</th>
                  <th className="px-4 py-2.5">Margin %</th>
                  <th className="px-4 py-2.5">Margin $</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { stage: 1, day: 0, discount: "0.0%", price: "$60.00", margin: "70.0%", marginDollar: "$42.00" },
                  { stage: 2, day: 14, discount: "20.0%", price: "$48.00", margin: "62.5%", marginDollar: "$30.00" },
                  { stage: 3, day: 28, discount: "40.0%", price: "$36.00", margin: "50.0%", marginDollar: "$18.00" },
                  { stage: 4, day: 42, discount: "60.0%", price: "$24.00", margin: "25.0%", marginDollar: "$6.00" },
                ].map((row) => (
                  <tr key={row.stage} className="border-t border-zinc-100">
                    <td className="px-4 py-2.5 font-medium text-zinc-900">{row.stage}</td>
                    <td className="px-4 py-2.5 font-mono text-zinc-600">{row.day}</td>
                    <td className="px-4 py-2.5 font-mono text-zinc-600">{row.discount}</td>
                    <td className="px-4 py-2.5 font-mono text-zinc-600">{row.price}</td>
                    <td className="px-4 py-2.5 font-mono text-zinc-600">{row.margin}</td>
                    <td className="px-4 py-2.5 font-mono text-zinc-600">{row.marginDollar}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-zinc-400">
            Stage 4 lands exactly on your $24 floor price. Change any input in the real file and
            every row recalculates the same way.
          </p>
        </div>

        <div className="mt-16 space-y-6 border-t border-zinc-100 pt-10">
          <h2 className="text-xl font-semibold text-zinc-900">How the curve is built</h2>
          <p className="text-sm leading-relaxed text-zinc-500">
            Set a starting price, a clearance floor price you&apos;re willing to sell at, your cost
            of goods, how many markdown stages you want, and the number of days between each one.
            The spreadsheet works out the maximum discount implied by your floor price, then steps
            the discount evenly across your chosen number of stages, landing exactly on your floor
            price at the final stage.
          </p>
          <p className="text-sm leading-relaxed text-zinc-500">
            Example: a $60 product with an $24 floor, $18 cost of goods, over 4 stages spaced 14
            days apart moves $60 → $48 → $36 → $24, with margin stepping from 70% down to 25% as
            the price clears. Every number is a formula, change any input and the whole schedule
            recalculates.
          </p>
          <h2 className="text-xl font-semibold text-zinc-900">When to use a staged markdown</h2>
          <p className="text-sm leading-relaxed text-zinc-500">
            A staged markdown works best for genuinely slow-moving inventory you need gone by a
            deadline, seasonal stock, a discontinued SKU, or a product tying up cash you need
            elsewhere. For products that are simply priced wrong rather than clearing intentionally,{" "}
            <a
              href="/blog/how-to-run-a-sale-without-wrecking-your-margin"
              className="font-medium text-emerald-700 underline underline-offset-2"
            >
              how to run a sale without wrecking your margin
            </a>{" "}
            covers picking the right discount depth in the first place, and{" "}
            <a
              href="/research/inventory-turnover-by-product-category"
              className="font-medium text-emerald-700 underline underline-offset-2"
            >
              our research on inventory turnover by category
            </a>{" "}
            covers how slow &ldquo;too slow&rdquo; actually is for your category.
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
            Want to know which products actually need a markdown instead of guessing?{" "}
            <a href="/signup" className="font-medium text-emerald-700 underline underline-offset-2">
              See your slowest-moving SKUs in Zorin
            </a>
            , backed by your own sales data.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
