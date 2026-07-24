# Launch Readiness and Break-Even Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade `/launch-planner` with readiness scoring, break-even operating limits, deterministic price explanations, and local scenario comparison.

**Architecture:** Add small pure helpers under `src/lib/launchPlanner/` first, then integrate them into the existing `LaunchPlanner` client component. Keep the feature stateless and local-only: no database migration, no API route, no server action.

**Tech Stack:** Next.js 16 app router, React 19, TypeScript, Vitest, Testing Library, existing Zorin money helpers.

## Global Constraints

- Enhance the existing authenticated route `/launch-planner`; do not add a new route or sidebar item.
- No competitor discovery or scraping.
- No saved scenarios in the database.
- No Shopify write-back from Launch Planner.
- No AI-generated copy.
- No database migration.
- Saved scenarios are local component state only and reset on refresh.
- Sales data points are a manual numeric UI input defaulting to `0`.
- Use deterministic copy and avoid fake certainty.
- `npm test` and `npm run build` must pass before completion.

---

## File Structure

- Create `src/lib/launchPlanner/calculateReadiness.ts`: readiness score, mode, evidence, summary, and next-step copy.
- Create `src/lib/launchPlanner/calculateReadiness.test.ts`: readiness unit tests.
- Create `src/lib/launchPlanner/calculateBreakEvenPlan.ts`: break-even operating limits, risk classification, stress tests.
- Create `src/lib/launchPlanner/calculateBreakEvenPlan.test.ts`: break-even plan unit tests.
- Create `src/lib/launchPlanner/explainLaunchPrice.ts`: deterministic "Why this price?" headline and bullets.
- Create `src/lib/launchPlanner/explainLaunchPrice.test.ts`: explanation unit tests.
- Modify `src/components/LaunchPlanner.tsx`: add readiness input/panel, explanation block, break-even plan cards, and saved scenario comparison.
- Modify `src/components/LaunchPlanner.test.tsx`: UI tests for the new sections and saved scenarios.

---

### Task 1: Readiness Score Helper

**Files:**
- Create: `src/lib/launchPlanner/calculateReadiness.ts`
- Create: `src/lib/launchPlanner/calculateReadiness.test.ts`

**Interfaces:**
- Produces:

```ts
export interface PriceReadinessInput {
  salesDataPoints: number;
  competitorPriceCount: number;
  hasUnitCost: boolean;
  hasTargetMargin: boolean;
}

export type PriceReadinessMode = "launch" | "learning" | "optimization";

export interface PriceReadinessResult {
  mode: PriceReadinessMode;
  score: number;
  label: string;
  summary: string;
  nextStep: string;
  evidence: string[];
}

export function calculateReadiness(input: PriceReadinessInput): PriceReadinessResult;
```

- Consumed by Task 4 in `src/components/LaunchPlanner.tsx`.

- [ ] **Step 1: Write failing readiness tests**

Create `src/lib/launchPlanner/calculateReadiness.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { calculateReadiness } from "./calculateReadiness";

describe("calculateReadiness", () => {
  it("returns Launch Mode at 0 sales data points", () => {
    const result = calculateReadiness({
      salesDataPoints: 0,
      competitorPriceCount: 0,
      hasUnitCost: true,
      hasTargetMargin: true,
    });

    expect(result.mode).toBe("launch");
    expect(result.label).toBe("Launch Mode");
    expect(result.summary).toContain("does not have enough sales history");
    expect(result.score).toBe(40);
    expect(result.evidence).toContain("Unit cost is present.");
    expect(result.evidence).toContain("Target margin is present.");
  });

  it("returns Learning Mode at 10 sales data points", () => {
    const result = calculateReadiness({
      salesDataPoints: 10,
      competitorPriceCount: 2,
      hasUnitCost: true,
      hasTargetMargin: true,
    });

    expect(result.mode).toBe("learning");
    expect(result.label).toBe("Learning Mode");
    expect(result.score).toBe(75);
    expect(result.nextStep).toContain("Keep comparing");
  });

  it("returns Optimization Mode at 30 sales data points", () => {
    const result = calculateReadiness({
      salesDataPoints: 30,
      competitorPriceCount: 3,
      hasUnitCost: true,
      hasTargetMargin: true,
    });

    expect(result.mode).toBe("optimization");
    expect(result.label).toBe("Optimization Mode");
    expect(result.score).toBe(100);
    expect(result.summary).toContain("demand-aware price optimization");
  });

  it("clamps invalid counts and increases score as evidence improves", () => {
    const weak = calculateReadiness({
      salesDataPoints: -5,
      competitorPriceCount: -2,
      hasUnitCost: false,
      hasTargetMargin: false,
    });
    const stronger = calculateReadiness({
      salesDataPoints: 9,
      competitorPriceCount: 3,
      hasUnitCost: true,
      hasTargetMargin: true,
    });

    expect(weak.score).toBe(0);
    expect(weak.mode).toBe("launch");
    expect(stronger.score).toBeGreaterThan(weak.score);
    expect(stronger.evidence).toContain("3 competitor prices are available.");
  });
});
```

- [ ] **Step 2: Run readiness tests to verify they fail**

Run:

```powershell
npx vitest run src/lib/launchPlanner/calculateReadiness.test.ts
```

Expected: FAIL because `./calculateReadiness` does not exist.

- [ ] **Step 3: Implement readiness helper**

Create `src/lib/launchPlanner/calculateReadiness.ts`:

