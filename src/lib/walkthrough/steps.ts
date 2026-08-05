import type { IconWeight } from "@phosphor-icons/react";
import {
  Compass,
  UploadSimple,
  ChartLineUp,
  RocketLaunch,
  ChatCircleDots,
  Scales,
  Gear,
} from "@phosphor-icons/react";

export interface WalkthroughStep {
  icon: React.ElementType;
  iconWeight?: IconWeight;
  title: string;
  description: string;
}

export const WALKTHROUGH_STEPS: WalkthroughStep[] = [
  {
    icon: Compass,
    title: "Welcome — here's the tour",
    description:
      "A minute or two and you'll know where everything lives. We'll point at each part of Zorin as we go.",
  },
  {
    icon: UploadSimple,
    title: "Import your products",
    description:
      "Upload a CSV of your catalog, or connect Shopify/WooCommerce from Settings for automatic sync — either way, this is where your pricing data starts.",
  },
  {
    icon: ChartLineUp,
    title: "Fit a model, get a recommendation",
    description:
      "Once a product has sales history, fit the elasticity model and Zorin tells you whether to raise, lower, or hold the price — with the reasoning shown alongside it.",
  },
  {
    icon: RocketLaunch,
    title: "No sales data yet? Use Launch Planner",
    description:
      "For new products with no history, Launch Planner works from your costs and margin instead — a defensible starting price with zero data required.",
  },
  {
    icon: ChatCircleDots,
    title: "Ask customers directly",
    description:
      "The Van Westendorp survey lets you share a link with customers and see what they'd actually pay — a second signal alongside the sales-based recommendation.",
  },
  {
    icon: Scales,
    title: "Benchmark against competitors",
    description:
      "Track competitor prices per product to see where you sit in the market, and feed them straight into Launch Planner for a market-aware starting price.",
  },
  {
    icon: Gear,
    title: "Settings & integrations",
    description:
      "Connect Shopify or WooCommerce, manage billing, and update your account — all from Settings. You can replay this tour anytime from the Guide page.",
  },
];
