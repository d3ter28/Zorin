# Launch Planner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:subagent-driven-development (recommended) or superpowers-extended-cc:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a stateless authenticated Launch Planner that helps new merchants calculate a launch price and simulate launch economics without historical sales data.

**Architecture:** Add pure launch-planning math under `src/lib/launchPlanner/`, then render it through a new client component on an authenticated `/launch-planner` page. Navigation is added through the existing `Sidebar`; no database schema or API route changes are needed.

**Tech Stack:** Next.js 16 App Router, React client components, TypeScript, Vitest unit + jsdom projects, Tailwind v4 design tokens, existing `formatCents` and `dollarsToCents` money utilities.

**User decisions (already made):**
- Build both the Launch Price Calculator and Scenario Simulator now.
- Use superpower skills to create a design spec and implementation plan before executing code.
- Version 1 should support new merchants without historical product data.

---

## File Map

| File | Responsibility |
|---|---|
| `src/lib/launchPlanner/calculateLaunchPlan.ts` | Pure launch price calculator: margin floor, market target, rounding, confidence, warnings |
| `src/lib/launchPlanner/calculateLaunchPlan.test.ts` | Unit tests for launch price calculation behavior |
| `src/lib/launchPlanner/simulateLaunchScenario.ts` | Pure scenario simulator: revenue, profit, contribution, break-even units |
| `src/lib/launchPlanner/simulateLaunchScenario.test.ts` | Unit tests for launch scenario behavior |
| `src/components/LaunchPlanner.tsx` | Client UI for calculator inputs, recommendation summary, and scenario simulator |
| `src/components/LaunchPlanner.test.tsx` | jsdom tests for interactive Launch Planner behavior |
| `src/app/launch-planner/page.tsx` | Authenticated server page that wraps `LaunchPlanner` in `AppShell` |
| `src/components/Sidebar.tsx` | Add Launch Planner nav item and active-route matching |

---

### Task 1: Implement Pure Launch Price Calculator

**Goal:** Create a tested pure function that turns costs, fees, target margin, positioning, and optional competitor prices into a launch price recommendation.

**Files:**
- Create: `src/lib/launchPlanner/calculateLaunchPlan.ts`
- Create: `src/lib/launchPlanner/calculateLaunchPlan.test.ts`

**Acceptance Criteria:**
- [ ] `calculateLaunchPlan` returns an error when `requiredMarginPct + paymentFeePct + platformFeePct >= 0.95`.
- [ ] Cost-only inputs produce a rounded recommended price above the minimum viable price.
- [ ] Competitor-price inputs use budget/mid-market/premium positioning and never recommend below the margin floor.
- [ ] `.99` rounding never rounds below the minimum viable price.
- [ ] Output includes minimum viable price, recommended price, stretch price, discount floor, gross margin, confidence, warnings, and explanation.

**Verify:** `npx vitest run src/lib/launchPlanner/calculateLaunchPlan.test.ts` -> expected 5 passed

**Steps:**

- [ ] **Step 1: Write failing tests**

Create `src/lib/launchPlanner/calculateLaunchPlan.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { calculateLaunchPlan } from "./calculateLaunchPlan";

const baseInput = {
  unitCostCents: 1200,
  shippingCents: 300,
  packagingCents: 100,
  otherUnitCostsCents: 0,
  paymentFeePct: 0.03,
  platformFeePct: 0.02,
  requiredMarginPct: 0.35,
  positioning: "mid-market" as const,
  competitorPricesCents: [],
  roundingMode: "ninety-nine" as const,
};

describe("calculateLaunchPlan", () => {
  it("rejects margin and fee combinations that leave too little pricing room", () => {
    const result = calculateLaunchPlan({
      ...baseInput,
      requiredMarginPct: 0.8,
      paymentFeePct: 0.1,
      platformFeePct: 0.05,
    });

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/margin and fee/i);
  });

  it("uses cost-only positioning markup when no competitor prices are supplied", () => {
    const result = calculateLaunchPlan(baseInput);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.minimumViablePriceCents).toBe(2667);
    expect(result.recommendedPriceCents).toBe(3399);
    expect(result.confidence).toBe("low");
    expect(result.marketStats).toBeNull();
  });

  it("uses the market median for mid-market positioning and respects the floor", () => {
    const result = calculateLaunchPlan({
      ...baseInput,
      competitorPricesCents: [2900, 3500, 3900, 4200, 4900],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.marketStats?.medianCents).toBe(3900);
    expect(result.recommendedPriceCents).toBe(3999);
    expect(result.confidence).toBe("medium");
  });

  it("lifts a market target up when competitor prices sit below the margin floor", () => {
    const result = calculateLaunchPlan({
      ...baseInput,
      competitorPricesCents: [1900, 2100, 2300],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.recommendedPriceCents).toBeGreaterThanOrEqual(result.minimumViablePriceCents);
    expect(result.warnings.join(" ")).toMatch(/market/i);
  });

  it("returns stretch and discount-safe prices above the recommended and floor anchors", () => {
    const result = calculateLaunchPlan(baseInput);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.stretchPriceCents).toBeGreaterThan(result.recommendedPriceCents);
    expect(Math.round(result.discountFloorPriceCents * 0.85)).toBeGreaterThanOrEqual(result.minimumViablePriceCents);
    expect(result.explanation.length).toBeGreaterThan(20);
  });
});
```

