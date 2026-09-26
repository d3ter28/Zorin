import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // unsafe-eval only needed for Next.js dev/HMR — omitted in production
      `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://www.googletagmanager.com`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self'",
      // GA4 sends hit data to google-analytics.com/analytics.google.com; googletagmanager.com serves gtag config
      "connect-src 'self' https://www.google-analytics.com https://analytics.google.com https://www.googletagmanager.com",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "base-uri 'self'",
    ].join("; "),
  },
];

// Retired blog slugs -> the live post that replaced them. Keep destinations
// pointing at live slugs (no chains): when a live slug changes, update every
// row that targets it as well as adding a row for the old slug.
const BLOG_REDIRECTS: [string, string][] = [
  // Placeholder sample posts removed before real content existed (commit 8e091a9).
  ["why-merchants-leave-money-on-the-table", "how-to-know-if-your-prices-are-too-high-or-too-low"],
  ["price-elasticity-101", "what-does-price-elasticity-actually-mean"],
  ["from-csv-to-optimal-price", "how-do-i-calculate-my-own-price-elasticity-without-a-data-scientist"],
  // 2026-09-26 cannibalization merges: keeper chosen by GSC ranking history.
  ["amazon-vs-your-own-store-pricing", "should-you-price-the-same-on-shopify-and-amazon"],
  ["should-you-price-differently-on-shopify-vs-amazon", "should-you-price-the-same-on-shopify-and-amazon"],
  ["shopify-pricing-apps-what-to-look-for", "how-to-evaluate-a-shopify-pricing-app"],
  ["why-did-my-sales-drop-when-i-raised-my-price", "price-increase-killed-your-sales-heres-the-real-reason"],
  ["price-elasticity-explained-a-guide-for-ecommerce-sellers", "what-does-price-elasticity-actually-mean"],
  ["the-real-cost-of-pricing-products-without-software", "is-pricing-software-worth-the-monthly-cost"],
  ["whats-a-good-profit-margin-for-an-online-store", "ecommerce-profit-margins-what-to-target-and-how-to-track-them"],
  ["how-much-should-you-discount-without-killing-your-margin", "how-to-price-a-discount-without-losing-your-margin"],
  ["best-price-optimization-app-for-small-shopify-stores", "best-pricing-optimization-tools-for-shopify-stores-2026"],
  ["is-your-store-leaving-money-on-the-table", "how-to-know-if-your-prices-are-too-high-or-too-low"],
];

const nextConfig: NextConfig = {
  // Prevent bundling native SQLite modules — they load from node_modules at
  // runtime on local dev only; the production build never reaches this path.
  serverExternalPackages: ["@prisma/adapter-better-sqlite3", "better-sqlite3", "@prisma/adapter-neon", "@neondatabase/serverless"],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
  async redirects() {
    return BLOG_REDIRECTS.map(([from, to]) => ({
      source: `/blog/${from}`,
      destination: `/blog/${to}`,
      permanent: true,
    }));
  },
};

export default nextConfig;
