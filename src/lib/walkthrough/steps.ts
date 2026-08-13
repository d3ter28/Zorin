import type { IconWeight } from "@phosphor-icons/react";
import {
  Compass,
  UploadSimple,
  ChartLineUp,
  CalendarBlank,
  RocketLaunch,
  ChatCircleDots,
  Scales,
  TrendUp,
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
    icon: CalendarBlank,
    title: "Apply recommendations at scale with Campaigns",
    description:
      "Campaigns roll a rules-based price change out across many products at once — by percentage, ML recommendation, or competitor match — on a schedule, with automatic revert and conflict detection built in.",
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
    icon: TrendUp,
    title: "Track profit, not just price",
    description:
      "The Profit page shows real P&L over time, a per-product leaderboard of top earners and margin bleeders, and before/after performance for every campaign you've run.",
  },
  {
    icon: Gear,
    title: "Settings & your team",
    description:
      "Settings is now split into Account, Billing, Team, and Integrations. Invite teammates from Team (Owners can manage billing and team; Members get full pricing access), and connect Shopify or WooCommerce from Integrations. Replay this tour anytime from the Guide page.",
  },
];
