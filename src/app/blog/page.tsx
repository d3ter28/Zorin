import { posts } from "@/lib/blog/posts";
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
  title: "Blog — Zorin",
  description: "Pricing strategy, elasticity explainers, and product updates from Zorin.",
};

export default function BlogPage() {
  const sorted = [...posts].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-[1400px] px-6 pb-24 pt-32 md:pb-32">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 md:text-4xl dark:text-zinc-50">
          Blog
        </h1>
        <p className="mt-3 text-base text-zinc-500 dark:text-zinc-400">
          Pricing strategy, elasticity explainers, and product updates.
        </p>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {sorted.map((post) => (
            <a
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group flex flex-col rounded-xl border border-zinc-200 bg-white p-6 transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950"
            >
              <span className="inline-flex w-fit rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
                {post.category}
              </span>
              <h2 className="mt-3 text-base font-semibold leading-snug text-zinc-900 group-hover:text-blue-600 dark:text-zinc-100 dark:group-hover:text-blue-400">
                {post.title}
              </h2>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                {post.excerpt}
              </p>
              <div className="mt-4 flex items-center gap-2 text-xs text-zinc-400 dark:text-zinc-500">
                <span>{formatDate(post.date)}</span>
                <span>·</span>
                <span>{post.readingTime}</span>
              </div>
            </a>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
