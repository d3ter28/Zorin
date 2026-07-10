# Profit Opportunity Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:subagent-driven-development (recommended) or superpowers-extended-cc:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a fifth stat card to the dashboard Overview that shows total estimated gross profit uplift if all current recommendations are applied, with a prompt state when no opportunities exist.

**Architecture:** Extend the existing `/api/products/portfolio` GET route to compute `profitOpportunityCents` by running `simulateProfit` against each product that has a fitted model and a non-hold recommendation. The `PortfolioStats` component receives the new field and renders a fifth card — a green dollar figure when opportunities exist, or a dashed-border prompt linking to the Products tab when they don't.

**Tech Stack:** Next.js App Router, TypeScript, Vitest, Prisma (SQLite), Tailwind v4 design tokens.

**User decisions (already made):**
- Layout: stat card (5th in existing grid, not a banner or separate section)
- Metric: gross profit uplift in dollars (not revenue)
- Empty/zero state: show a prompt "Fit models to unlock profit opportunities" with "Go to Products →" link

---

## File Map

| File | Change |
|---|---|
| `src/app/api/products/portfolio/route.ts` | Import `simulateProfit`, add computation loop, return `profitOpportunityCents` |
| `src/app/api/products/portfolio/route.test.ts` | New — tests for `profitOpportunityCents` field |
| `src/components/PortfolioStats.tsx` | Add field to interface, add `onGoToProducts` prop, widen grid, add 5th card |
| `src/components/Dashboard.tsx` | Pass `onGoToProducts` prop to `<PortfolioStats>` |

---

### Task 1: Add profitOpportunityCents to portfolio API

**Goal:** The GET `/api/products/portfolio` response includes `profitOpportunityCents: number` — the sum of estimated gross profit uplift across all products with a fitted model and a non-hold recommendation.

**Files:**
- Modify: `src/app/api/products/portfolio/route.ts`
- Create: `src/app/api/products/portfolio/route.test.ts`

**Acceptance Criteria:**
- [ ] Response JSON includes `profitOpportunityCents` as a number (never null, never missing)
- [ ] Products with `cogs === null` are skipped
- [ ] Products with `recommendation.action === "hold"` are skipped
- [ ] Products with unparseable `rulesJson` are skipped (no throw)
- [ ] Products where `predictedGrossProfitCents <= 0` are skipped
- [ ] When no products qualify, `profitOpportunityCents` is `0`
- [ ] All 5 tests pass: `npx vitest run src/app/api/products/portfolio/route.test.ts`

**Verify:** `npx vitest run src/app/api/products/portfolio/route.test.ts` → 5 passed

**Steps:**

- [ ] **Step 1: Write the failing tests**

