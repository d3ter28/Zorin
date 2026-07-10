# Phase 3: Confidence-Weighted Elasticity Model

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:subagent-driven-development (recommended) or superpowers-extended-cc:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the elasticity model weight recent sales more heavily, shrink noisy estimates toward a sensible retail prior, and surface a `confidenceScore` (0–1) that narrows price recommendations when data is sparse.

**Architecture:** Three layered changes to `src/lib/elasticity/`: (1) weighted least squares replaces OLS so time-decay depresses old records' influence; (2) Bayesian shrinkage pulls the elasticity toward −1.2 (typical retail) when effective sample size is small; (3) a `confidenceScore = r² × min(1, effectiveSampleSize/20)` drives both a tighter scan range in `generateRecommendation` and a richer `ModelHealthBadge`. The `ElasticityModel` DB table gains three new columns (`effectiveSampleSize`, `confidenceScore`, `priorApplied`); all existing rows default to `0/0/false` and update when the merchant re-fits.

**Tech Stack:** TypeScript, Prisma 7 + SQLite, Vitest 4, Next.js 16 App Router.

**User decisions (already made):**
- "A confidence-weighted ensemble — run the elasticity model as-is, but add a simple time-decay weighting and a Bayesian prior that pulls recommendations toward the category average when data is sparse."
- Prior elasticity = −1.2 (sensible retail default); prior strength = 5 phantom data points; half-life = 90 days.
- Conservative scan range: ±10 % at confidence 0, ±30 % at confidence 1.

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/elasticity/fitElasticityModel.ts` | Modify | Add time-decay WLS; expose `effectiveSampleSize` |
| `src/lib/elasticity/fitElasticityModel.test.ts` | Modify | Add WLS + time-decay tests |
| `src/lib/elasticity/bayesianShrinkage.ts` | Create | Shrink elasticity toward prior when data is sparse |
| `src/lib/elasticity/bayesianShrinkage.test.ts` | Create | Unit tests |
| `src/lib/elasticity/confidenceScore.ts` | Create | Compute 0–1 confidence from r² + effectiveSampleSize |
| `src/lib/elasticity/confidenceScore.test.ts` | Create | Unit tests |
| `src/lib/elasticity/generateRecommendation.ts` | Modify | Accept `confidenceScore`; narrow scan range; add data-quality note to reasoning |
| `src/lib/elasticity/generateRecommendation.test.ts` | Modify | Tests for confidence-adjusted scan |
| `prisma/schema.prisma` | Modify | Add `effectiveSampleSize`, `confidenceScore`, `priorApplied` to `ElasticityModel` |
| `src/app/api/products/[id]/fit-model/route.ts` | Modify | Select `date`; apply shrinkage + confidence; store new fields |
| `src/app/api/products/[id]/recommend/route.ts` | Modify | Pass `confidenceScore` to `generateRecommendation`; include it in `rulesJson` |
| `src/app/api/products/route.ts` | Modify | Include `confidenceScore` in `modelHealth` shape |
| `src/components/ModelHealthBadge.tsx` | Modify | Accept `confidenceScore?`; use it for tier thresholds |
| `src/components/RecommendationCard.tsx` | Modify | Add `confidenceScore?` to `MLRecView`; pass to badge |
| `src/app/product/[id]/page.tsx` | Modify | Parse `confidenceScore` from `rulesJson` in `parseRecView` |
| `src/components/DemandCurve.tsx` | Modify | Pass `model.confidenceScore` to `ModelHealthBadge` |
| `src/components/ProductsTable.tsx` | Modify | Add `confidenceScore` to `Row.modelHealth`; pass to badge |

---

## Tasks

---

### Task 1: Time-Decay Weighted `fitElasticityModel`

**Goal:** Replace OLS with WLS in `fitElasticityModel`, weighting each record by `2^(−daysAgo / 90)` so stale data shrinks toward zero influence, and expose `effectiveSampleSize` (sum of weights) in the result.

**Files:**
- Modify: `src/lib/elasticity/fitElasticityModel.ts`
- Modify: `src/lib/elasticity/fitElasticityModel.test.ts`

**Acceptance Criteria:**
- [ ] `fitElasticityModel` accepts `{ priceCents, unitsSold, date?: Date | null }[]` (backward-compatible — date is optional)
- [ ] When all records have no `date`, the function returns the same elasticity/intercept/r² as the old OLS (within floating-point tolerance), and `effectiveSampleSize === dataPoints`
- [ ] When records have dates, recent records dominate the fit (verified by contrasting "old" vs "recent" record groups)
- [ ] `ElasticityResult` includes `effectiveSampleSize: number`
- [ ] All existing tests still pass; new WLS tests pass

**Verify:** `npx vitest run src/lib/elasticity/fitElasticityModel.test.ts` → all pass

**Steps:**

- [ ] **Step 1: Write the new failing tests first**

Add to `src/lib/elasticity/fitElasticityModel.test.ts`:

```ts
it("effectiveSampleSize equals dataPoints when no dates provided", () => {
  const records = [
    { priceCents: 1000, unitsSold: 100 },
    { priceCents: 1500, unitsSold: 54 },
    { priceCents: 2000, unitsSold: 35 },
    { priceCents: 2500, unitsSold: 25 },
    { priceCents: 3000, unitsSold: 19 },
  ];
  const result = fitElasticityModel(records);
  expect(result!.effectiveSampleSize).toBeCloseTo(5, 4);
});

