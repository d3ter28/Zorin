import { notFound } from "next/navigation";
import { getPostBySlug, posts } from "@/lib/blog/posts";
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

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-2xl px-6 pb-24 pt-32 md:pb-32">
        <a
          href="/blog"
          className="mb-8 inline-flex items-center gap-1.5 text-sm text-zinc-400 transition-colors hover:text-zinc-600 dark:hover:text-zinc-300"
        >
          ← All posts
        </a>

        <div className="mt-4">
          <span className="inline-flex w-fit rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
            {post.category}
          </span>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-zinc-900 md:text-4xl dark:text-zinc-50">
            {post.title}
          </h1>
          <div className="mt-3 flex items-center gap-2 text-sm text-zinc-400 dark:text-zinc-500">
            <span>{formatDate(post.date)}</span>
            <span>·</span>
            <span>{post.readingTime}</span>
          </div>
        </div>

        <div
          className="prose-content mt-10"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        <div className="mt-16 border-t border-zinc-100 pt-8 dark:border-zinc-800">
          <a
            href="/blog"
            className="text-sm font-medium text-blue-600 transition-colors hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            ← Back to all posts
          </a>
        </div>
      </main>
      <Footer />
    </>
  );
}
