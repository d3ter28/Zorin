import { notFound } from "next/navigation";
import { clusters, getClusterBySlug } from "@/lib/blog/clusters";
import { getPostBySlug } from "@/lib/blog/posts";
import { Navbar } from "@/components/marketing/Navbar";
import { Footer } from "@/components/marketing/Footer";
import { Pagination } from "@/components/marketing/Pagination";
import { IndexShell } from "@/components/site/TopicIndex";
import { ArticleTable } from "@/components/site/ArticleTable";

export async function generateStaticParams() {
  return clusters.map((c) => ({ slug: c.slug }));
}

const BASE_URL = "https://www.tryzorin.com";
const POSTS_PER_PAGE = 12;

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
  const suffix = pageNum > 1 ? ` — Page ${pageNum}` : "";

  return {
    title: `${cluster.name} Articles${suffix} — Zorin Blog`,
    description: pageNum > 1 ? `${cluster.description} (Page ${pageNum}.)` : cluster.description,
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
    .filter((p): p is NonNullable<typeof p> => p !== undefined && !p.hidden && !p.canonicalSlug)
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
      <IndexShell active={cluster.slug}>
        <span className="label-mono text-accent">
          Topic · {allClusterPosts.length} {allClusterPosts.length === 1 ? "article" : "articles"}
        </span>
        <h1 className="mt-2 text-4xl text-ink md:text-5xl">
          {cluster.name}{currentPage > 1 ? `, page ${currentPage}` : ""}
        </h1>
        <p className="mt-3 max-w-[62ch] font-serif text-lg leading-relaxed text-ink-2">
          {cluster.description}
        </p>

        <div className="mt-9">
          <ArticleTable posts={clusterPosts} showTopic={false} />
        </div>

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          basePath={`/blog/cluster/${cluster.slug}`}
        />

        {cluster.related && currentPage === 1 && (
          <section className="mt-14 max-w-2xl border border-line bg-surface">
            <h2 className="border-b border-ink px-5 py-4 font-serif text-[22px] font-medium text-ink">
              Category benchmarks to start from
            </h2>
            <p className="px-5 pt-4 text-sm leading-relaxed text-ink-2">{cluster.related.intro}</p>
            <ul className="mt-2 pb-2">
              {cluster.related.links.map((link) => (
                <li key={link.href}>
                  <a href={link.href} className="block px-5 py-2 text-[15px] text-accent hover:underline">
                    {link.label} →
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}
      </IndexShell>
      <Footer />
    </>
  );
}