Create `src/app/api/products/portfolio/route.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const { findMany } = vi.hoisted(() => ({
  findMany: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    product: { findMany },
  },
}));

vi.mock("@/lib/auth/requireSession", () => ({
  requireSessionApi: vi.fn(async () => ({
    merchantId: "m1",
    user: { id: "u1", email: "test@example.com", merchantId: "m1" },
  })),
}));

import { GET } from "./route";

const req = () => ({}) as unknown as Request;

// A product with a model and recommendation that qualifies.
// elasticity=-1.5, intercept=8.0, currentPrice=10000 cents ($100), cogs=4000 cents ($40)
// predictedUnits = exp(8.0 + (-1.5)*ln(10000)) = exp(8.0 - 13.816) = exp(-5.816) ≈ 0.00298
// (units are small because this is a synthetic model — the key is the sign)
// predictedGrossProfit = 0.00298 * (10000 - 4000) = 0.01788 > 0
// opportunity = 0.01788 * 0.10 ≈ 0.001788 cents
// We just assert it's > 0 since exact float math varies.
const qualifyingProduct = {
  id: "p1",
  merchantId: "m1",
  title: "Widget",
  sku: "SKU-001",
  currentPrice: 10000,
  cogs: 4000,
  estUnits: 50,
  category: "test",
  elasticityModel: {
    elasticity: -1.5,
    intercept: 8.0,
    r2: 0.8,
    dataPoints: 20,
    confidenceScore: 0.7,
  },
  recommendation: {
    action: "lower",
    phrasing: "lower price",
    rulesJson: JSON.stringify({
      suggestedPriceCents: 9500,
      expectedProfitLiftPct: 0.10,
      r2: 0.8,
      dataPoints: 20,
    }),
  },
  priceChanges: [],
};

beforeEach(() => {
  findMany.mockReset();
});

describe("GET /api/products/portfolio — profitOpportunityCents", () => {
  it("returns profitOpportunityCents > 0 when a qualifying product exists", async () => {
    findMany.mockResolvedValue([qualifyingProduct]);

    const res = await GET(req());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(typeof body.profitOpportunityCents).toBe("number");
    expect(body.profitOpportunityCents).toBeGreaterThan(0);
  });

  it("returns 0 when product has null cogs", async () => {
    findMany.mockResolvedValue([{ ...qualifyingProduct, cogs: null }]);

    const res = await GET(req());
    const body = await res.json();

    expect(body.profitOpportunityCents).toBe(0);
  });

  it("returns 0 when recommendation action is hold", async () => {
    findMany.mockResolvedValue([{
      ...qualifyingProduct,
      recommendation: {
        action: "hold",
        phrasing: "hold",
        rulesJson: JSON.stringify({ suggestedPriceCents: 10000, expectedProfitLiftPct: 0, r2: 0.8, dataPoints: 20 }),
      },
    }]);

    const res = await GET(req());
    const body = await res.json();

    expect(body.profitOpportunityCents).toBe(0);
  });

  it("returns 0 when product has no elasticity model", async () => {
    findMany.mockResolvedValue([{ ...qualifyingProduct, elasticityModel: null }]);

    const res = await GET(req());
    const body = await res.json();

    expect(body.profitOpportunityCents).toBe(0);
  });

  it("skips product with unparseable rulesJson without throwing", async () => {
    findMany.mockResolvedValue([{
      ...qualifyingProduct,
      recommendation: { action: "lower", phrasing: "lower", rulesJson: "not-json" },
    }]);

    const res = await GET(req());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.profitOpportunityCents).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run src/app/api/products/portfolio/route.test.ts
```

Expected: 5 failing (property `profitOpportunityCents` missing from response).

- [ ] **Step 3: Implement profitOpportunityCents in the route**

Open `src/app/api/products/portfolio/route.ts`. Add the import at the top (after the existing imports):

```ts
import { simulateProfit } from "@/lib/elasticity/simulateProfit";
```

After the existing `belowFloor` computation (around line 72), add:

```ts
  let profitOpportunityCents = 0;
  for (const p of products) {
    if (!p.elasticityModel || !p.recommendation || p.cogs === null) continue;
    if (p.recommendation.action === "hold") continue;
    let expectedProfitLiftPct: number;
    try {
      const rules = JSON.parse(p.recommendation.rulesJson) as { expectedProfitLiftPct: number };
      if (typeof rules.expectedProfitLiftPct !== "number") continue;
      expectedProfitLiftPct = rules.expectedProfitLiftPct;
    } catch {
      continue;
    }
    const sim = simulateProfit({
      elasticity: p.elasticityModel.elasticity,
      intercept: p.elasticityModel.intercept,
      currentPriceCents: p.currentPrice,
      candidatePriceCents: p.currentPrice,
      cogsCents: p.cogs,
    });
    if (sim.predictedGrossProfitCents <= 0) continue;
    profitOpportunityCents += sim.predictedGrossProfitCents * expectedProfitLiftPct;
  }
```

In the `return NextResponse.json({...})` call, add `profitOpportunityCents` to the returned object:

```ts
  return NextResponse.json({
    totalProducts,
    avgMargin,
    avgProfitLiftPct,
    belowFloor,
    modelHealth: { strong: modelsStrong, fair: modelsFair, weak: modelsWeak, none: modelsNone },
    actions: { raise: actionsRaise, lower: actionsLower, hold: actionsHold },
    hasModels,
    hasAppliedPrice,
    profitOpportunityCents,
  });
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx vitest run src/app/api/products/portfolio/route.test.ts
```

