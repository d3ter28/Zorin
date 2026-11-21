import { Navbar } from "@/components/marketing/Navbar";
import { Footer } from "@/components/marketing/Footer";
import { Pagination } from "@/components/marketing/Pagination";
import { IndexShell } from "@/components/site/TopicIndex";
import { ArticleTable } from "@/components/site/ArticleTable";
import { getListedPosts } from "@/lib/blog/listing";

const BASE_URL = "https://www.tryzorin.com";
const POSTS_PER_PAGE = 12;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page } = await searchParams;
  const pageNum = Math.max(1, Number(page) || 1);
  const suffix = pageNum > 1 ? ` — Page ${pageNum}` : "";

  return {
    title: `All Ecommerce Pricing Articles${suffix} — Zorin Blog`,
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

  const sorted = getListedPosts();

  const totalPages = Math.max(1, Math.ceil(sorted.length / POSTS_PER_PAGE));
  const currentPage = Math.min(Math.max(1, Number(page) || 1), totalPages);
  const pagePosts = sorted.slice(
    (currentPage - 1) * POSTS_PER_PAGE,
    currentPage * POSTS_PER_PAGE
  );

  return (
    <>
      <Navbar />
      <IndexShell active="all">
        <span className="label-mono text-accent">The index</span>
        <h1 className="mt-2 text-4xl text-ink md:text-5xl">
          All articles{currentPage > 1 ? `, page ${currentPage}` : ""}
        </h1>
        <p className="mt-3 max-w-[60ch] text-base leading-relaxed text-ink-2">
          Every article, newest first. {sorted.length} in total. Prefer a reading path?{" "}
          <a href="/blog" className="text-accent underline underline-offset-2">Browse by topic</a>.
        </p>

        <div className="mt-9">
          <ArticleTable posts={pagePosts} />
        </div>

        <Pagination currentPage={currentPage} totalPages={totalPages} basePath="/blog/all" />
      </IndexShell>
      <Footer />
    </>
  );
}
