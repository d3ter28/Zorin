"use client";

import {
  MathOperations,
  ChartBar,
  ShieldCheck,
  ChatCenteredText,
  Scales,
  RocketLaunch,
  CalendarBlank,
  TrendUp,
  UsersThree,
  Plugs,
  type Icon,
} from "@phosphor-icons/react";

interface FeatureItem {
  icon: Icon;
  title: string;
  body: string;
}

interface FeatureGroup {
  eyebrow: string;
  heading: string;
  intro: string;
  items: FeatureItem[];
}

const groups: FeatureGroup[] = [
  {
    eyebrow: "Know what to charge",
    heading: "Every signal, in one place",
    intro:
      "Your own sales history, what customers say they'd pay, and what competitors charge - three independent signals, never blended together, so you can see where they agree and where they don't.",
    items: [
      {
        icon: MathOperations,
        title: "Price elasticity modeling",
        body: "A statistical model learns how demand shifts with price for every SKU in your catalog, then recommends the price that maximizes profit - not just revenue.",
      },
      {
        icon: ShieldCheck,
        title: "Confidence scoring",
        body: "Every recommendation ships with a confidence score based on data density and model fit (R²), so you know when to trust it and when to wait for more data.",
      },
      {
        icon: ChartBar,
        title: "Promotion detection",
        body: "Sales spikes from past promotions are automatically flagged and excluded from the model, so a Black Friday discount doesn't skew your everyday-price recommendation.",
      },
      {
        icon: ChatCenteredText,
        title: "Van Westendorp price sensitivity survey",
        body: "Send customers four price-perception questions and get back an optimal price and acceptable range - real willingness-to-pay data, independent of your sales-based model.",
      },
      {
        icon: Scales,
        title: "Competitor price tracking",
        body: "Log what similar products sell for elsewhere, on any product page. Track it over time and see exactly where you sit in the market.",
      },
      {
        icon: RocketLaunch,
        title: "Launch Planner",
        body: "No sales history yet? Launch Planner works from your cost of goods, target margin, and tracked competitor prices instead - a defensible starting price with zero data required.",
      },
    ],
  },
  {
    eyebrow: "Apply it at scale",
    heading: "From recommendation to live price",
    intro:
      "A recommendation only helps once it's actually applied - and reviewing products one at a time doesn't scale past a handful of SKUs.",
    items: [
      {
        icon: TrendUp,
        title: "One-click apply",
        body: "Apply any recommendation from a product's page. If you're connected to Shopify or WooCommerce, the new price pushes live to your store automatically, and the full change history is recorded.",
      },
      {
        icon: CalendarBlank,
        title: "Pricing campaigns",
        body: "Roll a price change out across many products at once, on a schedule, using a rules engine - percentage, ML recommendation, or competitor match, with a margin floor, .99/.95 rounding, automatic revert at the end date, and conflict detection so two campaigns never fight over the same product.",
      },
    ],
  },
  {
    eyebrow: "See what it's worth",
    heading: "Profit, not just price",
    intro:
      "A recommendation tells you what to change. Profit tracking tells you whether it worked.",
    items: [
      {
        icon: TrendUp,
        title: "Real P&L over time",
        body: "Monthly revenue, cost of goods, and gross profit for the last 24 months, backed by a full cost-of-goods audit trail - not a snapshot, an actual history.",
      },
      {
        icon: ChartBar,
        title: "Product leaderboard",
        body: "Toggle between top earners and margin bleeders over a 30/90/365-day window to find which products are quietly costing you money.",
      },
      {
        icon: ShieldCheck,
        title: "Campaign performance, honestly labeled",
        body: "For every completed campaign, profit during the campaign versus an equal-length prior period - clearly flagged when a campaign is still running, has no prior baseline, or falls back to an estimated cost of goods.",
      },
    ],
  },
  {
    eyebrow: "Built for your team",
    heading: "Not just one login",
    intro:
      "Pricing decisions rarely rest on one person - Zorin's account model reflects that.",
    items: [
      {
        icon: UsersThree,
        title: "Multi-user teams",
        body: "Invite teammates by email. Members get full access to products, pricing, campaigns, and profit data; only the account Owner manages billing and the team itself.",
      },
      {
        icon: Plugs,
        title: "Shopify & WooCommerce sync",
        body: "Connect either platform once and products, orders, and price changes stay in sync automatically - no manual CSV re-uploads.",
      },
    ],
  },
];

export function FeaturesGrid() {
  return (
    <div className="mt-16 space-y-20">
      {groups.map((group) => (
        <section key={group.heading}>
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
            {group.eyebrow}
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-zinc-900">
            {group.heading}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-500">{group.intro}</p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {group.items.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="rounded-xl border border-zinc-200 bg-white p-6">
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-blue-50 text-blue-600">
                    <Icon size={20} weight="duotone" />
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-zinc-900">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-500">{item.body}</p>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
