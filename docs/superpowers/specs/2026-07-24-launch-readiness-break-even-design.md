# Launch Readiness and Break-Even Design Spec

**Date:** 2026-07-24
**Status:** Draft for approval

## Summary

Upgrade Zorin's Launch Planner from a calculator into a clearer launch decision workflow for merchants without historic product data.

The current Launch Planner already recommends a launch price and simulates profitability. This feature adds three paid-value layers on top:

- A **Price Readiness Score** that explains whether the product is in Launch, Learning, or Optimization mode.
- A **Break-Even Launch Plan** that turns the simulator output into concrete operating limits.
- A **Save and Compare Scenarios** panel for comparing up to three launch assumptions locally.

The goal is to make Zorin useful before a merchant has enough sales history, while staying honest about confidence.

## Product Positioning

This feature should communicate:

```text
Use this before you have enough sales history. Once products have history, Zorin can switch from launch assumptions to demand-aware price optimization.
```

Zorin should not pretend a new-product launch price is ML-backed. It should show why the price is reasonable, what assumptions drive the plan, and where the launch becomes unprofitable.

## Goals

- Help new merchants understand whether Zorin is using launch assumptions, early evidence, or historical optimization.
- Make break-even units, max safe ad spend, discount risk, and return-rate risk obvious.
- Let users compare a small number of realistic scenarios without requiring account-level persistence.
- Add plain-English explanation copy that answers "why this price?"
- Keep version 1 local and stateless: no database schema changes, no new API routes, no billing changes.

## Non-Goals

- No competitor discovery or scraping.
- No saved scenarios in the database.
- No Shopify write-back from Launch Planner.
- No AI-generated copy.
- No onboarding flow changes.
- No changes to the existing historical recommendation engine.

## Placement

Enhance the existing authenticated route:

```text
/launch-planner
```

Do not create a new navigation item. The existing Launch Planner sidebar entry remains the entry point.

## Readiness Model

Create a pure readiness helper:

```text
src/lib/launchPlanner/calculateReadiness.ts
```

Inputs:

```ts
export interface PriceReadinessInput {
  salesDataPoints: number;
  competitorPriceCount: number;
  hasUnitCost: boolean;
  hasTargetMargin: boolean;
}
```

Output:

```ts
export type PriceReadinessMode = "launch" | "learning" | "optimization";

export interface PriceReadinessResult {
  mode: PriceReadinessMode;
  score: number;
  label: string;
  summary: string;
  nextStep: string;
  evidence: string[];
}
```

Scoring rules:

- Start at `0`.
- Add `25` if unit cost is present.
- Add `15` if target margin is present.
- Add up to `20` for competitor prices:
  - `0` prices: `0`
  - `1-2` prices: `10`
  - `3+` prices: `20`
- Add up to `40` for sales data:
  - `0` points: `0`
  - `1-9` points: `15`
  - `10-29` points: `25`
  - `30+` points: `40`

Mode rules:

- `launch`: fewer than `10` sales data points.
- `learning`: `10-29` sales data points.
- `optimization`: `30+` sales data points.

Labels and summaries:

- `launch`: "Launch Mode" - "Zorin is using cost, margin, and market assumptions because this product does not have enough sales history yet."
- `learning`: "Learning Mode" - "Zorin has early sales evidence, but recommendations should still be checked against launch economics."
- `optimization`: "Optimization Mode" - "Zorin has enough sales history to support demand-aware price optimization."

For version 1, `salesDataPoints` is supplied by the UI as a simple numeric input defaulting to `0`. This avoids API work while making the model explicit and testable.

## Break-Even Plan

Extend the existing scenario simulator output with operating limits.

Create or extend a pure helper:

```text
src/lib/launchPlanner/calculateBreakEvenPlan.ts
```

Inputs:

```ts
export interface BreakEvenPlanInput {
  recommendedPriceCents: number;
  minimumViablePriceCents: number;
  effectivePriceCents: number;
  monthlyUnits: number;
  unitCostTotalCents: number;
  feePct: number;
  adCostPerSaleCents: number;
  fixedMonthlyCostsCents: number;
  returnRatePct: number;
  discountPct: number;
}
```

Output:

```ts
export type LaunchRiskLevel = "low" | "medium" | "high";

export interface BreakEvenPlanResult {
  breakEvenUnits: number | null;
  maxSafeAdSpendCents: number | null;
  discountSafePriceCents: number;
  returnRateStress: {
    testedReturnRatePct: number;
    netProfitCents: number;
    risk: LaunchRiskLevel;
  };
  discountStress: {
    testedDiscountPct: number;
    netProfitCents: number;
    risk: LaunchRiskLevel;
  };
  viability: {
    risk: LaunchRiskLevel;
    headline: string;
    explanation: string;
  };
  warnings: string[];
}
```

Rules:

- `breakEvenUnits` reuses the return-adjusted contribution logic from `simulateLaunchScenario`.
- `maxSafeAdSpendCents` is the highest ad cost per ordered unit that keeps contribution above `0`, after fees and expected returns.
- If max safe ad spend is below `0`, return `null` and warn that the launch loses money before advertising.
- `discountSafePriceCents` is the minimum price that stays above `minimumViablePriceCents` after the current discount.
- Return-rate stress tests the current scenario at `returnRatePct + 10`, capped at `95`.
- Discount stress tests the current scenario at `discountPct + 10`, capped at `95`.
- Risk is `high` when contribution is `<= 0` or projected net profit is negative.
- Risk is `medium` when projected net profit is positive but less than `15%` of revenue.
- Risk is `low` when projected net profit is at least `15%` of revenue.

