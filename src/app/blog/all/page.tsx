import { posts } from "@/lib/blog/posts";
import { Navbar } from "@/components/marketing/Navbar";
import { Footer } from "@/components/marketing/Footer";
import { Pagination } from "@/components/marketing/Pagination";

const BASE_URL = "https://www.tryzorin.com";
const POSTS_PER_PAGE = 12;

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page } = await searchParams;
  const pageNum = Math.max(1, Number(page) || 1);
  const suffix = pageNum > 1 ? ` — Page ${pageNum}` : "";

  return {
    title: `All Posts${suffix} — Zorin Blog`,
    description: `Every Zorin blog post, newest first${pageNum > 1 ? `, page ${pageNum}` : ""}. Browse by topic instead from the main blog page.`,
    alternates: {
      canonical: pageNum > 1 ? `${BASE_URL}/blog/all?page=${pageNum}` : `${BASE_URL}/blog/all`,
    },
  };
}

export default async function AllPostsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page } = await searchParams;

  const sorted = [...posts].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const totalPages = Math.max(1, Math.ceil(sorted.length / POSTS_PER_PAGE));
  const currentPage = Math.min(Math.max(1, Number(page) || 1), totalPages);
  const pagePosts = sorted.slice(
    (currentPage - 1) * POSTS_PER_PAGE,
    currentPage * POSTS_PER_PAGE
  );

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-[1400px] px-6 pb-24 pt-32 md:pb-32">
        <a
          href="/blog"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-zinc-400 transition-colors hover:text-zinc-600"
        >
          ← Browse by topic
        </a>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 md:text-4xl">
          All Posts{currentPage > 1 ? ` — Page ${currentPage}` : ""}
        </h1>
        <p className="mt-3 text-base text-zinc-500">
          Every post, newest first. {sorted.length} in total.
        </p>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {pagePosts.map((post) => (
            <a
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group flex flex-col rounded-xl border border-zinc-200 bg-white p-6 transition-shadow hover:shadow-md"
            >
              <span className="inline-flex w-fit rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-600">
                {post.category}
              </span>
              <h2 className="mt-3 text-base font-semibold leading-snug text-zinc-900 group-hover:text-blue-600">
                {post.title}
              </h2>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-zinc-500">
                {post.excerpt}
              </p>
              <div className="mt-4 flex items-center gap-2 text-xs text-zinc-400">
                <span>{formatDate(post.date)}</span>
                <span>·</span>
                <span>{post.readingTime}</span>
              </div>
            </a>
          ))}
        </div>

        <Pagination currentPage={currentPage} totalPages={totalPages} basePath="/blog/all" />
      </main>
      <Footer />
    </>
  );
}
