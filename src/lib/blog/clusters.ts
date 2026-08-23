export type Cluster = {
  slug: string;
  name: string;
  description: string;
  postSlugs: string[];
};

export const clusters: Cluster[] = [
  {
    slug: "price-elasticity",
    name: "Price Elasticity",
    description:
      "The core concept behind every Zorin recommendation: how demand actually responds when your price moves. Start here to understand elasticity scores, how to calculate them, and what to do once you have one.",
    postSlugs: [
      "what-does-price-elasticity-actually-mean",
      "price-elasticity-explained-a-guide-for-ecommerce-sellers",
      "price-elasticity-examples-by-ecommerce-category",
      "why-do-some-products-have-more-elastic-demand-than-others",
      "elastic-vs-inelastic-demand-whats-the-difference",
      "how-do-i-calculate-my-own-price-elasticity-without-a-data-scientist",
      "how-to-calculate-price-elasticity-for-your-shopify-store",
      "how-to-know-if-your-prices-are-too-high-or-too-low",
      "why-did-my-sales-drop-when-i-raised-my-price",
      "price-increase-killed-your-sales-heres-the-real-reason",
      "how-much-should-i-trust-an-ai-pricing-recommendation",
      "do-i-need-a-data-analyst-to-price-my-products-well",
      "what-your-price-elasticity-score-actually-means",
    ],
  },
  {
    slug: "pricing-tools-and-software",
    name: "Pricing Tools & Software",
    description:
      "Comparisons and buyer's guides for pricing, repricing, and pricing-optimization apps, including where a demand-based tool like Zorin fits and where a different category makes more sense.",
    postSlugs: [
      "best-pricing-optimization-tools-for-shopify-stores-2026",
      "shopify-pricing-apps-what-to-look-for",
      "woocommerce-pricing-apps-what-to-look-for",
      "best-price-optimization-app-for-small-shopify-stores",
      "price-elasticity-vs-repricing-software",
      "price-elasticity-tools-for-ecommerce-how-to-find-your-best-price",
      "do-you-need-a-competitor-price-tracking-app",
      "how-to-evaluate-a-shopify-pricing-app",
    ],
  },
  {
    slug: "discounts-and-promotions",
    name: "Discounts & Promotions",
    description:
      "How to run a sale, price a bundle, or use dynamic pricing without quietly eating into margin you didn't mean to give up.",
    postSlugs: [
      "how-to-run-a-sale-without-wrecking-your-margin",
      "how-to-price-a-discount-without-losing-your-margin",
      "how-to-price-product-bundles-without-giving-away-your-margin",
      "dynamic-pricing-vs-sales-a-shopify-sellers-guide",
    ],
  },
  {
    slug: "margin-and-profit-fundamentals",
    name: "Margin & Profit Fundamentals",
    description:
      "Benchmarks and frameworks for gross margin, net margin, and where profit actually leaks out of a catalog that looks healthy on paper.",
    postSlugs: [
      "ecommerce-profit-margins-what-to-target-and-how-to-track-them",
      "whats-a-good-profit-margin-for-an-online-store",
      "is-your-store-leaving-money-on-the-table",
      "should-i-raise-prices-to-cover-rising-costs",
      "why-do-my-bestsellers-and-slow-sellers-need-different-pricing-strategies",
      "how-do-i-set-prices-for-my-whole-catalog-without-doing-it-one-by-one",
    ],
  },
  {
    slug: "price-sensitivity-surveys",
    name: "Price Sensitivity Surveys",
    description:
      "The Van Westendorp method: how to run a price survey, read the results, and know when survey data should, and shouldn't, be trusted over real sales data.",
    postSlugs: [
      "how-do-i-know-what-price-my-customers-are-willing-to-pay",
      "how-to-run-a-price-sensitivity-survey",
      "how-to-interpret-van-westendorp-results",
      "price-survey-vs-price-testing",
    ],
  },
  {
    slug: "multi-channel-and-launch-pricing",
    name: "Multi-Channel & Launch Pricing",
    description:
      "Setting a price with no sales history yet, and deciding whether that price should stay the same across Shopify, Amazon, and other channels.",
    postSlugs: [
      "should-you-price-differently-on-shopify-vs-amazon",
      "should-you-price-the-same-on-shopify-and-amazon",
      "how-do-i-price-a-new-product-with-no-sales-history",
      "how-to-price-a-new-product-from-launch-to-end-of-life",
    ],
  },
  {
    slug: "pricing-fundamentals-and-strategy",
    name: "Pricing Fundamentals & Strategy",
    description:
      "Broader strategy questions: how often to review prices, whether to price above or below competitors, and the core frameworks every pricing decision comes back to.",
    postSlugs: [
      "ecommerce-pricing-strategy-the-complete-guide",
      "ecommerce-pricing-strategy-by-growth-stage",
      "does-charm-pricing-999-actually-work",
      "how-often-should-i-change-my-prices",
      "how-do-i-know-what-to-price-my-products",
      "should-you-price-below-at-or-above-your-competitors",
      "how-to-automate-pricing-updates-across-your-shopify-store",
    ],
  },
  {
    slug: "vertical-specific-pricing",
    name: "Vertical-Specific Pricing",
    description:
      "Pricing guidance for categories with their own quirks, apparel returns and tariffs, skincare margins, and more categories as they're added.",
    postSlugs: [
      "pricing-skincare-products-on-shopify-charging-enough",
      "how-to-price-clothing-on-shopify",
    ],
  },
];

export function getClusterBySlug(slug: string) {
  return clusters.find((c) => c.slug === slug);
}
