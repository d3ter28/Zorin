import type { MetadataRoute } from "next";

const BASE_URL = "https://www.tryzorin.com";

const disallow = [
  "/dashboard",
  "/settings",
  "/login",
  "/signup",
  "/api",
  "/forgot-password",
  "/reset-password",
  "/guide",
  "/launch-planner",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow },
      { userAgent: "GPTBot", allow: "/" },
      { userAgent: "ClaudeBot", allow: "/" },
      { userAgent: "PerplexityBot", allow: "/" },
      { userAgent: "Applebot-Extended", allow: "/" },
      { userAgent: "cohere-ai", allow: "/" },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
