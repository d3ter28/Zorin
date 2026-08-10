import * as cheerio from "cheerio";
import type { BlogPost } from "./posts";

const BASE_URL = "https://www.tryzorin.com";

function extractFaqEntities(html: string) {
  const $ = cheerio.load(html);
  return $(".faq-item")
    .map((_, el) => {
      const question = $(el).find("h3").first().text().trim();
      const answer = $(el).find("p").first().text().trim();
      if (!question || !answer) return null;
      return {
        "@type": "Question",
        name: question,
        acceptedAnswer: { "@type": "Answer", text: answer },
      };
    })
    .get()
    .filter(Boolean);
}

export function buildArticleSchema(post: BlogPost) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.date,
    dateModified: post.date,
    author: post.author
      ? { "@type": "Person", name: post.author.name }
      : { "@type": "Organization", name: "Zorin" },
    publisher: { "@type": "Organization", name: "Zorin" },
    mainEntityOfPage: { "@type": "WebPage", "@id": `${BASE_URL}/blog/${post.slug}` },
  };
}

export function buildFaqSchema(post: BlogPost) {
  const entities = extractFaqEntities(post.content);
  if (entities.length === 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: entities,
  };
}