```ts
export interface PriceReadinessInput {
  salesDataPoints: number;
  competitorPriceCount: number;
  hasUnitCost: boolean;
  hasTargetMargin: boolean;
}

export type PriceReadinessMode = "launch" | "learning" | "optimization";

export interface PriceReadinessResult {
  mode: PriceReadinessMode;
  score: number;
  label: string;
  summary: string;
  nextStep: string;
  evidence: string[];
}

export function calculateReadiness(input: PriceReadinessInput): PriceReadinessResult {
  const salesDataPoints = clampInteger(input.salesDataPoints, 0, 999);
  const competitorPriceCount = clampInteger(input.competitorPriceCount, 0, 999);
  const score =
    (input.hasUnitCost ? 25 : 0) +
    (input.hasTargetMargin ? 15 : 0) +
    competitorScore(competitorPriceCount) +
    salesScore(salesDataPoints);
  const mode = readinessMode(salesDataPoints);

  return {
    mode,
    score,
    ...copyForMode(mode),
    evidence: buildEvidence({
      salesDataPoints,
      competitorPriceCount,
      hasUnitCost: input.hasUnitCost,
      hasTargetMargin: input.hasTargetMargin,
    }),
  };
}

function clampInteger(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.floor(value)));
}

function competitorScore(count: number): number {
  if (count >= 3) return 20;
  if (count >= 1) return 10;
  return 0;
}

function salesScore(points: number): number {
  if (points >= 30) return 40;
  if (points >= 10) return 25;
  if (points >= 1) return 15;
  return 0;
}

function readinessMode(points: number): PriceReadinessMode {
  if (points >= 30) return "optimization";
  if (points >= 10) return "learning";
  return "launch";
}

function copyForMode(mode: PriceReadinessMode): Omit<PriceReadinessResult, "mode" | "score" | "evidence"> {
  if (mode === "optimization") {
    return {
      label: "Optimization Mode",
      summary: "Zorin has enough sales history to support demand-aware price optimization.",
      nextStep: "Use Launch Planner as a guardrail, then compare against historical product recommendations.",
    };
  }

  if (mode === "learning") {
    return {
      label: "Learning Mode",
      summary: "Zorin has early sales evidence, but recommendations should still be checked against launch economics.",
      nextStep: "Keep comparing margin, returns, and early conversion before trusting demand signals fully.",
    };
  }

  return {
    label: "Launch Mode",
    summary: "Zorin is using cost, margin, and market assumptions because this product does not have enough sales history yet.",
    nextStep: "Add competitor prices and keep the launch above break-even while sales history builds.",
  };
}

function buildEvidence(input: Required<PriceReadinessInput>): string[] {
  const evidence: string[] = [];

  evidence.push(input.hasUnitCost ? "Unit cost is present." : "Unit cost is missing.");
  evidence.push(input.hasTargetMargin ? "Target margin is present." : "Target margin is missing.");

  if (input.competitorPriceCount === 0) {
    evidence.push("No competitor prices are available.");
  } else if (input.competitorPriceCount === 1) {
    evidence.push("1 competitor price is available.");
  } else {
    evidence.push(`${input.competitorPriceCount} competitor prices are available.`);
  }

  if (input.salesDataPoints === 0) {
    evidence.push("No sales history is available yet.");
  } else if (input.salesDataPoints === 1) {
    evidence.push("1 sales data point is available.");
  } else {
    evidence.push(`${input.salesDataPoints} sales data points are available.`);
  }

  return evidence;
}
```

- [ ] **Step 4: Run readiness tests**

Run:

```powershell
npx vitest run src/lib/launchPlanner/calculateReadiness.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit readiness helper**

Run:

```powershell
git add src/lib/launchPlanner/calculateReadiness.ts src/lib/launchPlanner/calculateReadiness.test.ts
git commit -m "feat: add launch readiness scoring"
```

---

### Task 2: Break-Even Plan Helper

**Files:**
- Create: `src/lib/launchPlanner/calculateBreakEvenPlan.ts`
- Create: `src/lib/launchPlanner/calculateBreakEvenPlan.test.ts`

**Interfaces:**
- Consumes: return-adjusted unit economics equivalent to `simulateLaunchScenario(input)`.
- Produces:

```ts
export type LaunchRiskLevel = "low" | "medium" | "high";

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

export function calculateBreakEvenPlan(input: BreakEvenPlanInput): BreakEvenPlanResult;
```

- Consumed by Task 4 in `src/components/LaunchPlanner.tsx`.

- [ ] **Step 1: Write failing break-even tests**

Create `src/lib/launchPlanner/calculateBreakEvenPlan.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { calculateBreakEvenPlan } from "./calculateBreakEvenPlan";

const profitableInput = {
  recommendedPriceCents: 3999,
  minimumViablePriceCents: 2870,
  effectivePriceCents: 3999,
  monthlyUnits: 100,
  unitCostTotalCents: 1600,
  feePct: 0.05,
  adCostPerSaleCents: 400,
  fixedMonthlyCostsCents: 50000,
  returnRatePct: 0.05,
  discountPct: 0,
};

