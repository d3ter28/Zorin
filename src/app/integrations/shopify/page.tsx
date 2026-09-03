import { Navbar } from "@/components/marketing/Navbar";
import { Footer } from "@/components/marketing/Footer";
import { IntegrationLanding } from "@/components/marketing/IntegrationLanding";
import { buildBreadcrumbSchema } from "@/lib/seo/toolSchema";

export const metadata = {
  title: "Shopify Pricing Intelligence Integration - Zorin",
  description:
    "Connect your Shopify store to Zorin in 2 minutes. Products, orders, and price changes sync automatically for profit-maximizing price recommendations.",
  alternates: { canonical: "https://www.tryzorin.com/integrations/shopify" },
};

// No /integrations hub page exists yet, so the trail stays two levels
// (Home -> this page) rather than referencing a non-existent middle crumb.
const breadcrumbSchema = buildBreadcrumbSchema([
  { name: "Shopify Integration", path: "/integrations/shopify" },
]);

export default function ShopifyIntegrationPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <Navbar />
      <IntegrationLanding
        platform="Shopify"
        ctaLabel="Connect Shopify in 2 Minutes"
        intro="Connect once and Zorin keeps your catalog, orders, and prices in sync automatically - no manual re-import, no spreadsheets."
        where="In your Shopify admin: Settings → Apps → Develop apps → Create an app → configure Admin API scopes (read_products, read_orders, write_products)."
        how="In Zorin: Settings → Shopify Connection. Paste your store domain and the Admin API access token from that app."
        syncedData={[
          "Products and prices - imported on connect, then kept current via real-time webhooks",
          "Orders - synced automatically as sales come in, feeding your elasticity model",
          "Price changes you apply in Zorin push straight back to your Shopify catalog",
        ]}
        faqs={[
          {
            q: "Do I need a developer to connect Shopify?",
            a: "No. Creating a custom app in your Shopify admin is a self-serve process that takes a couple of minutes, no code required. Zorin walks you through exactly which Admin API scopes to enable.",
          },
          {
            q: "Will connecting Shopify slow down my store?",
            a: "No. Zorin reads your data through Shopify's Admin API and webhooks, it never adds a script or app embed to your storefront, so page load speed for your customers is unaffected.",
          },
          {
            q: "What happens to my existing order history?",
            a: "Your full order history imports on the initial connection, which is what your elasticity model needs to fit properly. Zorin generally needs at least 6 months of history with some price variation to produce a confident recommendation.",
          },
          {
            q: "Can I disconnect Shopify later?",
            a: "Yes. Revoking the custom app's access in your Shopify admin, or removing the connection in Zorin's settings, stops the sync immediately. Your existing recommendations and data stay in your Zorin account.",
          },
        ]}
      />
      <Footer />
    </>
  );
}
