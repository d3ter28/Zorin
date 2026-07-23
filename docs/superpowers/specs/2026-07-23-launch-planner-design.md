# Launch Planner Design Spec

**Date:** 2026-07-23
**Status:** Draft for approval

## Summary

Add a new authenticated Launch Planner for merchants who do not yet have enough sales history for Zorin's ML recommendations. The tool helps them choose a defensible starting price by combining margin-floor math, optional market reference prices, positioning, retail rounding, and a no-history scenario simulator.

This is not ML. It is a transparent decision-support workflow for new products: "What price can I safely launch at, and what does the business look like under realistic sales scenarios?"

## Goals

- Give new merchants immediate value before they have Shopify/order history.
- Avoid fake precision by showing a price range, confidence level, and explanation.
- Keep the first version client-side and stateless: no schema changes, no saved plans, no API routes.
- Reuse Zorin's existing authenticated app shell, restrained SaaS UI, and money utilities.

## Non-Goals

- No competitor scraping or external market data lookup.
- No saved launch plans in the database.
- No Shopify write-back from the Launch Planner.
- No billing, team permissions, or onboarding changes.

## Route and Placement

Add a new authenticated route:

```text
/launch-planner
```

It uses `requireSessionPage()`, loads the merchant name with the same pattern as `/dashboard`, and renders inside `AppShell`.

Add a sidebar item labeled **Launch Planner** between Dashboard and Settings. The active state matches `/launch-planner`.

## Calculator Logic

All pricing math lives in a pure module:

```text
src/lib/launchPlanner/calculateLaunchPlan.ts
```

Inputs:

```ts
type Positioning = "budget" | "mid-market" | "premium";
type RoundingMode = "whole" | "ninety-nine";

interface LaunchPlanInput {
  unitCostCents: number;
  shippingCents: number;
  packagingCents: number;
  otherUnitCostsCents: number;
  paymentFeePct: number;
  platformFeePct: number;
  requiredMarginPct: number;
  positioning: Positioning;
  competitorPricesCents: number[];
  roundingMode: RoundingMode;
}
```

Cost basis:

```text
unitCostTotal = unitCost + shipping + packaging + otherUnitCosts
feePct = paymentFeePct + platformFeePct
minimumViablePrice = unitCostTotal / (1 - requiredMarginPct - feePct)
```

If `requiredMarginPct + feePct >= 0.95`, return a validation error because the floor becomes unusable.

Market reference:

- Sort valid competitor prices ascending.
- Compute low, median, and high from the sorted list.
- Budget positioning targets the midpoint between low and median.
- Mid-market targets the median.
- Premium targets the midpoint between median and high.
- If no competitor prices are supplied, target the margin floor plus a positioning markup:
  - Budget: `1.10x`
  - Mid-market: `1.25x`
  - Premium: `1.45x`

Recommended launch price:

```text
rawRecommended = max(minimumViablePrice, positioningTarget)
recommendedLaunchPrice = retailRound(rawRecommended, roundingMode)
```

If rounding would put the price below the minimum viable price, round upward to the next valid retail price.

Additional outputs:

- `minimumViablePriceCents`
- `recommendedPriceCents`
- `stretchPriceCents`: rounded `max(recommended * 1.12, marketHigh)` when market data exists, otherwise rounded `recommended * 1.15`
- `discountFloorPriceCents`: rounded-up price that allows a 15% launch discount without falling below the margin floor
- `grossMarginPct`
- `feePct`
- `marketStats` when competitor prices exist
- `confidence`: `"medium"` when at least 3 competitor prices exist, otherwise `"low"`
- `warnings`: non-blocking warnings such as "recommended price is above the market high" or "discounting below this price breaks your margin floor"
- `explanation`: one concise sentence for the result

## Scenario Simulator Logic

The simulator shares the same pure module or a sibling module:

```text
src/lib/launchPlanner/simulateLaunchScenario.ts
```

Inputs:

```ts
interface LaunchScenarioInput {
  priceCents: number;
  monthlyUnits: number;
  unitCostCents: number;
  shippingCents: number;
  packagingCents: number;
  otherUnitCostsCents: number;
  paymentFeePct: number;
  platformFeePct: number;
  adCostPerSaleCents: number;
  fixedMonthlyCostsCents: number;
  returnRatePct: number;
  discountPct: number;
}
```

Derived values:

```text
effectivePrice = price * (1 - discountPct)
keptUnits = monthlyUnits * (1 - returnRatePct)
revenue = effectivePrice * keptUnits
variableCost = (unitCostTotal + adCostPerSale + effectivePrice * feePct) * monthlyUnits
grossProfit = revenue - variableCost
netProfit = grossProfit - fixedMonthlyCosts
contributionPerUnit = effectivePrice - unitCostTotal - adCostPerSale - effectivePrice * feePct
breakEvenUnits = ceil(fixedMonthlyCosts / contributionPerUnit)
```

If `contributionPerUnit <= 0`, break-even units is `null` and the UI shows that each sale loses money.

Outputs:

- `effectivePriceCents`
- `revenueCents`
- `grossProfitCents`
- `netProfitCents`
- `contributionPerUnitCents`
- `breakEvenUnits`
- `marginPct`
- `warnings`

## UI Design

Create a single client component:

```text
src/components/LaunchPlanner.tsx
```

Layout:

- Left column: form controls for product economics, market references, positioning, and rounding.
- Right column: recommendation summary and scenario simulator.
- On narrow screens, stack columns vertically.

Controls:

- Currency inputs for costs and competitor/reference prices.
- Percent inputs for fees, margin, returns, and discount.
- Segmented controls for positioning and rounding.
- Numeric inputs for monthly units and fixed costs.
- A range slider plus exact input for scenario price, defaulting to the recommended launch price.

Recommendation summary:

- Minimum viable price
- Recommended launch price
- Stretch price
- Discount-safe floor
- Confidence badge
- Explanation sentence
- Warnings when present

Scenario summary:

- Revenue
- Gross profit
- Net profit
- Contribution per unit
- Break-even units
- Margin
- Warning when each sale loses money or discounting breaks the floor

## Error Handling

Client-side validation prevents impossible calculations:

- Prices/costs must be non-negative.
- Required margin and total fees must leave at least 5% room below price.
- Monthly units must be zero or greater.
- Percent values are clamped from `0` to `95` in the UI.

Validation errors appear inline in the calculator panel. The simulator still renders only when the calculator has a valid result.

## Testing

Use TDD.

Pure unit tests:

- Cost-only calculation picks a rounded price above the margin floor.
- Market-positioned calculation respects competitor median/high and never drops below floor.
- Invalid margin/fee combination returns an error.
- Scenario simulator computes revenue, profit, contribution, and break-even units.
- Scenario simulator returns `breakEvenUnits: null` when each sale loses money.

UI tests:

- Page component renders the calculator labels and default recommended price.
- Changing costs updates the recommendation.
- Adding competitor prices changes the market-aware recommendation.
- Scenario price/monthly units updates net profit.
- Invalid margin/fee values show an inline validation error.

## Open Decisions

None for version 1. Use USD formatting to match the rest of Zorin, and keep the feature stateless until users ask to save launch plans.
