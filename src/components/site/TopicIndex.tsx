import { clusters } from "@/lib/blog/clusters";
import { getClusterCounts, getListedPosts } from "@/lib/blog/listing";
import { research } from "@/lib/research";

const startHere = [
  { href: "/blog/what-does-price-elasticity-actually-mean", label: "What price elasticity means" },
  { href: "/blog/ecommerce-pricing-strategy-the-complete-guide", label: "Ecommerce pricing strategy guide" },
  { href: "/blog/margin-vs-markup", label: "Margin vs markup" },
];

function Count({ n }: { n: number | string }) {
  return <span className="font-mono text-xs text-faint">{typeof n === "number" ? String(n).padStart(2, "0") : n}</span>;
}

/**
 * Left-hand topic index. Sticky on desktop; on mobile it collapses to a
 * horizontally scrolling strip of topic chips.
 */
export function TopicIndex({ active }: { active?: string }) {
  const counts = getClusterCounts();
  const total = getListedPosts().length;
  const topics = [
    { href: "/blog/all", key: "all", label: "All articles", n: total },
    ...clusters.map((c) => ({ href: `/blog/cluster/${c.slug}`, key: c.slug, label: c.name, n: counts[c.slug] ?? 0 })),
  ];

  return (
    <aside className="min-w-0 border-b border-line py-5 lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] lg:self-start lg:overflow-y-auto lg:border-r lg:border-b-0 lg:py-8 lg:pr-6">
      <h4 className="label-mono mb-2.5 hidden text-faint lg:block">Topics</h4>
      <ul className="-mx-6 flex gap-2 overflow-x-auto px-6 [scrollbar-width:none] lg:mx-0 lg:mb-7 lg:block lg:px-0">
        {topics.map((t) => {
          const on = t.key === active;
          return (
            <li key={t.key}>
              <a
                href={t.href}
                aria-current={on ? "page" : undefined}
                className={`flex items-baseline justify-between gap-3 whitespace-nowrap border px-3 py-1.5 text-sm transition-colors lg:whitespace-normal lg:border-0 lg:px-0 ${
                  on
                    ? "border-ink bg-ink text-white lg:bg-transparent lg:font-semibold lg:text-ink"
                    : "border-line bg-surface text-ink-2 hover:text-accent lg:bg-transparent"
                }`}
              >
                {t.label}
                <Count n={t.n} />
              </a>
            </li>
          );
        })}
      </ul>

      <div className="hidden lg:block">
        <h4 className="label-mono mb-2.5 text-faint">Start here</h4>
        <ul className="mb-7">
          {startHere.map((l) => (
            <li key={l.href}>
              <a href={l.href} className="block py-1.5 text-sm text-ink-2 hover:text-accent">
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <h4 className="label-mono mb-2.5 text-faint">Reference</h4>
        <ul>
          <li>
            <a href="/glossary" className="flex justify-between py-1.5 text-sm text-ink-2 hover:text-accent">
              Glossary <Count n="A–Z" />
            </a>
          </li>
          <li>
            <a href="/research" className="flex justify-between py-1.5 text-sm text-ink-2 hover:text-accent">
              Research reports <Count n={research.length} />
            </a>
          </li>
          <li>
            <a href="/#tools" className="flex justify-between py-1.5 text-sm text-ink-2 hover:text-accent">
              Calculators &amp; templates <Count n={6} />
            </a>
          </li>
        </ul>
      </div>
    </aside>
  );
}

/** Two-column shell: topic index on the left, page content on the right. */
export function IndexShell({ active, children }: { active?: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto grid w-full max-w-[1360px] grid-cols-[minmax(0,1fr)] gap-x-12 px-6 pt-16 md:px-7 lg:grid-cols-[250px_minmax(0,1fr)]">
      <TopicIndex active={active} />
      <main className="min-w-0 pb-24 pt-8 lg:pt-10">{children}</main>
    </div>
  );
}
