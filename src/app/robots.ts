import type { MetadataRoute } from "next";

const BASE_URL = "https://www.tryzorin.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/" },
      // Training crawlers
      { userAgent: "GPTBot", allow: "/" },
      { userAgent: "ClaudeBot", allow: "/" },
      { userAgent: "Applebot-Extended", allow: "/" },
      { userAgent: "cohere-ai", allow: "/" },
      { userAgent: "Google-Extended", allow: "/" },
      { userAgent: "CCBot", allow: "/" },
      { userAgent: "Amazonbot", allow: "/" },
      { userAgent: "meta-externalagent", allow: "/" },
      // Answer-grounding / citation crawlers — these are what actually
      // populate live AI answers (ChatGPT, Perplexity, Claude, DuckDuckGo),
      // distinct from the training-only bots above.
      { userAgent: "PerplexityBot", allow: "/" },
      { userAgent: "OAI-SearchBot", allow: "/" },
      { userAgent: "Claude-SearchBot", allow: "/" },
      { userAgent: "DuckAssistBot", allow: "/" },
      // Agent crawlers — live, in-session fetches when a user asks the
      // assistant to look at a specific page.
      { userAgent: "ChatGPT-User", allow: "/" },
      { userAgent: "Claude-User", allow: "/" },
      { userAgent: "Perplexity-User", allow: "/" },
      { userAgent: "meta-externalfetcher", allow: "/" },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
