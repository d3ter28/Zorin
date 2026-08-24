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
];
