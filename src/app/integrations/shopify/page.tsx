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
      />
      <Footer />
    </>
  );
}
