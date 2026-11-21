import type { Metadata } from "next";
import localFont from "next/font/local";
import Script from "next/script";
import "./globals.css";

const GA_ID = "G-BF8DJYWE15";

// IBM Plex is self-hosted (latin subset, SIL OFL, see fonts/OFL-LICENSE.txt) so the
// build never depends on fetching from Google Fonts.
const plexSans = localFont({
  variable: "--font-plex-sans",
  src: [
    { path: "./fonts/ibm-plex-sans-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/ibm-plex-sans-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "./fonts/ibm-plex-sans-latin-600-normal.woff2", weight: "600", style: "normal" },
  ],
});

const plexSerif = localFont({
  variable: "--font-plex-serif",
  src: [
    { path: "./fonts/ibm-plex-serif-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/ibm-plex-serif-latin-400-italic.woff2", weight: "400", style: "italic" },
    { path: "./fonts/ibm-plex-serif-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "./fonts/ibm-plex-serif-latin-600-normal.woff2", weight: "600", style: "normal" },
  ],
});

const plexMono = localFont({
  variable: "--font-plex-mono",
  src: [
    { path: "./fonts/ibm-plex-mono-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/ibm-plex-mono-latin-500-normal.woff2", weight: "500", style: "normal" },
  ],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.tryzorin.com"),
  title: "Zorin",
  description: "Pricing guides for online sellers: price elasticity, discounts, margins and strategy.",
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${plexSans.variable} ${plexSerif.variable} ${plexMono.variable} h-full antialiased`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        <script
          type="speculationrules"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              prerender: [{ urls: ["/blog"] }],
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