describe("calculateBreakEvenPlan", () => {
  it("returns break-even units and max safe ad spend when contribution is positive", () => {
    const result = calculateBreakEvenPlan(profitableInput);

    expect(result.breakEvenUnits).toBe(28);
    expect(result.maxSafeAdSpendCents).toBe(2199);
    expect(result.discountSafePriceCents).toBe(2870);
    expect(result.viability.risk).toBe("low");
    expect(result.warnings).toEqual([]);
  });

  it("returns null max safe ad spend when launch loses money before ads", () => {
    const result = calculateBreakEvenPlan({
      ...profitableInput,
      effectivePriceCents: 1500,
      unitCostTotalCents: 1800,
      adCostPerSaleCents: 0,
    });

    expect(result.breakEvenUnits).toBeNull();
    expect(result.maxSafeAdSpendCents).toBeNull();
    expect(result.viability.risk).toBe("high");
    expect(result.warnings).toContain("This launch loses money before advertising.");
  });

  it("marks negative net profit as high risk", () => {
    const result = calculateBreakEvenPlan({
      ...profitableInput,
      monthlyUnits: 5,
      fixedMonthlyCostsCents: 100000,
    });

    expect(result.viability.risk).toBe("high");
    expect(result.viability.headline).toContain("fragile");
  });

  it("stress tests return rate and discount by 10 points capped at 95 percent", () => {
    const result = calculateBreakEvenPlan({
      ...profitableInput,
      returnRatePct: 0.9,
      discountPct: 0.9,
    });

    expect(result.returnRateStress.testedReturnRatePct).toBe(0.95);
    expect(result.discountStress.testedDiscountPct).toBe(0.95);
  });
});
```

- [ ] **Step 2: Run break-even tests to verify they fail**

Run:

```powershell
npx vitest run src/lib/launchPlanner/calculateBreakEvenPlan.test.ts
```

Expected: FAIL because `./calculateBreakEvenPlan` does not exist.

- [ ] **Step 3: Implement break-even helper**

Create `src/lib/launchPlanner/calculateBreakEvenPlan.ts`:

```ts
export type LaunchRiskLevel = "low" | "medium" | "high";

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

export function calculateBreakEvenPlan(input: BreakEvenPlanInput): BreakEvenPlanResult {
  const normalized = normalizeInput(input);
  const contributionPerUnitCents = contributionFor({
    ...normalized,
    adCostPerSaleCents: normalized.adCostPerSaleCents,
  });
  const netProfitCents = contributionPerUnitCents * normalized.monthlyUnits - normalized.fixedMonthlyCostsCents;
  const revenueCents = Math.round(
    normalized.effectivePriceCents * normalized.monthlyUnits * (1 - normalized.returnRatePct)
  );
  const breakEvenUnits =
    contributionPerUnitCents <= 0 ? null : Math.ceil(normalized.fixedMonthlyCostsCents / contributionPerUnitCents);
  const maxSafeAdSpendCents = calculateMaxSafeAdSpend(normalized);
  const discountSafePriceCents = calculateDiscountSafePrice(normalized);
  const returnRateStress = stressReturnRate(normalized);
  const discountStress = stressDiscount(normalized);
  const risk = riskFor({ contributionPerUnitCents, netProfitCents, revenueCents });
  const warnings: string[] = [];

  if (maxSafeAdSpendCents === null) {
    warnings.push("This launch loses money before advertising.");
  }

  return {
    breakEvenUnits,
    maxSafeAdSpendCents,
    discountSafePriceCents,
    returnRateStress,
    discountStress,
    viability: viabilityFor(risk),
    warnings,
  };
}

function normalizeInput(input: BreakEvenPlanInput): BreakEvenPlanInput {
  return {
    recommendedPriceCents: clampMoney(input.recommendedPriceCents),
    minimumViablePriceCents: clampMoney(input.minimumViablePriceCents),
    effectivePriceCents: clampMoney(input.effectivePriceCents),
    monthlyUnits: Math.max(0, Math.floor(Number.isFinite(input.monthlyUnits) ? input.monthlyUnits : 0)),
    unitCostTotalCents: clampMoney(input.unitCostTotalCents),
    feePct: clampPct(input.feePct),
    adCostPerSaleCents: clampMoney(input.adCostPerSaleCents),
    fixedMonthlyCostsCents: clampMoney(input.fixedMonthlyCostsCents),
    returnRatePct: clampPct(input.returnRatePct),
    discountPct: clampPct(input.discountPct),
  };
}

function contributionFor(input: Pick<BreakEvenPlanInput, "effectivePriceCents" | "returnRatePct" | "unitCostTotalCents" | "feePct" | "adCostPerSaleCents">): number {
  const revenuePerOrderedUnitCents = input.effectivePriceCents * (1 - input.returnRatePct);
  const feeCents = Math.round(input.effectivePriceCents * input.feePct);
  return Math.round(revenuePerOrderedUnitCents - input.unitCostTotalCents - feeCents - input.adCostPerSaleCents);
}

function calculateMaxSafeAdSpend(input: BreakEvenPlanInput): number | null {
  const beforeAds = contributionFor({ ...input, adCostPerSaleCents: 0 });
  return beforeAds <= 0 ? null : beforeAds - 1;
}

function calculateDiscountSafePrice(input: BreakEvenPlanInput): number {
  const discountMultiplier = 1 - input.discountPct;
  if (discountMultiplier <= 0) return input.minimumViablePriceCents;
  return Math.ceil(input.minimumViablePriceCents / discountMultiplier);
}

function stressReturnRate(input: BreakEvenPlanInput): BreakEvenPlanResult["returnRateStress"] {
  const testedReturnRatePct = Math.min(0.95, input.returnRatePct + 0.1);
  const contribution = contributionFor({ ...input, returnRatePct: testedReturnRatePct });
  const netProfitCents = contribution * input.monthlyUnits - input.fixedMonthlyCostsCents;
  const revenueCents = Math.round(input.effectivePriceCents * input.monthlyUnits * (1 - testedReturnRatePct));
  return {
    testedReturnRatePct,
    netProfitCents,
    risk: riskFor({ contributionPerUnitCents: contribution, netProfitCents, revenueCents }),
  };
}

