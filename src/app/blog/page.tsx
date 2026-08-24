import { clusters } from "@/lib/blog/clusters";
import { research } from "@/lib/research";
import { Navbar } from "@/components/marketing/Navbar";
import { Footer } from "@/components/marketing/Footer";

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export const metadata = {
  title: "Blog - Zorin",
  description: "Pricing strategy, elasticity explainers, and product updates from Zorin.",
  alternates: { canonical: "https://www.tryzorin.com/blog" },
};

export default function BlogPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-[1400px] px-6 pb-24 pt-32 md:pb-32">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 md:text-4xl">
              Blog
            </h1>
            <p className="mt-3 text-base text-zinc-500">
              Pricing strategy, elasticity explainers, and product updates.
            </p>
          </div>
          <a
            href="/blog/all"
            className="inline-flex h-10 items-center rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700 active:scale-[0.98]"
          >
            View all posts →
          </a>
        </div>

        <h2 className="mt-14 text-xl font-semibold tracking-tight text-zinc-900">
          Browse by topic
        </h2>
        <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {clusters.map((cluster) => (
            <a
              key={cluster.slug}
              href={`/blog/cluster/${cluster.slug}`}
              className="group flex flex-col rounded-xl border border-zinc-200 bg-white p-6 transition-shadow hover:shadow-md"
            >
              <span className="inline-flex w-fit rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-600">
                {cluster.postSlugs.length} {cluster.postSlugs.length === 1 ? "post" : "posts"}
              </span>
              <h3 className="mt-3 text-base font-semibold leading-snug text-zinc-900 group-hover:text-blue-600">
                {cluster.name}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                {cluster.description}
              </p>
            </a>
          ))}
        </div>

        <h2 className="mt-16 text-xl font-semibold tracking-tight text-zinc-900">
          Research & Whitepapers
        </h2>
        <p className="mt-2 max-w-[65ch] text-sm text-zinc-500">
          Sourced reference data and original analysis, distinct from the blog: no product
          walkthroughs, just cited numbers other sites can link to and rely on.
        </p>
        <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {research.map((item) => (
            <a
              key={item.slug}
              href={`/research/${item.slug}`}
              className="group flex flex-col rounded-xl border border-zinc-200 bg-white p-6 transition-shadow hover:shadow-md"
            >
              <span className="inline-flex w-fit rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                Research
              </span>
              <h3 className="mt-3 text-base font-semibold leading-snug text-zinc-900 group-hover:text-blue-600">
                {item.title}
              </h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-zinc-500">
                {item.description}
              </p>
              <p className="mt-4 text-xs text-zinc-400">
                Updated {formatDate(item.updatedDate ?? item.date)}
              </p>
            </a>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
