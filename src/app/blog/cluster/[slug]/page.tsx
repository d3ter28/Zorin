import { notFound } from "next/navigation";
import { clusters, getClusterBySlug } from "@/lib/blog/clusters";
import { getPostBySlug } from "@/lib/blog/posts";
import { Navbar } from "@/components/marketing/Navbar";
import { Footer } from "@/components/marketing/Footer";
import { Pagination } from "@/components/marketing/Pagination";

export async function generateStaticParams() {
  return clusters.map((c) => ({ slug: c.slug }));
}

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
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { slug } = await params;
  const { page } = await searchParams;
  const cluster = getClusterBySlug(slug);
  if (!cluster) return {};

  const pageNum = Math.max(1, Number(page) || 1);
  const baseUrl = `${BASE_URL}/blog/cluster/${cluster.slug}`;

  return {
    title: `${cluster.name} — Zorin Blog`,
    description: cluster.description,
    alternates: { canonical: pageNum > 1 ? `${baseUrl}?page=${pageNum}` : baseUrl },
  };
}

export default async function ClusterPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { slug } = await params;
  const { page } = await searchParams;
  const cluster = getClusterBySlug(slug);
  if (!cluster) notFound();

  const allClusterPosts = cluster.postSlugs
    .map((s) => getPostBySlug(s))
    .filter((p): p is NonNullable<typeof p> => Boolean(p))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const totalPages = Math.max(1, Math.ceil(allClusterPosts.length / POSTS_PER_PAGE));
  const currentPage = Math.min(Math.max(1, Number(page) || 1), totalPages);
  const clusterPosts = allClusterPosts.slice(
    (currentPage - 1) * POSTS_PER_PAGE,
    currentPage * POSTS_PER_PAGE
  );

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
      { "@type": "ListItem", position: 2, name: "Blog", item: `${BASE_URL}/blog` },
      { "@type": "ListItem", position: 3, name: cluster.name, item: `${BASE_URL}/blog/cluster/${cluster.slug}` },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <Navbar />
      <main className="mx-auto max-w-[1400px] px-6 pb-24 pt-32 md:pb-32">
        <a
          href="/blog"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-zinc-400 transition-colors hover:text-zinc-600"
        >
          ← All topics
        </a>
        <span className="inline-flex w-fit rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-600">
          {allClusterPosts.length} {allClusterPosts.length === 1 ? "post" : "posts"}
        </span>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-zinc-900 md:text-4xl">
          {cluster.name}
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-zinc-500">
          {cluster.description}
        </p>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {clusterPosts.map((post) => (
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

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          basePath={`/blog/cluster/${cluster.slug}`}
        />
      </main>
      <Footer />
    </>
  );
}