- [ ] **Step 2: Run tests to confirm RED**

```bash
npx vitest run src/lib/launchPlanner/calculateLaunchPlan.test.ts
```

Expected: fails because `src/lib/launchPlanner/calculateLaunchPlan.ts` does not exist.

- [ ] **Step 3: Implement calculator**

Create `src/lib/launchPlanner/calculateLaunchPlan.ts`:

```ts
export type Positioning = "budget" | "mid-market" | "premium";
export type RoundingMode = "whole" | "ninety-nine";

export interface LaunchPlanInput {
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

export interface MarketStats {
  lowCents: number;
  medianCents: number;
  highCents: number;
  count: number;
}

export type LaunchPlanResult =
  | {
      ok: true;
      minimumViablePriceCents: number;
      recommendedPriceCents: number;
      stretchPriceCents: number;
      discountFloorPriceCents: number;
      grossMarginPct: number;
      feePct: number;
      marketStats: MarketStats | null;
      confidence: "low" | "medium";
      warnings: string[];
      explanation: string;
    }
  | { ok: false; error: string };

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 1) return sorted[0];
  const index = (sorted.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return Math.round(sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower));
}

function roundWhole(cents: number): number {
  return Math.ceil(cents / 100) * 100;
}

function roundNinetyNine(cents: number): number {
  const dollars = Math.ceil(cents / 100);
  return Math.max(99, dollars * 100 - 1);
}

function roundRetail(cents: number, mode: RoundingMode, floorCents: number): number {
  let rounded = mode === "whole" ? roundWhole(cents) : roundNinetyNine(cents);
  while (rounded < floorCents) {
    rounded = mode === "whole" ? rounded + 100 : rounded + 100;
  }
  return rounded;
}

export function calculateLaunchPlan(input: LaunchPlanInput): LaunchPlanResult {
  const unitCostTotal =
    input.unitCostCents + input.shippingCents + input.packagingCents + input.otherUnitCostsCents;
  const feePct = input.paymentFeePct + input.platformFeePct;
  const denominator = 1 - input.requiredMarginPct - feePct;
  if (denominator <= 0.05) {
    return { ok: false, error: "Required margin and fee percentages leave too little room to price this product." };
  }

  const minimumViablePriceCents = Math.ceil(unitCostTotal / denominator);
  const competitorPrices = input.competitorPricesCents
    .filter((price) => Number.isFinite(price) && price > 0)
    .sort((a, b) => a - b);

  const marketStats =
    competitorPrices.length > 0
      ? {
          lowCents: percentile(competitorPrices, 0.25),
          medianCents: percentile(competitorPrices, 0.5),
          highCents: percentile(competitorPrices, 0.75),
          count: competitorPrices.length,
        }
      : null;

  const fallbackMarkup = input.positioning === "budget" ? 1.1 : input.positioning === "premium" ? 1.45 : 1.25;
  const positioningTarget = marketStats
    ? input.positioning === "budget"
      ? Math.round((marketStats.lowCents + marketStats.medianCents) / 2)
      : input.positioning === "premium"
        ? Math.round((marketStats.medianCents + marketStats.highCents) / 2)
        : marketStats.medianCents
    : Math.round(minimumViablePriceCents * fallbackMarkup);

  const rawRecommended = Math.max(minimumViablePriceCents, positioningTarget);
  const recommendedPriceCents = roundRetail(rawRecommended, input.roundingMode, minimumViablePriceCents);
  const stretchAnchor = marketStats
    ? Math.max(Math.round(recommendedPriceCents * 1.12), marketStats.highCents)
    : Math.round(recommendedPriceCents * 1.15);
  const stretchPriceCents = roundRetail(stretchAnchor, input.roundingMode, recommendedPriceCents + 1);
  const discountFloorPriceCents = roundRetail(Math.ceil(minimumViablePriceCents / 0.85), input.roundingMode, minimumViablePriceCents);
  const grossMarginPct = (recommendedPriceCents - unitCostTotal - recommendedPriceCents * feePct) / recommendedPriceCents;
  const warnings: string[] = [];

  if (marketStats && positioningTarget < minimumViablePriceCents) {
    warnings.push("Market references are below your margin floor, so the recommendation was lifted to protect profit.");
  }
  if (marketStats && recommendedPriceCents > marketStats.highCents) {
    warnings.push("The recommended price is above your upper market reference.");
  }

  return {
    ok: true,
    minimumViablePriceCents,
    recommendedPriceCents,
    stretchPriceCents,
    discountFloorPriceCents,
    grossMarginPct,
    feePct,
    marketStats,
    confidence: competitorPrices.length >= 3 ? "medium" : "low",
    warnings,
    explanation: `Recommended launch price balances your margin floor with ${marketStats ? `${input.positioning} market positioning` : `${input.positioning} cost-based positioning`}.`,
  };
}
```

