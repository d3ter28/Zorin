export interface PlanCatalogEntry {
  tier: "starter" | "growth" | "scale";
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  highlight: boolean;
}

export const PLAN_CATALOG: PlanCatalogEntry[] = [
  {
    tier: "starter",
    name: "Starter",
    price: "$39",
    period: "/mo",
    description: "For stores testing the waters with data-driven pricing.",
    features: ["Up to 25 products", "CSV upload", "Elasticity modeling", "Profit recommendations"],
    highlight: false,
  },
  {
    tier: "growth",
    name: "Growth",
    price: "$99",
    period: "/mo",
    description: "For growing stores ready to optimize their full catalog.",
    features: [
      "Up to 150 products",
      "Shopify & WooCommerce sync",
      "Elasticity modeling",
      "Profit recommendations",
      "What-if simulator",
      "Priority support",
    ],
    highlight: true,
  },
  {
    tier: "scale",
    name: "Scale",
    price: "$249",
    period: "/mo",
    description: "For catalogs and multi-store operations that outgrow the basics.",
    features: [
      "Unlimited products",
      "Shopify & WooCommerce sync",
      "Elasticity modeling",
      "Profit recommendations",
      "What-if simulator",
      "Multi-store support",
      "Dedicated support",
    ],
    highlight: false,
  },
];
