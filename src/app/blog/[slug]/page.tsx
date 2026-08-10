import { notFound } from "next/navigation";
import { getPostBySlug, posts } from "@/lib/blog/posts";
import { buildArticleSchema, buildFaqSchema } from "@/lib/blog/schema";
import { Navbar } from "@/components/marketing/Navbar";
import { Footer } from "@/components/marketing/Footer";

export async function generateStaticParams() {
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};
  return { title: `${post.title} — Zorin`, description: post.excerpt };
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const articleSchema = buildArticleSchema(post);
  const faqSchema = buildFaqSchema(post);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
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
          <span className="inline-flex w-fit rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-600">
            {post.category}
          </span>
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
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {post.author && (
          <div className="mt-12 rounded-xl border border-zinc-100 bg-zinc-50 p-5">
            <p className="text-sm font-semibold text-zinc-900">Written by {post.author.name}</p>
            <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">{post.author.bio}</p>
          </div>
        )}

        <div className="mt-16 border-t border-zinc-100 pt-8">
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