Expected: 5 passed.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/products/portfolio/route.ts src/app/api/products/portfolio/route.test.ts
git commit -m "feat: add profitOpportunityCents to portfolio API"
```

---

### Task 2: Render Profit Opportunity stat card

**Goal:** `PortfolioStats` renders a fifth stat card showing the profit opportunity in dollars (green value) or a dashed-border prompt with "Go to Products →" when there are no opportunities.

**Files:**
- Modify: `src/components/PortfolioStats.tsx`
- Modify: `src/components/Dashboard.tsx`

**Acceptance Criteria:**
- [ ] When `profitOpportunityCents > 0`: fifth card shows `+$X.XX` in green with sub-label `est. if all recs applied`
- [ ] When `profitOpportunityCents === 0`: fifth card shows dashed border, text `Fit models to unlock profit opportunities`, and a `Go to Products →` button
- [ ] Clicking `Go to Products →` switches the dashboard to the Products tab
- [ ] Dev server shows no TypeScript errors: `npx tsc --noEmit`

**Verify:** Start dev server, visit `/dashboard`, confirm fifth card renders in both states (with a fitted model → value; without → prompt).

**Steps:**

- [ ] **Step 1: Update PortfolioStats interface and props**

In `src/components/PortfolioStats.tsx`, update the `PortfolioData` interface to add the new field:

```ts
interface PortfolioData {
  totalProducts: number;
  avgMargin: number | null;
  avgProfitLiftPct: number | null;
  modelHealth: { strong: number; fair: number; weak: number; none: number };
  actions: { raise: number; lower: number; hold: number };
  belowFloor: number;
  profitOpportunityCents: number;
}
```

Update the `PortfolioStats` function signature to accept `onGoToProducts`:

```ts
export function PortfolioStats({
  refreshToken,
  onGoToProducts,
}: {
  refreshToken: number;
  onGoToProducts?: () => void;
}) {
```

Add `formatCents` to the import from `@/lib/money` (it currently only imports `pct`):

```ts
import { pct, formatCents } from "@/lib/money";
```

- [ ] **Step 2: Destructure the new field and widen the grid**

In the return JSX, find the `<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">` and change it to `sm:grid-cols-5`:

```tsx
<div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
```

Update the destructuring of `data` to include `profitOpportunityCents`:

```ts
const { totalProducts, avgMargin, avgProfitLiftPct, modelHealth, actions, belowFloor, profitOpportunityCents } = data;
```

- [ ] **Step 3: Add the fifth stat card**

After the existing fourth `<StatCard>` (the `Avg profit lift` one), add:

```tsx
{profitOpportunityCents > 0 ? (
  <StatCard
    label="Profit Opportunity"
    value={`+${formatCents(Math.round(profitOpportunityCents))}`}
    sub="est. if all recs applied"
    accent="positive"
  />
) : (
  <div className="flex flex-col gap-1 rounded-xl border border-dashed border-line bg-surface px-5 py-4">
    <span className="text-[0.7rem] font-medium uppercase tracking-wide text-muted">
      Profit Opportunity
    </span>
    <p className="mt-1 text-xs leading-snug text-muted">
      Fit models to unlock profit opportunities
    </p>
    {onGoToProducts && (
      <button
        onClick={onGoToProducts}
        className="mt-1 text-left text-xs font-medium text-accent hover:underline"
      >
        Go to Products →
      </button>
    )}
  </div>
)}
```

- [ ] **Step 4: Pass onGoToProducts from Dashboard**

In `src/components/Dashboard.tsx`, find the `<PortfolioStats>` usage and add the prop:

```tsx
<PortfolioStats refreshToken={refreshToken} onGoToProducts={() => setTab("products")} />
```

- [ ] **Step 5: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors. Fix any type errors before continuing.

- [ ] **Step 6: Visual verify**

Start the dev server (`npm run dev`) and open `http://localhost:3000/dashboard`. Confirm:
- The stat row now has 5 cards.
- With the Dumbbell fitted and a recommendation: the fifth card shows `+$XX.XX` in green.
- If you delete all models/recs (or use a fresh account): the fifth card shows the dashed-border prompt with `Go to Products →`.
- Clicking `Go to Products →` switches to the Products tab.

- [ ] **Step 7: Commit**

```bash
git add src/components/PortfolioStats.tsx src/components/Dashboard.tsx
git commit -m "feat: add profit opportunity stat card to dashboard overview"
```
