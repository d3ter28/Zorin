import type { MetadataRoute } from "next";
import { posts } from "@/lib/blog/posts";
import { clusters } from "@/lib/blog/clusters";
import { research } from "@/lib/research";

const BASE_URL = "https://www.tryzorin.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL,                                              lastModified: new Date("2026-08-01") },
    { url: `${BASE_URL}/blog`,                                    lastModified: new Date("2026-08-21") },
    { url: `${BASE_URL}/blog/all`,                                lastModified: new Date("2026-08-21") },
    { url: `${BASE_URL}/features`,                                lastModified: new Date("2026-07-15") },
    { url: `${BASE_URL}/pricing`,                                  lastModified: new Date("2026-08-22") },
    { url: `${BASE_URL}/features/price-elasticity-modeling`,      lastModified: new Date("2026-07-01") },
    { url: `${BASE_URL}/features/competitor-price-tracking`,      lastModified: new Date("2026-07-01") },
    { url: `${BASE_URL}/features/promotion-detection`,            lastModified: new Date("2026-07-01") },
    { url: `${BASE_URL}/integrations/shopify`,                    lastModified: new Date("2026-06-01") },
    { url: `${BASE_URL}/integrations/woocommerce`,                lastModified: new Date("2026-06-01") },
    { url: `${BASE_URL}/shopify-profit-margin-calculator`,        lastModified: new Date("2026-07-01") },
    { url: `${BASE_URL}/woocommerce-profit-margin-calculator`,    lastModified: new Date("2026-08-22") },
    { url: `${BASE_URL}/price-elasticity-calculator`,             lastModified: new Date("2026-08-20") },
    { url: `${BASE_URL}/about`,                                   lastModified: new Date("2026-08-20") },
    { url: `${BASE_URL}/terms`,                                   lastModified: new Date("2026-06-01") },
    { url: `${BASE_URL}/privacy`,                                 lastModified: new Date("2026-06-01") },
  ];

  const blogRoutes: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${BASE_URL}/blog/${post.slug}`,
    lastModified: new Date(post.updatedDate ?? post.date),
  }));

  const clusterRoutes: MetadataRoute.Sitemap = clusters.map((cluster) => ({
    url: `${BASE_URL}/blog/cluster/${cluster.slug}`,
    lastModified: new Date("2026-08-21"),
  }));

  const researchRoutes: MetadataRoute.Sitemap = research.map((item) => ({
    url: `${BASE_URL}/research/${item.slug}`,
    lastModified: new Date(item.updatedDate ?? item.date),
  }));

  return [...staticRoutes, ...blogRoutes, ...clusterRoutes, ...researchRoutes];
}
