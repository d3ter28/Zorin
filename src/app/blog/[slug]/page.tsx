import { notFound, permanentRedirect } from "next/navigation";
import { getPostBySlug, posts } from "@/lib/blog/posts";
import { getClusterForPost } from "@/lib/blog/clusters";
import { buildArticleSchema, buildFaqSchema } from "@/lib/blog/schema";
import { Navbar } from "@/components/marketing/Navbar";
import { Footer } from "@/components/marketing/Footer";
import { formatIsoDate, getPostNumber, withHeadingAnchors } from "@/lib/blog/listing";

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
    ...(post.hidden ? { robots: { index: false, follow: true } } : {}),
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

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();
  if (post.canonicalSlug && post.canonicalSlug !== slug) {
    permanentRedirect(`/blog/${post.canonicalSlug}`);
  }

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
        .slice(0, 4)
    : [];

  const { html, headings } = withHeadingAnchors(post.content);
  const postNumber = getPostNumber(post.slug);

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
      <div className="mx-auto w-full max-w-[1240px] px-6 pt-16 md:px-7">
        <header className="grid gap-x-12 pt-10 pb-8 md:pt-12 lg:grid-cols-[220px_minmax(0,720px)] lg:justify-center">
          <div className="hidden pt-2 font-mono text-xs leading-loose text-faint lg:block">
            {post.author && <p className="font-medium text-ink">{post.author.name}</p>}
            <p>{formatIsoDate(post.date)}</p>
            <p>{post.readingTime}</p>
            {post.updatedDate && <p>Updated {formatIsoDate(post.updatedDate)}</p>}
          </div>
          <div>
            <p className="label-mono text-accent">
              <a href="/blog/all" className="hover:underline">Index</a>
              {postNumber && <> · No. {postNumber}</>}
              {cluster && (
                <>
                  {" · "}
                  <a href={`/blog/cluster/${cluster.slug}`} className="hover:underline">
                    {cluster.name}
                  </a>
                </>
              )}
            </p>
            <h1 className="mt-3 text-[34px] leading-[1.1] text-ink md:text-[52px]">{post.title}</h1>
            <p className="mt-4 font-serif text-lg leading-relaxed text-ink-2 italic md:text-xl">
              {post.excerpt}
            </p>
            <p className="mt-4 font-mono text-xs text-faint lg:hidden">
              {post.author ? `${post.author.name} · ` : ""}
              {formatIsoDate(post.date)} · {post.readingTime}
            </p>
          </div>
        </header>

        <div className="grid gap-x-12 border-t border-line pb-24 lg:grid-cols-[220px_minmax(0,720px)] lg:justify-center">
          <nav aria-label="Contents" className="hidden pt-8 lg:sticky lg:top-16 lg:block lg:self-start">
            {headings.length > 0 && (
              <>
                <h4 className="label-mono mb-2.5 text-faint">Contents</h4>
                <ol>
                  {headings.map((h, i) => (
                    <li key={h.id}>
                      <a
                        href={`#${h.id}`}
                        className="grid grid-cols-[28px_1fr] py-1.5 text-sm leading-snug text-ink-2 hover:text-accent"
                      >
                        <span className="font-mono text-xs text-faint">{String(i + 1).padStart(2, "0")}</span>
                        {h.text}
                      </a>
                    </li>
                  ))}
                </ol>
              </>
            )}
          </nav>

          <article className="min-w-0 pt-8">
            <div className="prose-content" dangerouslySetInnerHTML={{ __html: html }} />

            {post.author && (
              <div className="mt-12 flex gap-4 border-t border-ink pt-5">
                <span className="flex h-11 w-11 flex-none items-center justify-center bg-ink font-serif text-lg text-white">
                  {post.author.name.charAt(0)}
                </span>
                <div>
                  <p className="text-sm font-semibold text-ink">Written by {post.author.name}</p>
                  <p
                    className="mt-1 text-sm leading-relaxed text-ink-2"
                    dangerouslySetInnerHTML={{ __html: post.author.bio }}
                  />
                </div>
              </div>
            )}

            {cluster && moreInCluster.length > 0 && (
              <section className="mt-12 border border-line bg-surface">
                <div className="flex items-baseline justify-between border-b border-ink px-4 py-3">
                  <h2 className="label-mono text-ink">More in {cluster.name}</h2>
                  <a
                    href={`/blog/cluster/${cluster.slug}`}
                    className="font-mono text-xs text-accent hover:underline"
                  >
                    View all →
                  </a>
                </div>
                {moreInCluster.map((p) => (
                  <a
                    key={p.slug}
                    href={`/blog/${p.slug}`}
                    className="grid grid-cols-[52px_1fr] border-b border-line px-4 py-3 last:border-b-0 hover:bg-bg"
                  >
                    <span className="font-mono text-xs text-faint pt-1">{getPostNumber(p.slug)}</span>
                    <span className="font-serif text-[17px] font-medium text-ink hover:text-accent">
                      {p.title}
                    </span>
                  </a>
                ))}
              </section>
            )}
          </article>
        </div>
      </div>
      <Footer />
    </>
  );
}
