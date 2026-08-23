const BASE_URL = "https://www.tryzorin.com";

// Free interactive tools get their own WebApplication schema with a $0
// Offer, kept separate from the sitewide SoftwareApplication block in
// layout.tsx (which describes the paid Zorin product) so a $0 tool page
// never inherits paid pricing.
export function buildCalculatorSchema({
  name,
  path,
  description,
}: {
  name: string;
  path: string;
  description: string;
}) {
  const url = `${BASE_URL}${path}`;

  const webApplicationSchema = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name,
    url,
    description,
    applicationCategory: "CalculatorApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    isPartOf: {
      "@type": "WebSite",
      url: BASE_URL,
    },
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
      { "@type": "ListItem", position: 2, name, item: url },
    ],
  };

  return { webApplicationSchema, breadcrumbSchema };
}

// Generic BreadcrumbList builder for non-blog pages (features, integrations)
// that don't otherwise carry any page-specific schema.
export function buildBreadcrumbSchema(trail: Array<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
      ...trail.map((step, i) => ({
        "@type": "ListItem",
        position: i + 2,
        name: step.name,
        item: `${BASE_URL}${step.path}`,
      })),
    ],
  };
}