- [ ] **Step 4: Run unit tests to confirm GREEN**

```bash
npx vitest run src/lib/launchPlanner/calculateLaunchPlan.test.ts
```

Expected: 5 passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/launchPlanner/calculateLaunchPlan.ts src/lib/launchPlanner/calculateLaunchPlan.test.ts
git commit -m "feat: add launch price calculator logic"
```

---

### Task 2: Implement Pure Scenario Simulator

**Goal:** Create a tested pure function that simulates monthly launch economics from price, volume, costs, ads, fees, returns, and fixed costs.

**Files:**
- Create: `src/lib/launchPlanner/simulateLaunchScenario.ts`
- Create: `src/lib/launchPlanner/simulateLaunchScenario.test.ts`

**Acceptance Criteria:**
- [ ] Simulator returns effective price after discount.
- [ ] Simulator returns revenue, gross profit, net profit, contribution per unit, margin, and break-even units.
- [ ] Return rate reduces kept revenue units.
- [ ] Fixed monthly costs reduce net profit but not gross profit.
- [ ] `breakEvenUnits` is `null` when contribution per unit is zero or negative.

**Verify:** `npx vitest run src/lib/launchPlanner/simulateLaunchScenario.test.ts` -> expected 3 passed

**Steps:**

- [ ] **Step 1: Write failing tests**

Create `src/lib/launchPlanner/simulateLaunchScenario.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { simulateLaunchScenario } from "./simulateLaunchScenario";

const baseInput = {
  priceCents: 4000,
  monthlyUnits: 100,
  unitCostCents: 1200,
  shippingCents: 300,
  packagingCents: 100,
  otherUnitCostsCents: 0,
  paymentFeePct: 0.03,
  platformFeePct: 0.02,
  adCostPerSaleCents: 400,
  fixedMonthlyCostsCents: 50000,
  returnRatePct: 0,
  discountPct: 0,
};

