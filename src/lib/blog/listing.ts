import { posts, type BlogPost } from "./posts";
import { clusters, getClusterForPost } from "./clusters";

/** Posts that appear in listings: not hidden and not a duplicate of a newer slug. Newest first. */
export function getListedPosts(): BlogPost[] {
  return posts
    .filter((p) => !p.hidden && !p.canonicalSlug)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

// Index numbers are assigned oldest-first so a post keeps its number as new ones are added.
const numberBySlug = new Map<string, number>(
  [...getListedPosts()].reverse().map((p, i) => [p.slug, i + 1])
);

/** Stable "No. 042"-style index number for a listed post, or null for hidden/duplicate posts. */
export function getPostNumber(slug: string): string | null {
  const n = numberBySlug.get(slug);
  return n ? String(n).padStart(3, "0") : null;
}

const shortClusterNames: Record<string, string> = {
  "price-elasticity": "Elasticity",
  "pricing-tools-and-software": "Tools",
  "discounts-and-promotions": "Discounts",
  "margin-and-profit-fundamentals": "Margin",
  "price-sensitivity-surveys": "Surveys",
  "multi-channel-and-launch-pricing": "Launch",
  "pricing-fundamentals-and-strategy": "Strategy",
  "vertical-specific-pricing": "Vertical",
};

/** Short topic label for a post's pill, from its cluster; falls back to the post's category. */
export function getTopicLabel(post: BlogPost): string {
  const cluster = getClusterForPost(post.slug);
  if (cluster) return shortClusterNames[cluster.slug] ?? cluster.name;
  return post.category;
}

/** Listed-post count per cluster (cluster postSlugs can include hidden or merged posts). */
export function getClusterCounts(): Record<string, number> {
  const listed = new Set(getListedPosts().map((p) => p.slug));
  return Object.fromEntries(
    clusters.map((c) => [c.slug, c.postSlugs.filter((s) => listed.has(s)).length])
  );
}

export function formatIsoDate(dateStr: string): string {
  return dateStr.slice(0, 10);
}

export function slugifyHeading(text: string): string {
  return text
    .replace(/<[^>]+>/g, "")
    .replace(/&[a-z]+;/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Adds ids to every plain <h2> in a post's HTML and returns the headings for a
 * table of contents. Headings that already carry attributes are left alone.
 */
export function withHeadingAnchors(html: string): {
  html: string;
  headings: { id: string; text: string }[];
} {
  const headings: { id: string; text: string }[] = [];
  const used = new Set<string>();
  const out = html.replace(/<h2>([\s\S]*?)<\/h2>/g, (_, inner: string) => {
    let id = slugifyHeading(inner) || "section";
    while (used.has(id)) id += "-2";
    used.add(id);
    headings.push({ id, text: inner.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&") });
    return `<h2 id="${id}">${inner}</h2>`;
  });
  return { html: out, headings };
}

/** The bullet points from a post's Key Takeaways block, as plain text. */
export function getKeyTakeaways(post: BlogPost, limit = 3): string[] {
  const block = post.content.match(/<div class="key-takeaways">([\s\S]*?)<\/div>/);
  if (!block) return [];
  return [...block[1].matchAll(/<li>([\s\S]*?)<\/li>/g)]
    .map((m) => m[1].replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").trim())
    .slice(0, limit);
}
