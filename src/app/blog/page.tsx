import { clusters } from "@/lib/blog/clusters";
import { research } from "@/lib/research";
import { getClusterCounts } from "@/lib/blog/listing";
import { Navbar } from "@/components/marketing/Navbar";
import { Footer } from "@/components/marketing/Footer";
import { IndexShell } from "@/components/site/TopicIndex";

export const metadata = {
  title: "Ecommerce Pricing Blog - Zorin",
  description:
    "Pricing guides for online sellers, organised by topic: price elasticity, discounts, margins, surveys, launch pricing and pricing tools.",
  alternates: { canonical: "https://www.tryzorin.com/blog" },
};

export default function BlogPage() {
  const counts = getClusterCounts();

  return (
    <>
      <Navbar />
      <IndexShell>
        <span className="label-mono text-accent">Reading paths</span>
        <h1 className="mt-2 text-4xl text-ink md:text-5xl">Browse by topic</h1>
        <p className="mt-3 max-w-[60ch] text-base leading-relaxed text-ink-2">
          Each topic collects the articles on one pricing question, from first principles to worked
          examples. Want everything in one list?{" "}
          <a href="/blog/all" className="text-accent underline underline-offset-2">See the full index</a>.
        </p>

        <ol className="mt-9 border-t border-ink">
          {clusters.map((cluster, i) => (
            <li key={cluster.slug} className="group border-b border-line hover:bg-surface">
              <a
                href={`/blog/cluster/${cluster.slug}`}
                className="grid grid-cols-[44px_1fr_auto] gap-x-3 py-5"
              >
                <span className="font-mono text-[13px] text-faint">{String(i + 1).padStart(2, "0")}</span>
                <span>
                  <span className="font-serif text-[22px] font-medium text-ink group-hover:text-accent">
                    {cluster.name}
                  </span>
                  <span className="mt-1 block max-w-[70ch] text-sm leading-relaxed text-faint">
                    {cluster.description}
                  </span>
                </span>
                <span className="font-mono text-xs text-ink-2">{counts[cluster.slug] ?? 0} articles</span>
              </a>
            </li>
          ))}
        </ol>

        <section className="mt-14 border border-line bg-surface">
          <div className="flex items-baseline justify-between border-b border-ink px-5 py-4">
            <h2 className="font-serif text-[22px] font-medium text-ink">Research reports</h2>
            <span className="label-mono text-accent">{String(research.length).padStart(2, "0")}</span>
          </div>
          <p className="border-b border-line px-5 py-3 text-sm text-ink-2">
            Sourced reference data, separate from the articles: cited numbers you can compare your
            store against.
          </p>
          {research.map((item, i) => (
            <a
              key={item.slug}
              href={`/research/${item.slug}`}
              className="grid grid-cols-[1fr_auto] gap-4 border-b border-line px-5 py-3 text-[15px] text-ink last:border-b-0 hover:bg-bg hover:text-accent"
            >
              {item.title}
              <span className="font-mono text-xs text-faint">R-{String(i + 1).padStart(2, "0")}</span>
            </a>
          ))}
        </section>
      </IndexShell>
      <Footer />
    </>
  );
}
