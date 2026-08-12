# Profit Tracking Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:subagent-driven-development (recommended) or superpowers-extended-cc:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single `/profit` page showing real P&L over time, per-product profit ranking, and before/after campaign performance — the context layer that quantifies Zorin's recommendations and campaigns.

**Architecture:** A new `CogsChange` audit table records COGS edits over time. One pure, Prisma-free module (`src/lib/profit/computeProfit.ts`) does all the profit math from `SalesRecord` + COGS history, flagging figures that fell back to current COGS. Three thin API routes wrap it, and three components render on one `/profit` page. Campaign performance uses a before/after window comparison (labeled a period comparison, never causal).

**Tech Stack:** Next.js 16.2.9 (App Router, Turbopack), TypeScript, Prisma 7 (SQLite dev / Postgres prod), Vitest 4, Tailwind v4 (OKLCH tokens), pure-SVG charts (no charting dependency).

**User decisions (already made):**
- "All three pieces are equal priority" — P&L trend, per-product profit, campaign performance; none dropped.
- "COGS history via a `CogsChange` audit trail" — pre-tracking figures fall back to current COGS, labeled "estimated from current costs."
- "Campaign attribution = before/after comparison (headline) + raw actuals, labeled 'vs prior period,' never 'caused by.'" No elasticity counterfactual, no seasonality adjustment.
- "One new top-level 'Profit' page" with summary cards → P&L trend → per-product leaderboard → campaign performance, in that order.
- "One implementation plan," foundation-first.

**Reference spec:** `docs/superpowers/specs/2026-08-12-profit-tracking-dashboard-design.md`

---

## CRITICAL environment notes (read before Task 1)

1. **Two schema files.** `scripts/prepare-prod.mjs` copies `prisma/schema.production.prisma` OVER `prisma/schema.prisma` at build time. **Every schema change MUST be made in BOTH files** — `schema.prisma` (SQLite, dev, `provider = "sqlite"`) and `schema.production.prisma` (Postgres, prod, `provider = "postgresql"`). If you only edit one, production silently misses the change.
2. **Money is integer cents everywhere.** Never introduce floats for money except at the final `formatCents` display boundary.
3. **Test runner:** `npx vitest run` (all) or `npx vitest run <path>` (one file). Baseline is 819 passing tests — do not regress.
4. **Read before coding:** `node_modules/next/dist/docs/` for any Next.js 16 specifics (async route params are `Promise<{...}>` and must be awaited).
5. **Pure-module convention:** the math module takes already-fetched plain rows (no Prisma types, no DB calls) so it is unit-testable with fixtures — mirror `src/lib/pricing/marketStats.ts` and `src/lib/priceSurvey/vanWestendorp.ts`.

---

## File Structure

**Created:**
- `src/lib/profit/computeProfit.ts` — pure profit math (COGS-at-date primitive + P&L/product/window helpers)
- `src/lib/profit/computeProfit.test.ts` — exhaustive unit tests for the above
- `src/app/api/profit/trend/route.ts` — monthly P&L API
- `src/app/api/profit/trend/route.test.ts`
- `src/app/api/profit/products/route.ts` — per-product profit API
- `src/app/api/profit/products/route.test.ts`
- `src/app/api/profit/campaigns/route.ts` — campaign performance API
- `src/app/api/profit/campaigns/route.test.ts`
- `src/app/profit/page.tsx` — the Profit page (server component)
- `src/components/ProfitSummaryCards.tsx` + `.test.tsx`
- `src/components/ProfitTrendChart.tsx` + `.test.tsx`
- `src/components/ProductProfitTable.tsx` + `.test.tsx`
- `src/components/CampaignPerformanceList.tsx` + `.test.tsx`

**Modified:**
- `prisma/schema.prisma` and `prisma/schema.production.prisma` — add `CogsChange` model + `Product.cogsChanges` relation
- `src/app/api/products/[id]/cogs/route.ts` — log a `CogsChange` on edit
- `src/lib/products/importProducts.ts` — log a `CogsChange` when CSV import changes COGS
- `src/components/Sidebar.tsx` — add the Profit nav item

---

### Task 1: `CogsChange` schema + audit wiring

**Goal:** Add the `CogsChange` model to both schema files and append an audit row wherever COGS actually changes (inline edit + CSV import).

**Files:**
- Modify: `prisma/schema.prisma` (add model + relation, `provider = "sqlite"`)
- Modify: `prisma/schema.production.prisma` (identical model + relation, `provider = "postgresql"`)
- Modify: `src/app/api/products/[id]/cogs/route.ts`
- Modify: `src/lib/products/importProducts.ts`
- Test: `src/lib/products/importProducts.test.ts` (extend existing)
- Test: `src/app/api/products/[id]/cogs/route.test.ts` (extend existing)

**Acceptance Criteria:**
- [ ] `CogsChange` model exists identically in both schema files with `@@index([productId, changedAt])`
- [ ] `Product` has a `cogsChanges CogsChange[]` relation in both files
- [ ] `npx prisma migrate dev --name add-cogs-change` succeeds against dev SQLite
- [ ] Editing COGS via `POST /api/products/[id]/cogs` writes a `CogsChange` row with `fromCents` = prior value, `toCents` = new value, `source: "manual_edit"`
- [ ] CSV import writes a `CogsChange` only for rows whose COGS differs from the existing value (or first-set); unchanged COGS writes no row
- [ ] `npx vitest run src/app/api/products/[id]/cogs src/lib/products/importProducts` passes

**Verify:** `npx vitest run src/app/api/products/[id]/cogs src/lib/products/importProducts` → all pass; `npx prisma migrate dev --name add-cogs-change` → "in sync"

**Steps:**

- [ ] **Step 1: Add the model to `prisma/schema.prisma`.** Append after the `CampaignLog` model (end of file):

```prisma
model CogsChange {
  id         String   @id @default(cuid())
  productId  String
  product    Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  merchantId String
  fromCents  Int?
  toCents    Int
  source     String
  changedAt  DateTime @default(now())

  @@index([productId, changedAt])
}
```

Add the reverse relation to the `Product` model (in the relations block, alongside `campaignProducts`):

```prisma
  cogsChanges          CogsChange[]
```

- [ ] **Step 2: Make the identical edits to `prisma/schema.production.prisma`.** Same `CogsChange` model, same `cogsChanges CogsChange[]` line on `Product`. The ONLY difference between the files is the datasource provider — do not change anything else.

- [ ] **Step 3: Generate the migration.**

Run: `npx prisma migrate dev --name add-cogs-change`
Expected: creates `prisma/migrations/<timestamp>_add_cogs_change/` and prints "Your database is now in sync with your schema."

- [ ] **Step 4: Write the failing test for the COGS edit route.** Add to `src/app/api/products/[id]/cogs/route.test.ts` (create the mock surface if the file currently mocks a narrower prisma). The route currently mocks `prisma`; extend the mock to include `cogsChange.create` and `product.findUnique`. Add:

```typescript
it("logs a CogsChange with prior and new value on edit", async () => {
  // product currently has cogs 4000
  productFindUnique.mockResolvedValue({ id: "p1", merchantId: "m1", cogs: 4000 });
  const res = await POST(reqWithBody({ cogs: 5000 }), { params: Promise.resolve({ id: "p1" }) });
  expect(res.status).toBe(200);
  expect(cogsChangeCreate).toHaveBeenCalledWith({
    data: { productId: "p1", merchantId: "m1", fromCents: 4000, toCents: 5000, source: "manual_edit" },
  });
});

it("logs fromCents null when prior cogs was null", async () => {
  productFindUnique.mockResolvedValue({ id: "p1", merchantId: "m1", cogs: null });
  await POST(reqWithBody({ cogs: 5000 }), { params: Promise.resolve({ id: "p1" }) });
  expect(cogsChangeCreate).toHaveBeenCalledWith({
    data: { productId: "p1", merchantId: "m1", fromCents: null, toCents: 5000, source: "manual_edit" },
  });
});

it("does NOT log a CogsChange when the value is unchanged", async () => {
  productFindUnique.mockResolvedValue({ id: "p1", merchantId: "m1", cogs: 4000 });
  await POST(reqWithBody({ cogs: 4000 }), { params: Promise.resolve({ id: "p1" }) });
  expect(cogsChangeCreate).not.toHaveBeenCalled();
});

it("does NOT log when new cogs is null (cleared)", async () => {
  productFindUnique.mockResolvedValue({ id: "p1", merchantId: "m1", cogs: 4000 });
  await POST(reqWithBody({ cogs: null }), { params: Promise.resolve({ id: "p1" }) });
  expect(cogsChangeCreate).not.toHaveBeenCalled();
});
```

Wire the mocks at the top of the test file (hoisted pattern already used in this repo):

```typescript
const { productUpdate, productFindUnique, cogsChangeCreate, recommendationDeleteMany } = vi.hoisted(() => ({
  productUpdate: vi.fn(async () => ({})),
  productFindUnique: vi.fn(),
  cogsChangeCreate: vi.fn(async () => ({})),
  recommendationDeleteMany: vi.fn(async () => ({})),
}));
vi.mock("@/lib/db", () => ({
  prisma: {
    product: { update: productUpdate, findUnique: productFindUnique },
    cogsChange: { create: cogsChangeCreate },
    recommendation: { deleteMany: recommendationDeleteMany },
  },
}));
vi.mock("@/lib/auth/requireSession", () => ({
  requireSessionApi: vi.fn(async () => ({ merchantId: "m1", user: { id: "u1", email: "e", merchantId: "m1" } })),
}));
vi.mock("@/lib/auth/ownership", () => ({ assertProductOwned: vi.fn(async () => {}) }));

function reqWithBody(body: unknown): Request {
  return new Request("http://t/api/products/p1/cogs", { method: "POST", body: JSON.stringify(body) });
}
```

- [ ] **Step 5: Run the test to confirm it fails.**

