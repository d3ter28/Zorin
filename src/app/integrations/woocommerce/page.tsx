import { Navbar } from "@/components/marketing/Navbar";
import { Footer } from "@/components/marketing/Footer";
import { IntegrationLanding } from "@/components/marketing/IntegrationLanding";
import { buildBreadcrumbSchema } from "@/lib/seo/toolSchema";

export const metadata = {
  title: "WooCommerce Pricing Intelligence Integration - Zorin",
  description:
    "Connect your WooCommerce store to Zorin in 2 minutes. Products, orders, and price changes sync automatically for profit-maximizing price recommendations.",
  alternates: { canonical: "https://www.tryzorin.com/integrations/woocommerce" },
};

const breadcrumbSchema = buildBreadcrumbSchema([
  { name: "WooCommerce Integration", path: "/integrations/woocommerce" },
]);

export default function WooCommerceIntegrationPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <Navbar />
      <IntegrationLanding
        platform="WooCommerce"
        ctaLabel="Connect WooCommerce in 2 Minutes"
        intro="Connect once and Zorin keeps your catalog, orders, and prices in sync automatically - no manual re-import, no spreadsheets."
        where="In your WordPress admin: WooCommerce → Settings → Advanced → REST API → Add key, with permissions set to Read/Write."
        how="In Zorin: Settings → WooCommerce Connection. Enter your store URL and the consumer key and secret from that API key."
        syncedData={[
          "Products and prices - imported on connect, then kept current via real-time webhooks",
          "Orders - synced automatically as sales come in, feeding your elasticity model",
          "Price changes you apply in Zorin push straight back to your WooCommerce catalog",
        ]}
        faqs={[
          {
            q: "Do I need a developer to connect WooCommerce?",
            a: "No. Generating a REST API key is a self-serve step in your own WordPress admin, no code required. Zorin only needs the consumer key and secret from that key to connect.",
          },
          {
            q: "Will connecting WooCommerce slow down my store?",
            a: "No. Zorin reads your data through WooCommerce's REST API, it doesn't add any script or plugin overhead to your storefront, so page load speed for your customers is unaffected.",
          },
          {
            q: "What happens to my existing order history?",
            a: "Your full order history imports on the initial connection, which is what your elasticity model needs to fit properly. Zorin generally needs at least 6 months of history with some price variation to produce a confident recommendation.",
          },
          {
            q: "Can I disconnect WooCommerce later?",
            a: "Yes. Revoking the REST API key in your WordPress admin, or removing the connection in Zorin's settings, stops the sync immediately. Your existing recommendations and data stay in your Zorin account.",
          },
        ]}
      />
      <Footer />
    </>
  );
}
