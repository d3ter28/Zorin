import type { BlogPost } from "@/lib/blog/posts";
import { formatIsoDate, getPostNumber, getTopicLabel } from "@/lib/blog/listing";

/** Numbered index of articles: No. / title + excerpt / topic / date / read time. */
export function ArticleTable({ posts, showTopic = true }: { posts: BlogPost[]; showTopic?: boolean }) {
  return (
    <table className="w-full border-collapse">
      <thead>
        <tr className="border-b border-ink text-left">
          <th className="label-mono w-14 py-2.5 pr-3 font-medium text-faint">No.</th>
          <th className="label-mono py-2.5 pr-3 font-medium text-faint">Title</th>
          {showTopic && (
            <th className="label-mono hidden w-36 py-2.5 pr-3 font-medium text-faint md:table-cell">Topic</th>
          )}
          <th className="label-mono hidden w-28 py-2.5 pr-3 font-medium text-faint md:table-cell">Date</th>
          <th className="label-mono w-16 py-2.5 font-medium text-faint">Read</th>
        </tr>
      </thead>
      <tbody>
        {posts.map((post) => (
          <tr key={post.slug} className="group border-b border-line align-top hover:bg-surface">
            <td className="py-4 pr-3 font-mono text-[13px] text-faint">{getPostNumber(post.slug)}</td>
            <td className="py-4 pr-3">
              <a
                href={`/blog/${post.slug}`}
                className="font-serif text-[19px] font-medium leading-snug text-ink group-hover:text-accent"
              >
                {post.title}
              </a>
              <p className="mt-1 max-w-[68ch] text-sm leading-relaxed text-faint">{post.excerpt}</p>
            </td>
            {showTopic && (
              <td className="hidden py-4 pr-3 md:table-cell">
                <span className="inline-block bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent">
                  {getTopicLabel(post)}
                </span>
              </td>
            )}
            <td className="hidden py-4 pr-3 font-mono text-xs whitespace-nowrap text-ink-2 md:table-cell">
              {formatIsoDate(post.date)}
            </td>
            <td className="py-4 font-mono text-xs whitespace-nowrap text-ink-2">
              {post.readingTime.replace(" read", "")}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