Run: `npx vitest run src/app/api/products/[id]/cogs`
Expected: FAIL — `cogsChangeCreate` not called (route doesn't log yet).

- [ ] **Step 6: Update the COGS route to log.** Rewrite `src/app/api/products/[id]/cogs/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withErrorHandling } from "@/lib/api/errors";
import { parseCogs, parseJsonBody } from "@/lib/api/validation";
import { requireSessionApi } from "@/lib/auth/requireSession";
import { assertProductOwned } from "@/lib/auth/ownership";

export const POST = withErrorHandling(
  async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { merchantId } = await requireSessionApi();
    const { id } = await params;
    await assertProductOwned(prisma, id, merchantId);
    const body = await parseJsonBody(req);
    const cogs = parseCogs(body.cogs);

    const existing = await prisma.product.findUnique({ where: { id }, select: { cogs: true } });
    const prior = existing?.cogs ?? null;

    await prisma.product.update({ where: { id }, data: { cogs } });

    // Log an audit row only when a non-null cost actually changed. A cleared
    // (null) cost, or an unchanged value, does not start/continue history.
    if (cogs !== null && cogs !== prior) {
      await prisma.cogsChange.create({
        data: { productId: id, merchantId, fromCents: prior, toCents: cogs, source: "manual_edit" },
      });
    }

    // Invalidate cached recommendation.
    await prisma.recommendation.deleteMany({ where: { productId: id } });

    return NextResponse.json({ ok: true });
  },
);
```

- [ ] **Step 7: Run the route test to confirm it passes.**

Run: `npx vitest run src/app/api/products/[id]/cogs`
Expected: PASS.

- [ ] **Step 8: Wire CSV import logging.** Modify `src/lib/products/importProducts.ts`. Widen the `PrismaSurface` type and record changes. Replace the `PrismaSurface` type and the update/create loop:

```typescript
type PrismaSurface = Pick<PrismaClient, "product" | "recommendation" | "cogsChange">;
```

In the update branch, capture the prior cogs before updating and log if changed. Replace the update branch body:

```typescript
    if (id) {
      const before = existing.find((e) => e.id === id);
      const priorCogs = before?.cogs ?? null;
      await prisma.product.update({
        where: { id },
        data: {
          title: r.title,
          currentPrice: r.currentPriceCents,
          category: r.category,
          cogs: r.cogsCents,
          estUnits: r.estUnits,
          imageUrl: r.imageUrl,
        },
      });
      if (r.cogsCents !== null && r.cogsCents !== priorCogs) {
        await prisma.cogsChange.create({
          data: { productId: id, merchantId, fromCents: priorCogs, toCents: r.cogsCents, source: "csv_import" },
        });
      }
      touched.push(id);
      updated++;
    } else {
      const created = await prisma.product.create({
        data: {
          merchantId,
          sku: r.sku,
          title: r.title,
          currentPrice: r.currentPriceCents,
          category: r.category,
          cogs: r.cogsCents,
          estUnits: r.estUnits,
          imageUrl: r.imageUrl,
        },
      });
      if (r.cogsCents !== null) {
        await prisma.cogsChange.create({
          data: { productId: created.id, merchantId, fromCents: null, toCents: r.cogsCents, source: "csv_import" },
        });
      }
      inserted++;
    }
```

Note: `existing` already holds the pre-update rows (fetched once at the top), so `before.cogs` is the prior value even after other rows in the same import touched the DB.

- [ ] **Step 9: Add CSV import tests.** Append to `src/lib/products/importProducts.test.ts` (it already builds a fake prisma; add a `cogsChange: { create: vi.fn() }` to that fake and assert):

```typescript
it("logs a CogsChange when an imported row changes an existing product's cogs", async () => {
  // existing product SKU-1 has cogs 1000; import sets 2000
  const summary = await importProducts(fakePrisma, "m1", parsedWith({ sku: "SKU-1", cogsCents: 2000 }));
  expect(summary.updated).toBe(1);
  expect(cogsChangeCreate).toHaveBeenCalledWith({
    data: { productId: "existing-1", merchantId: "m1", fromCents: 1000, toCents: 2000, source: "csv_import" },
  });
});

it("does NOT log a CogsChange when imported cogs matches existing", async () => {
  await importProducts(fakePrisma, "m1", parsedWith({ sku: "SKU-1", cogsCents: 1000 }));
  expect(cogsChangeCreate).not.toHaveBeenCalled();
});

it("logs a first-set CogsChange (fromCents null) for a newly created product", async () => {
  await importProducts(fakePrisma, "m1", parsedWith({ sku: "SKU-NEW", cogsCents: 3000 }));
  expect(cogsChangeCreate).toHaveBeenCalledWith(
    expect.objectContaining({ data: expect.objectContaining({ fromCents: null, toCents: 3000, source: "csv_import" }) }),
  );
});
```

Adapt `parsedWith`/`fakePrisma`/`existing` to the existing test file's helpers (match its current shape; the existing product's id in that file is whatever it seeds — use that id, shown here as `existing-1`).

- [ ] **Step 10: Run import tests.**

Run: `npx vitest run src/lib/products/importProducts`
Expected: PASS.

- [ ] **Step 11: Commit.**

```bash
git add prisma/schema.prisma prisma/schema.production.prisma prisma/migrations/ src/app/api/products/[id]/cogs/route.ts src/app/api/products/[id]/cogs/route.test.ts src/lib/products/importProducts.ts src/lib/products/importProducts.test.ts
git commit -m "feat(profit): add CogsChange audit trail on cogs edit and CSV import"
```

---

### Task 2: `computeProfit` pure module

**Goal:** A pure, Prisma-free module that computes COGS-at-date and rolls sales into monthly P&L, per-product profit, and windowed profit — flagging any figure that fell back to current COGS.

**Files:**
- Create: `src/lib/profit/computeProfit.ts`
- Test: `src/lib/profit/computeProfit.test.ts`

**Acceptance Criteria:**
- [ ] `cogsInEffectOn` returns the latest change at-or-before the date; falls back to current COGS with `estimated: true` when the date predates all changes or none exist
- [ ] `monthlyPnL` returns one bucket per month over the window with `revenueCents`/`cogsCents`/`grossProfitCents`/`estimated`, excluding rows with no COGS
- [ ] `productProfit` returns per-product totals with `marginPct` (null when revenue is 0) and `estimated`
- [ ] `windowProfitForProducts` sums the given product set between two dates and reports `hasSales`
- [ ] All money is integer cents; no `NaN` ever returned
- [ ] `npx vitest run src/lib/profit/computeProfit` passes

**Verify:** `npx vitest run src/lib/profit/computeProfit` → all pass

**Steps:**

- [ ] **Step 1: Write the failing tests.** Create `src/lib/profit/computeProfit.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import {
  cogsInEffectOn,
  monthlyPnL,
  productProfit,
  windowProfitForProducts,
  type CogsChangeRow,
  type SalesRow,
} from "./computeProfit";

const d = (s: string) => new Date(s + "T00:00:00Z");

describe("cogsInEffectOn", () => {
  const changes: CogsChangeRow[] = [
    { toCents: 1000, changedAt: d("2026-01-01") },
    { toCents: 1500, changedAt: d("2026-06-01") },
  ];

  it("returns the change in effect at the date (not estimated)", () => {
    expect(cogsInEffectOn(changes, 2000, d("2026-03-01"))).toEqual({ cogsCents: 1000, estimated: false });
    expect(cogsInEffectOn(changes, 2000, d("2026-07-01"))).toEqual({ cogsCents: 1500, estimated: false });
  });

  it("falls back to current cogs (estimated) when date predates all changes", () => {
    expect(cogsInEffectOn(changes, 2000, d("2025-12-01"))).toEqual({ cogsCents: 2000, estimated: true });
  });

  it("falls back (estimated) when there are no changes at all", () => {
    expect(cogsInEffectOn([], 2000, d("2026-03-01"))).toEqual({ cogsCents: 2000, estimated: true });
  });

  it("returns null cogs when no changes and current cogs is null", () => {
    expect(cogsInEffectOn([], null, d("2026-03-01"))).toEqual({ cogsCents: null, estimated: true });
  });

  it("is order-independent (sorts defensively)", () => {
    const unsorted: CogsChangeRow[] = [
      { toCents: 1500, changedAt: d("2026-06-01") },
      { toCents: 1000, changedAt: d("2026-01-01") },
    ];
    expect(cogsInEffectOn(unsorted, 2000, d("2026-03-01"))).toEqual({ cogsCents: 1000, estimated: false });
  });
});

describe("monthlyPnL", () => {
  const now = d("2026-03-15");
  const changesByProduct = new Map<string, CogsChangeRow[]>([["p1", [{ toCents: 400, changedAt: d("2026-01-01") }]]]);
  const currentCogs = new Map<string, number | null>([["p1", 400]]);

  it("buckets revenue, cogs and gross profit by month", () => {
    const sales: SalesRow[] = [
      { productId: "p1", date: d("2026-02-10"), unitsSold: 3, priceCents: 1000 },
      { productId: "p1", date: d("2026-02-20"), unitsSold: 2, priceCents: 1000 },
    ];
    const out = monthlyPnL(sales, changesByProduct, currentCogs, 24, now);
    const feb = out.find((b) => b.month === "2026-02")!;
    expect(feb.revenueCents).toBe(5000);        // 5 units * 1000
    expect(feb.cogsCents).toBe(2000);           // 5 units * 400
    expect(feb.grossProfitCents).toBe(3000);
    expect(feb.estimated).toBe(false);
  });

  it("marks a month estimated when a row fell back to current cogs", () => {
    const sales: SalesRow[] = [{ productId: "p1", date: d("2025-12-10"), unitsSold: 1, priceCents: 1000 }];
    const out = monthlyPnL(sales, changesByProduct, currentCogs, 24, now);
    const dec = out.find((b) => b.month === "2025-12")!;
    expect(dec.estimated).toBe(true);
    expect(dec.grossProfitCents).toBe(600); // 1000 - 400
  });

  it("excludes rows for products with no cogs data", () => {
    const sales: SalesRow[] = [{ productId: "pX", date: d("2026-02-10"), unitsSold: 5, priceCents: 1000 }];
    const out = monthlyPnL(sales, new Map(), new Map([["pX", null]]), 24, now);
    const feb = out.find((b) => b.month === "2026-02");
    expect(feb).toBeUndefined();
  });
});

describe("productProfit", () => {
  const changesByProduct = new Map<string, CogsChangeRow[]>();
  const currentCogs = new Map<string, number | null>([["p1", 400], ["p2", null]]);

  it("sums per product and computes revenue-weighted margin", () => {
    const sales: SalesRow[] = [
      { productId: "p1", date: d("2026-02-10"), unitsSold: 10, priceCents: 1000 },
    ];
    const out = productProfit(sales, changesByProduct, currentCogs, d("2026-02-01"), d("2026-03-01"));
    const p1 = out.find((p) => p.productId === "p1")!;
    expect(p1.revenueCents).toBe(10000);
    expect(p1.grossProfitCents).toBe(6000);
    expect(p1.marginPct).toBeCloseTo(0.6, 5);
    expect(p1.estimated).toBe(true); // no changes → fallback
  });

  it("omits products with null cogs", () => {
    const sales: SalesRow[] = [{ productId: "p2", date: d("2026-02-10"), unitsSold: 5, priceCents: 1000 }];
    const out = productProfit(sales, changesByProduct, currentCogs, d("2026-02-01"), d("2026-03-01"));
    expect(out.find((p) => p.productId === "p2")).toBeUndefined();
  });

  it("excludes sales outside the window", () => {
    const sales: SalesRow[] = [{ productId: "p1", date: d("2026-05-10"), unitsSold: 5, priceCents: 1000 }];
    const out = productProfit(sales, changesByProduct, currentCogs, d("2026-02-01"), d("2026-03-01"));
    expect(out).toHaveLength(0);
  });
});

describe("windowProfitForProducts", () => {
  const changesByProduct = new Map<string, CogsChangeRow[]>();
  const currentCogs = new Map<string, number | null>([["p1", 400]]);

  it("sums only the given products within [start, end)", () => {
    const sales: SalesRow[] = [
      { productId: "p1", date: d("2026-02-10"), unitsSold: 4, priceCents: 1000 },
      { productId: "p9", date: d("2026-02-10"), unitsSold: 99, priceCents: 1000 },
    ];
    const w = windowProfitForProducts(sales, changesByProduct, currentCogs, ["p1"], d("2026-02-01"), d("2026-03-01"));
    expect(w.grossProfitCents).toBe(2400); // 4 * (1000-400)
    expect(w.hasSales).toBe(true);
  });

  it("reports hasSales false and zero profit for an empty window", () => {
    const w = windowProfitForProducts([], changesByProduct, currentCogs, ["p1"], d("2026-02-01"), d("2026-03-01"));
    expect(w).toEqual({ grossProfitCents: 0, revenueCents: 0, units: 0, estimated: false, hasSales: false });
  });
});
```