it("weights recent records more heavily than old ones", () => {
  const refDate = new Date("2025-01-01");

  // Old records (≈12 months ago) imply elasticity ≈ −2.0
  const old = [
    { priceCents: 1000, unitsSold: 100, date: new Date("2024-01-01") },
    { priceCents: 2000, unitsSold: 25,  date: new Date("2024-01-15") },
    { priceCents: 3000, unitsSold: 11,  date: new Date("2024-02-01") },
  ];
  // Recent records (≈1 week ago) imply elasticity ≈ −0.5
  const recent = [
    { priceCents: 1000, unitsSold: 100, date: new Date("2024-12-20") },
    { priceCents: 2000, unitsSold: 71,  date: new Date("2024-12-25") },
    { priceCents: 3000, unitsSold: 58,  date: new Date("2024-12-28") },
  ];

  const unweighted = fitElasticityModel([...old, ...recent], { referenceDate: refDate, halfLifeDays: Infinity });
  const weighted   = fitElasticityModel([...old, ...recent], { referenceDate: refDate, halfLifeDays: 90 });

  // Weighted fit should be dominated by recent records (less negative elasticity)
  expect(weighted!.elasticity).toBeGreaterThan(unweighted!.elasticity);
});

it("effectiveSampleSize is less than dataPoints when records have dates", () => {
  const refDate = new Date("2025-01-01");
  const records = [
    { priceCents: 1000, unitsSold: 100, date: new Date("2024-01-01") }, // ~365 days old → weight ≈ 0.06
    { priceCents: 1500, unitsSold: 54,  date: new Date("2024-01-15") },
    { priceCents: 2000, unitsSold: 35,  date: new Date("2024-12-25") }, // 7 days old → weight ≈ 0.95
    { priceCents: 2500, unitsSold: 25,  date: new Date("2024-12-28") },
    { priceCents: 3000, unitsSold: 19,  date: new Date("2024-12-30") },
  ];
  const result = fitElasticityModel(records, { referenceDate: refDate });
  expect(result!.effectiveSampleSize).toBeLessThan(result!.dataPoints);
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /c/Users/pohde/projects/priceiq && npx vitest run src/lib/elasticity/fitElasticityModel.test.ts 2>&1 | tail -15
```

Expected: failures on the three new tests (property `effectiveSampleSize` undefined, etc.).

- [ ] **Step 3: Rewrite `src/lib/elasticity/fitElasticityModel.ts`**

```ts
export interface ElasticityResult {
  elasticity: number;
  intercept: number;
  r2: number;
  dataPoints: number;
  /** Sum of time-decay weights. Equals dataPoints when no dates are supplied. */
  effectiveSampleSize: number;
  minPriceCents: number;
  maxPriceCents: number;
}

export interface FitOptions {
  /** Exponential half-life in days. Default 90. Use Infinity to disable decay. */
  halfLifeDays?: number;
  /** Reference date for computing daysAgo. Default: now. */
  referenceDate?: Date;
}

export function fitElasticityModel(
  records: { priceCents: number; unitsSold: number; date?: Date | null }[],
  options: FitOptions = {}
): ElasticityResult | null {
  const { halfLifeDays = 90, referenceDate = new Date() } = options;
  const valid = records.filter((r) => r.priceCents > 0 && r.unitsSold > 0);
  if (valid.length < 3) return null;

  const refMs = referenceDate.getTime();
  const msPerDay = 86_400_000;

  const xs = valid.map((r) => Math.log(r.priceCents));
  const ys = valid.map((r) => Math.log(r.unitsSold));
  const ws = valid.map((r) => {
    if (!r.date) return 1;
    const daysAgo = (refMs - new Date(r.date).getTime()) / msPerDay;
    return halfLifeDays === Infinity ? 1 : Math.pow(2, -daysAgo / halfLifeDays);
  });

  // Weighted least squares
  const W   = ws.reduce((a, w) => a + w, 0);
  const Wx  = ws.reduce((a, w, i) => a + w * xs[i], 0);
  const Wy  = ws.reduce((a, w, i) => a + w * ys[i], 0);
  const Wxx = ws.reduce((a, w, i) => a + w * xs[i] * xs[i], 0);
  const Wxy = ws.reduce((a, w, i) => a + w * xs[i] * ys[i], 0);

  const denom = W * Wxx - Wx * Wx;
  if (denom === 0) return null;

  const elasticity = (W * Wxy - Wx * Wy) / denom;
  const intercept  = (Wy - elasticity * Wx) / W;

  // Weighted R²
  const yMean = Wy / W;
  const ssTot = ws.reduce((a, w, i) => a + w * (ys[i] - yMean) ** 2, 0);
  const ssRes = ws.reduce((a, w, i) => {
    const yHat = intercept + elasticity * xs[i];
    return a + w * (ys[i] - yHat) ** 2;
  }, 0);
  const r2 = ssTot === 0 ? 0 : Math.max(0, 1 - ssRes / ssTot);

  const minPriceCents = Math.min(...valid.map((r) => r.priceCents));
  const maxPriceCents = Math.max(...valid.map((r) => r.priceCents));

  return {
    elasticity,
    intercept,
    r2,
    dataPoints: valid.length,
    effectiveSampleSize: W,
    minPriceCents,
    maxPriceCents,
  };
}
```

- [ ] **Step 4: Run tests to verify all pass**

```bash
cd /c/Users/pohde/projects/priceiq && npx vitest run src/lib/elasticity/fitElasticityModel.test.ts 2>&1 | tail -10
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
cd /c/Users/pohde/projects/priceiq && git add src/lib/elasticity/fitElasticityModel.ts src/lib/elasticity/fitElasticityModel.test.ts && git commit -m "feat: time-decay WLS in fitElasticityModel + effectiveSampleSize"
```

---

### Task 2: `bayesianShrinkage` + `computeConfidenceScore` Utilities

**Goal:** Two pure utility functions: `bayesianShrinkage` pulls an elasticity estimate toward a retail prior (−1.2) using James-Stein shrinkage; `computeConfidenceScore` computes a 0–1 score from r² and effectiveSampleSize.

**Files:**
- Create: `src/lib/elasticity/bayesianShrinkage.ts`
- Create: `src/lib/elasticity/bayesianShrinkage.test.ts`
- Create: `src/lib/elasticity/confidenceScore.ts`
- Create: `src/lib/elasticity/confidenceScore.test.ts`

**Acceptance Criteria:**
- [ ] `bayesianShrinkage(elasticity, effectiveSampleSize)` returns `{ shrunkElasticity, priorApplied: boolean }`
- [ ] With `effectiveSampleSize = 0`, returns `priorElasticity` verbatim and `priorApplied = true`
- [ ] With large `effectiveSampleSize` (>>priorStrength), `shrunkElasticity ≈ elasticity`
- [ ] With `effectiveSampleSize = priorStrength`, the result is the midpoint between elasticity and prior
- [ ] `computeConfidenceScore(r2, effectiveSampleSize)` returns a value in [0, 1]
- [ ] At r²=1.0 and effectiveSampleSize ≥ 20, returns 1.0
- [ ] At r²=0.0, returns 0.0 regardless of sample size

**Verify:** `npx vitest run src/lib/elasticity/bayesianShrinkage.test.ts src/lib/elasticity/confidenceScore.test.ts` → all pass

**Steps:**

- [ ] **Step 1: Write tests for `bayesianShrinkage`**

Create `src/lib/elasticity/bayesianShrinkage.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { bayesianShrinkage } from "./bayesianShrinkage";

describe("bayesianShrinkage", () => {
  const PRIOR = -1.2;
  const K = 5; // priorStrength

  it("returns prior when effectiveSampleSize is 0", () => {
    const { shrunkElasticity, priorApplied } = bayesianShrinkage(0, 0);
    expect(shrunkElasticity).toBeCloseTo(PRIOR);
    expect(priorApplied).toBe(true);
  });

  it("returns midpoint when effectiveSampleSize equals priorStrength", () => {
    // weight = 5/(5+5) = 0.5 → midpoint
    const { shrunkElasticity } = bayesianShrinkage(-3.0, K, PRIOR, K);
    expect(shrunkElasticity).toBeCloseTo(0.5 * (-3.0) + 0.5 * PRIOR);
  });

  it("approaches raw elasticity as effectiveSampleSize grows", () => {
    const { shrunkElasticity } = bayesianShrinkage(-2.5, 500, PRIOR, K);
    expect(shrunkElasticity).toBeCloseTo(-2.5, 1);
  });

  it("priorApplied is true whenever shrinkage is non-zero", () => {
    const { priorApplied } = bayesianShrinkage(-1.5, 10, PRIOR, K);
    expect(priorApplied).toBe(true);
  });

  it("shrinkage never produces values outside [elasticity, prior] range", () => {
    const { shrunkElasticity } = bayesianShrinkage(-3.0, 7, PRIOR, K);
    expect(shrunkElasticity).toBeGreaterThanOrEqual(-3.0);
    expect(shrunkElasticity).toBeLessThanOrEqual(PRIOR); // prior is less negative
  });
});
```

- [ ] **Step 2: Write tests for `computeConfidenceScore`**

Create `src/lib/elasticity/confidenceScore.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { computeConfidenceScore } from "./confidenceScore";

describe("computeConfidenceScore", () => {
  it("returns 1.0 at perfect r² and sufficient data", () => {
    expect(computeConfidenceScore(1.0, 20)).toBe(1.0);
    expect(computeConfidenceScore(1.0, 50)).toBe(1.0);
  });

  it("returns 0 when r² is 0", () => {
    expect(computeConfidenceScore(0, 100)).toBe(0);
  });

  it("scales with data sufficiency below 20 effective samples", () => {
    // r²=1.0, 10 samples → 1.0 * (10/20) = 0.5
    expect(computeConfidenceScore(1.0, 10)).toBeCloseTo(0.5);
  });

  it("scales with r²", () => {
    // r²=0.5, 20 samples → 0.5 * 1.0 = 0.5
    expect(computeConfidenceScore(0.5, 20)).toBeCloseTo(0.5);
  });

  it("result is always in [0, 1]", () => {
    expect(computeConfidenceScore(1.5, 100)).toBe(1.0); // clamp above 1
    expect(computeConfidenceScore(-0.1, 5)).toBe(0);    // clamp below 0
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
cd /c/Users/pohde/projects/priceiq && npx vitest run src/lib/elasticity/bayesianShrinkage.test.ts src/lib/elasticity/confidenceScore.test.ts 2>&1 | tail -10
```

Expected: both files fail (modules not found).

- [ ] **Step 4: Create `src/lib/elasticity/bayesianShrinkage.ts`**

```ts
export interface ShrinkageResult {
  shrunkElasticity: number;
  priorApplied: boolean;
}

/**
 * James-Stein shrinkage toward a retail prior elasticity.
 *
 * weight = n / (n + k) where n = effectiveSampleSize, k = priorStrength.
 * shrunkElasticity = weight * elasticity + (1 - weight) * priorElasticity.
 *
 * With little data (n ≈ 0), result → prior.
 * With lots of data (n >> k), result → raw elasticity.
 */
export function bayesianShrinkage(
  elasticity: number,
  effectiveSampleSize: number,
  priorElasticity = -1.2,
  priorStrength = 5
): ShrinkageResult {
  if (effectiveSampleSize <= 0) {
    return { shrunkElasticity: priorElasticity, priorApplied: true };
  }
  const weight = effectiveSampleSize / (effectiveSampleSize + priorStrength);
  const shrunkElasticity = weight * elasticity + (1 - weight) * priorElasticity;
  return { shrunkElasticity, priorApplied: true };
}
```

- [ ] **Step 5: Create `src/lib/elasticity/confidenceScore.ts`**

```ts
/**
 * Combines r² (fit quality) and effectiveSampleSize (data quantity) into a
 * single 0–1 confidence score.
 *
 * confidenceScore = r² × min(1, effectiveSampleSize / 20)
 *
 * Interpretation:
 *  1.0 → strong fit with ≥20 effective data points (full confidence)
 *  0.5 → either moderate fit or sparse data
 *  0.0 → model explains nothing, or no data
 */
export function computeConfidenceScore(r2: number, effectiveSampleSize: number): number {
  const clampedR2 = Math.max(0, Math.min(1, r2));
  const dataSufficiency = Math.min(1, effectiveSampleSize / 20);
  return Math.round(clampedR2 * dataSufficiency * 100) / 100;
}
```

- [ ] **Step 6: Run tests to verify all pass**

```bash
cd /c/Users/pohde/projects/priceiq && npx vitest run src/lib/elasticity/bayesianShrinkage.test.ts src/lib/elasticity/confidenceScore.test.ts 2>&1 | tail -10
```

Expected: all pass.

- [ ] **Step 7: Commit**

```bash
cd /c/Users/pohde/projects/priceiq && git add src/lib/elasticity/bayesianShrinkage.ts src/lib/elasticity/bayesianShrinkage.test.ts src/lib/elasticity/confidenceScore.ts src/lib/elasticity/confidenceScore.test.ts && git commit -m "feat: bayesianShrinkage + computeConfidenceScore utilities"
```

---

### Task 3: Schema Migration + Pipeline Wiring

**Goal:** Add `effectiveSampleSize`, `confidenceScore`, and `priorApplied` to the `ElasticityModel` DB table; wire up the fit-model route (time-weighted fitting + shrinkage + confidence); update `generateRecommendation` to narrow the price scan at low confidence; update the recommend route to pass confidence through.

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `src/app/api/products/[id]/fit-model/route.ts`
- Modify: `src/lib/elasticity/generateRecommendation.ts`
- Modify: `src/lib/elasticity/generateRecommendation.test.ts`
- Modify: `src/app/api/products/[id]/recommend/route.ts`

**Acceptance Criteria:**
- [ ] `ElasticityModel` table has `effectiveSampleSize Float @default(0)`, `confidenceScore Float @default(0)`, `priorApplied Boolean @default(false)`
- [ ] `POST /api/products/[id]/fit-model` stores `effectiveSampleSize`, `confidenceScore`, and `priorApplied` (and stores the shrunk elasticity, not the raw one)
- [ ] `generateRecommendation` accepts optional `confidenceScore` param (default 1.0); scan range is ±10 % at confidence 0, ±30 % at confidence 1
- [ ] Reasoning string appends a low-confidence note when `confidenceScore < 0.4`
- [ ] `POST /api/products/[id]/recommend` passes `product.elasticityModel.confidenceScore` to `generateRecommendation` and includes it in `rulesJson`
- [ ] All existing tests pass; new `generateRecommendation` tests pass

**Verify:** `npx vitest run` → all pass (full suite)

**Steps:**

- [ ] **Step 1: Update `prisma/schema.prisma`**

Find the `ElasticityModel` block and add three fields:

```prisma
model ElasticityModel {
  id                  String   @id @default(cuid())
  productId           String   @unique
  product             Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  elasticity          Float
  intercept           Float
  r2                  Float
  dataPoints          Int
  minPriceCents       Int      @default(0)
  maxPriceCents       Int      @default(0)
  effectiveSampleSize Float    @default(0)
  confidenceScore     Float    @default(0)
  priorApplied        Boolean  @default(false)
  fittedAt            DateTime @default(now())
}
```

- [ ] **Step 2: Run schema migration**

Stop the dev server if running. Then:

```bash
cd /c/Users/pohde/projects/priceiq && npx prisma db push && npx prisma generate
```

Expected output includes `Your database is now in sync with your Prisma schema.`

- [ ] **Step 3: Write new `generateRecommendation` test for confidence-adjusted scan**

Add to `src/lib/elasticity/generateRecommendation.test.ts`:

```ts
it("uses narrower scan range at low confidence", () => {
  // With confidence=0, scan is ±10%. With confidence=1, scan is ±30%.
  // At current price 1000 with confidence=0, suggestedPrice should stay within ±10%.
  const highlyElastic = { elasticity: -3.0, intercept: 15, r2: 0.9, dataPoints: 5 };
  const recLowConf  = generateRecommendation(highlyElastic, 1000, 200, 0.1, 0.0);
  const recHighConf = generateRecommendation(highlyElastic, 1000, 200, 0.1, 1.0);

  // Low confidence: suggested price within ±10% of 1000
  expect(recLowConf.suggestedPriceCents).toBeGreaterThanOrEqual(900);
  expect(recLowConf.suggestedPriceCents).toBeLessThanOrEqual(1100);

  // High confidence: can suggest up to ±30% — delta magnitude should be larger (or equal)
  expect(Math.abs(recHighConf.deltaPct)).toBeGreaterThanOrEqual(Math.abs(recLowConf.deltaPct));
});

it("appends low-confidence note to reasoning when confidenceScore < 0.4", () => {
  const model = { elasticity: -0.5, intercept: 10.0, r2: 0.85, dataPoints: 12 };
  const rec = generateRecommendation(model, 1000, 400, 0.1, 0.2);
  expect(rec.reasoning).toMatch(/limited data/i);
});

it("does not append confidence note at high confidence", () => {
  const model = { elasticity: -0.5, intercept: 10.0, r2: 0.85, dataPoints: 12 };
  const rec = generateRecommendation(model, 1000, 400, 0.1, 0.9);
  expect(rec.reasoning).not.toMatch(/limited data/i);
});
```

- [ ] **Step 4: Run tests to verify the new tests fail**

```bash
cd /c/Users/pohde/projects/priceiq && npx vitest run src/lib/elasticity/generateRecommendation.test.ts 2>&1 | tail -10
```

Expected: the 3 new tests fail (wrong param count or wrong scan range).

- [ ] **Step 5: Update `src/lib/elasticity/generateRecommendation.ts`**

Replace the entire file:

```ts
import { simulateProfit } from "./simulateProfit";

export interface ElasticityModelParams {
  elasticity: number;
  intercept: number;
  r2: number;
  dataPoints: number;
  minPriceCents?: number | null;
  maxPriceCents?: number | null;
  confidenceScore?: number | null;
}

export interface PricingRecommendation {
  action: "raise" | "lower" | "hold";
  suggestedPriceCents: number;
  deltaPct: number;
  reasoning: string;
  expectedProfitLiftPct: number;
}

export function generateRecommendation(
  model: ElasticityModelParams,
  currentPriceCents: number,
  cogsCents: number,
  marginFloorPct = 0.10,
  confidenceScore = 1.0
): PricingRecommendation {
  const minPriceCents = cogsCents / (1 - marginFloorPct);

  // Confidence-adjusted scan: ±10% at confidence=0, ±30% at confidence=1
  const clampedConf = Math.max(0, Math.min(1, confidenceScore));
  const scanWidth = 0.10 + 0.20 * clampedConf;
  const steps = 50;
  const scanLo = Math.round(currentPriceCents * (1 - scanWidth));
  const scanHi = Math.round(currentPriceCents * (1 + scanWidth));
  const trainLo = model.minPriceCents ? Math.round(model.minPriceCents * 0.8) : scanLo;
  const trainHi = model.maxPriceCents ? Math.round(model.maxPriceCents * 1.2) : scanHi;
  const lo = Math.max(scanLo, trainLo);
  const hi = Math.min(scanHi, trainHi);
  const step = Math.round((hi - lo) / steps);

  let bestPriceCents = currentPriceCents;
  let bestProfit = simulateProfit({
    elasticity: model.elasticity,
    intercept: model.intercept,
    currentPriceCents,
    candidatePriceCents: currentPriceCents,
    cogsCents,
  }).predictedGrossProfitCents;

  for (let p = lo; p <= hi; p += Math.max(1, step)) {
    if (p < minPriceCents) continue;
    const sim = simulateProfit({
      elasticity: model.elasticity,
      intercept: model.intercept,
      currentPriceCents,
      candidatePriceCents: p,
      cogsCents,
    });
    if (sim.predictedGrossProfitCents > bestProfit) {
      bestProfit = sim.predictedGrossProfitCents;
      bestPriceCents = p;
    }
  }

  const deltaPct = (bestPriceCents - currentPriceCents) / currentPriceCents;
  const action = Math.abs(deltaPct) < 0.01
    ? "hold"
    : deltaPct > 0 ? "raise" : "lower";

  const currentSim = simulateProfit({
    elasticity: model.elasticity,
    intercept: model.intercept,
    currentPriceCents,
    candidatePriceCents: currentPriceCents,
    cogsCents,
  });
  const expectedProfitLiftPct = currentSim.predictedGrossProfitCents > 0
    ? (bestProfit - currentSim.predictedGrossProfitCents) / currentSim.predictedGrossProfitCents
    : 0;

  const elasticLabel = Math.abs(model.elasticity) < 1 ? "inelastic" : "elastic";
  const pricePctStr = `${(Math.abs(deltaPct) * 100).toFixed(0)}%`;
  const unitChangePct = (Math.exp(model.elasticity * Math.log(1 + deltaPct)) - 1) * 100;
  const profitChangePct = (expectedProfitLiftPct * 100).toFixed(0);
  const confidenceNote = clampedConf < 0.4
    ? " Limited data — re-fit after collecting more sales records for a stronger signal."
    : "";

  const reasoning = action === "hold"
    ? `Demand elasticity is ${model.elasticity.toFixed(2)}. Current price is already near the profit-maximizing point.${confidenceNote}`
    : `Demand is ${elasticLabel} (elasticity = ${model.elasticity.toFixed(2)}). ` +
      `${action === "raise" ? "Raising" : "Lowering"} price ${pricePctStr} ${unitChangePct >= 0 ? "increases" : "reduces"} units by ~${Math.abs(unitChangePct).toFixed(0)}% ` +
      `but ${parseFloat(profitChangePct) >= 0 ? "grows" : "reduces"} gross profit by ~${Math.abs(parseFloat(profitChangePct))}%.${confidenceNote}`;

  return {
    action,
    suggestedPriceCents: action === "hold" ? currentPriceCents : bestPriceCents,
    deltaPct,
    reasoning,
    expectedProfitLiftPct,
  };
}
```

- [ ] **Step 6: Run `generateRecommendation` tests**

```bash
cd /c/Users/pohde/projects/priceiq && npx vitest run src/lib/elasticity/generateRecommendation.test.ts 2>&1 | tail -10
```

Expected: all pass.

- [ ] **Step 7: Update `src/app/api/products/[id]/fit-model/route.ts`**

Read the file, then replace its body. The route must: select `date` from sales records, call the time-weighted fit, apply Bayesian shrinkage, compute confidence, and store all new fields.

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { HttpError, withErrorHandling } from "@/lib/api/errors";
import { requireSessionApi } from "@/lib/auth/requireSession";
import { fitElasticityModel } from "@/lib/elasticity/fitElasticityModel";
import { bayesianShrinkage } from "@/lib/elasticity/bayesianShrinkage";
import { computeConfidenceScore } from "@/lib/elasticity/confidenceScore";

export const POST = withErrorHandling(
  async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { merchantId } = await requireSessionApi();
    const { id } = await params;

    const product = await prisma.product.findFirst({
      where: { id, merchantId },
    });
    if (!product) {
      throw new HttpError(404, "Not found");
    }

    const records = await prisma.salesRecord.findMany({
      where: { productId: id, promotionFlag: false },
      select: { priceCents: true, unitsSold: true, date: true },
    });

    const raw = fitElasticityModel(records);
    if (!raw) {
      throw new HttpError(
        400,
        "Insufficient data: need at least 3 non-promotional sales records with positive price and units",
      );
    }

    const { shrunkElasticity, priorApplied } = bayesianShrinkage(
      raw.elasticity,
      raw.effectiveSampleSize
    );
    const confidenceScore = computeConfidenceScore(raw.r2, raw.effectiveSampleSize);

    const result = {
      elasticity: shrunkElasticity,
      intercept: raw.intercept,
      r2: raw.r2,
      dataPoints: raw.dataPoints,
      effectiveSampleSize: raw.effectiveSampleSize,
      minPriceCents: raw.minPriceCents,
      maxPriceCents: raw.maxPriceCents,
      confidenceScore,
      priorApplied,
      fittedAt: new Date(),
    };

    await prisma.elasticityModel.upsert({
      where: { productId: id },
      create: { productId: id, ...result },
      update: result,
    });

    return NextResponse.json({ ...raw, elasticity: shrunkElasticity, confidenceScore, priorApplied });
  }
);
```

- [ ] **Step 8: Update `src/app/api/products/[id]/recommend/route.ts`**

Read the file, then update to pass `confidenceScore` to `generateRecommendation` and include it in `rulesJson`:

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { HttpError, withErrorHandling } from "@/lib/api/errors";
import { requireSessionApi } from "@/lib/auth/requireSession";
import { generateRecommendation } from "@/lib/elasticity/generateRecommendation";

export const POST = withErrorHandling(
  async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { merchantId } = await requireSessionApi();
    const { id } = await params;

    const product = await prisma.product.findFirst({
      where: { id, merchantId },
      include: { elasticityModel: true },
    });
    if (!product) throw new HttpError(404, "Not found");
    if (!product.elasticityModel) throw new HttpError(400, "No elasticity model — fit model first");
    if (product.cogs === null) throw new HttpError(400, "COGS required to generate recommendation");

    const confidenceScore = product.elasticityModel.confidenceScore ?? 1.0;

    const rec = generateRecommendation(
      product.elasticityModel,
      product.currentPrice,
      product.cogs,
      0.10,
      confidenceScore
    );

    const rulesJson = JSON.stringify({
      suggestedPriceCents: rec.suggestedPriceCents,
      expectedProfitLiftPct: rec.expectedProfitLiftPct,
      elasticity: product.elasticityModel.elasticity,
      r2: product.elasticityModel.r2,
      dataPoints: product.elasticityModel.dataPoints,
      confidenceScore,
    });

    await prisma.recommendation.upsert({
      where: { productId: id },
      create: { productId: id, action: rec.action, deltaPct: rec.deltaPct, phrasing: rec.reasoning, rulesJson },
      update: { action: rec.action, deltaPct: rec.deltaPct, phrasing: rec.reasoning, rulesJson, generatedAt: new Date() },
    });

    return NextResponse.json(rec);
  }
);
```

- [ ] **Step 9: Run full test suite**

```bash
cd /c/Users/pohde/projects/priceiq && npm test 2>&1 | tail -10
```

Expected: all tests pass (the fit-model route test doesn't call Prisma directly, so schema changes don't break it).

- [ ] **Step 10: Commit**

```bash
cd /c/Users/pohde/projects/priceiq && git add prisma/schema.prisma src/app/api/products/[id]/fit-model/route.ts src/lib/elasticity/generateRecommendation.ts src/lib/elasticity/generateRecommendation.test.ts src/app/api/products/[id]/recommend/route.ts && git commit -m "feat: wire confidence-weighted pipeline — shrinkage, confidence score, narrow scan"
```

---

### Task 4: UI — Confidence in `ModelHealthBadge` + Recommendation Reasoning

**Goal:** Surface `confidenceScore` in the `ModelHealthBadge` component (replacing the ad-hoc r²/dataPoints tier thresholds) and thread it through all call sites so the badge reflects real model confidence.

**Files:**
- Modify: `src/components/ModelHealthBadge.tsx`
- Modify: `src/app/api/products/route.ts`
- Modify: `src/components/ProductsTable.tsx`
- Modify: `src/components/RecommendationCard.tsx`
- Modify: `src/app/product/[id]/page.tsx`
- Modify: `src/components/DemandCurve.tsx`

**Acceptance Criteria:**
- [ ] `ModelHealthBadge` accepts optional `confidenceScore?: number | null`; when provided, uses it for tier thresholds (≥0.7 → Strong, ≥0.4 → Fair, < 0.4 → Weak); falls back to legacy r²/dataPoints logic when absent
- [ ] Badge tooltip shows `confidence: X%` when `confidenceScore` is provided
- [ ] `GET /api/products` includes `confidenceScore` in `modelHealth`
- [ ] `ProductsTable` Row type includes `modelHealth.confidenceScore` and passes it to the badge
- [ ] `RecommendationCard` `MLRecView` includes optional `confidenceScore?`; it passes it to the badge
- [ ] `parseRecView` in `product/[id]/page.tsx` parses `confidenceScore` from `rulesJson`
- [ ] `DemandCurve` passes `model.confidenceScore` to the badge

**Verify:** `npm test` → all pass. Visually: fitting a model and getting a recommendation shows updated badge tier based on confidence score.

**Steps:**

- [ ] **Step 1: Update `src/components/ModelHealthBadge.tsx`**

Replace the entire file:

```tsx
interface Props {
  r2: number | null;
  dataPoints: number | null;
  confidenceScore?: number | null;
  size?: "sm" | "md";
}

type Tier = "strong" | "fair" | "weak" | "none";

function getTier(
  r2: number | null | undefined,
  dataPoints: number | null | undefined,
  confidenceScore?: number | null
): Tier {
  if (r2 == null || dataPoints == null) return "none";
  if (confidenceScore != null) {
    if (confidenceScore >= 0.7) return "strong";
    if (confidenceScore >= 0.4) return "fair";
    return "weak";
  }
  // Legacy fallback when confidenceScore not yet stored
  if (r2 >= 0.7 && dataPoints >= 30) return "strong";
  if (r2 >= 0.5 && dataPoints >= 10) return "fair";
  return "weak";
}

const TIER_CONFIG: Record<Tier, { label: string; dot: string; text: string; bg: string }> = {
  strong: { label: "Strong", dot: "bg-positive",  text: "text-positive", bg: "bg-[color:oklch(0.96_0.04_150)]" },
  fair:   { label: "Fair",   dot: "bg-warning",   text: "text-warning",  bg: "bg-[color:oklch(0.96_0.04_65)]"  },
  weak:   { label: "Weak",   dot: "bg-danger",    text: "text-danger",   bg: "bg-danger-soft"                   },
  none:   { label: "No model", dot: "bg-faint",   text: "text-faint",    bg: "bg-panel"                         },
};

export function ModelHealthBadge({ r2, dataPoints, confidenceScore, size = "md" }: Props) {
  const tier = getTier(r2, dataPoints, confidenceScore);
  const cfg = TIER_CONFIG[tier];

  const title =
    tier === "none"
      ? "No elasticity model fitted yet"
      : confidenceScore != null
        ? `Confidence: ${Math.round(confidenceScore * 100)}% · R²=${r2?.toFixed(2) ?? "?"}, ${dataPoints} data points`
        : `R²=${r2?.toFixed(2) ?? "?"}, ${dataPoints} data points`;

  if (size === "sm") {
    return (
      <span title={title} className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[0.68rem] font-medium ${cfg.text} ${cfg.bg}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
        {cfg.label}
      </span>
    );
  }

  return (
    <span title={title} className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium ${cfg.text} ${cfg.bg}`}>
      <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
      {cfg.label} fit
      {tier !== "none" && (
        <span className="ml-0.5 font-normal opacity-70">
          {confidenceScore != null
            ? `· ${Math.round(confidenceScore * 100)}% conf`
            : `· R²=${r2?.toFixed(2) ?? "?"} · ${dataPoints} pts`}
        </span>
      )}
    </span>
  );
}
```

- [ ] **Step 2: Update `src/app/api/products/route.ts`**

Read the file. Find the `modelHealth` mapping (currently `{ r2, dataPoints }`) and add `confidenceScore`:

```ts
// Find this section and update it:
modelHealth: p.elasticityModel
  ? {
      r2: p.elasticityModel.r2,
      dataPoints: p.elasticityModel.dataPoints,
      confidenceScore: p.elasticityModel.confidenceScore,
    }
  : null,
```

- [ ] **Step 3: Update `src/components/ProductsTable.tsx`**

Read the file. Find the `Row` interface's `modelHealth` type and add `confidenceScore`:

```ts
// Update Row.modelHealth type:
modelHealth: { r2: number; dataPoints: number; confidenceScore: number } | null;
```

Find the `<ModelHealthBadge ...>` JSX and add `confidenceScore` prop:

```tsx
<ModelHealthBadge
  r2={r.modelHealth?.r2 ?? null}
  dataPoints={r.modelHealth?.dataPoints ?? null}
  confidenceScore={r.modelHealth?.confidenceScore ?? null}
  size="sm"
/>
```

- [ ] **Step 4: Update `src/components/RecommendationCard.tsx`**

Read the file. Add `confidenceScore?` to `MLRecView` and pass it to the badge:

```ts
export interface MLRecView {
  action: "raise" | "lower" | "hold";
  suggestedPriceCents: number;
  reasoning: string;
  r2: number;
  dataPoints: number;
  expectedProfitLiftPct: number;
  confidenceScore?: number | null;
}
```

Find `<ModelHealthBadge r2={rec.r2} dataPoints={rec.dataPoints} />` and update:

```tsx
<ModelHealthBadge r2={rec.r2} dataPoints={rec.dataPoints} confidenceScore={rec.confidenceScore ?? null} />
```

- [ ] **Step 5: Update `parseRecView` in `src/app/product/[id]/page.tsx`**

Read the file. Find the `parseRecView` function and update the `rules` type and return value to include `confidenceScore`:

```ts
function parseRecView(rec: RecData): MLRecView | null {
  try {
    const rules = JSON.parse(rec.rulesJson) as {
      suggestedPriceCents: number;
      expectedProfitLiftPct: number;
      r2: number;
      dataPoints: number;
      confidenceScore?: number;
    };
    return {
      action: rec.action,
      suggestedPriceCents: rules.suggestedPriceCents,
      reasoning: rec.phrasing,
      r2: rules.r2,
      dataPoints: rules.dataPoints,
      expectedProfitLiftPct: rules.expectedProfitLiftPct,
      confidenceScore: rules.confidenceScore ?? null,
    };
  } catch {
    return null;
  }
}
```

- [ ] **Step 6: Update `src/components/DemandCurve.tsx`**

Read the file. Find `<ModelHealthBadge r2={model.r2} dataPoints={model.dataPoints} size="sm" />` and add `confidenceScore`. The `model` object comes from the elasticity model API response — check what type it is and whether it now includes `confidenceScore`. If the component receives the full model object from the fit-model API response (which now includes `confidenceScore`), add the prop:

```tsx
<ModelHealthBadge
  r2={model.r2}
  dataPoints={model.dataPoints}
  confidenceScore={model.confidenceScore ?? null}
  size="sm"
/>
```

If the type used in `DemandCurve.tsx` doesn't yet include `confidenceScore`, add it to that interface.

- [ ] **Step 7: Run full test suite**

```bash
cd /c/Users/pohde/projects/priceiq && npm test 2>&1 | tail -10
```

Expected: all tests pass.

- [ ] **Step 8: Commit**

```bash
cd /c/Users/pohde/projects/priceiq && git add src/components/ModelHealthBadge.tsx src/app/api/products/route.ts src/components/ProductsTable.tsx src/components/RecommendationCard.tsx src/app/product/[id]/page.tsx src/components/DemandCurve.tsx && git commit -m "feat: surface confidenceScore in ModelHealthBadge and all call sites"
```

---

## Self-Review

### Spec Coverage

| Requirement | Task |
|-------------|------|
| Time-decay weighting (recent sales matter more) | Task 1 |
| `effectiveSampleSize` exposed from fit | Task 1 |
| Bayesian shrinkage toward −1.2 prior | Task 2 |
| `confidenceScore` = r² × min(1, n/20) | Task 2 |
| Schema columns for new fields | Task 3 |
| Fit-model route applies shrinkage + stores confidence | Task 3 |
| Recommend route uses confidence for scan range | Task 3 |
| Low-confidence note in reasoning | Task 3 |
| `ModelHealthBadge` uses confidenceScore for tier | Task 4 |
| Badge tooltip shows confidence % | Task 4 |
| All call sites threaded | Task 4 |

### Features Deferred

- **Category-level prior** (−1.2 used for all categories): a per-category prior would require enough products per category to estimate the mean — deferred until merchant data grows.
- **Prior strength auto-tuning**: fixed at 5 phantom points. Could be calibrated empirically. Not worth the complexity in Phase 3.
- **Confidence shown on portfolio dashboard**: `PortfolioTrendChart` and `PortfolioStats` don't use model confidence — no natural place to surface it there without UI restructuring.

### Placeholder Scan

No TBDs. Every step has complete code or a specific grep/read instruction.

### Type Consistency

- `ElasticityResult.effectiveSampleSize` (Task 1) → used by `bayesianShrinkage` (Task 2) → stored to DB as `ElasticityModel.effectiveSampleSize` (Task 3) → not exposed in API yet (intentional — UI doesn't need raw effective sample size, only `confidenceScore`)
- `ElasticityModelParams.confidenceScore?` (Task 3) → optional in interface so existing call sites (tests with no `confidenceScore`) remain valid
- `MLRecView.confidenceScore?` (Task 4) → optional so that existing recommendations without it in `rulesJson` don't break `parseRecView`
