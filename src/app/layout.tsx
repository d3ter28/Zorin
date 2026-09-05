import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { PLAN_CATALOG } from "@/lib/billing/planCatalog";
import "./globals.css";

const GA_ID = "G-BF8DJYWE15";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.tryzorin.com"),
  title: "Zorin",
  description: "Turn your sales history into profit-maximizing price recommendations.",
  other: {
    "pressplaced-verification": "a4e4c427b5e6bf5d",
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Zorin",
  url: "https://www.tryzorin.com",
  logo: "https://www.tryzorin.com/logo.png",
  sameAs: [
    "https://x.com/tryzorin",
  ],
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Zorin",
  url: "https://www.tryzorin.com",
  potentialAction: {
    "@type": "SearchAction",
    target: "https://www.tryzorin.com/blog?q={search_term_string}",
    "query-input": "required name=search_term_string",
  },
};

const softwareJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Zorin",
  description:
    "ML-powered pricing intelligence for Shopify and WooCommerce merchants. Fits a per-SKU demand curve from your sales history and returns raise/lower/hold recommendations with estimated profit lift.",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  url: "https://www.tryzorin.com",
  offers: {
    "@type": "Offer",
    price: PLAN_CATALOG[0].price.replace("$", ""),
    priceCurrency: "USD",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        <script
          type="speculationrules"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              prerender: [{ urls: ["/signup", "/features", "/blog"] }],
              prefetch: [{ source: "document", where: { href_matches: "/blog/*" }, eagerness: "moderate" }],
            }),
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
      {/* lazyOnload defers gtag.js (~160 KiB) until the browser is idle, so it
          doesn't compete with initial page load / LCP. @next/third-parties'
          GoogleAnalytics helper hardcodes afterInteractive with no way to override it. */}
      <Script
        id="_next-ga-init"
        strategy="lazyOnload"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){window.dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_ID}');
          `,
        }}
      />
      <Script
        id="_next-ga"
        strategy="lazyOnload"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
      />
    </html>
  );
}