function stressDiscount(input: BreakEvenPlanInput): BreakEvenPlanResult["discountStress"] {
  const testedDiscountPct = Math.min(0.95, input.discountPct + 0.1);
  const effectivePriceCents = Math.round(input.recommendedPriceCents * (1 - testedDiscountPct));
  const contribution = contributionFor({ ...input, effectivePriceCents });
  const netProfitCents = contribution * input.monthlyUnits - input.fixedMonthlyCostsCents;
  const revenueCents = Math.round(effectivePriceCents * input.monthlyUnits * (1 - input.returnRatePct));
  return {
    testedDiscountPct,
    netProfitCents,
    risk: riskFor({ contributionPerUnitCents: contribution, netProfitCents, revenueCents }),
  };
}

function riskFor(input: {
  contributionPerUnitCents: number;
  netProfitCents: number;
  revenueCents: number;
}): LaunchRiskLevel {
  if (input.contributionPerUnitCents <= 0 || input.netProfitCents < 0) return "high";
  if (input.revenueCents <= 0) return "high";
  return input.netProfitCents / input.revenueCents < 0.15 ? "medium" : "low";
}

function viabilityFor(risk: LaunchRiskLevel): BreakEvenPlanResult["viability"] {
  if (risk === "low") {
    return {
      risk,
      headline: "This launch has room to absorb normal discounting and returns.",
      explanation: "The current assumptions leave enough contribution after product costs, fees, ads, and fixed costs.",
    };
  }

  if (risk === "medium") {
    return {
      risk,
      headline: "This launch can work, but the buffer is thin.",
      explanation: "Discounts, ad costs, or returns could quickly erase profit, so watch early performance closely.",
    };
  }

  return {
    risk,
    headline: "This launch is fragile.",
    explanation: "The current assumptions do not leave enough contribution per order or enough net profit.",
  };
}

function clampMoney(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value));
}

function clampPct(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(0.95, Math.max(0, value));
}
```

- [ ] **Step 4: Run break-even tests**

Run:

```powershell
npx vitest run src/lib/launchPlanner/calculateBreakEvenPlan.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit break-even helper**

Run:

```powershell
git add src/lib/launchPlanner/calculateBreakEvenPlan.ts src/lib/launchPlanner/calculateBreakEvenPlan.test.ts
git commit -m "feat: add launch break-even planning"
```

---

### Task 3: Price Explanation Helper

**Files:**
- Create: `src/lib/launchPlanner/explainLaunchPrice.ts`
- Create: `src/lib/launchPlanner/explainLaunchPrice.test.ts`

**Interfaces:**
- Consumes: `LaunchPositioning`, `LaunchMarketStats`, and `LaunchPlanConfidence` from `calculateLaunchPlan.ts`; `PriceReadinessMode` from `calculateReadiness.ts`.
- Produces:

```ts
export interface ExplainLaunchPriceInput {
  minimumViablePriceCents: number;
  recommendedPriceCents: number;
  positioning: LaunchPositioning;
  competitorPriceCount: number;
  marketStats: LaunchMarketStats | null;
  confidence: LaunchPlanConfidence;
  readinessMode: PriceReadinessMode;
}

export interface PriceExplanation {
  headline: string;
  bullets: string[];
}

export function explainLaunchPrice(input: ExplainLaunchPriceInput): PriceExplanation;
```

- Consumed by Task 4 in `src/components/LaunchPlanner.tsx`.

- [ ] **Step 1: Write failing explanation tests**

Create `src/lib/launchPlanner/explainLaunchPrice.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { explainLaunchPrice } from "./explainLaunchPrice";

describe("explainLaunchPrice", () => {
  it("mentions market references when competitor prices exist", () => {
    const result = explainLaunchPrice({
      minimumViablePriceCents: 2870,
      recommendedPriceCents: 3999,
      positioning: "mid-market",
      competitorPriceCount: 4,
      marketStats: {
        minCents: 2900,
        maxCents: 4900,
        medianCents: 3900,
        q1Cents: 3400,
        q3Cents: 4400,
      },
      confidence: "medium",
      readinessMode: "launch",
    });

    expect(result.headline).toContain("$39.99");
    expect(result.headline).toContain("mid-market");
    expect(result.bullets).toContain("Your minimum viable price is $28.70 after product cost, fulfillment, and fees.");
    expect(result.bullets).toContain("You supplied 4 competitor prices, giving this launch a medium-confidence market reference.");
    expect(result.bullets.join(" ")).toContain("market median");
  });

  it("asks for competitor prices when none exist", () => {
    const result = explainLaunchPrice({
      minimumViablePriceCents: 2870,
      recommendedPriceCents: 3599,
      positioning: "premium",
      competitorPriceCount: 0,
      marketStats: null,
      confidence: "low",
      readinessMode: "launch",
    });

    expect(result.headline).toContain("no market references");
    expect(result.bullets).toContain("Add competitor prices to improve confidence before committing inventory or ad spend.");
  });

  it("mentions historical optimization when readiness mode is optimization", () => {
    const result = explainLaunchPrice({
      minimumViablePriceCents: 2870,
      recommendedPriceCents: 3999,
      positioning: "mid-market",
      competitorPriceCount: 3,
      marketStats: {
        minCents: 2900,
        maxCents: 4900,
        medianCents: 3900,
        q1Cents: 3400,
        q3Cents: 4400,
      },
      confidence: "medium",
      readinessMode: "optimization",
    });

    expect(result.bullets).toContain("This product has enough sales history for demand-aware recommendations, so treat Launch Planner as a margin guardrail.");
  });
});
```

