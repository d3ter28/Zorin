"use client";

import { motion, useReducedMotion } from "motion/react";
import { getRecentPosts } from "@/lib/blog/posts";

const recentPosts = getRecentPosts(3);

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function Blog() {
  const reduce = useReducedMotion();

  return (
    <section id="blog" className="scroll-mt-20">
      <div className="mx-auto max-w-[1400px] px-6 py-10 md:py-16">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-zinc-900 md:text-4xl dark:text-zinc-50">
              From the blog
            </h2>
            <p className="mt-3 max-w-[45ch] text-base leading-relaxed text-zinc-500 dark:text-zinc-400">
              Pricing strategy, elasticity explainers, and product updates.
            </p>
          </div>
          <a
            href="/blog"
            className="hidden text-sm font-medium text-blue-600 transition-colors hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 md:block"
          >
            View all posts →
          </a>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {recentPosts.map((post, i) => (
            <motion.a
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group flex flex-col rounded-xl border border-zinc-200 bg-white p-6 transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950 dark:hover:shadow-zinc-900"
              initial={reduce ? false : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
            >
              <span className="inline-flex w-fit rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
                {post.category}
              </span>
              <h3 className="mt-3 text-base font-semibold leading-snug text-zinc-900 group-hover:text-blue-600 dark:text-zinc-100 dark:group-hover:text-blue-400">
                {post.title}
              </h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                {post.excerpt}
              </p>
              <div className="mt-4 flex items-center gap-2 text-xs text-zinc-400 dark:text-zinc-500">
                <span>{formatDate(post.date)}</span>
                <span>·</span>
                <span>{post.readingTime}</span>
              </div>
            </motion.a>
          ))}
        </div>

        <a
          href="/blog"
          className="mt-8 block text-sm font-medium text-blue-600 transition-colors hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 md:hidden"
        >
          View all posts →
        </a>
      </div>
    </section>
  );
}
