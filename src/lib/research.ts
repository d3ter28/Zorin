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
  {
    slug: "inventory-turnover-by-product-category",
    title: "Inventory Turnover by Ecommerce Product Category",
    description:
      "A sourced reference compiling real inventory turnover ratios and days inventory outstanding across ecommerce product categories, calculated from public company SEC filings.",
    date: "2026-09-01",
  },
  {
    slug: "discount-impact-on-margin-by-product-category",
    title: "Discount Impact on Margin by Ecommerce Product Category",
    description:
      "A sourced reference compiling real gross margin impact from promotional discounting, measured in basis points, across ecommerce product categories, drawn from public company filings.",
    date: "2026-09-01",
  },
  {
    slug: "average-order-value-by-product-category",
    title: "Average Order Value by Ecommerce Product Category",
    description:
      "A sourced reference compiling real average order value figures across ecommerce product categories, drawn directly from public company SEC filings and investor disclosures.",
    date: "2026-09-12",
  },
  {
    slug: "discount-depth-by-product-category",
    title: "Discount Depth by Ecommerce Product Category",
    description:
      "A sourced reference of real peak promotional discount depth across ecommerce product categories, drawn from Adobe Analytics' Holiday 2025 shopping report.",
    date: "2026-09-20",
  },
  {
    slug: "return-rate-by-product-category",
    title: "Ecommerce Return Rate by Product Category",
    description:
      "A sourced reference of online return rates across ecommerce product categories, anchored to NRF, Coresight Research and Zalando figures alongside published industry benchmarks.",
    date: "2026-09-25",
  },
  {
    slug: "state-of-ecommerce-pricing-2026",
    title: "State of Ecommerce Pricing 2026",
    description:
      "A sourced report on how small online retailers are pricing in 2026: tariff pass-through, price increases, price realization, discount depth and returns, compiled from public research.",
    date: "2026-09-25",
  },
];
