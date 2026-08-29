export type ResearchItem = {
  slug: string;
  title: string;
  description: string;
  date: string;
  updatedDate?: string;
};

export const research: ResearchItem[] = [
  {
    slug: "price-elasticity-by-category",
    title: "Price Elasticity of Demand by Product Category",
    description:
      "A sourced reference compiling real price elasticity coefficients across ecommerce product categories, drawn from peer-reviewed studies and government data.",
    date: "2026-08-23",
  },
  {
    slug: "profit-margins-by-product-category",
    title: "Gross Profit Margins by Ecommerce Product Category",
    description:
      "A sourced reference compiling real gross profit margins across ecommerce product categories, drawn from public company SEC filings and investor relations disclosures.",
    date: "2026-08-25",
  },
  {
    slug: "marketing-spend-by-product-category",
    title: "Marketing Spend by Ecommerce Product Category",
    description:
      "A sourced reference compiling real advertising and marketing spend as a percentage of revenue across ecommerce product categories, drawn from public company SEC filings.",
    date: "2026-08-26",
  },
];