- [ ] **Step 2: Run to confirm failure.**

Run: `npx vitest run src/lib/profit/computeProfit`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the module.** Create `src/lib/profit/computeProfit.ts`:

```typescript
export interface CogsChangeRow {
  toCents: number;
  changedAt: Date;
}

export interface SalesRow {
  productId: string;
  date: Date;
  unitsSold: number;
  priceCents: number;
}

export interface MonthlyPnLPoint {
  month: string; // "YYYY-MM"
  revenueCents: number;
  cogsCents: number;
  grossProfitCents: number;
  estimated: boolean;
}

export interface ProductProfit {
  productId: string;
  units: number;
  revenueCents: number;
  cogsCents: number;
  grossProfitCents: number;
  marginPct: number | null;
  estimated: boolean;
}

export interface WindowProfit {
  grossProfitCents: number;
  revenueCents: number;
  units: number;
  estimated: boolean;
  hasSales: boolean;
}

/**
 * The COGS in effect on `date`: the latest change at-or-before the date.
 * Falls back to `currentCogs` (estimated) when the date predates all changes
 * or none exist. Sorts defensively so callers need not pre-sort.
 */
export function cogsInEffectOn(
  changes: CogsChangeRow[],
  currentCogs: number | null,
  date: Date,
): { cogsCents: number | null; estimated: boolean } {
  const sorted = [...changes].sort((a, b) => a.changedAt.getTime() - b.changedAt.getTime());
  let inEffect: number | null = null;
  for (const c of sorted) {
    if (c.changedAt.getTime() <= date.getTime()) inEffect = c.toCents;
    else break;
  }
  if (inEffect === null) return { cogsCents: currentCogs, estimated: true };
  return { cogsCents: inEffect, estimated: false };
}

function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * Monthly P&L over the last `months` months ending at `now`. Rows for products
 * with no COGS data (null current cogs AND no history) are excluded, since a
 * P&L needs cost. A month is `estimated` if any included row used fallback COGS.
 * Callers decide promo-row inclusion BEFORE calling (P&L excludes promos).
 */
export function monthlyPnL(
  salesRows: SalesRow[],
  cogsChangesByProduct: Map<string, CogsChangeRow[]>,
  currentCogsByProduct: Map<string, number | null>,
  months: number,
  now: Date,
): MonthlyPnLPoint[] {
  const cutoff = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1), 1));
  const buckets = new Map<string, MonthlyPnLPoint>();

  for (const row of salesRows) {
    if (row.date.getTime() < cutoff.getTime()) continue;
    const changes = cogsChangesByProduct.get(row.productId) ?? [];
    const current = currentCogsByProduct.get(row.productId) ?? null;
    const { cogsCents, estimated } = cogsInEffectOn(changes, current, row.date);
    if (cogsCents === null) continue; // no cost data → exclude from P&L

    const key = monthKey(row.date);
    const b = buckets.get(key) ?? { month: key, revenueCents: 0, cogsCents: 0, grossProfitCents: 0, estimated: false };
    const revenue = row.unitsSold * row.priceCents;
    const cost = row.unitsSold * cogsCents;
    b.revenueCents += revenue;
    b.cogsCents += cost;
    b.grossProfitCents += revenue - cost;
    b.estimated = b.estimated || estimated;
    buckets.set(key, b);
  }

  return Array.from(buckets.values()).sort((a, b) => a.month.localeCompare(b.month));
}

/**
 * Per-product profit within [windowStart, windowEnd). Products with no COGS
 * data are omitted. `marginPct` is grossProfit / revenue (null if revenue 0).
 */
export function productProfit(
  salesRows: SalesRow[],
  cogsChangesByProduct: Map<string, CogsChangeRow[]>,
  currentCogsByProduct: Map<string, number | null>,
  windowStart: Date,
  windowEnd: Date,
): ProductProfit[] {
  const acc = new Map<string, ProductProfit>();

  for (const row of salesRows) {
    if (row.date.getTime() < windowStart.getTime() || row.date.getTime() >= windowEnd.getTime()) continue;
    const changes = cogsChangesByProduct.get(row.productId) ?? [];
    const current = currentCogsByProduct.get(row.productId) ?? null;
    const { cogsCents, estimated } = cogsInEffectOn(changes, current, row.date);
    if (cogsCents === null) continue;

    const p = acc.get(row.productId) ?? {
      productId: row.productId, units: 0, revenueCents: 0, cogsCents: 0, grossProfitCents: 0, marginPct: null, estimated: false,
    };
    const revenue = row.unitsSold * row.priceCents;
    const cost = row.unitsSold * cogsCents;
    p.units += row.unitsSold;
    p.revenueCents += revenue;
    p.cogsCents += cost;
    p.grossProfitCents += revenue - cost;
    p.estimated = p.estimated || estimated;
    acc.set(row.productId, p);
  }

  for (const p of acc.values()) {
    p.marginPct = p.revenueCents > 0 ? p.grossProfitCents / p.revenueCents : null;
  }
  return Array.from(acc.values());
}

/**
 * Gross profit for a specific product set within [start, end). Used by the
 * campaign before/after report for both the during- and prior-windows.
 * Callers INCLUDE promo rows here (a campaign is effectively a promotion).
 */
export function windowProfitForProducts(
  salesRows: SalesRow[],
  cogsChangesByProduct: Map<string, CogsChangeRow[]>,
  currentCogsByProduct: Map<string, number | null>,
  productIds: string[],
  start: Date,
  end: Date,
): WindowProfit {
  const idSet = new Set(productIds);
  let grossProfitCents = 0;
  let revenueCents = 0;
  let units = 0;
  let estimated = false;
  let hasSales = false;

  for (const row of salesRows) {
    if (!idSet.has(row.productId)) continue;
    if (row.date.getTime() < start.getTime() || row.date.getTime() >= end.getTime()) continue;
    const changes = cogsChangesByProduct.get(row.productId) ?? [];
    const current = currentCogsByProduct.get(row.productId) ?? null;
    const { cogsCents, estimated: est } = cogsInEffectOn(changes, current, row.date);
    if (cogsCents === null) continue;
    hasSales = true;
    const revenue = row.unitsSold * row.priceCents;
    revenueCents += revenue;
    units += row.unitsSold;
    grossProfitCents += revenue - row.unitsSold * cogsCents;
    estimated = estimated || est;
  }

  return { grossProfitCents, revenueCents, units, estimated, hasSales };
}
```

- [ ] **Step 4: Run to confirm pass.**

Run: `npx vitest run src/lib/profit/computeProfit`
Expected: PASS (all cases).

- [ ] **Step 5: Commit.**

```bash
git add src/lib/profit/computeProfit.ts src/lib/profit/computeProfit.test.ts
git commit -m "feat(profit): add pure computeProfit module (cogs-at-date, monthly P&L, product + window profit)"
```

---

### Task 3: `GET /api/profit/trend`

**Goal:** Monthly P&L API — 24 months of revenue/COGS/gross-profit from non-promo sales, flagging estimated months.

**Files:**
- Create: `src/app/api/profit/trend/route.ts`
- Test: `src/app/api/profit/trend/route.test.ts`

**Acceptance Criteria:**
- [ ] `GET` returns `MonthlyPnLPoint[]` (month, revenueCents, cogsCents, grossProfitCents, estimated) for the last 24 months
- [ ] Only the caller's merchant's data is read; promo rows (`promotionFlag: true`) are excluded
- [ ] Returns `[]` (200) when the merchant has no sales
- [ ] `npx vitest run src/app/api/profit/trend` passes

**Verify:** `npx vitest run src/app/api/profit/trend` → all pass

**Steps:**

- [ ] **Step 1: Write the failing test.** Create `src/app/api/profit/trend/route.test.ts`:

```typescript
import { beforeEach, describe, expect, it, vi } from "vitest";

const { salesFindMany, productFindMany, cogsChangeFindMany } = vi.hoisted(() => ({
  salesFindMany: vi.fn(),
  productFindMany: vi.fn(),
  cogsChangeFindMany: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    salesRecord: { findMany: salesFindMany },
    product: { findMany: productFindMany },
    cogsChange: { findMany: cogsChangeFindMany },
  },
}));
vi.mock("@/lib/auth/requireSession", () => ({
  requireSessionApi: vi.fn(async () => ({ merchantId: "m1", user: { id: "u1", email: "e", merchantId: "m1" } })),
}));

import { GET } from "./route";
const req = () => ({}) as unknown as Request;

beforeEach(() => {
  salesFindMany.mockReset();
  productFindMany.mockReset();
  cogsChangeFindMany.mockReset();
});

describe("GET /api/profit/trend", () => {
  it("returns monthly P&L points from non-promo sales", async () => {
    const now = new Date();
    const thisMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 10));
    salesFindMany.mockResolvedValue([
      { productId: "p1", date: thisMonth, unitsSold: 5, priceCents: 1000 },
    ]);
    productFindMany.mockResolvedValue([{ id: "p1", cogs: 400 }]);
    cogsChangeFindMany.mockResolvedValue([]);

    const res = await GET(req());
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toHaveLength(1);
    expect(body[0].revenueCents).toBe(5000);
    expect(body[0].grossProfitCents).toBe(3000);
    expect(body[0].estimated).toBe(true); // no cogs history
  });

  it("passes promotionFlag:false to the sales query", async () => {
    salesFindMany.mockResolvedValue([]);
    productFindMany.mockResolvedValue([]);
    cogsChangeFindMany.mockResolvedValue([]);
    await GET(req());
    expect(salesFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ merchantId: "m1", promotionFlag: false }) }),
    );
  });

  it("returns [] when there are no sales", async () => {
    salesFindMany.mockResolvedValue([]);
    productFindMany.mockResolvedValue([]);
    cogsChangeFindMany.mockResolvedValue([]);
    const res = await GET(req());
    expect(await res.json()).toEqual([]);
  });
});
```

- [ ] **Step 2: Run to confirm failure.**

Run: `npx vitest run src/app/api/profit/trend`
Expected: FAIL — route not found.

- [ ] **Step 3: Implement the route.** Create `src/app/api/profit/trend/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withErrorHandling } from "@/lib/api/errors";
import { requireSessionApi } from "@/lib/auth/requireSession";
import { monthlyPnL, type CogsChangeRow, type SalesRow } from "@/lib/profit/computeProfit";

const MONTHS = 24;

export const GET = withErrorHandling(async () => {
  const { merchantId } = await requireSessionApi();

  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - MONTHS);

  const [sales, products, cogsChanges] = await Promise.all([
    prisma.salesRecord.findMany({
      where: { merchantId, promotionFlag: false, date: { gte: cutoff } },
      select: { productId: true, date: true, unitsSold: true, priceCents: true },
    }),
    prisma.product.findMany({ where: { merchantId }, select: { id: true, cogs: true } }),
    prisma.cogsChange.findMany({
      where: { merchantId },
      select: { productId: true, toCents: true, changedAt: true },
      orderBy: { changedAt: "asc" },
    }),
  ]);

  const currentCogs = new Map<string, number | null>(products.map((p) => [p.id, p.cogs]));
  const changesByProduct = new Map<string, CogsChangeRow[]>();
  for (const c of cogsChanges) {
    const list = changesByProduct.get(c.productId) ?? [];
    list.push({ toCents: c.toCents, changedAt: c.changedAt });
    changesByProduct.set(c.productId, list);
  }

  const salesRows: SalesRow[] = sales.map((s) => ({
    productId: s.productId, date: s.date, unitsSold: s.unitsSold, priceCents: s.priceCents,
  }));

  const result = monthlyPnL(salesRows, changesByProduct, currentCogs, MONTHS, new Date());
  return NextResponse.json(result);
});
```

- [ ] **Step 4: Run to confirm pass.**

Run: `npx vitest run src/app/api/profit/trend`
Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add src/app/api/profit/trend/route.ts src/app/api/profit/trend/route.test.ts
git commit -m "feat(profit): add GET /api/profit/trend monthly P&L route"
```

---

### Task 4: `GET /api/profit/products`

**Goal:** Per-product profit for a selectable window (30/90/365 days), enriched with title/sku for the leaderboard.

**Files:**
- Create: `src/app/api/profit/products/route.ts`
- Test: `src/app/api/profit/products/route.test.ts`

**Acceptance Criteria:**
- [ ] `GET ?window=30|90|365` returns `{ window, products: [...] }` where each row has `productId, title, sku, units, revenueCents, cogsCents, grossProfitCents, marginPct, estimated`
- [ ] Invalid/missing `window` defaults to 90; excludes promo rows
- [ ] Products with no COGS data are omitted (they never appear in `productProfit` output)
- [ ] Only the caller's merchant's data is read
- [ ] `npx vitest run src/app/api/profit/products` passes

**Verify:** `npx vitest run src/app/api/profit/products` → all pass

**Steps:**

- [ ] **Step 1: Write the failing test.** Create `src/app/api/profit/products/route.test.ts`:

```typescript
import { beforeEach, describe, expect, it, vi } from "vitest";

const { salesFindMany, productFindMany, cogsChangeFindMany } = vi.hoisted(() => ({
  salesFindMany: vi.fn(),
  productFindMany: vi.fn(),
  cogsChangeFindMany: vi.fn(),
}));
vi.mock("@/lib/db", () => ({
  prisma: {
    salesRecord: { findMany: salesFindMany },
    product: { findMany: productFindMany },
    cogsChange: { findMany: cogsChangeFindMany },
  },
}));
vi.mock("@/lib/auth/requireSession", () => ({
  requireSessionApi: vi.fn(async () => ({ merchantId: "m1", user: { id: "u1", email: "e", merchantId: "m1" } })),
}));

import { GET } from "./route";
const reqWith = (window?: string) =>
  ({ url: `http://t/api/profit/products${window ? `?window=${window}` : ""}` }) as unknown as Request;

beforeEach(() => {
  salesFindMany.mockReset();
  productFindMany.mockReset();
  cogsChangeFindMany.mockReset();
});

describe("GET /api/profit/products", () => {
  it("returns per-product profit enriched with title/sku", async () => {
    const recent = new Date();
    salesFindMany.mockResolvedValue([{ productId: "p1", date: recent, unitsSold: 10, priceCents: 1000 }]);
    productFindMany.mockResolvedValue([{ id: "p1", cogs: 400, title: "Widget", sku: "W-1" }]);
    cogsChangeFindMany.mockResolvedValue([]);

    const res = await GET(reqWith("30"));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.window).toBe(30);
    expect(body.products[0]).toMatchObject({ productId: "p1", title: "Widget", sku: "W-1", grossProfitCents: 6000 });
    expect(body.products[0].marginPct).toBeCloseTo(0.6, 5);
  });

  it("defaults window to 90 when invalid", async () => {
    salesFindMany.mockResolvedValue([]);
    productFindMany.mockResolvedValue([]);
    cogsChangeFindMany.mockResolvedValue([]);
    const res = await GET(reqWith("banana"));
    expect((await res.json()).window).toBe(90);
  });
});
```

- [ ] **Step 2: Run to confirm failure.**

Run: `npx vitest run src/app/api/profit/products`
Expected: FAIL.

- [ ] **Step 3: Implement the route.** Create `src/app/api/profit/products/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withErrorHandling } from "@/lib/api/errors";
import { requireSessionApi } from "@/lib/auth/requireSession";
import { productProfit, type CogsChangeRow, type SalesRow } from "@/lib/profit/computeProfit";

const ALLOWED_WINDOWS = [30, 90, 365];

export const GET = withErrorHandling(async (req: Request) => {
  const { merchantId } = await requireSessionApi();

  const raw = Number(new URL(req.url).searchParams.get("window"));
  const window = ALLOWED_WINDOWS.includes(raw) ? raw : 90;

  const windowEnd = new Date();
  const windowStart = new Date(windowEnd.getTime() - window * 24 * 60 * 60 * 1000);

  const [sales, products, cogsChanges] = await Promise.all([
    prisma.salesRecord.findMany({
      where: { merchantId, promotionFlag: false, date: { gte: windowStart } },
      select: { productId: true, date: true, unitsSold: true, priceCents: true },
    }),
    prisma.product.findMany({ where: { merchantId }, select: { id: true, cogs: true, title: true, sku: true } }),
    prisma.cogsChange.findMany({
      where: { merchantId },
      select: { productId: true, toCents: true, changedAt: true },
      orderBy: { changedAt: "asc" },
    }),
  ]);

  const currentCogs = new Map<string, number | null>(products.map((p) => [p.id, p.cogs]));
  const meta = new Map(products.map((p) => [p.id, { title: p.title, sku: p.sku }]));
  const changesByProduct = new Map<string, CogsChangeRow[]>();
  for (const c of cogsChanges) {
    const list = changesByProduct.get(c.productId) ?? [];
    list.push({ toCents: c.toCents, changedAt: c.changedAt });
    changesByProduct.set(c.productId, list);
  }

  const salesRows: SalesRow[] = sales.map((s) => ({
    productId: s.productId, date: s.date, unitsSold: s.unitsSold, priceCents: s.priceCents,
  }));

  const rows = productProfit(salesRows, changesByProduct, currentCogs, windowStart, windowEnd)
    .map((p) => ({ ...p, title: meta.get(p.productId)?.title ?? "Unknown", sku: meta.get(p.productId)?.sku ?? "" }))
    .sort((a, b) => b.grossProfitCents - a.grossProfitCents);

  return NextResponse.json({ window, products: rows });
});
```

- [ ] **Step 4: Run to confirm pass.**

Run: `npx vitest run src/app/api/profit/products`
Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add src/app/api/profit/products/route.ts src/app/api/profit/products/route.test.ts
git commit -m "feat(profit): add GET /api/profit/products per-product profit route"
```

---

### Task 5: `GET /api/profit/campaigns`

**Goal:** Campaign before/after report — window vs prior-period profit for each campaign that has applied products, with the three honesty flags.

**Files:**
- Create: `src/app/api/profit/campaigns/route.ts`
- Test: `src/app/api/profit/campaigns/route.test.ts`

