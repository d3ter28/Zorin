import { Navbar } from "@/components/marketing/Navbar";
import { Footer } from "@/components/marketing/Footer";
import { IndexShell } from "@/components/site/TopicIndex";
import { ArticleTable } from "@/components/site/ArticleTable";
import { clusters } from "@/lib/blog/clusters";
import { research } from "@/lib/research";
import {
  formatIsoDate,
  getKeyTakeaways,
  getListedPosts,
  getPostNumber,
} from "@/lib/blog/listing";
import { getClusterForPost } from "@/lib/blog/clusters";

export const metadata = {
  title: "Zorin - Pricing Guides for Online Sellers",
  description:
    "Practical pricing articles for Shopify and WooCommerce sellers: price elasticity, discounts, margins and pricing strategy, with the math worked out.",
  alternates: { canonical: "https://www.tryzorin.com" },
};

const tools = [
  { href: "/price-elasticity-calculator", title: "Price elasticity calculator", kind: "Calc" },
  { href: "/shopify-profit-margin-calculator", title: "Shopify profit margin calculator", kind: "Calc" },
  { href: "/woocommerce-profit-margin-calculator", title: "WooCommerce profit margin calculator", kind: "Calc" },
  { href: "/van-westendorp-survey-template", title: "Van Westendorp survey template", kind: "Tmpl" },
  { href: "/price-increase-email-template", title: "Price increase email template", kind: "Tmpl" },
  { href: "/markdown-clearance-spreadsheet", title: "Markdown & clearance spreadsheet", kind: "Xlsx" },
];

export default function LandingPage() {
  const listed = getListedPosts();
  const [latest, ...rest] = listed;
  const latestCluster = getClusterForPost(latest.slug);
  const takeaways = getKeyTakeaways(latest);

  const facts = [
    { n: listed.length, label: "Articles" },
    { n: research.length, label: "Research reports" },
    { n: clusters.length, label: "Topics" },
    { n: tools.length, label: "Free tools" },
  ];

  return (
    <>
      <Navbar />
      <IndexShell active="all">
        <section className="grid gap-10 border-b border-line pb-9 lg:grid-cols-[1.3fr_1fr]">
          <div>
            <span className="label-mono text-accent">A reference library for online sellers</span>
            <h1 className="mt-3 text-4xl leading-[1.08] text-ink md:text-[52px]">
              Pricing decisions, <span className="mark-hl">worked through</span> with real numbers and
              cited sources.
            </h1>
            <p className="mt-4 max-w-[52ch] text-base leading-relaxed text-ink-2">
              Practical guides on elasticity, discounts, margins and strategy for Shopify and
              WooCommerce stores. Every claim links to its source; every method comes with a worked
              example.
            </p>
          </div>
          <div className="grid grid-cols-2 self-start border border-line bg-surface">
            {facts.map((f, i) => (
              <div
                key={f.label}
                className={`px-4.5 py-4 ${i % 2 === 0 ? "border-r border-line" : ""} ${i < 2 ? "border-b border-line" : ""}`}
              >
                <b className="block font-serif text-[32px] font-medium leading-tight text-ink">{f.n}</b>
                <small className="label-mono text-faint">{f.label}</small>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-9 border-b border-line py-9 lg:grid-cols-[1fr_320px]">
          <div>
            <span className="label-mono text-accent">
              Latest · No. {getPostNumber(latest.slug)}
              {latestCluster ? ` · ${latestCluster.name}` : ""}
            </span>
            <h2 className="mt-2.5 font-serif text-[34px] leading-[1.12] font-medium tracking-tight text-ink">
              <a href={`/blog/${latest.slug}`} className="hover:text-accent">
                {latest.title}
              </a>
            </h2>
            <p className="mt-3 font-serif text-lg leading-relaxed text-ink-2">{latest.excerpt}</p>
            <p className="mt-3.5 font-mono text-xs text-faint">
              {latest.author?.name ?? "Zorin"} · {formatIsoDate(latest.date)} · {latest.readingTime}
            </p>
          </div>
          {takeaways.length > 0 && (
            <div className="self-start border border-line bg-surface">
              <div className="label-mono border-b border-line px-3.5 py-2.5 text-faint">Key takeaways</div>
              <ul>
                {takeaways.map((t) => (
                  <li
                    key={t}
                    className="grid grid-cols-[22px_1fr] border-b border-dashed border-line px-3.5 py-2.5 text-sm leading-snug text-ink last:border-b-0"
                  >
                    <span className="text-accent">→</span>
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <div className="mt-10 mb-3 flex items-baseline justify-between gap-4">
          <h2 className="font-serif text-2xl font-medium text-ink">Recent articles</h2>
          <a href="/blog/all" className="font-mono text-xs text-accent hover:underline">
            Full index →
          </a>
        </div>
        <ArticleTable posts={rest.slice(0, 10)} />
        <a
          href="/blog/all"
          className="block border border-t-0 border-line bg-surface py-4 text-center font-mono text-xs text-accent hover:border-ink"
        >
          Browse all {listed.length} articles →
        </a>

        <section className="mt-14 grid gap-7 md:grid-cols-2">
          <div id="research" className="border border-line bg-surface">
            <div className="flex items-baseline justify-between border-b border-ink px-5 py-4">
              <h2 className="font-serif text-[22px] font-medium text-ink">
                <a href="/research" className="hover:text-accent">Research reports</a>
              </h2>
              <span className="label-mono text-accent">{String(research.length).padStart(2, "0")}</span>
            </div>
            {research.map((r, i) => (
              <a
                key={r.slug}
                href={`/research/${r.slug}`}
                className="grid grid-cols-[1fr_auto] gap-4 border-b border-line px-5 py-3 text-[15px] text-ink last:border-b-0 hover:bg-bg hover:text-accent"
              >
                {r.title}
                <span className="font-mono text-xs text-faint">R-{String(i + 1).padStart(2, "0")}</span>
              </a>
            ))}
          </div>
          <div id="tools" className="scroll-mt-20 self-start border border-line bg-surface">
            <div className="flex items-baseline justify-between border-b border-ink px-5 py-4">
              <h2 className="font-serif text-[22px] font-medium text-ink">Calculators &amp; templates</h2>
              <span className="label-mono text-accent">{String(tools.length).padStart(2, "0")}</span>
            </div>
            {tools.map((t) => (
              <a
                key={t.href}
                href={t.href}
                className="grid grid-cols-[1fr_auto] gap-4 border-b border-line px-5 py-3 text-[15px] text-ink last:border-b-0 hover:bg-bg hover:text-accent"
              >
                {t.title}
                <span className="font-mono text-xs uppercase text-faint">{t.kind}</span>
              </a>
            ))}
          </div>
        </section>
      </IndexShell>
      <Footer />
    </>
  );
}