- [ ] **Step 2: Run explanation tests to verify they fail**

Run:

```powershell
npx vitest run src/lib/launchPlanner/explainLaunchPrice.test.ts
```

Expected: FAIL because `./explainLaunchPrice` does not exist.

- [ ] **Step 3: Implement explanation helper**

Create `src/lib/launchPlanner/explainLaunchPrice.ts`:

```ts
import type {
  LaunchMarketStats,
  LaunchPlanConfidence,
  LaunchPositioning,
} from "./calculateLaunchPlan";
import type { PriceReadinessMode } from "./calculateReadiness";

export interface ExplainLaunchPriceInput {
  minimumViablePriceCents: number;
  recommendedPriceCents: number;
  positioning: LaunchPositioning;
  competitorPriceCount: number;
  marketStats: LaunchMarketStats | null;
  confidence: LaunchPlanConfidence;
  readinessMode: PriceReadinessMode;
}

export interface PriceExplanation {
  headline: string;
  bullets: string[];
}

export function explainLaunchPrice(input: ExplainLaunchPriceInput): PriceExplanation {
  const positioningLabel = input.positioning === "mid-market" ? "mid-market" : input.positioning;

  if (input.marketStats) {
    return {
      headline: `Zorin is anchoring this launch at ${formatCents(input.recommendedPriceCents)} because it clears your margin floor and sits near the ${positioningLabel} reference.`,
      bullets: [
        `Your minimum viable price is ${formatCents(input.minimumViablePriceCents)} after product cost, fulfillment, and fees.`,
        `You supplied ${input.competitorPriceCount} competitor prices, giving this launch a ${input.confidence}-confidence market reference.`,
        marketPositioningBullet(input.positioning),
        readinessBullet(input.readinessMode),
      ].slice(0, 4),
    };
  }

  return {
    headline: `Zorin is using your costs and target margin because this product has no market references yet.`,
    bullets: [
      `Your minimum viable price is ${formatCents(input.minimumViablePriceCents)}.`,
      `The recommendation adds a launch markup for ${positioningLabel} positioning.`,
      "Add competitor prices to improve confidence before committing inventory or ad spend.",
      readinessBullet(input.readinessMode),
    ].slice(0, 4),
  };
}

function marketPositioningBullet(positioning: LaunchPositioning): string {
  if (positioning === "budget") {
    return "Budget positioning keeps the recommendation between the low market reference and the market median.";
  }

  if (positioning === "premium") {
    return "Premium positioning keeps the recommendation above the market median without ignoring the upper reference.";
  }

  return "Mid-market positioning keeps the recommendation near the market median instead of chasing the lowest price.";
}

function readinessBullet(mode: PriceReadinessMode): string {
  if (mode === "optimization") {
    return "This product has enough sales history for demand-aware recommendations, so treat Launch Planner as a margin guardrail.";
  }

  if (mode === "learning") {
    return "This product has early sales evidence, so keep checking launch assumptions against real demand.";
  }

  return "This product is still in Launch Mode, so the recommendation is based on assumptions rather than proven demand.";
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
```

- [ ] **Step 4: Run explanation tests**

Run:

```powershell
npx vitest run src/lib/launchPlanner/explainLaunchPrice.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit explanation helper**

Run:

```powershell
git add src/lib/launchPlanner/explainLaunchPrice.ts src/lib/launchPlanner/explainLaunchPrice.test.ts
git commit -m "feat: explain launch price recommendation"
```

---

### Task 4: Launch Planner UI Integration

**Files:**
- Modify: `src/components/LaunchPlanner.tsx`
- Modify: `src/components/LaunchPlanner.test.tsx`

**Interfaces:**
- Consumes:
  - `calculateReadiness(input: PriceReadinessInput): PriceReadinessResult`
  - `calculateBreakEvenPlan(input: BreakEvenPlanInput): BreakEvenPlanResult`
  - `explainLaunchPrice(input: ExplainLaunchPriceInput): PriceExplanation`
  - existing `calculateLaunchPlan(input)`
  - existing `simulateLaunchScenario(input)`
- Produces:
  - Launch Readiness panel
  - Why This Price explanation block
  - Break-Even Plan cards
  - local saved scenario table with up to 3 rows

- [ ] **Step 1: Write failing UI tests**

Modify `src/components/LaunchPlanner.test.tsx` to include these tests while preserving existing tests:

```ts
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { LaunchPlanner } from "./LaunchPlanner";