**Acceptance Criteria:**
- [ ] For each campaign with ≥1 applied `CampaignProduct`, returns `{ campaignId, name, status, firstAppliedAt, windowEnd, days, productsChanged, duringProfitCents, priorProfitCents, deltaCents, noPriorBaseline, stillRunning, estimated }`
- [ ] `duringProfitCents` covers `[firstAppliedAt, windowEnd)`; `priorProfitCents` covers the equal-length window immediately before `firstAppliedAt`
- [ ] `windowEnd = revertedAt ?? endsAt ?? now`; `noPriorBaseline = true` when the prior window had no sales; `stillRunning = status !== "completed"`
- [ ] Campaigns with zero applied products are omitted; result sorted by `firstAppliedAt` desc
- [ ] Only the caller's merchant's campaigns are read
- [ ] `npx vitest run src/app/api/profit/campaigns` passes

**Verify:** `npx vitest run src/app/api/profit/campaigns` → all pass

**Steps:**

- [ ] **Step 1: Write the failing test.** Create `src/app/api/profit/campaigns/route.test.ts`:

```typescript
import { beforeEach, describe, expect, it, vi } from "vitest";

const { campaignFindMany, salesFindMany, productFindMany, cogsChangeFindMany } = vi.hoisted(() => ({
  campaignFindMany: vi.fn(),
  salesFindMany: vi.fn(),
  productFindMany: vi.fn(),
  cogsChangeFindMany: vi.fn(),
}));
vi.mock("@/lib/db", () => ({
  prisma: {
    campaign: { findMany: campaignFindMany },
    salesRecord: { findMany: salesFindMany },
    product: { findMany: productFindMany },
    cogsChange: { findMany: cogsChangeFindMany },
  },
}));
vi.mock("@/lib/auth/requireSession", () => ({
  requireSessionApi: vi.fn(async () => ({ merchantId: "m1", user: { id: "u1", email: "e", merchantId: "m1" } })),
}));

import { GET } from "./route";
const req = () => ({}) as unknown as Request;
const d = (s: string) => new Date(s + "T00:00:00Z");

beforeEach(() => {
  campaignFindMany.mockReset();
  salesFindMany.mockReset();
  productFindMany.mockReset();
  cogsChangeFindMany.mockReset();
});

describe("GET /api/profit/campaigns", () => {
  it("computes during vs prior profit and delta", async () => {
    campaignFindMany.mockResolvedValue([{
      id: "c1", name: "Summer Sale", status: "completed", endsAt: d("2026-02-15"), revertedAt: d("2026-02-15"),
      products: [{ productId: "p1", appliedAt: d("2026-02-01") }],
    }]);
    // prior window = 2026-01-18..2026-02-01 (14 days); during = 2026-02-01..2026-02-15
    salesFindMany.mockResolvedValue([
      { productId: "p1", date: d("2026-01-20"), unitsSold: 2, priceCents: 1000 }, // prior
      { productId: "p1", date: d("2026-02-05"), unitsSold: 5, priceCents: 1000 }, // during
    ]);
    productFindMany.mockResolvedValue([{ id: "p1", cogs: 400 }]);
    cogsChangeFindMany.mockResolvedValue([]);

    const res = await GET(req());
    const body = await res.json();
    expect(res.status).toBe(200);
    const c = body[0];
    expect(c.productsChanged).toBe(1);
    expect(c.duringProfitCents).toBe(3000); // 5 * (1000-400)
    expect(c.priorProfitCents).toBe(1200);  // 2 * (1000-400)
    expect(c.deltaCents).toBe(1800);
    expect(c.noPriorBaseline).toBe(false);
    expect(c.stillRunning).toBe(false);
    expect(c.estimated).toBe(true); // no cogs history
  });

  it("flags noPriorBaseline when the prior window had no sales", async () => {
    campaignFindMany.mockResolvedValue([{
      id: "c2", name: "New Launch", status: "active", endsAt: null, revertedAt: null,
      products: [{ productId: "p2", appliedAt: d("2026-02-01") }],
    }]);
    salesFindMany.mockResolvedValue([{ productId: "p2", date: d("2026-02-05"), unitsSold: 3, priceCents: 1000 }]);
    productFindMany.mockResolvedValue([{ id: "p2", cogs: 500 }]);
    cogsChangeFindMany.mockResolvedValue([]);

    const res = await GET(req());
    const c = (await res.json())[0];
    expect(c.noPriorBaseline).toBe(true);
    expect(c.stillRunning).toBe(true);
  });

  it("omits campaigns with no applied products", async () => {
    campaignFindMany.mockResolvedValue([{ id: "c3", name: "Draft", status: "draft", endsAt: null, revertedAt: null, products: [] }]);
    salesFindMany.mockResolvedValue([]);
    productFindMany.mockResolvedValue([]);
    cogsChangeFindMany.mockResolvedValue([]);
    const res = await GET(req());
    expect(await res.json()).toEqual([]);
  });
});
```

- [ ] **Step 2: Run to confirm failure.**

Run: `npx vitest run src/app/api/profit/campaigns`
Expected: FAIL.

- [ ] **Step 3: Implement the route.** Create `src/app/api/profit/campaigns/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withErrorHandling } from "@/lib/api/errors";
import { requireSessionApi } from "@/lib/auth/requireSession";
import { windowProfitForProducts, type CogsChangeRow, type SalesRow } from "@/lib/profit/computeProfit";

export const GET = withErrorHandling(async () => {
  const { merchantId } = await requireSessionApi();
  const now = new Date();

  const campaigns = await prisma.campaign.findMany({
    where: { merchantId },
    select: {
      id: true, name: true, status: true, endsAt: true, revertedAt: true,
      products: { where: { appliedAt: { not: null } }, select: { productId: true, appliedAt: true } },
    },
  });

  const active = campaigns.filter((c) => c.products.length > 0);
  if (active.length === 0) return NextResponse.json([]);

  // Fetch supporting data once for all campaigns' products.
  const allProductIds = [...new Set(active.flatMap((c) => c.products.map((p) => p.productId)))];
  const [sales, products, cogsChanges] = await Promise.all([
    prisma.salesRecord.findMany({
      where: { merchantId, productId: { in: allProductIds } },
      select: { productId: true, date: true, unitsSold: true, priceCents: true },
    }),
    prisma.product.findMany({ where: { id: { in: allProductIds } }, select: { id: true, cogs: true } }),
    prisma.cogsChange.findMany({
      where: { productId: { in: allProductIds } },
      select: { productId: true, toCents: true, changedAt: true },
      orderBy: { changedAt: "asc" },
    }),
  ]);

  const currentCogs = new Map<string, number | null>(products.map((p) => [p.id, p.cogs]));
  const changesByProduct = new Map<string, CogsChangeRow[]>();
  for (const c of cogsChanges) {
    const list = changesByProduct.get(c.productId) ?? [];
    list.push({ toCents: c.toCents, changedAt: c.changedAt });
    changesByProduct.set(c.productId, list);
  }
  const salesRows: SalesRow[] = sales.map((s) => ({
    productId: s.productId, date: s.date, unitsSold: s.unitsSold, priceCents: s.priceCents,
  }));

  const report = active.map((c) => {
    const appliedTimes = c.products.map((p) => p.appliedAt!.getTime());
    const firstAppliedAt = new Date(Math.min(...appliedTimes));
    const windowEnd = c.revertedAt ?? c.endsAt ?? now;
    const durationMs = Math.max(0, windowEnd.getTime() - firstAppliedAt.getTime());
    const priorStart = new Date(firstAppliedAt.getTime() - durationMs);
    const productIds = c.products.map((p) => p.productId);

    const during = windowProfitForProducts(salesRows, changesByProduct, currentCogs, productIds, firstAppliedAt, windowEnd);
    const prior = windowProfitForProducts(salesRows, changesByProduct, currentCogs, productIds, priorStart, firstAppliedAt);

    const days = Math.round(durationMs / (24 * 60 * 60 * 1000));
    return {
      campaignId: c.id,
      name: c.name,
      status: c.status,
      firstAppliedAt: firstAppliedAt.toISOString(),
      windowEnd: windowEnd.toISOString(),
      days,
      productsChanged: c.products.length,
      duringProfitCents: during.grossProfitCents,
      priorProfitCents: prior.grossProfitCents,
      deltaCents: during.grossProfitCents - prior.grossProfitCents,
      noPriorBaseline: !prior.hasSales,
      stillRunning: c.status !== "completed",
      estimated: during.estimated || prior.estimated,
    };
  });

  report.sort((a, b) => new Date(b.firstAppliedAt).getTime() - new Date(a.firstAppliedAt).getTime());
  return NextResponse.json(report);
});
```

- [ ] **Step 4: Run to confirm pass.**

Run: `npx vitest run src/app/api/profit/campaigns`
Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add src/app/api/profit/campaigns/route.ts src/app/api/profit/campaigns/route.test.ts
git commit -m "feat(profit): add GET /api/profit/campaigns before/after report route"
```

---

### Task 6: Profit page shell + nav + summary cards

**Goal:** The `/profit` server page with `AppShell`, a sidebar nav item, and the summary cards computed from trend data.

**Files:**
- Create: `src/app/profit/page.tsx`
- Create: `src/components/ProfitSummaryCards.tsx`
- Test: `src/components/ProfitSummaryCards.test.tsx`
- Modify: `src/components/Sidebar.tsx`

**Acceptance Criteria:**
- [ ] `/profit` renders inside `AppShell` behind `requireSessionPage()`
- [ ] Sidebar shows a **Profit** item directly after Campaigns, active on `/profit`
- [ ] `ProfitSummaryCards` fetches `/api/profit/trend` and shows gross profit (with MoM delta), revenue, avg margin, COGS for the latest month; shows an empty state when no data
- [ ] `npx vitest run src/components/ProfitSummaryCards` passes

**Verify:** `npx vitest run src/components/ProfitSummaryCards` → pass; visit `/profit` in dev → page renders with nav highlighted

**Steps:**

- [ ] **Step 1: Add the nav item.** In `src/components/Sidebar.tsx`, add `TrendUp` to the phosphor import and insert into `NAV` after the Campaigns entry:

```typescript
import { SquaresFour, CalendarBlank, RocketLaunch, Gear, SignOut, ChatTeardrop, BookOpen, CaretRight, TrendUp } from "@phosphor-icons/react";
```

```typescript
const NAV = [
  { href: "/dashboard", icon: SquaresFour, label: "Dashboard", matchPrefix: ["/dashboard", "/product"] },
  { href: "/campaigns", icon: CalendarBlank, label: "Campaigns", matchPrefix: ["/campaigns"] },
  { href: "/profit", icon: TrendUp, label: "Profit", matchPrefix: ["/profit"] },
  { href: "/launch-planner", icon: RocketLaunch, label: "Launch Planner", matchPrefix: ["/launch-planner"] },
  { href: "/guide", icon: BookOpen, label: "Guide", matchPrefix: ["/guide"] },
];
```

- [ ] **Step 2: Write the failing test for summary cards.** Create `src/components/ProfitSummaryCards.test.tsx`:

```typescript
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { ProfitSummaryCards } from "./ProfitSummaryCards";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

