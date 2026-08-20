import { Navbar } from "@/components/marketing/Navbar";
import { Footer } from "@/components/marketing/Footer";
import { IntegrationLanding } from "@/components/marketing/IntegrationLanding";

export const metadata = {
  title: "WooCommerce Pricing Intelligence Integration - Zorin",
  description:
    "Connect your WooCommerce store to Zorin in 2 minutes. Products, orders, and price changes sync automatically for profit-maximizing price recommendations.",
  alternates: { canonical: "https://www.tryzorin.com/integrations/woocommerce" },
};

export default function WooCommerceIntegrationPage() {
  return (
    <>
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
      />
      <Footer />
    </>
  );
}
