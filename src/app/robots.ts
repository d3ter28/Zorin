import type { MetadataRoute } from "next";

const BASE_URL = "https://www.tryzorin.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/settings", "/login", "/signup", "/api"],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