function mockTrend(points: unknown[]) {
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => points })) as unknown as typeof fetch);
}

describe("ProfitSummaryCards", () => {
  it("shows latest-month gross profit and MoM delta", async () => {
    mockTrend([
      { month: "2026-01", revenueCents: 100000, cogsCents: 70000, grossProfitCents: 30000, estimated: false },
      { month: "2026-02", revenueCents: 120000, cogsCents: 78000, grossProfitCents: 42000, estimated: false },
    ]);
    render(<ProfitSummaryCards />);
    await waitFor(() => expect(screen.getByText("$420.00")).toBeInTheDocument()); // gross profit Feb
    expect(screen.getByText(/40\.0%/)).toBeInTheDocument(); // MoM (42000-30000)/30000
  });

  it("shows an empty state when there is no data", async () => {
    mockTrend([]);
    render(<ProfitSummaryCards />);
    await waitFor(() => expect(screen.getByText(/no profit data yet/i)).toBeInTheDocument());
  });
});
```

- [ ] **Step 3: Run to confirm failure.**

Run: `npx vitest run src/components/ProfitSummaryCards`
Expected: FAIL — component not found.

- [ ] **Step 4: Implement the summary cards.** Create `src/components/ProfitSummaryCards.tsx`:

```typescript
"use client";
import { useEffect, useState } from "react";
import { formatCents } from "@/lib/money";

interface PnLPoint {
  month: string;
  revenueCents: number;
  cogsCents: number;
  grossProfitCents: number;
  estimated: boolean;
}

function Card({ label, value, sub }: { label: string; value: string; sub?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-xl font-semibold text-ink tabular-nums">{value}</p>
      {sub && <p className="mt-0.5 text-xs">{sub}</p>}
    </div>
  );
}

export function ProfitSummaryCards() {
  const [data, setData] = useState<PnLPoint[] | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/profit/trend")
      .then((r) => (r.ok ? r.json() : []))
      .then((d: PnLPoint[]) => { if (active) setData(d); })
      .catch(() => { if (active) setData([]); });
    return () => { active = false; };
  }, []);

  if (data === null) {
    return <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => (
      <div key={i} className="h-20 animate-pulse rounded-xl bg-panel" />
    ))}</div>;
  }

  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line-strong bg-surface p-8 text-center">
        <p className="text-sm font-semibold text-ink">No profit data yet</p>
        <p className="mt-1 text-sm text-muted">Add COGS to your products and sync sales to see profit.</p>
      </div>
    );
  }

  const latest = data[data.length - 1];
  const prev = data.length >= 2 ? data[data.length - 2] : null;
  const momPct = prev && prev.grossProfitCents !== 0
    ? ((latest.grossProfitCents - prev.grossProfitCents) / Math.abs(prev.grossProfitCents)) * 100
    : null;
  const margin = latest.revenueCents > 0 ? (latest.grossProfitCents / latest.revenueCents) * 100 : null;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Card
        label="Gross profit (latest mo)"
        value={formatCents(latest.grossProfitCents)}
        sub={momPct !== null ? (
          <span className={momPct >= 0 ? "text-positive" : "text-danger"}>
            {momPct >= 0 ? "▲" : "▼"} {Math.abs(momPct).toFixed(1)}% vs last mo
          </span>
        ) : undefined}
      />
      <Card label="Revenue" value={formatCents(latest.revenueCents)} />
      <Card label="Avg margin" value={margin !== null ? `${margin.toFixed(0)}%` : "—"} />
      <Card label="COGS" value={formatCents(latest.cogsCents)} />
    </div>
  );
}
```

- [ ] **Step 5: Run to confirm pass.**

Run: `npx vitest run src/components/ProfitSummaryCards`
Expected: PASS.

- [ ] **Step 6: Create the page.** Create `src/app/profit/page.tsx` (mirrors `src/app/campaigns/page.tsx`):

```typescript
import { requireSessionPage } from "@/lib/auth/requireSession";
import { prisma } from "@/lib/db";
import { AppShell } from "@/components/AppShell";
import { ProfitSummaryCards } from "@/components/ProfitSummaryCards";

export default async function ProfitPage() {
  const user = await requireSessionPage();
  const merchant = await prisma.merchant.findFirst({
    where: { id: user.merchantId },
    select: { name: true },
  });

  return (
    <AppShell merchantName={merchant?.name ?? undefined}>
      <div className="px-8 py-8 max-w-6xl space-y-8">
        <header>
          <h1 className="text-xl font-semibold text-ink">Profit</h1>
          <p className="text-sm text-muted mt-0.5">Real P&amp;L, per-product profit, and campaign performance.</p>
        </header>
        <ProfitSummaryCards />
        {/* ProfitTrendChart (Task 7), ProductProfitTable (Task 8), CampaignPerformanceList (Task 9) added below */}
      </div>
    </AppShell>
  );
}
```

- [ ] **Step 7: Verify the page renders.** Start the dev server via the preview tool (`npm run dev`, port 3000), log in as the demo account, navigate to `/profit`. Confirm the page renders, the sidebar **Profit** item is highlighted, and the summary cards show either data or the empty state (no console errors).

- [ ] **Step 8: Commit.**

```bash
git add src/app/profit/page.tsx src/components/ProfitSummaryCards.tsx src/components/ProfitSummaryCards.test.tsx src/components/Sidebar.tsx
git commit -m "feat(profit): add /profit page shell, nav item, and summary cards"
```

---

### Task 7: P&L trend chart component

**Goal:** A pure-SVG chart of monthly revenue / COGS / gross profit, mounted on the Profit page, marking estimated months.

**Files:**
- Create: `src/components/ProfitTrendChart.tsx`
- Test: `src/components/ProfitTrendChart.test.tsx`
- Modify: `src/app/profit/page.tsx` (mount it)

**Acceptance Criteria:**
- [ ] Fetches `/api/profit/trend`; renders three series (revenue, COGS, gross profit) as SVG lines over the month axis
- [ ] Shows a "loading" then either the chart or an "upload sales / add COGS" empty state (< 2 points)
- [ ] Renders a legend and an "estimated" note when any point has `estimated: true`
- [ ] No external charting dependency; uses OKLCH CSS tokens like `PortfolioTrendChart`
- [ ] `npx vitest run src/components/ProfitTrendChart` passes

**Verify:** `npx vitest run src/components/ProfitTrendChart` → pass; `/profit` in dev shows the chart

**Steps:**

- [ ] **Step 1: Write the failing test.** Create `src/components/ProfitTrendChart.test.tsx`:

```typescript
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { ProfitTrendChart } from "./ProfitTrendChart";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

function mockTrend(points: unknown[]) {
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => points })) as unknown as typeof fetch);
}

describe("ProfitTrendChart", () => {
  it("renders the three-series legend when there are >=2 points", async () => {
    mockTrend([
      { month: "2026-01", revenueCents: 100000, cogsCents: 70000, grossProfitCents: 30000, estimated: false },
      { month: "2026-02", revenueCents: 120000, cogsCents: 78000, grossProfitCents: 42000, estimated: false },
    ]);
    render(<ProfitTrendChart />);
    await waitFor(() => expect(screen.getByText(/Gross profit/i)).toBeInTheDocument());
    expect(screen.getByText(/Revenue/i)).toBeInTheDocument();
    expect(screen.getByText(/COGS/i)).toBeInTheDocument();
  });

  it("shows an estimated note when any point is estimated", async () => {
    mockTrend([
      { month: "2026-01", revenueCents: 100000, cogsCents: 70000, grossProfitCents: 30000, estimated: true },
      { month: "2026-02", revenueCents: 120000, cogsCents: 78000, grossProfitCents: 42000, estimated: false },
    ]);
    render(<ProfitTrendChart />);
    await waitFor(() => expect(screen.getByText(/estimated from current costs/i)).toBeInTheDocument());
  });

  it("shows an empty state with fewer than 2 points", async () => {
    mockTrend([]);
    render(<ProfitTrendChart />);
    await waitFor(() => expect(screen.getByText(/add cogs and sync sales/i)).toBeInTheDocument());
  });
});
```

- [ ] **Step 2: Run to confirm failure.**

Run: `npx vitest run src/components/ProfitTrendChart`
Expected: FAIL.

- [ ] **Step 3: Implement the chart.** Create `src/components/ProfitTrendChart.tsx`:

```typescript
"use client";
import { useEffect, useState } from "react";
import { formatCents } from "@/lib/money";

interface PnLPoint {
  month: string;
  revenueCents: number;
  cogsCents: number;
  grossProfitCents: number;
  estimated: boolean;
}

const W = 560;
const H = 240;
const PAD = { top: 20, right: 20, bottom: 36, left: 56 };
const INNER_W = W - PAD.left - PAD.right;
const INNER_H = H - PAD.top - PAD.bottom;

const SERIES: { key: keyof Pick<PnLPoint, "revenueCents" | "cogsCents" | "grossProfitCents">; label: string; color: string }[] = [
  { key: "revenueCents", label: "Revenue", color: "var(--color-accent)" },
  { key: "cogsCents", label: "COGS", color: "var(--color-warning)" },
  { key: "grossProfitCents", label: "Gross profit", color: "var(--color-positive)" },
];

function monthLabel(m: string) {
  const [y, mm] = m.split("-");
  return new Date(Number(y), Number(mm) - 1).toLocaleString("default", { month: "short" });
}

