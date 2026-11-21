import { Navbar } from "@/components/marketing/Navbar";
import { Footer } from "@/components/marketing/Footer";
import { clusters } from "@/lib/blog/clusters";

const BASE_URL = "https://www.tryzorin.com";

export const metadata = {
  title: "About Zorin: Practical Pricing Guides for Online Sellers",
  description:
    "Zorin publishes practical pricing guides for online sellers, organised by topic, plus sourced research reports, a pricing glossary and free tools.",
  alternates: { canonical: `${BASE_URL}/about` },
};

const aboutSchema = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  url: `${BASE_URL}/about`,
  name: "About Zorin",
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
        </div>
      </main>
      <Footer />
    </>
  );
}
