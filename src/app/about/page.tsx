import { Navbar } from "@/components/marketing/Navbar";
import { Footer } from "@/components/marketing/Footer";
import { clusters } from "@/lib/blog/clusters";

const BASE_URL = "https://www.tryzorin.com";

export const metadata = {
  title: "About Zorin: Who Writes It and How We Research",
  description:
    "Zorin publishes practical pricing guides for online sellers. Who writes them, how every figure is sourced and checked, and how to report a correction.",
  alternates: { canonical: `${BASE_URL}/about` },
};

const aboutSchema = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  url: `${BASE_URL}/about`,
  name: "About Zorin",
  mainEntity: {
    "@type": "Person",
    "@id": `${BASE_URL}/about#dexter`,
    name: "Dexter",
    url: `${BASE_URL}/about#dexter`,
    jobTitle: "Writer and editor, Zorin",
    alumniOf: {
      "@type": "CollegeOrUniversity",
      name: "Nanyang Technological University",
    },
  },
};

const TOOLS = [
  { href: "/price-elasticity-calculator", label: "Price elasticity calculator" },
  { href: "/shopify-profit-margin-calculator", label: "Shopify profit margin calculator" },
  { href: "/woocommerce-profit-margin-calculator", label: "WooCommerce profit margin calculator" },
  { href: "/van-westendorp-survey-template", label: "Van Westendorp survey template" },
  { href: "/price-increase-email-template", label: "Price increase email template" },
  { href: "/markdown-clearance-spreadsheet", label: "Markdown and clearance spreadsheet" },
];

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-12 font-serif text-[24px] font-medium text-ink">{children}</h2>;
}

export default function AboutPage() {
  return (
    <>
      <Navbar />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutSchema) }}
      />
      <main className="mx-auto max-w-2xl px-6 pb-24 pt-32 md:pb-32">
        <span className="label-mono text-accent">About</span>
        <h1 className="mt-2 text-4xl text-ink md:text-5xl">About Zorin</h1>

        <div className="mt-8 space-y-5 text-base leading-relaxed text-ink-2">
          <p>
            Zorin publishes practical pricing guides for people who sell online, mostly on
            Shopify and WooCommerce. Each article takes one pricing question, such as how deep
            a discount can go, whether to match a competitor or how to price a new product,
            and works through it with real numbers so you can see how the decision plays out
            before you make it.
          </p>
          <p>
            Most small stores set prices by gut feel, by copying a competitor, or once at
            launch and never again. The math behind a better price is usually simpler than it
            looks. We try to lay it out plainly, with sources you can check.
          </p>

          <H2>What we cover</H2>
          <p>Articles are organised into topics, each with a recommended reading order:</p>
          <ul className="list-disc space-y-1 pl-5">
            {clusters.map((c) => (
              <li key={c.slug}>
                <a href={`/blog/cluster/${c.slug}`} className="text-accent underline underline-offset-2">
                  {c.name}
                </a>
              </li>
            ))}
          </ul>
          <p>
            Alongside the articles we publish{" "}
            <a href="/research/price-elasticity-by-category" className="text-accent underline underline-offset-2">
              research reports
            </a>{" "}
            that compile benchmark figures from public sources, a{" "}
            <a href="/glossary" className="text-accent underline underline-offset-2">pricing glossary</a>, and
            free tools:
          </p>
          <ul className="list-disc space-y-1 pl-5">
            {TOOLS.map((t) => (
              <li key={t.href}>
                <a href={t.href} className="text-accent underline underline-offset-2">{t.label}</a>
              </li>
            ))}
          </ul>

          <H2>Who writes it</H2>
          <div id="dexter" className="scroll-mt-28 border border-line bg-surface p-5">
            <p className="font-serif text-[20px] font-medium text-ink">Dexter</p>
            <p className="mt-2">
              Dexter writes and edits Zorin&apos;s articles. He is studying Robotics and
              Mechatronics Engineering at Nanyang Technological University (NTU) in Singapore,
              and has interned in investment banking, business development and growth.
              Most recently he worked at the AI music video company freebeat in 2026. Before that he ran
              his own ecommerce brand selling pet toys, which is where the questions in these
              guides started: what to charge, when to discount and how to tell whether a price
              change worked.
            </p>
            <p className="mt-2">
              Zorin itself began in 2026 as a pricing-analysis tool that fit a demand model to
              a store&apos;s own sales history. The software has been retired, and the site now
              publishes what was learned building it.
            </p>
          </div>

          <H2>How we research and check articles</H2>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong className="text-ink">Primary sources first.</strong> Figures come from company
              filings, government statistics, peer-reviewed research and vendors&apos; own pricing
              pages, and every one is linked so you can check it.
            </li>
            <li>
              <strong className="text-ink">We check the number against the source.</strong> If a
              widely quoted statistic can&apos;t be traced to an accessible original, we leave it
              out rather than repeat it.
            </li>
            <li>
              <strong className="text-ink">Worked examples are examples.</strong> Most articles
              include a calculation with example numbers. Unless an article says otherwise, these
              illustrate the method and are not data from a real store.
            </li>
            <li>
              <strong className="text-ink">No invented experience.</strong> We don&apos;t write
              made-up anecdotes or first-person stories presented as real.
            </li>
            <li>
              <strong className="text-ink">Dates are kept honest.</strong> Articles show when they
              were published and when they were last substantially updated. Vendor prices in tool
              reviews are checked on the date stated in the article and can change.
            </li>
          </ul>

          <H2>Independence</H2>
          <p>
            Tool reviews and roundups are not paid for, and we don&apos;t use affiliate links.
            Occasionally we publish a guest contribution from another site; any link a partner
            requests is marked as sponsored, and those posts are kept out of the main article
            index.
          </p>

          <H2>Corrections and contact</H2>
          <p>
            If you spot an error, an outdated price or a broken source, email{" "}
            <a href="mailto:support@tryzorin.com" className="text-accent underline underline-offset-2">
              support@tryzorin.com
            </a>{" "}
            with the article link. Confirmed errors are corrected and the article&apos;s updated
            date is changed. Topic ideas and questions are welcome at the same address.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