export function ProfitTrendChart() {
  const [data, setData] = useState<PnLPoint[] | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/profit/trend")
      .then((r) => (r.ok ? r.json() : []))
      .then((d: PnLPoint[]) => { if (active) setData(d); })
      .catch(() => { if (active) setData([]); });
    return () => { active = false; };
  }, []);

  if (data === null) {
    return <div className="rounded-xl border border-line bg-surface p-5 flex items-center justify-center" style={{ minHeight: 280 }}>
      <p className="text-sm text-muted">Loading…</p>
    </div>;
  }

  if (data.length < 2) {
    return (
      <div className="rounded-xl border border-line bg-surface p-5" style={{ minHeight: 280 }}>
        <h2 className="text-sm font-semibold text-ink">P&amp;L trend</h2>
        <div className="flex items-center justify-center h-48">
          <p className="text-sm text-muted">Add COGS and sync sales to see your profit trend.</p>
        </div>
      </div>
    );
  }

  const allValues = data.flatMap((d) => [d.revenueCents, d.cogsCents, d.grossProfitCents]);
  const minV = Math.min(0, ...allValues);
  const maxV = Math.max(...allValues);
  const range = maxV - minV || 1;
  const anyEstimated = data.some((d) => d.estimated);

  const xOf = (i: number) => PAD.left + (i / (data.length - 1)) * INNER_W;
  const yOf = (v: number) => PAD.top + INNER_H - ((v - minV) / range) * INNER_H;

  const pathFor = (key: (typeof SERIES)[number]["key"]) =>
    data.map((d, i) => `${i === 0 ? "M" : "L"}${xOf(i).toFixed(1)},${yOf(d[key]).toFixed(1)}`).join(" ");

  const yTicks = [minV, minV + range / 2, maxV];
  const step = Math.ceil(data.length / 6);

  return (
    <div className="rounded-xl border border-line bg-surface p-5">
      <div className="mb-3 flex items-start justify-between">
        <h2 className="text-sm font-semibold text-ink">P&amp;L trend</h2>
        <div className="flex gap-3 text-xs">
          {SERIES.map((s) => (
            <span key={s.key} className="flex items-center gap-1 text-muted">
              <span style={{ display: "inline-block", width: 10, height: 2, background: s.color }} /> {s.label}
            </span>
          ))}
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ fontFamily: "var(--font-mono, monospace)" }}>
        {yTicks.map((v) => (
          <g key={v}>
            <line x1={PAD.left} x2={PAD.left + INNER_W} y1={yOf(v)} y2={yOf(v)} stroke="var(--color-line)" strokeWidth="1" />
            <text x={PAD.left - 6} y={yOf(v)} textAnchor="end" dominantBaseline="middle" fontSize="9" fill="var(--color-faint)">
              {formatCents(v)}
            </text>
          </g>
        ))}
        {SERIES.map((s) => (
          <path key={s.key} d={pathFor(s.key)} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        ))}
        {data.map((d, i) => {
          if (i % step !== 0 && i !== data.length - 1) return null;
          return (
            <text key={d.month} x={xOf(i)} y={PAD.top + INNER_H + 18} textAnchor="middle" fontSize="9" fill="var(--color-faint)">
              {monthLabel(d.month)}
            </text>
          );
        })}
      </svg>
      {anyEstimated && (
        <p className="mt-2 text-xs text-faint">Some months are estimated from current costs (no cost history before tracking began).</p>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run to confirm pass.**

Run: `npx vitest run src/components/ProfitTrendChart`
Expected: PASS.

- [ ] **Step 5: Mount it on the page.** In `src/app/profit/page.tsx`, import and render below the summary cards:

```typescript
import { ProfitTrendChart } from "@/components/ProfitTrendChart";
```
Add `<ProfitTrendChart />` immediately after `<ProfitSummaryCards />`.

- [ ] **Step 6: Commit.**

```bash
git add src/components/ProfitTrendChart.tsx src/components/ProfitTrendChart.test.tsx src/app/profit/page.tsx
git commit -m "feat(profit): add P&L trend chart component"
```

---

### Task 8: Per-product profit leaderboard component

**Goal:** A table ranking products by gross profit with a Top-earners ↔ Margin-bleeders toggle and a 30/90/365-day window switch.

**Files:**
- Create: `src/components/ProductProfitTable.tsx`
- Test: `src/components/ProductProfitTable.test.tsx`
- Modify: `src/app/profit/page.tsx` (mount it)

**Acceptance Criteria:**
- [ ] Fetches `/api/profit/products?window=N`; refetches when the window toggle changes
- [ ] "Top earners" sorts by gross profit desc; "Margin bleeders" sorts by margin asc and flags rows below the 15% floor
- [ ] Renders product, units, revenue, COGS, gross profit, margin%, and an "est." marker on estimated rows
- [ ] Empty state when no products have profit data
- [ ] `npx vitest run src/components/ProductProfitTable` passes

**Verify:** `npx vitest run src/components/ProductProfitTable` → pass; `/profit` in dev shows the table and the toggles work

**Steps:**

- [ ] **Step 1: Write the failing test.** Create `src/components/ProductProfitTable.test.tsx`:

```typescript
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { ProductProfitTable } from "./ProductProfitTable";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const rows = [
  { productId: "p1", title: "Alpha", sku: "A-1", units: 100, revenueCents: 100000, cogsCents: 60000, grossProfitCents: 40000, marginPct: 0.4, estimated: false },
  { productId: "p2", title: "Gamma", sku: "G-1", units: 200, revenueCents: 100000, cogsCents: 91000, grossProfitCents: 9000, marginPct: 0.09, estimated: true },
];

describe("ProductProfitTable", () => {
  it("renders product rows with profit and margin", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ window: 90, products: rows }) })) as unknown as typeof fetch);
    render(<ProductProfitTable />);
    await waitFor(() => expect(screen.getByText("Alpha")).toBeInTheDocument());
    expect(screen.getByText("$400.00")).toBeInTheDocument(); // Alpha gross profit
    expect(screen.getByText(/9%/)).toBeInTheDocument();       // Gamma margin
  });

  it("shows an empty state when there are no products", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ window: 90, products: [] }) })) as unknown as typeof fetch);
    render(<ProductProfitTable />);
    await waitFor(() => expect(screen.getByText(/no product profit data/i)).toBeInTheDocument());
  });
});
```

- [ ] **Step 2: Run to confirm failure.**

Run: `npx vitest run src/components/ProductProfitTable`
Expected: FAIL.

- [ ] **Step 3: Implement the table.** Create `src/components/ProductProfitTable.tsx`:

```typescript
"use client";
import { useEffect, useState } from "react";
import { formatCents } from "@/lib/money";

interface Row {
  productId: string;
  title: string;
  sku: string;
  units: number;
  revenueCents: number;
  cogsCents: number;
  grossProfitCents: number;
  marginPct: number | null;
  estimated: boolean;
}

const MARGIN_FLOOR = 0.15;
type Mode = "earners" | "bleeders";
const WINDOWS = [30, 90, 365];

export function ProductProfitTable() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [mode, setMode] = useState<Mode>("earners");
  const [window, setWindow] = useState(90);

  useEffect(() => {
    let active = true;
    setRows(null);
    fetch(`/api/profit/products?window=${window}`)
      .then((r) => (r.ok ? r.json() : { products: [] }))
      .then((d: { products: Row[] }) => { if (active) setRows(d.products); })
      .catch(() => { if (active) setRows([]); });
    return () => { active = false; };
  }, [window]);

  const sorted = rows
    ? [...rows].sort((a, b) =>
        mode === "earners"
          ? b.grossProfitCents - a.grossProfitCents
          : (a.marginPct ?? Infinity) - (b.marginPct ?? Infinity))
    : [];

  return (
    <div className="rounded-xl border border-line bg-surface p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-ink">Per-product profit</h2>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-line text-xs">
            <button className={`px-2 py-1 ${mode === "earners" ? "bg-accent text-accent-fg" : "text-muted"}`} onClick={() => setMode("earners")}>Top earners</button>
            <button className={`px-2 py-1 ${mode === "bleeders" ? "bg-accent text-accent-fg" : "text-muted"}`} onClick={() => setMode("bleeders")}>Margin bleeders</button>
          </div>
          <select value={window} onChange={(e) => setWindow(Number(e.target.value))} aria-label="Time window" className="rounded border border-line bg-panel px-2 py-1 text-xs text-ink">
            {WINDOWS.map((w) => <option key={w} value={w}>Last {w} days</option>)}
          </select>
        </div>
      </div>

      {rows === null ? (
        <div className="h-40 animate-pulse rounded-lg bg-panel" />
      ) : sorted.length === 0 ? (
        <div className="py-10 text-center text-sm text-muted">No product profit data for this window. Add COGS and sync sales.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-muted">
                <th className="px-2 py-2 font-medium">Product</th>
                <th className="px-2 py-2 font-medium">Units</th>
                <th className="px-2 py-2 font-medium">Revenue</th>
                <th className="px-2 py-2 font-medium">COGS</th>
                <th className="px-2 py-2 font-medium">Gross profit</th>
                <th className="px-2 py-2 font-medium">Margin</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => {
                const belowFloor = r.marginPct !== null && r.marginPct < MARGIN_FLOOR;
                return (
                  <tr key={r.productId} className="border-b border-line last:border-0">
                    <td className="px-2 py-2 text-ink">
                      {r.title}
                      {r.estimated && <span className="ml-1 text-xs text-faint" title="Estimated from current costs">est.</span>}
                      <span className="block text-xs text-faint">{r.sku}</span>
                    </td>
                    <td className="px-2 py-2 text-muted tabular-nums">{r.units}</td>
                    <td className="px-2 py-2 text-ink tabular-nums">{formatCents(r.revenueCents)}</td>
                    <td className="px-2 py-2 text-muted tabular-nums">{formatCents(r.cogsCents)}</td>
                    <td className="px-2 py-2 tabular-nums text-positive">{formatCents(r.grossProfitCents)}</td>
                    <td className={`px-2 py-2 tabular-nums ${belowFloor ? "text-warning" : "text-muted"}`}>
                      {r.marginPct !== null ? `${(r.marginPct * 100).toFixed(0)}%` : "—"}
                      {belowFloor && <span className="ml-1 text-xs">below floor</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run to confirm pass.**

Run: `npx vitest run src/components/ProductProfitTable`
Expected: PASS.

- [ ] **Step 5: Mount it.** In `src/app/profit/page.tsx` add `import { ProductProfitTable } from "@/components/ProductProfitTable";` and render `<ProductProfitTable />` after `<ProfitTrendChart />`.

- [ ] **Step 6: Commit.**

```bash
git add src/components/ProductProfitTable.tsx src/components/ProductProfitTable.test.tsx src/app/profit/page.tsx
git commit -m "feat(profit): add per-product profit leaderboard component"
```

---

### Task 9: Campaign performance list component

**Goal:** A list of campaigns with window profit and the honest "vs prior period" delta, each row linking to the campaign detail.

**Files:**
- Create: `src/components/CampaignPerformanceList.tsx`
- Test: `src/components/CampaignPerformanceList.test.tsx`
- Modify: `src/app/profit/page.tsx` (mount it)

**Acceptance Criteria:**
- [ ] Fetches `/api/profit/campaigns`; renders name, days ran, products changed, window profit, and the delta
- [ ] Shows "no prior baseline" instead of a delta when `noPriorBaseline`; shows a "still running" note when `stillRunning`; shows "est." when `estimated`
- [ ] Each row links to `/campaigns/[id]`
- [ ] Empty state when there are no campaigns with results
- [ ] `npx vitest run src/components/CampaignPerformanceList` passes

**Verify:** `npx vitest run src/components/CampaignPerformanceList` → pass; `/profit` in dev shows the list

**Steps:**

- [ ] **Step 1: Write the failing test.** Create `src/components/CampaignPerformanceList.test.tsx`:

```typescript
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { CampaignPerformanceList } from "./CampaignPerformanceList";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

function mockCampaigns(list: unknown[]) {
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => list })) as unknown as typeof fetch);
}

