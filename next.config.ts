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
    return [
      // Old placeholder sample posts removed before real content existed
      // (commit 8e091a9), still getting crawled/404'd per GSC as of 2026-09-18.
      // Redirect to the closest live post on the same topic instead of a dead end.
      {
        source: "/blog/why-merchants-leave-money-on-the-table",
        destination: "/blog/is-your-store-leaving-money-on-the-table",
        permanent: true,
      },
      {
        source: "/blog/price-elasticity-101",
        destination: "/blog/price-elasticity-explained-a-guide-for-ecommerce-sellers",
        permanent: true,
      },
      {
        source: "/blog/from-csv-to-optimal-price",
        destination: "/blog/how-do-i-calculate-my-own-price-elasticity-without-a-data-scientist",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