describe("simulateLaunchScenario", () => {
  it("calculates monthly launch economics without returns or discount", () => {
    const result = simulateLaunchScenario(baseInput);

    expect(result.effectivePriceCents).toBe(4000);
    expect(result.revenueCents).toBe(400000);
    expect(result.contributionPerUnitCents).toBe(1800);
    expect(result.grossProfitCents).toBe(180000);
    expect(result.netProfitCents).toBe(130000);
    expect(result.breakEvenUnits).toBe(28);
    expect(result.marginPct).toBe(0.45);
  });

  it("reduces revenue for returns and price for discounts", () => {
    const result = simulateLaunchScenario({
      ...baseInput,
      discountPct: 0.1,
      returnRatePct: 0.2,
    });

    expect(result.effectivePriceCents).toBe(3600);
    expect(result.revenueCents).toBe(288000);
    expect(result.netProfitCents).toBeLessThan(130000);
  });

  it("reports no break-even point when each sale loses money", () => {
    const result = simulateLaunchScenario({
      ...baseInput,
      priceCents: 1800,
      adCostPerSaleCents: 1000,
    });

    expect(result.contributionPerUnitCents).toBeLessThanOrEqual(0);
    expect(result.breakEvenUnits).toBeNull();
    expect(result.warnings.join(" ")).toMatch(/loses money/i);
  });
});
```

- [ ] **Step 2: Run tests to confirm RED**

```bash
npx vitest run src/lib/launchPlanner/simulateLaunchScenario.test.ts
```

Expected: fails because `src/lib/launchPlanner/simulateLaunchScenario.ts` does not exist.

- [ ] **Step 3: Implement simulator**

Create `src/lib/launchPlanner/simulateLaunchScenario.ts`:

```ts
export interface LaunchScenarioInput {
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

export interface LaunchScenarioResult {
  effectivePriceCents: number;
  revenueCents: number;
  grossProfitCents: number;
  netProfitCents: number;
  contributionPerUnitCents: number;
  breakEvenUnits: number | null;
  marginPct: number | null;
  warnings: string[];
}

export function simulateLaunchScenario(input: LaunchScenarioInput): LaunchScenarioResult {
  const feePct = input.paymentFeePct + input.platformFeePct;
  const unitCostTotal =
    input.unitCostCents + input.shippingCents + input.packagingCents + input.otherUnitCostsCents;
  const effectivePriceCents = Math.round(input.priceCents * (1 - input.discountPct));
  const keptUnits = input.monthlyUnits * (1 - input.returnRatePct);
  const revenueCents = Math.round(effectivePriceCents * keptUnits);
  const perUnitFees = effectivePriceCents * feePct;
  const contributionPerUnitCents = Math.round(
    effectivePriceCents - unitCostTotal - input.adCostPerSaleCents - perUnitFees
  );
  const variableCostCents = Math.round(
    (unitCostTotal + input.adCostPerSaleCents + perUnitFees) * input.monthlyUnits
  );
  const grossProfitCents = revenueCents - variableCostCents;
  const netProfitCents = grossProfitCents - input.fixedMonthlyCostsCents;
  const breakEvenUnits =
    contributionPerUnitCents > 0
      ? Math.ceil(input.fixedMonthlyCostsCents / contributionPerUnitCents)
      : null;
  const marginPct = effectivePriceCents > 0 ? contributionPerUnitCents / effectivePriceCents : null;
  const warnings =
    contributionPerUnitCents <= 0
      ? ["Each sale loses money at this scenario price."]
      : [];

  return {
    effectivePriceCents,
    revenueCents,
    grossProfitCents,
    netProfitCents,
    contributionPerUnitCents,
    breakEvenUnits,
    marginPct,
    warnings,
  };
}
```

- [ ] **Step 4: Run unit tests to confirm GREEN**

```bash
npx vitest run src/lib/launchPlanner/simulateLaunchScenario.test.ts
```

Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/launchPlanner/simulateLaunchScenario.ts src/lib/launchPlanner/simulateLaunchScenario.test.ts
git commit -m "feat: add launch scenario simulator logic"
```

---

### Task 3: Build Launch Planner UI Component

**Goal:** Create an interactive client component that exposes the calculator and simulator in one usable tool surface.

**Files:**
- Create: `src/components/LaunchPlanner.tsx`
- Create: `src/components/LaunchPlanner.test.tsx`

**Acceptance Criteria:**
- [ ] Initial render shows the calculator heading, recommended launch price, minimum viable price, stretch price, and scenario summary.
- [ ] Changing unit cost updates the recommended price.
- [ ] Adding competitor prices changes the recommendation to a market-aware price.
- [ ] Changing monthly units updates net profit.
- [ ] An invalid margin/fee combination shows an inline validation error.

**Verify:** `npx vitest run src/components/LaunchPlanner.test.tsx` -> expected 5 passed

**Steps:**

- [ ] **Step 1: Write failing UI tests**

Create `src/components/LaunchPlanner.test.tsx`:

```tsx
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { LaunchPlanner } from "./LaunchPlanner";

afterEach(() => cleanup());

describe("LaunchPlanner", () => {
  it("renders the default recommendation and scenario summary", () => {
    render(<LaunchPlanner />);

    expect(screen.getByRole("heading", { name: "Launch Planner" })).toBeTruthy();
    expect(screen.getByText("Recommended launch price")).toBeTruthy();
    expect(screen.getByText("$33.99")).toBeTruthy();
    expect(screen.getByText("Minimum viable price")).toBeTruthy();
    expect(screen.getByText("Net profit")).toBeTruthy();
  });

  it("updates the recommendation when unit cost changes", async () => {
    render(<LaunchPlanner />);

    const unitCost = screen.getByRole("spinbutton", { name: "Unit cost" });
    await userEvent.clear(unitCost);
    await userEvent.type(unitCost, "20");

    expect(screen.getByText("$55.99")).toBeTruthy();
  });

  it("uses competitor prices for market-aware recommendations", async () => {
    render(<LaunchPlanner />);

    await userEvent.type(screen.getByRole("textbox", { name: "Competitor prices" }), "29, 35, 39, 42, 49");

    expect(screen.getByText("$39.99")).toBeTruthy();
    expect(screen.getByText(/medium confidence/i)).toBeTruthy();
  });

  it("updates net profit when monthly units change", async () => {
    render(<LaunchPlanner />);

    const monthlyUnits = screen.getByRole("spinbutton", { name: "Expected monthly units" });
    await userEvent.clear(monthlyUnits);
    await userEvent.type(monthlyUnits, "200");

    expect(screen.getByText("$2,446.00")).toBeTruthy();
  });

  it("shows validation error for impossible margin and fees", async () => {
    render(<LaunchPlanner />);

    const requiredMargin = screen.getByRole("spinbutton", { name: "Required margin percent" });
    await userEvent.clear(requiredMargin);
    await userEvent.type(requiredMargin, "90");

    expect(screen.getByRole("alert").textContent).toMatch(/margin and fee/i);
  });
});
```

- [ ] **Step 2: Run tests to confirm RED**

```bash
npx vitest run src/components/LaunchPlanner.test.tsx
```

Expected: fails because `src/components/LaunchPlanner.tsx` does not exist.

- [ ] **Step 3: Implement UI component**

Create `src/components/LaunchPlanner.tsx`:

```tsx
"use client";

import { useMemo, useState } from "react";
import { calculateLaunchPlan, type Positioning, type RoundingMode } from "@/lib/launchPlanner/calculateLaunchPlan";
import { simulateLaunchScenario } from "@/lib/launchPlanner/simulateLaunchScenario";
import { dollarsToCents, formatCents, pct } from "@/lib/money";

function currencyToCents(value: string): number {
  return dollarsToCents(value) ?? 0;
}

function percentToRatio(value: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(95, Math.max(0, parsed)) / 100;
}

function Field({
  label,
  value,
  onChange,
  prefix,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  prefix?: string;
}) {
  return (
    <label className="grid gap-1 text-xs font-medium text-muted">
      {label}
      <div className="flex items-center rounded-md border border-line-strong bg-surface pl-2 focus-within:border-accent focus-within:shadow-[0_0_0_3px_var(--accent-soft)]">
        {prefix && <span className="text-sm text-faint">{prefix}</span>}
        <input
          aria-label={label}
          type="number"
          min="0"
          step="0.01"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent px-2 py-2 text-sm tabular text-ink outline-none"
        />
      </div>
    </label>
  );
}

function Segment<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium text-muted">{label}</p>
      <div className="grid grid-cols-3 rounded-lg border border-line bg-panel p-1">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`rounded-md px-2 py-1.5 text-xs font-medium ${
              value === option.value ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function LaunchPlanner() {
  const [unitCost, setUnitCost] = useState("12");
  const [shipping, setShipping] = useState("3");
  const [packaging, setPackaging] = useState("1");
  const [otherCosts, setOtherCosts] = useState("0");
  const [paymentFee, setPaymentFee] = useState("3");
  const [platformFee, setPlatformFee] = useState("2");
  const [requiredMargin, setRequiredMargin] = useState("35");
  const [positioning, setPositioning] = useState<Positioning>("mid-market");
  const [roundingMode, setRoundingMode] = useState<RoundingMode>("ninety-nine");
  const [competitors, setCompetitors] = useState("");
  const [scenarioPrice, setScenarioPrice] = useState("");
  const [monthlyUnits, setMonthlyUnits] = useState("100");
  const [adCost, setAdCost] = useState("4");
  const [fixedCosts, setFixedCosts] = useState("500");
  const [returnRate, setReturnRate] = useState("0");
  const [discount, setDiscount] = useState("0");

  const competitorPricesCents = useMemo(
    () =>
      competitors
        .split(/[,\\n]/)
        .map((part) => dollarsToCents(part.trim()))
        .filter((value): value is number => value !== null && value > 0),
    [competitors]
  );

  const plan = calculateLaunchPlan({
    unitCostCents: currencyToCents(unitCost),
    shippingCents: currencyToCents(shipping),
    packagingCents: currencyToCents(packaging),
    otherUnitCostsCents: currencyToCents(otherCosts),
    paymentFeePct: percentToRatio(paymentFee),
    platformFeePct: percentToRatio(platformFee),
    requiredMarginPct: percentToRatio(requiredMargin),
    positioning,
    competitorPricesCents,
    roundingMode,
  });

  const activePriceCents = scenarioPrice.trim() === "" && plan.ok
    ? plan.recommendedPriceCents
    : currencyToCents(scenarioPrice);

  const scenario = simulateLaunchScenario({
    priceCents: activePriceCents,
    monthlyUnits: Math.max(0, Number(monthlyUnits) || 0),
    unitCostCents: currencyToCents(unitCost),
    shippingCents: currencyToCents(shipping),
    packagingCents: currencyToCents(packaging),
    otherUnitCostsCents: currencyToCents(otherCosts),
    paymentFeePct: percentToRatio(paymentFee),
    platformFeePct: percentToRatio(platformFee),
    adCostPerSaleCents: currencyToCents(adCost),
    fixedMonthlyCostsCents: currencyToCents(fixedCosts),
    returnRatePct: percentToRatio(returnRate),
    discountPct: percentToRatio(discount),
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(340px,0.7fr)]">
      <section className="rounded-xl border border-line bg-surface p-5">
        <h2 className="text-sm font-semibold text-ink">Product economics</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Unit cost" prefix="$" value={unitCost} onChange={setUnitCost} />
          <Field label="Shipping per order" prefix="$" value={shipping} onChange={setShipping} />
          <Field label="Packaging per order" prefix="$" value={packaging} onChange={setPackaging} />
          <Field label="Other unit costs" prefix="$" value={otherCosts} onChange={setOtherCosts} />
          <Field label="Payment fee percent" value={paymentFee} onChange={setPaymentFee} />
          <Field label="Platform fee percent" value={platformFee} onChange={setPlatformFee} />
          <Field label="Required margin percent" value={requiredMargin} onChange={setRequiredMargin} />
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Segment
            label="Positioning"
            value={positioning}
            onChange={setPositioning}
            options={[
              { value: "budget", label: "Budget" },
              { value: "mid-market", label: "Mid" },
              { value: "premium", label: "Premium" },
            ]}
          />
          <Segment
            label="Rounding"
            value={roundingMode}
            onChange={setRoundingMode}
            options={[
              { value: "ninety-nine", label: ".99" },
              { value: "whole", label: "Whole" },
            ]}
          />
        </div>
        <label className="mt-5 grid gap-1 text-xs font-medium text-muted">
          Competitor prices
          <input
            aria-label="Competitor prices"
            value={competitors}
            onChange={(e) => setCompetitors(e.target.value)}
            placeholder="29, 35, 39, 42, 49"
            className="field text-sm"
          />
        </label>
      </section>

      <section className="rounded-xl border border-line bg-surface p-5">
        <h1 className="text-xl font-semibold text-ink">Launch Planner</h1>
        {!plan.ok ? (
          <p role="alert" className="mt-4 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
            {plan.error}
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted">Recommended launch price</p>
              <p className="mt-1 text-4xl font-semibold tabular text-ink">{formatCents(plan.recommendedPriceCents)}</p>
              <p className="mt-2 text-sm text-muted">{plan.explanation}</p>
              <span className="mt-3 inline-flex rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent">
                {plan.confidence} confidence
              </span>
            </div>
            <dl className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-line bg-panel p-3">
                <dt className="text-xs text-muted">Minimum viable price</dt>
                <dd className="mt-1 text-lg font-semibold tabular">{formatCents(plan.minimumViablePriceCents)}</dd>
              </div>
              <div className="rounded-lg border border-line bg-panel p-3">
                <dt className="text-xs text-muted">Stretch price</dt>
                <dd className="mt-1 text-lg font-semibold tabular">{formatCents(plan.stretchPriceCents)}</dd>
              </div>
              <div className="rounded-lg border border-line bg-panel p-3">
                <dt className="text-xs text-muted">Discount-safe floor</dt>
                <dd className="mt-1 text-lg font-semibold tabular">{formatCents(plan.discountFloorPriceCents)}</dd>
              </div>
              <div className="rounded-lg border border-line bg-panel p-3">
                <dt className="text-xs text-muted">Margin after fees</dt>
                <dd className="mt-1 text-lg font-semibold tabular">{pct(plan.grossMarginPct)}</dd>
              </div>
            </dl>
            {plan.warnings.length > 0 && (
              <ul className="space-y-1 rounded-lg bg-danger-soft px-3 py-2 text-xs text-danger">
                {plan.warnings.map((warning) => <li key={warning}>{warning}</li>)}
              </ul>
            )}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-line bg-surface p-5 lg:col-span-2">
        <h2 className="text-sm font-semibold text-ink">Scenario simulator</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <Field label="Scenario price" prefix="$" value={scenarioPrice} onChange={setScenarioPrice} />
          <Field label="Expected monthly units" value={monthlyUnits} onChange={setMonthlyUnits} />
          <Field label="Ad cost per sale" prefix="$" value={adCost} onChange={setAdCost} />
          <Field label="Fixed monthly costs" prefix="$" value={fixedCosts} onChange={setFixedCosts} />
          <Field label="Return rate percent" value={returnRate} onChange={setReturnRate} />
          <Field label="Discount percent" value={discount} onChange={setDiscount} />
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="Revenue" value={formatCents(scenario.revenueCents)} />
          <Stat label="Gross profit" value={formatCents(scenario.grossProfitCents)} />
          <Stat label="Net profit" value={formatCents(scenario.netProfitCents)} />
          <Stat label="Contribution" value={formatCents(scenario.contributionPerUnitCents)} />
          <Stat label="Break-even units" value={scenario.breakEvenUnits === null ? "No break-even" : String(scenario.breakEvenUnits)} />
          <Stat label="Margin" value={scenario.marginPct === null ? "No margin" : pct(scenario.marginPct)} />
        </div>
        {scenario.warnings.length > 0 && (
          <p className="mt-4 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{scenario.warnings[0]}</p>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-panel p-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-base font-semibold tabular text-ink">{value}</p>
    </div>
  );
}
```

- [ ] **Step 4: Run UI tests to confirm GREEN**

```bash
npx vitest run src/components/LaunchPlanner.test.tsx
```

Expected: 5 passed.

- [ ] **Step 5: Commit**

```bash
git add src/components/LaunchPlanner.tsx src/components/LaunchPlanner.test.tsx
git commit -m "feat: add launch planner interface"
```

---

### Task 4: Add Authenticated Route and Sidebar Navigation

**Goal:** Expose the Launch Planner at `/launch-planner` inside the existing authenticated app shell and make it reachable from sidebar navigation.

**Files:**
- Create: `src/app/launch-planner/page.tsx`
- Modify: `src/components/Sidebar.tsx`

**Acceptance Criteria:**
- [ ] `/launch-planner` requires an authenticated session through `requireSessionPage()`.
- [ ] Page uses `AppShell` and merchant-name lookup matching `/dashboard`.
- [ ] Sidebar includes a Launch Planner item between Dashboard and Settings.
- [ ] Sidebar active state highlights Launch Planner on `/launch-planner`.
- [ ] TypeScript build passes.

**Verify:** `npx tsc --noEmit` -> expected exit 0

**Steps:**

- [ ] **Step 1: Create the route**

Create `src/app/launch-planner/page.tsx`:

```tsx
import { AppShell } from "@/components/AppShell";
import { LaunchPlanner } from "@/components/LaunchPlanner";
import { requireSessionPage } from "@/lib/auth/requireSession";
import { prisma } from "@/lib/db";

export default async function LaunchPlannerPage() {
  const user = await requireSessionPage();
  const merchant = await prisma.merchant.findFirst({
    where: { id: user.merchantId },
    select: { name: true },
  });

  return (
    <AppShell merchantName={merchant?.name ?? undefined}>
      <div className="max-w-6xl px-8 py-8">
        <header className="mb-8">
          <h1 className="text-xl font-semibold text-ink">Launch Planner</h1>
          <p className="mt-0.5 text-sm text-muted">
            Price new products before Zorin has enough order history to model demand.
          </p>
        </header>
        <LaunchPlanner />
      </div>
    </AppShell>
  );
}
```

- [ ] **Step 2: Add sidebar nav item**

Modify `src/components/Sidebar.tsx`.

Update the icon import:

```ts
import { SquaresFour, Gear, SignOut, RocketLaunch } from "@phosphor-icons/react";
```

Update `NAV`:

```ts
const NAV = [
  { href: "/dashboard", icon: SquaresFour, label: "Dashboard", matchPrefix: ["/dashboard", "/product"] },
  { href: "/launch-planner", icon: RocketLaunch, label: "Launch Planner", matchPrefix: ["/launch-planner"] },
  { href: "/settings", icon: Gear, label: "Settings", matchPrefix: ["/settings"] },
];
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: no TypeScript errors. If `RocketLaunch` is unavailable in the installed icon package, use `Calculator` from `@phosphor-icons/react` and keep the same label/href.

- [ ] **Step 4: Commit**

```bash
git add src/app/launch-planner/page.tsx src/components/Sidebar.tsx
git commit -m "feat: add launch planner route"
```

---

### Task 5: Run Full Verification

**Goal:** Prove the Launch Planner works with the existing test suite and production build.

**Files:**
- No code files changed in this task.

**Acceptance Criteria:**
- [ ] Launch planner unit tests pass.
- [ ] Launch planner UI tests pass.
- [ ] Full `npm test` passes.
- [ ] Production build completes.
- [ ] Manual browser check confirms `/launch-planner` renders after login and the calculator updates when values change.

**Verify:** `npm test` and `npm run build` -> expected exit 0 for both

**Steps:**

- [ ] **Step 1: Run focused tests**

```bash
npx vitest run src/lib/launchPlanner/calculateLaunchPlan.test.ts src/lib/launchPlanner/simulateLaunchScenario.test.ts src/components/LaunchPlanner.test.tsx
```

Expected: all focused tests pass.

- [ ] **Step 2: Run full tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 3: Run production build**

```bash
npm run build
```

Expected: exit 0.

- [ ] **Step 4: Manual browser verification**

```bash
npm run dev
```

Open `http://localhost:3000/login`, sign in with `demo@priceiq.example` / `demo1234`, click Launch Planner in the sidebar, and confirm:

- Default recommendation renders as `$33.99`.
- Changing Unit cost from `12` to `20` updates recommendation to `$55.99`.
- Entering competitor prices `29, 35, 39, 42, 49` shows `$39.99` and medium confidence.
- Changing Expected monthly units updates Net profit.

- [ ] **Step 5: Commit verification note only if code changed during fixes**

If verification required a code fix, commit the fix with a focused message. If no code changed, do not create an empty commit.

---

## Self-Review

Spec coverage:

- Calculator formula and outputs are covered by Task 1.
- Scenario simulator formula and outputs are covered by Task 2.
- Interactive UI is covered by Task 3.
- Authenticated route and sidebar placement are covered by Task 4.
- Fresh verification is covered by Task 5.

Placeholder scan:

- No `TBD`, `TODO`, "implement later", or unspecified edge handling remains.

Type consistency:

- `Positioning`, `RoundingMode`, `LaunchPlanInput`, and `LaunchScenarioInput` are defined before use.
- Component and route imports match the files created in earlier tasks.
- Verification commands match Vitest project includes for `.test.ts` and `.test.tsx`.