describe("LaunchPlanner readiness and break-even additions", () => {
  it("renders Launch Readiness in Launch Mode by default", () => {
    render(<LaunchPlanner />);

    expect(screen.getByRole("heading", { name: "Launch Readiness" })).toBeInTheDocument();
    expect(screen.getByText("Launch Mode")).toBeInTheDocument();
    expect(screen.getByText(/does not have enough sales history/i)).toBeInTheDocument();
  });

  it("changes readiness to Optimization Mode at 30 sales data points", async () => {
    const user = userEvent.setup();
    render(<LaunchPlanner />);

    const salesInput = screen.getByLabelText("Sales data points");
    await user.clear(salesInput);
    await user.type(salesInput, "30");

    expect(screen.getByText("Optimization Mode")).toBeInTheDocument();
    expect(screen.getByText(/demand-aware price optimization/i)).toBeInTheDocument();
  });

  it("updates Why this price copy when competitor prices are added", async () => {
    const user = userEvent.setup();
    render(<LaunchPlanner />);

    expect(screen.getByRole("heading", { name: "Why this price?" })).toBeInTheDocument();
    expect(screen.getByText(/no market references/i)).toBeInTheDocument();

    await user.type(screen.getByLabelText("Competitor prices"), "29, 35, 39, 42");

    expect(screen.getByText(/competitor prices/i)).toBeInTheDocument();
    expect(screen.getByText(/market median/i)).toBeInTheDocument();
  });

  it("saves and removes a scenario in the comparison table", async () => {
    const user = userEvent.setup();
    render(<LaunchPlanner />);

    expect(screen.getByText("Save a scenario to compare launch assumptions.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Save Scenario" }));

    const table = screen.getByRole("table", { name: "Saved launch scenarios" });
    expect(within(table).getByText("Conservative launch")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Remove Conservative launch" }));
    expect(screen.getByText("Save a scenario to compare launch assumptions.")).toBeInTheDocument();
  });

  it("limits saved scenarios to three", async () => {
    const user = userEvent.setup();
    render(<LaunchPlanner />);

    await user.click(screen.getByRole("button", { name: "Save Scenario" }));
    await user.click(screen.getByRole("button", { name: "Save Scenario" }));
    await user.click(screen.getByRole("button", { name: "Save Scenario" }));
    await user.click(screen.getByRole("button", { name: "Save Scenario" }));

    expect(screen.getByText("Compare up to 3 scenarios at a time. Remove one to save another.")).toBeInTheDocument();
    expect(screen.getAllByRole("row")).toHaveLength(4);
  });

  it("shows non-misleading labels for a losing scenario", async () => {
    const user = userEvent.setup();
    render(<LaunchPlanner />);

    await user.clear(screen.getByLabelText("Scenario price"));
    await user.type(screen.getByLabelText("Scenario price"), "1");

    expect(screen.getByText("Not reachable")).toBeInTheDocument();
    expect(screen.getByText("No paid ads room")).toBeInTheDocument();
  });
});
```

If the file already has imports and a `describe("LaunchPlanner", ...)` block, merge these tests into the existing structure instead of duplicating imports.

- [ ] **Step 2: Run UI tests to verify they fail**

Run:

```powershell
npx vitest run src/components/LaunchPlanner.test.tsx
```

Expected: FAIL because the new headings, fields, helpers, and controls are not wired into the component yet.

- [ ] **Step 3: Import new helpers and add local state**

Modify the imports and state setup in `src/components/LaunchPlanner.tsx`:

```ts
import { calculateBreakEvenPlan, type LaunchRiskLevel } from "@/lib/launchPlanner/calculateBreakEvenPlan";
import { calculateReadiness } from "@/lib/launchPlanner/calculateReadiness";
import { explainLaunchPrice } from "@/lib/launchPlanner/explainLaunchPrice";
```

Add below the existing helper functions:

```ts
interface SavedLaunchScenario {
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

const DEFAULT_SCENARIO_NAMES = ["Conservative launch", "Base launch", "Aggressive launch"];

function integerValue(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(999, Math.max(0, Math.floor(parsed))) : 0;
}

function riskClassName(risk: LaunchRiskLevel): string {
  if (risk === "low") return "text-success";
  if (risk === "medium") return "text-warning";
  return "text-danger";
}
```

Inside `LaunchPlanner()`, add:

```ts
const [salesDataPoints, setSalesDataPoints] = useState("0");
const [savedScenarios, setSavedScenarios] = useState<SavedLaunchScenario[]>([]);
const [scenarioLimitMessage, setScenarioLimitMessage] = useState("");
```

- [ ] **Step 4: Calculate readiness, explanation, and break-even plan**

Inside `LaunchPlanner()`, after `plan`, `activePriceCents`, and `scenario` are calculated, add:

```ts
const unitCostTotalCents =
  currencyToCents(unitCost) +
  currencyToCents(shipping) +
  currencyToCents(packaging) +
  currencyToCents(otherCosts);

const readiness = calculateReadiness({
  salesDataPoints: integerValue(salesDataPoints),
  competitorPriceCount: competitorPricesCents.length,
  hasUnitCost: currencyToCents(unitCost) > 0,
  hasTargetMargin: percentToRatio(requiredMargin) > 0,
});

const explanation =
  plan.ok
    ? explainLaunchPrice({
        minimumViablePriceCents: plan.minimumViablePriceCents,
        recommendedPriceCents: plan.recommendedPriceCents,
        positioning,
        competitorPriceCount: competitorPricesCents.length,
        marketStats: plan.marketStats,
        confidence: plan.confidence,
        readinessMode: readiness.mode,
      })
    : null;

const breakEvenPlan =
  plan.ok
    ? calculateBreakEvenPlan({
        recommendedPriceCents: plan.recommendedPriceCents,
        minimumViablePriceCents: plan.minimumViablePriceCents,
        effectivePriceCents: scenario.effectivePriceCents,
        monthlyUnits: numericValue(monthlyUnits),
        unitCostTotalCents,
        feePct: plan.feePct,
        adCostPerSaleCents: currencyToCents(adCost),
        fixedMonthlyCostsCents: currencyToCents(fixedCosts),
        returnRatePct: percentToRatio(returnRate),
        discountPct: percentToRatio(discount),
      })
    : null;
```

Add an event handler:

```ts
function saveScenario() {
  if (!breakEvenPlan) return;

  if (savedScenarios.length >= 3) {
    setScenarioLimitMessage("Compare up to 3 scenarios at a time. Remove one to save another.");
    return;
  }

  const name = DEFAULT_SCENARIO_NAMES[savedScenarios.length] ?? `Scenario ${savedScenarios.length + 1}`;
  setSavedScenarios((current) => [
    ...current,
    {
      id: `${Date.now()}-${current.length}`,
      name,
      priceCents: activePriceCents,
      monthlyUnits: numericValue(monthlyUnits),
      discountPct: percentToRatio(discount),
      returnRatePct: percentToRatio(returnRate),
      adCostPerSaleCents: currencyToCents(adCost),
      fixedMonthlyCostsCents: currencyToCents(fixedCosts),
      netProfitCents: scenario.netProfitCents,
      breakEvenUnits: breakEvenPlan.breakEvenUnits,
      risk: breakEvenPlan.viability.risk,
    },
  ]);
  setScenarioLimitMessage("");
}

function removeScenario(id: string) {
  setSavedScenarios((current) => current.filter((scenario) => scenario.id !== id));
  setScenarioLimitMessage("");
}
```

- [ ] **Step 5: Add Launch Readiness and Why This Price UI**

In the right-column recommendation section, after `<h1 className="text-xl font-semibold text-ink">Launch Planner</h1>`, add:

```tsx
<div className="mt-4 rounded-lg border border-line bg-panel p-3">
  <div className="flex items-start justify-between gap-3">
    <div>
      <h2 className="text-sm font-semibold text-ink">Launch Readiness</h2>
      <p className="mt-1 text-xs text-muted">{readiness.summary}</p>
    </div>
    <div className="text-right">
      <p className="text-lg font-semibold tabular text-ink">{readiness.score}</p>
      <p className="text-xs text-muted">score</p>
    </div>
  </div>
  <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
    <p className="rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent">{readiness.label}</p>
    <Field label="Sales data points" value={salesDataPoints} onChange={setSalesDataPoints} />
  </div>
  <p className="mt-3 text-xs leading-relaxed text-muted">{readiness.nextStep}</p>
</div>
```

Inside the `plan.ok` branch, directly below the recommended launch price, replace the existing single explanation paragraph with:

```tsx
{explanation ? (
  <div className="mt-3 rounded-lg border border-line bg-panel p-3">
    <h2 className="text-sm font-semibold text-ink">Why this price?</h2>
    <p className="mt-2 text-sm leading-relaxed text-muted">{explanation.headline}</p>
    <ul className="mt-2 space-y-1 text-xs leading-relaxed text-muted">
      {explanation.bullets.map((bullet) => (
        <li key={bullet}>{bullet}</li>
      ))}
    </ul>
  </div>
) : null}
```

- [ ] **Step 6: Add Break-Even Plan and Saved Scenarios UI**

In the scenario simulator section, after the existing scenario stat grid, add:

```tsx
{breakEvenPlan ? (
  <div className="mt-5 rounded-lg border border-line bg-panel p-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-sm font-semibold text-ink">Break-Even Plan</h2>
        <p className="mt-1 text-xs leading-relaxed text-muted">{breakEvenPlan.viability.explanation}</p>
      </div>
      <p className={`text-xs font-semibold uppercase ${riskClassName(breakEvenPlan.viability.risk)}`}>
        {breakEvenPlan.viability.risk} risk
      </p>
    </div>
    <p className="mt-3 text-sm font-medium text-ink">{breakEvenPlan.viability.headline}</p>
    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <Stat
        label="Break-even units"
        value={breakEvenPlan.breakEvenUnits === null ? "Not reachable" : String(breakEvenPlan.breakEvenUnits)}
      />
      <Stat
        label="Max safe ad spend"
        value={breakEvenPlan.maxSafeAdSpendCents === null ? "No paid ads room" : formatCents(breakEvenPlan.maxSafeAdSpendCents)}
      />
      <Stat label="Discount-safe price" value={formatCents(breakEvenPlan.discountSafePriceCents)} />
      <Stat
        label="Return stress"
        value={`${pct(breakEvenPlan.returnRateStress.testedReturnRatePct)} / ${formatCents(breakEvenPlan.returnRateStress.netProfitCents)}`}
      />
      <Stat
        label="Discount stress"
        value={`${pct(breakEvenPlan.discountStress.testedDiscountPct)} / ${formatCents(breakEvenPlan.discountStress.netProfitCents)}`}
      />
    </div>
  </div>
) : null}

<div className="mt-5 rounded-lg border border-line bg-panel p-4">
  <div className="flex flex-wrap items-center justify-between gap-3">
    <div>
      <h2 className="text-sm font-semibold text-ink">Saved Scenarios</h2>
      <p className="mt-1 text-xs text-muted">Compare up to three launch assumptions locally.</p>
    </div>
    <button type="button" onClick={saveScenario} className="btn-primary text-sm">
      Save Scenario
    </button>
  </div>
  {scenarioLimitMessage ? <p className="mt-3 text-sm text-danger">{scenarioLimitMessage}</p> : null}
  {savedScenarios.length === 0 ? (
    <p className="mt-4 text-sm text-muted">Save a scenario to compare launch assumptions.</p>
  ) : (
    <div className="mt-4 overflow-x-auto">
      <table aria-label="Saved launch scenarios" className="w-full min-w-[760px] text-left text-sm">
        <thead className="text-xs uppercase text-muted">
          <tr>
            <th className="py-2 pr-3 font-medium">Scenario</th>
            <th className="py-2 pr-3 font-medium">Price</th>
            <th className="py-2 pr-3 font-medium">Units</th>
            <th className="py-2 pr-3 font-medium">Discount</th>
            <th className="py-2 pr-3 font-medium">Return rate</th>
            <th className="py-2 pr-3 font-medium">Net profit</th>
            <th className="py-2 pr-3 font-medium">Break-even</th>
            <th className="py-2 pr-3 font-medium">Risk</th>
            <th className="py-2 font-medium">Action</th>
          </tr>
        </thead>
        <tbody>
          {savedScenarios.map((saved) => (
            <tr key={saved.id} className="border-t border-line">
              <td className="py-2 pr-3 font-medium text-ink">{saved.name}</td>
              <td className="py-2 pr-3 tabular text-muted">{formatCents(saved.priceCents)}</td>
              <td className="py-2 pr-3 tabular text-muted">{saved.monthlyUnits}</td>
              <td className="py-2 pr-3 tabular text-muted">{pct(saved.discountPct)}</td>
              <td className="py-2 pr-3 tabular text-muted">{pct(saved.returnRatePct)}</td>
              <td className="py-2 pr-3 tabular text-muted">{formatCents(saved.netProfitCents)}</td>
              <td className="py-2 pr-3 tabular text-muted">
                {saved.breakEvenUnits === null ? "Not reachable" : saved.breakEvenUnits}
              </td>
              <td className={`py-2 pr-3 font-medium capitalize ${riskClassName(saved.risk)}`}>{saved.risk}</td>
              <td className="py-2">
                <button
                  type="button"
                  onClick={() => removeScenario(saved.id)}
                  className="text-xs font-medium text-danger"
                  aria-label={`Remove ${saved.name}`}
                >
                  Remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )}
</div>
```

- [ ] **Step 7: Run UI tests**

Run:

```powershell
npx vitest run src/components/LaunchPlanner.test.tsx
```

Expected: PASS.

- [ ] **Step 8: Run all launch planner tests**

Run:

```powershell
npx vitest run src/lib/launchPlanner/calculateLaunchPlan.test.ts src/lib/launchPlanner/simulateLaunchScenario.test.ts src/lib/launchPlanner/calculateReadiness.test.ts src/lib/launchPlanner/calculateBreakEvenPlan.test.ts src/lib/launchPlanner/explainLaunchPrice.test.ts src/components/LaunchPlanner.test.tsx
```

Expected: PASS.

- [ ] **Step 9: Commit UI integration**

Run:

```powershell
git add src/components/LaunchPlanner.tsx src/components/LaunchPlanner.test.tsx
git commit -m "feat: enhance launch planner decision workflow"
```

---

### Task 5: Final Verification and Handover Update

**Files:**
- Modify: `C:\Users\pohde\Notes\Zorin Launch Planner Handover.md`

**Interfaces:**
- Consumes all previous task outputs.
- Produces an updated Obsidian handover note with the new readiness and break-even feature state.

- [ ] **Step 1: Run full tests**

Run:

```powershell
npm test
```

Expected: all Vitest tests pass.

- [ ] **Step 2: Run production build**

Run:

```powershell
npm run build
```

Expected: build completes successfully and route list still includes `/launch-planner`.

- [ ] **Step 3: Confirm no migration was created**

Run:

```powershell
git status --short prisma\\migrations
```

Expected: no output.

- [ ] **Step 4: Update the Obsidian handover**

Append this section to `C:\Users\pohde\Notes\Zorin Launch Planner Handover.md`:

```md
## Launch Readiness and Break-Even Upgrade

Added after the original Launch Planner:

- Price Readiness Score with Launch, Learning, and Optimization modes.
- Break-Even Plan with break-even units, max safe ad spend, discount-safe price, return stress, discount stress, and launch viability.
- Deterministic "Why this price?" explanation.
- Local saved scenario comparison for up to three scenarios.

Verification:

- `npm test`: replace this sentence with the exact final pass count, for example `48 files passed, 304 tests passed`.
- `npm run build`: replace this sentence with `Passed` only after the command exits successfully.

No database migration was created. Saved scenarios remain local UI state only.
```

- [ ] **Step 5: Report handover update state**

Run:

```powershell
git status --short
```

Expected: repo status is understandable and any remaining uncommitted files are either pre-existing local work or intentionally reported. The Obsidian note lives outside the repository, so do not try to commit it from the Zorin repo.

---

## Final Verification

After all tasks are complete, run:

```powershell
npm test
npm run build
git status --short
```

Expected:

- All tests pass.
- Build passes.
- No new Prisma migration exists.
- Remaining uncommitted files are either pre-existing local work or intentionally reported.

## Self-Review

- Spec coverage: Task 1 covers readiness, Task 2 covers break-even plan, Task 3 covers deterministic explanation, Task 4 covers UI and scenario comparison, Task 5 covers rollout criteria and handover.
- Placeholder scan: no `TBD`, `TODO`, or vague implementation-only instructions remain.
- Type consistency: helper names and exported interfaces match the approved spec and the Task 4 imports.