const base = {
  campaignId: "c1", name: "Summer Sale", status: "completed",
  firstAppliedAt: "2026-02-01T00:00:00Z", windowEnd: "2026-02-15T00:00:00Z",
  days: 14, productsChanged: 47, duringProfitCents: 980000, priorProfitCents: 750000,
  deltaCents: 230000, noPriorBaseline: false, stillRunning: false, estimated: false,
};

describe("CampaignPerformanceList", () => {
  it("renders a campaign with its delta and links to the campaign", async () => {
    mockCampaigns([base]);
    render(<CampaignPerformanceList />);
    await waitFor(() => expect(screen.getByText("Summer Sale")).toBeInTheDocument());
    expect(screen.getByText(/\+\$2,300\.00/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Summer Sale/i })).toHaveAttribute("href", "/campaigns/c1");
  });

  it("shows 'no prior baseline' instead of a delta", async () => {
    mockCampaigns([{ ...base, noPriorBaseline: true }]);
    render(<CampaignPerformanceList />);
    await waitFor(() => expect(screen.getByText(/no prior baseline/i)).toBeInTheDocument());
  });

  it("shows a 'still running' note", async () => {
    mockCampaigns([{ ...base, stillRunning: true, status: "active" }]);
    render(<CampaignPerformanceList />);
    await waitFor(() => expect(screen.getByText(/still running/i)).toBeInTheDocument());
  });

  it("shows an empty state when there are no campaigns", async () => {
    mockCampaigns([]);
    render(<CampaignPerformanceList />);
    await waitFor(() => expect(screen.getByText(/no campaign performance yet/i)).toBeInTheDocument());
  });
});
```

- [ ] **Step 2: Run to confirm failure.**

Run: `npx vitest run src/components/CampaignPerformanceList`
Expected: FAIL.

- [ ] **Step 3: Implement the list.** Create `src/components/CampaignPerformanceList.tsx`:

```typescript
"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { formatCents } from "@/lib/money";

interface CampaignPerf {
  campaignId: string;
  name: string;
  status: string;
  firstAppliedAt: string;
  windowEnd: string;
  days: number;
  productsChanged: number;
  duringProfitCents: number;
  priorProfitCents: number;
  deltaCents: number;
  noPriorBaseline: boolean;
  stillRunning: boolean;
  estimated: boolean;
}

function signedCents(cents: number): string {
  return `${cents >= 0 ? "+" : "−"}${formatCents(Math.abs(cents))}`;
}

export function CampaignPerformanceList() {
  const [data, setData] = useState<CampaignPerf[] | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/profit/campaigns")
      .then((r) => (r.ok ? r.json() : []))
      .then((d: CampaignPerf[]) => { if (active) setData(d); })
      .catch(() => { if (active) setData([]); });
    return () => { active = false; };
  }, []);

  return (
    <div className="rounded-xl border border-line bg-surface p-5">
      <h2 className="mb-3 text-sm font-semibold text-ink">Campaign performance</h2>

      {data === null ? (
        <div className="h-32 animate-pulse rounded-lg bg-panel" />
      ) : data.length === 0 ? (
        <div className="py-10 text-center text-sm text-muted">No campaign performance yet. Run a campaign to see its impact.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-muted">
                <th className="px-2 py-2 font-medium">Campaign</th>
                <th className="px-2 py-2 font-medium">Ran</th>
                <th className="px-2 py-2 font-medium">Products</th>
                <th className="px-2 py-2 font-medium">Profit (window)</th>
                <th className="px-2 py-2 font-medium">vs prior period</th>
              </tr>
            </thead>
            <tbody>
              {data.map((c) => (
                <tr key={c.campaignId} className="border-b border-line last:border-0">
                  <td className="px-2 py-2">
                    <Link href={`/campaigns/${c.campaignId}`} className="text-ink hover:text-accent">{c.name}</Link>
                    {c.estimated && <span className="ml-1 text-xs text-faint" title="Estimated from current costs">est.</span>}
                    {c.stillRunning && <span className="block text-xs text-warning">still running — partial window</span>}
                  </td>
                  <td className="px-2 py-2 text-muted tabular-nums">{c.days}d</td>
                  <td className="px-2 py-2 text-muted tabular-nums">{c.productsChanged}</td>
                  <td className="px-2 py-2 text-ink tabular-nums">{formatCents(c.duringProfitCents)}</td>
                  <td className="px-2 py-2 tabular-nums">
                    {c.noPriorBaseline ? (
                      <span className="text-faint">no prior baseline</span>
                    ) : (
                      <span className={c.deltaCents >= 0 ? "text-positive" : "text-danger"}>
                        {signedCents(c.deltaCents)} {c.deltaCents >= 0 ? "▲" : "▼"}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-faint">&ldquo;vs prior period&rdquo; compares each campaign to the equal-length window before it started — a period comparison, not proven causation.</p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run to confirm pass.**

Run: `npx vitest run src/components/CampaignPerformanceList`
Expected: PASS.

- [ ] **Step 5: Mount it.** In `src/app/profit/page.tsx` add `import { CampaignPerformanceList } from "@/components/CampaignPerformanceList";` and render `<CampaignPerformanceList />` after `<ProductProfitTable />`.

- [ ] **Step 6: Commit.**

```bash
git add src/components/CampaignPerformanceList.tsx src/components/CampaignPerformanceList.test.tsx src/app/profit/page.tsx
git commit -m "feat(profit): add campaign performance list component"
```

---

### Task 10: Integration + final verification

**Goal:** Confirm the full feature works end-to-end and the whole suite is green.

**Files:**
- No new source; may touch `src/app/profit/page.tsx` for final layout polish only.

**Acceptance Criteria:**
- [ ] `npx vitest run` shows all tests passing (≥ 819 baseline + the new tests), zero failures
- [ ] `npx tsc --noEmit` reports no type errors
- [ ] In the dev server, `/profit` renders all four sections; the product window toggle and earners/bleeders toggle refetch and re-sort; a campaign row links to its detail page
- [ ] The `estimated`, `no prior baseline`, and `still running` labels appear when the underlying data warrants (verify with the demo/seed account, seeding a `CogsChange` and a campaign if needed)

**Verify:** `npx vitest run` → all pass; `npx tsc --noEmit` → no output; manual `/profit` walkthrough clean

**Steps:**

- [ ] **Step 1: Full test suite.**

Run: `npx vitest run`
Expected: all files pass, no failures.

- [ ] **Step 2: Type check.**

Run: `npx tsc --noEmit`
Expected: no output (clean).

- [ ] **Step 3: Manual walkthrough.** Start the dev server (`npm run dev`), log in as the demo account, open `/profit`. Confirm:
  - Summary cards show data or the empty state.
  - The P&L trend chart renders three series (or its empty state).
  - The per-product table sorts under both toggles and refetches on window change.
  - The campaign list renders; clicking a campaign name navigates to `/campaigns/[id]`.
  - Console shows no errors, no hydration warnings.

- [ ] **Step 4: Commit any final polish.**

```bash
git add -A
git commit -m "chore(profit): final integration polish for profit dashboard"
```

- [ ] **Step 5: Production reminder (do not run blindly).** Before this ships to production, the `CogsChange` table must exist in Neon Postgres. The build runs `prisma db push` against the production schema automatically (via `vercel-build`), and `schema.production.prisma` now contains `CogsChange` (Task 1), so the additive table is created on deploy — no manual migration. Confirm the deploy's build log shows the schema in sync, then smoke-test `/profit` on `tryzorin.com`.

---

## Notes for the implementer

- **Promo-row policy (intentional asymmetry):** `/api/profit/trend` and `/api/profit/products` exclude `promotionFlag: true` rows (steady-state profit picture). `/api/profit/campaigns` includes ALL sales in its windows — a campaign is effectively a promotion, so excluding promo rows would erase the very sales being measured. This is deliberate; do not "fix" it.
- **No `NaN`:** every ratio (margin, MoM %) guards its denominator and returns `null`/`—` rather than `NaN`.
- **CSS tokens:** reuse existing OKLCH tokens (`--color-accent`, `--color-positive`, `--color-warning`, `--color-line`, `--color-faint`, `text-ink`, `text-muted`, `bg-surface`, `bg-panel`). Do not introduce new colors.
- **Tenant isolation:** every profit route scopes all queries by `merchantId` from the session. The campaign route also scopes its supporting `salesRecord`/`product`/`cogsChange` queries by the merchant's own product ids.
