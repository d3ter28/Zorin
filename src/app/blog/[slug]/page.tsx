import { notFound } from "next/navigation";
import { getPostBySlug, posts } from "@/lib/blog/posts";
import { getClusterForPost } from "@/lib/blog/clusters";
import { buildArticleSchema, buildFaqSchema } from "@/lib/blog/schema";
import { Navbar } from "@/components/marketing/Navbar";
import { Footer } from "@/components/marketing/Footer";

export async function generateStaticParams() {
  return posts.map((p) => ({ slug: p.slug }));
}

const BASE_URL = "https://www.tryzorin.com";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};

  const ogImage = post.ogImage ?? "/og-default.png";
  const canonicalUrl = `${BASE_URL}/blog/${post.canonicalSlug ?? post.slug}`;

  return {
    title: `${post.title} — Zorin`,
    description: post.excerpt,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title: `${post.title} — Zorin`,
      description: post.excerpt,
      url: canonicalUrl,
      type: "article",
      publishedTime: post.date,
      modifiedTime: post.updatedDate ?? post.date,
      images: [{ url: ogImage, width: 1200, height: 630, alt: post.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${post.title} — Zorin`,
      description: post.excerpt,
      images: [ogImage],
    },
  };
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function splitContentForMidArticleCta(html: string) {
  const h2Indices: number[] = [];
  const re = /<h2/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) h2Indices.push(m.index);

  // Only insert a mid-article CTA when there's enough content for it to land
  // naturally between two sections rather than jammed right after the intro.
  if (h2Indices.length < 4) return { before: html, after: null as string | null };

  const splitAt = h2Indices[Math.floor(h2Indices.length / 2)];
  return { before: html.slice(0, splitAt), after: html.slice(splitAt) };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const { before, after } = splitContentForMidArticleCta(post.content);
  const articleSchema = buildArticleSchema(post);
  const faqSchema = buildFaqSchema(post);
  const cluster = getClusterForPost(post.slug);

  const breadcrumbItems = [
    { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
    { "@type": "ListItem", position: 2, name: "Blog", item: `${BASE_URL}/blog` },
    ...(cluster
      ? [{ "@type": "ListItem", position: 3, name: cluster.name, item: `${BASE_URL}/blog/cluster/${cluster.slug}` }]
      : []),
    { "@type": "ListItem", position: cluster ? 4 : 3, name: post.title, item: `${BASE_URL}/blog/${post.slug}` },
  ];
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbItems,
  };

  const moreInCluster = cluster
    ? cluster.postSlugs
        .filter((s) => s !== post.slug)
        .map((s) => getPostBySlug(s))
        .filter((p): p is NonNullable<typeof p> => Boolean(p))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 3)
    : [];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}
      <Navbar />
      <main className="mx-auto max-w-2xl px-6 pb-24 pt-32 md:pb-32">
        <a
          href="/blog"
          className="mb-8 inline-flex items-center gap-1.5 text-sm text-zinc-400 transition-colors hover:text-zinc-600"
        >
          ← All posts
        </a>

        <div className="mt-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex w-fit rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-600">
              {post.category}
            </span>
            {cluster && (
              <a
                href={`/blog/cluster/${cluster.slug}`}
                className="inline-flex w-fit items-center gap-1 rounded-full border border-zinc-200 px-2.5 py-0.5 text-xs font-medium text-zinc-500 transition-colors hover:border-blue-200 hover:text-blue-600"
              >
                Part of: {cluster.name}
              </a>
            )}
          </div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-zinc-900 md:text-4xl">
            {post.title}
          </h1>
          <div className="mt-3 flex items-center gap-2 text-sm text-zinc-400">
            {post.author && (
              <>
                <span>By {post.author.name}</span>
                <span>·</span>
              </>
            )}
            <span>{formatDate(post.date)}</span>
            <span>·</span>
            <span>{post.readingTime}</span>
          </div>
        </div>

        <div
          className="prose-content mt-10"
          dangerouslySetInnerHTML={{ __html: before }}
        />

        {after && (
          <div className="my-10 rounded-xl border border-blue-100 bg-blue-50 p-6 text-center">
            <p className="text-sm font-semibold text-zinc-900">
              See what Zorin's elasticity model says about your own catalog.
            </p>
            <a
              href="/signup"
              className="mt-3 inline-flex h-10 items-center rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700 active:scale-[0.98]"
            >
              Start free trial
            </a>
          </div>
        )}

        {after && (
          <div
            className="prose-content"
            dangerouslySetInnerHTML={{ __html: after }}
          />
        )}

        {post.author && (
          <div className="mt-12 rounded-xl border border-zinc-100 bg-zinc-50 p-5">
            <p className="text-sm font-semibold text-zinc-900">Written by {post.author.name}</p>
            <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">{post.author.bio}</p>
          </div>
        )}

        {cluster && moreInCluster.length > 0 && (
          <div className="mt-16 border-t border-zinc-100 pt-10">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-sm font-semibold text-zinc-900">
                More in {cluster.name}
              </h2>
              <a
                href={`/blog/cluster/${cluster.slug}`}
                className="text-sm font-medium text-blue-600 transition-colors hover:text-blue-700"
              >
                View all →
              </a>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              {moreInCluster.map((p) => (
                <a
                  key={p.slug}
                  href={`/blog/${p.slug}`}
                  className="group flex flex-col rounded-xl border border-zinc-200 bg-white p-4 transition-shadow hover:shadow-md"
                >
                  <h3 className="text-sm font-semibold leading-snug text-zinc-900 group-hover:text-blue-600">
                    {p.title}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-zinc-500">
                    {p.excerpt}
                  </p>
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="mt-10 border-t border-zinc-100 pt-8">
          <a
            href="/blog"
            className="text-sm font-medium text-blue-600 transition-colors hover:text-blue-700"
          >
            ← Back to all posts
          </a>
        </div>
      </main>
      <Footer />
    </>
  );
}
