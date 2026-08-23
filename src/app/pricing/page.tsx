import { Navbar } from "@/components/marketing/Navbar";
import { Footer } from "@/components/marketing/Footer";
import { Pricing } from "@/components/marketing/Pricing";
import { buildBreadcrumbSchema } from "@/lib/seo/toolSchema";

export const metadata = {
  title: "Pricing - Zorin",
  description:
    "Simple, honest pricing for Zorin's Shopify and WooCommerce pricing intelligence. Start with a 7-day free trial, no credit card required.",
  alternates: { canonical: "https://www.tryzorin.com/pricing" },
};

const breadcrumbSchema = buildBreadcrumbSchema([{ name: "Pricing", path: "/pricing" }]);

export default function PricingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <Navbar />
      <main>
        <Pricing />
      </main>
      <Footer />
    </>
  );
}
