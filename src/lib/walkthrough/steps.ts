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
  /** DOM id of the element this step is talking about, spotlighted on the dashboard while this step is active. */
  targetId?: string;
  /** Dashboard tab to switch to while this step is active, so the target above is actually visible. */
  tab?: "overview" | "products";
}

export const WALKTHROUGH_STEPS: WalkthroughStep[] = [
  {
    icon: Compass,
    title: "Welcome — here's the tour",
    description:
      "A minute or two and you'll know where everything lives. We'll point at each part of Zorin as we go.",
    tab: "overview",
  },
  {
    icon: UploadSimple,
    title: "Import your products",
    description:
      "Upload a CSV of your catalog here, or connect Shopify/WooCommerce from Settings for automatic sync — either way, this is where your pricing data starts.",
    targetId: "tour-import-csv",
    tab: "products",
  },
  {
    icon: ChartLineUp,
    title: "Fit a model, get a recommendation",
    description:
      "Click into any product from this list, then Fit Model. Once it has sales history, Zorin tells you whether to raise, lower, or hold the price — with the reasoning shown alongside it.",
    targetId: "tour-products-table",
    tab: "products",
  },
  {
    icon: CalendarBlank,
    title: "Apply recommendations at scale with Campaigns",
    description:
      "Campaigns, in the sidebar, roll a rules-based price change out across many products at once — by percentage, ML recommendation, or competitor match — on a schedule, with automatic revert and conflict detection built in.",
    targetId: "tour-nav-campaigns",
    tab: "overview",
  },
  {
    icon: RocketLaunch,
    title: "No sales data yet? Use Launch Planner",
    description:
      "For new products with no history, Launch Planner works from your costs and margin instead — a defensible starting price with zero data required.",
    targetId: "tour-nav-launch-planner",
    tab: "overview",
  },
  {
    icon: ChatCircleDots,
    title: "Ask customers directly",
    description:
      "Click into any product from this list and find the Van Westendorp Analysis card to share a survey link with customers and see what they'd actually pay — a second signal alongside the sales-based recommendation.",
    targetId: "tour-products-table",
    tab: "products",
  },
  {
    icon: Scales,
    title: "Benchmark against competitors",
    description:
      "Click into any product from this list and find the Competitor prices card — it tracks what similar products sell for elsewhere, and feeds straight into Launch Planner for a market-aware starting price.",
    targetId: "tour-products-table",
    tab: "products",
  },
  {
    icon: TrendUp,
    title: "Track profit, not just price",
    description:
      "Profit, in the sidebar, shows real P&L over time, a per-product leaderboard of top earners and margin bleeders, and before/after performance for every campaign you've run.",
    targetId: "tour-nav-profit",
    tab: "overview",
  },
  {
    icon: Gear,
    title: "Settings & your team",
    description:
      "Settings is split into Account, Billing, Team, and Integrations. Invite teammates from Team (Owners can manage billing and team; Members get full pricing access), and connect Shopify or WooCommerce from Integrations. Replay this tour anytime from the Guide page.",
    targetId: "tour-nav-settings",
    tab: "overview",
  },
];