Viability copy examples:

- Low risk: "This launch has room to absorb normal discounting and returns."
- Medium risk: "This launch can work, but discounts, ads, or returns could quickly erase profit."
- High risk: "This launch is fragile. The current assumptions do not leave enough contribution per order."

## Scenario Saving and Comparison

Saved scenarios are local UI state only.

Create a local scenario model in the Launch Planner component or a focused sibling module:

```ts
export interface SavedLaunchScenario {
  id: string;
  name: string;
  priceCents: number;
  monthlyUnits: number;
  discountPct: number;
  returnRatePct: number;
  adCostPerSaleCents: number;
  fixedMonthlyCostsCents: number;
  netProfitCents: number;
  breakEvenUnits: number | null;
  risk: LaunchRiskLevel;
}
```

Behavior:

- Users can save up to `3` scenarios.
- Default scenario names:
  - "Conservative launch"
  - "Base launch"
  - "Aggressive launch"
- If the user saves a fourth scenario, show an inline message: "Compare up to 3 scenarios at a time. Remove one to save another."
- Users can remove a saved scenario.
- Saved scenarios reset on page refresh.
- No browser localStorage in version 1.

Comparison columns:

- Scenario name
- Price
- Units
- Discount
- Return rate
- Net profit
- Break-even units
- Risk

## Explanation Copy

Add a "Why this price?" explanation block near the recommendation.

The explanation should be deterministic, not AI-generated.

Inputs:

- Minimum viable price
- Recommended price
- Positioning
- Competitor price count
- Market low, median, and high when available
- Readiness mode

Output:

```ts
export interface PriceExplanation {
  headline: string;
  bullets: string[];
}
```

Example with market data:

```text
Headline: Zorin is anchoring this launch at $39.99 because it clears your margin floor and sits near the mid-market reference.

Bullets:
- Your minimum viable price is $28.70 after product cost, fulfillment, and fees.
- You supplied 4 competitor prices, giving this launch a medium-confidence market reference.
- Mid-market positioning keeps the recommendation near the market median instead of chasing the lowest price.
```

Example without market data:

```text
Headline: Zorin is using your costs and target margin because this product has no market references yet.

Bullets:
- Your minimum viable price is $28.70.
- The recommendation adds a launch markup for mid-market positioning.
- Add competitor prices to improve confidence before committing inventory or ad spend.
```

## UI Design

Modify:

```text
src/components/LaunchPlanner.tsx
```

Keep the current two-column structure.

Add these sections:

1. **Launch Readiness**
   - Compact panel above the recommendation summary.
   - Shows score, mode label, summary, and next step.
   - Includes a small numeric input for "Sales data points" defaulting to `0`.

2. **Why This Price?**
   - Sits directly under the recommendation price.
   - Shows one headline and up to three bullets.

3. **Break-Even Plan**
   - Replaces or expands the existing scenario summary.
   - Shows cards for break-even units, max safe ad spend, return stress, discount stress, and launch viability.

4. **Saved Scenarios**
   - Table below the simulator.
   - Includes Save Scenario and Remove controls.
   - Empty state: "Save a scenario to compare launch assumptions."

Tone:

- Clear, restrained, and financially specific.
- Avoid fake certainty.
- Use "assumption", "estimate", and "launch" when data is limited.

## Error Handling

- If readiness inputs are invalid, clamp sales data points to `0-999`.
- If scenario contribution is zero or negative, show break-even as "Not reachable".
- If max safe ad spend is `null`, show "No paid ads room".
- If saved scenario limit is reached, show the inline limit message and do not overwrite existing scenarios.
- If competitor prices are missing, explanation copy should explicitly say confidence is limited.

## Testing

Use TDD.

Pure unit tests:

- Readiness returns Launch Mode at `0` sales data points.
- Readiness returns Learning Mode at `10` sales data points.
- Readiness returns Optimization Mode at `30` sales data points.
- Readiness score increases when costs, margin, competitor prices, and sales data are present.
- Break-even plan returns max safe ad spend when contribution is positive.
- Break-even plan returns `null` max safe ad spend when launch loses money before ads.
- Break-even plan marks negative net profit as high risk.
- Explanation copy mentions market references when competitor prices exist.
- Explanation copy asks for competitor prices when none exist.

UI tests:

- Launch Readiness panel renders in Launch Mode by default.
- Changing sales data points to `30` changes the mode to Optimization Mode.
- "Why this price?" updates when competitor prices are added.
- Save Scenario adds a row to the comparison table.
- Saving more than three scenarios shows the limit message.
- Removing a scenario updates the comparison table.
- A losing scenario shows "Not reachable" or "No paid ads room" instead of misleading break-even values.

## Rollout Criteria

- `npm test` passes.
- `npm run build` passes.
- `/launch-planner` still works for the default demo account.
- Existing calculator and simulator behaviors remain covered by their current tests.
- No database migration is created.

## Open Decisions

None for version 1. Keep saved scenarios local-only and keep sales data points as a manual input until the Launch Planner is connected to product-level history.
