# Pricing Campaigns Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:subagent-driven-development (recommended) or superpowers-extended-cc:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a campaigns engine that lets merchants define pricing rules, select products, schedule execution, and have prices automatically applied to and reverted from their Shopify/WooCommerce store (or tracked via CSV export for unconnected merchants).

**Architecture:** Three new Prisma models (Campaign, CampaignProduct, CampaignLog) with a pure-function rules engine, a chunked cron executor (Vercel Cron every 5 min, 30 products/chunk), and 14 API routes following existing auth/error patterns. A 4-page UI (list, builder, detail, edit) with a filterable product picker component.

**Tech Stack:** Next.js 16 App Router, Prisma 7 (SQLite dev / Postgres prod), Vitest 4, Tailwind v4 OKLCH tokens, Vercel Cron

**User decisions (already made):**
- Both campaign flavors (scheduled sale + ML recommendation batch) in v1
- Product selection: category filter + individual pick + smart filters
- Per-campaign revert toggle (default on for sale, off for ML)
- CSV-only merchants get tracking + CSV export only (no store push)
- Warn on conflicts with option to override at schedule time
- Always auto-execute on schedule (no confirmation gate)
- All rule types in v1 (percentage, ML recommendation, competitor match, fixed price)
- Top-level "Campaigns" sidebar item between Products and Launch Planner
- Vercel Cron + chunked execution (30 products/invocation, 5-min interval)

---

## File Structure

### New Files

| File | Responsibility |
|---|---|
| `src/lib/campaigns/rules.ts` | `calculateTargetPrice()` pure function — all pricing logic |
| `src/lib/campaigns/rules.test.ts` | Unit tests for rules engine (~20 tests) |
| `src/lib/campaigns/conflicts.ts` | `findConflicts()` — query for overlapping campaign products |
| `src/lib/campaigns/execute.ts` | `executeChunk()` / `revertChunk()` — shared by cron + manual execute |
| `src/lib/campaigns/assertions.ts` | `assertCampaignOwned()` — tenant isolation helper |
| `src/app/api/campaigns/route.ts` | GET list + POST create |
| `src/app/api/campaigns/route.test.ts` | Tests for list + create |
| `src/app/api/campaigns/[id]/route.ts` | GET detail + PATCH update + DELETE |
| `src/app/api/campaigns/[id]/route.test.ts` | Tests for detail + update + delete |
| `src/app/api/campaigns/[id]/schedule/route.ts` | POST schedule (draft -> scheduled) |
| `src/app/api/campaigns/[id]/schedule/route.test.ts` | Tests for schedule + conflict detection |
| `src/app/api/campaigns/[id]/execute/route.ts` | POST manual execute |
| `src/app/api/campaigns/[id]/execute/route.test.ts` | Tests for manual execute |
| `src/app/api/campaigns/[id]/stop/route.ts` | POST stop campaign |
| `src/app/api/campaigns/[id]/stop/route.test.ts` | Tests for stop |
| `src/app/api/campaigns/[id]/cancel/route.ts` | POST cancel (scheduled -> draft) |
| `src/app/api/campaigns/[id]/cancel/route.test.ts` | Tests for cancel |
| `src/app/api/campaigns/[id]/duplicate/route.ts` | POST duplicate (completed -> new draft) |
| `src/app/api/campaigns/[id]/duplicate/route.test.ts` | Tests for duplicate |
| `src/app/api/campaigns/[id]/export/route.ts` | GET CSV export |
| `src/app/api/campaigns/[id]/export/route.test.ts` | Tests for export |
| `src/app/api/campaigns/preview/route.ts` | POST dry-run preview |
| `src/app/api/campaigns/preview/route.test.ts` | Tests for preview |
| `src/app/api/cron/campaigns/route.ts` | GET cron handler |
| `src/app/api/cron/campaigns/route.test.ts` | Tests for cron handler (~15 tests) |
| `src/app/campaigns/page.tsx` | Campaigns list page (server component) |
| `src/app/campaigns/new/page.tsx` | Campaign builder page (new) |
| `src/app/campaigns/[id]/page.tsx` | Campaign detail page |
| `src/app/campaigns/[id]/edit/page.tsx` | Campaign builder page (edit draft) |
| `src/components/CampaignBuilder.tsx` | 3-step campaign builder form |
| `src/components/CampaignBuilder.test.tsx` | Tests for builder |
| `src/components/CampaignList.tsx` | Campaign list with status filter tabs |
| `src/components/CampaignList.test.tsx` | Tests for list |
| `src/components/CampaignDetail.tsx` | Campaign detail view with timeline + products |
| `src/components/CampaignDetail.test.tsx` | Tests for detail |
| `src/components/ProductPicker.tsx` | Filterable product selector with checkboxes |
| `src/components/ProductPicker.test.tsx` | Tests for product picker |
| `vercel.json` | Vercel Cron configuration |

### Modified Files

| File | Change |
|---|---|
| `prisma/schema.prisma` | Add Campaign, CampaignProduct, CampaignLog models + Product relation |
| `prisma/schema.production.prisma` | Same schema changes |
| `src/components/Sidebar.tsx` | Add "Campaigns" nav item |

---

### Task 1: Prisma Schema — Add Campaign Models

**Goal:** Add Campaign, CampaignProduct, and CampaignLog models to both dev and production Prisma schemas, and add the `campaignProducts` relation to Product.

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `prisma/schema.production.prisma`

**Acceptance Criteria:**
- [ ] Campaign model has all fields from the spec (id, merchantId, name, type, status, rules, revertOnEnd, startsAt, endsAt, executionCursor, executedAt, revertedAt, createdAt)
- [ ] CampaignProduct model has all fields (id, campaignId, productId, originalPriceCents, targetPriceCents, appliedAt, revertedAt, error) with cascade delete on campaign
- [ ] CampaignProduct has `@@unique([campaignId, productId])` constraint
- [ ] CampaignLog model has all fields (id, campaignId, event, detail, createdAt) with cascade delete on campaign
- [ ] Product model has `campaignProducts CampaignProduct[]` relation
- [ ] Merchant model has `campaigns Campaign[]` relation
- [ ] `npx prisma db push` succeeds without errors
- [ ] `npx prisma generate` succeeds
- [ ] All 681 existing tests still pass

**Verify:** `npx prisma db push && npx vitest run --reporter=verbose 2>&1 | tail -5` → "681 tests passed"

**Steps:**

- [ ] **Step 1: Add models to dev schema**

Add the following to the end of `prisma/schema.prisma`, before the closing of the file:

```prisma
model Campaign {
  id              String            @id @default(cuid())
  merchantId      String
  merchant        Merchant          @relation(fields: [merchantId], references: [id])
  name            String
  type            String
  status          String            @default("draft")
  rules           String
  revertOnEnd     Boolean           @default(true)
  startsAt        DateTime?
  endsAt          DateTime?
  executionCursor Int               @default(0)
  executedAt      DateTime?
  revertedAt      DateTime?
  createdAt       DateTime          @default(now())
  products        CampaignProduct[]
  logs            CampaignLog[]
}

model CampaignProduct {
  id                 String    @id @default(cuid())
  campaignId         String
  campaign           Campaign  @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  productId          String
  product            Product   @relation(fields: [productId], references: [id])
  originalPriceCents Int
  targetPriceCents   Int
  appliedAt          DateTime?
  revertedAt         DateTime?
  error              String?

  @@unique([campaignId, productId])
}

model CampaignLog {
  id         String   @id @default(cuid())
  campaignId String
  campaign   Campaign @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  event      String
  detail     String?
  createdAt  DateTime @default(now())
}
```

Add the `campaigns` relation to the Merchant model:
```prisma
campaigns         Campaign[]
```

Add the `campaignProducts` relation to the Product model:
```prisma
campaignProducts  CampaignProduct[]
```

- [ ] **Step 2: Add the same models to production schema**

Apply identical changes to `prisma/schema.production.prisma`. The only difference is the datasource provider (`postgresql` vs `sqlite`).

- [ ] **Step 3: Push schema and generate client**

Run:
```bash
npx prisma db push
npx prisma generate
```
Expected: Both commands succeed with no errors.

- [ ] **Step 4: Run existing tests to confirm no regressions**

Run:
```bash
npx vitest run
```
Expected: All 681 tests pass.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/schema.production.prisma
git commit -m "feat(campaigns): add Campaign, CampaignProduct, CampaignLog schema models"
```

---

### Task 2: Pricing Rules Engine

**Goal:** Implement `calculateTargetPrice()` — a pure function that computes the target price for a product given campaign rules — with full test coverage.

**Files:**
- Create: `src/lib/campaigns/rules.ts`
- Create: `src/lib/campaigns/rules.test.ts`

**Acceptance Criteria:**
- [ ] `calculateTargetPrice()` handles all four modes: percentage, ml_recommendation, competitor_match, fixed_price
- [ ] Post-mode adjustments applied in order: margin floor, rounding, no-change detection
- [ ] Products without required data are skipped with appropriate `skipReason`
- [ ] Function is pure — no DB calls, no side effects
- [ ] All ~20 tests pass

**Verify:** `npx vitest run src/lib/campaigns/rules.test.ts --reporter=verbose` → all tests pass

**Steps:**

- [ ] **Step 1: Define types**

Create `src/lib/campaigns/rules.ts`:

```typescript
import { marginPct } from "@/lib/margin";

export interface CampaignRules {
  mode: "percentage" | "ml_recommendation" | "competitor_match" | "fixed_price";
  percentage?: number;
  competitorStrategy?: "min" | "median";
  competitorOffset?: number;
  fixedPriceCents?: number;
  rounding: "none" | "99" | "95";
  marginFloorPct: number;
}

export interface RuleProduct {
  currentPrice: number;
  cogs: number | null;
  recommendation?: { rulesJson: string } | null;
  competitorPrices?: { priceCents: number }[];
}

export interface TargetPriceResult {
  targetPriceCents: number;
  skipped: boolean;
  skipReason?: string;
  clampedByMarginFloor: boolean;
}
```

- [ ] **Step 2: Implement base mode calculations**

Add to `src/lib/campaigns/rules.ts`:

```typescript
import { calculateMarketStats } from "@/lib/pricing/marketStats";

function computeBasePrice(product: RuleProduct, rules: CampaignRules): { price: number; skipped: boolean; skipReason?: string } {
  switch (rules.mode) {
    case "percentage": {
      const pct = rules.percentage ?? 0;
      return { price: Math.round(product.currentPrice * (1 + pct / 100)), skipped: false };
    }

    case "ml_recommendation": {
      if (!product.recommendation) {
        return { price: 0, skipped: true, skipReason: "no_recommendation" };
      }
      try {
        const parsed = JSON.parse(product.recommendation.rulesJson) as { suggestedPriceCents?: number };
        if (!parsed.suggestedPriceCents) {
          return { price: 0, skipped: true, skipReason: "no_recommendation" };
        }
        return { price: parsed.suggestedPriceCents, skipped: false };
      } catch {
        return { price: 0, skipped: true, skipReason: "no_recommendation" };
      }
    }

    case "competitor_match": {
      const prices = product.competitorPrices?.map(cp => cp.priceCents).sort((a, b) => a - b);
      if (!prices || prices.length === 0) {
        return { price: 0, skipped: true, skipReason: "no_competitor_data" };
      }
      const stats = calculateMarketStats(prices);
      const strategy = rules.competitorStrategy ?? "median";
      const baseRef = strategy === "min" ? stats.minCents : stats.medianCents;
      const offset = rules.competitorOffset ?? 0;
      return { price: Math.round(baseRef * (1 + offset / 100)), skipped: false };
    }

    case "fixed_price": {
      const fixed = rules.fixedPriceCents;
      if (!fixed || fixed <= 0) {
        return { price: 0, skipped: true, skipReason: "invalid_fixed_price" };
      }
      return { price: fixed, skipped: false };
    }

    default:
      return { price: 0, skipped: true, skipReason: "unknown_mode" };
  }
}
```

- [ ] **Step 3: Implement post-mode adjustments and the main function**

Add to `src/lib/campaigns/rules.ts`:

```typescript
function applyMarginFloor(priceCents: number, cogs: number | null, marginFloorPct: number): { price: number; clamped: boolean } {
  if (cogs === null) return { price: priceCents, clamped: false };
  const margin = marginPct(priceCents, cogs);
  if (margin !== null && margin < marginFloorPct / 100) {
    const floorPrice = Math.ceil(cogs / (1 - marginFloorPct / 100));
    return { price: floorPrice, clamped: true };
  }
  return { price: priceCents, clamped: false };
}

function applyRounding(priceCents: number, rounding: CampaignRules["rounding"]): number {
  if (rounding === "none") return priceCents;
  const wholeDollars = Math.round(priceCents / 100) * 100;
  if (rounding === "99") return wholeDollars - 1;
  if (rounding === "95") return wholeDollars - 5;
  return priceCents;
}

export function calculateTargetPrice(product: RuleProduct, rules: CampaignRules): TargetPriceResult {
  const base = computeBasePrice(product, rules);
  if (base.skipped) {
    return { targetPriceCents: 0, skipped: true, skipReason: base.skipReason, clampedByMarginFloor: false };
  }

  const { price: afterFloor, clamped } = applyMarginFloor(base.price, product.cogs, rules.marginFloorPct);
  const afterRounding = applyRounding(afterFloor, rules.rounding);
  const finalPrice = Math.max(afterRounding, 1);

  if (finalPrice === product.currentPrice) {
    return { targetPriceCents: finalPrice, skipped: true, skipReason: "no_change", clampedByMarginFloor: clamped };
  }

  return { targetPriceCents: finalPrice, skipped: false, clampedByMarginFloor: clamped };
}
```

- [ ] **Step 4: Write tests**

Create `src/lib/campaigns/rules.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { calculateTargetPrice, type CampaignRules, type RuleProduct } from "./rules";

const baseRules: CampaignRules = { mode: "percentage", rounding: "none", marginFloorPct: 10 };

function makeProduct(overrides: Partial<RuleProduct> = {}): RuleProduct {
  return { currentPrice: 1000, cogs: null, ...overrides };
}

describe("calculateTargetPrice — percentage mode", () => {
  it("raises price by positive percentage", () => {
    const result = calculateTargetPrice(makeProduct(), { ...baseRules, percentage: 10 });
    expect(result).toEqual({ targetPriceCents: 1100, skipped: false, clampedByMarginFloor: false });
  });

  it("lowers price by negative percentage", () => {
    const result = calculateTargetPrice(makeProduct(), { ...baseRules, percentage: -20 });
    expect(result).toEqual({ targetPriceCents: 800, skipped: false, clampedByMarginFloor: false });
  });

  it("rounds to nearest cent", () => {
    const result = calculateTargetPrice(makeProduct({ currentPrice: 1001 }), { ...baseRules, percentage: 33 });
    expect(result.targetPriceCents).toBe(1331);
    expect(result.skipped).toBe(false);
  });
});

describe("calculateTargetPrice — ml_recommendation mode", () => {
  const mlRules: CampaignRules = { ...baseRules, mode: "ml_recommendation" };

  it("uses suggestedPriceCents from recommendation", () => {
    const product = makeProduct({
      recommendation: { rulesJson: JSON.stringify({ suggestedPriceCents: 1200 }) },
    });
    const result = calculateTargetPrice(product, mlRules);
    expect(result).toEqual({ targetPriceCents: 1200, skipped: false, clampedByMarginFloor: false });
  });

  it("skips when no recommendation exists", () => {
    const result = calculateTargetPrice(makeProduct(), mlRules);
    expect(result.skipped).toBe(true);
    expect(result.skipReason).toBe("no_recommendation");
  });

  it("skips when rulesJson has no suggestedPriceCents", () => {
    const product = makeProduct({ recommendation: { rulesJson: JSON.stringify({}) } });
    const result = calculateTargetPrice(product, mlRules);
    expect(result.skipped).toBe(true);
    expect(result.skipReason).toBe("no_recommendation");
  });
});

describe("calculateTargetPrice — competitor_match mode", () => {
  const compRules: CampaignRules = {
    ...baseRules,
    mode: "competitor_match",
    competitorStrategy: "median",
    competitorOffset: 0,
  };

  it("matches median competitor price", () => {
    const product = makeProduct({
      competitorPrices: [{ priceCents: 900 }, { priceCents: 1100 }, { priceCents: 1300 }],
    });
    const result = calculateTargetPrice(product, compRules);
    expect(result.targetPriceCents).toBe(1100);
    expect(result.skipped).toBe(false);
  });

  it("undercuts median by offset percentage", () => {
    const product = makeProduct({
      competitorPrices: [{ priceCents: 1000 }, { priceCents: 1000 }],
    });
    const result = calculateTargetPrice(product, { ...compRules, competitorOffset: -5 });
    expect(result.targetPriceCents).toBe(950);
  });

  it("uses min strategy", () => {
    const product = makeProduct({
      competitorPrices: [{ priceCents: 800 }, { priceCents: 1200 }],
    });
    const result = calculateTargetPrice(product, { ...compRules, competitorStrategy: "min" });
    expect(result.targetPriceCents).toBe(800);
  });

  it("skips when no competitor data", () => {
    const result = calculateTargetPrice(makeProduct(), compRules);
    expect(result.skipped).toBe(true);
    expect(result.skipReason).toBe("no_competitor_data");
  });
});

describe("calculateTargetPrice — fixed_price mode", () => {
  it("uses fixed price directly", () => {
    const result = calculateTargetPrice(makeProduct(), {
      ...baseRules,
      mode: "fixed_price",
      fixedPriceCents: 1500,
    });
    expect(result).toEqual({ targetPriceCents: 1500, skipped: false, clampedByMarginFloor: false });
  });
});

describe("calculateTargetPrice — rounding", () => {
  it("rounds to .99", () => {
    const result = calculateTargetPrice(makeProduct({ currentPrice: 1000 }), {
      ...baseRules,
      percentage: 10,
      rounding: "99",
    });
    expect(result.targetPriceCents).toBe(1099);
  });

  it("rounds to .95", () => {
    const result = calculateTargetPrice(makeProduct({ currentPrice: 1000 }), {
      ...baseRules,
      percentage: 10,
      rounding: "95",
    });
    expect(result.targetPriceCents).toBe(1095);
  });

  it("handles price already ending in .99 with no rounding", () => {
    const result = calculateTargetPrice(makeProduct({ currentPrice: 999 }), {
      ...baseRules,
      percentage: 10,
      rounding: "none",
    });
    expect(result.targetPriceCents).toBe(1099);
  });
});

describe("calculateTargetPrice — margin floor", () => {
  it("clamps price upward when margin would go below floor", () => {
    const result = calculateTargetPrice(makeProduct({ currentPrice: 1000, cogs: 900 }), {
      ...baseRules,
      percentage: -20,
      marginFloorPct: 10,
    });
    expect(result.targetPriceCents).toBe(1000);
    expect(result.clampedByMarginFloor).toBe(true);
  });

  it("skips margin check when cogs is null", () => {
    const result = calculateTargetPrice(makeProduct({ currentPrice: 1000, cogs: null }), {
      ...baseRules,
      percentage: -50,
    });
    expect(result.targetPriceCents).toBe(500);
    expect(result.clampedByMarginFloor).toBe(false);
  });

  it("does not clamp when margin is above floor", () => {
    const result = calculateTargetPrice(makeProduct({ currentPrice: 1000, cogs: 500 }), {
      ...baseRules,
      percentage: -10,
      marginFloorPct: 10,
    });
    expect(result.targetPriceCents).toBe(900);
    expect(result.clampedByMarginFloor).toBe(false);
  });
});

describe("calculateTargetPrice — no-change detection", () => {
  it("skips when target equals current price", () => {
    const result = calculateTargetPrice(makeProduct({ currentPrice: 1000 }), {
      ...baseRules,
      percentage: 0,
    });
    expect(result.skipped).toBe(true);
    expect(result.skipReason).toBe("no_change");
  });
});

describe("calculateTargetPrice — combined adjustments", () => {
  it("applies margin floor then rounding in correct order", () => {
    const result = calculateTargetPrice(makeProduct({ currentPrice: 1000, cogs: 850 }), {
      ...baseRules,
      percentage: -20,
      marginFloorPct: 15,
      rounding: "99",
    });
    expect(result.clampedByMarginFloor).toBe(true);
    expect(result.targetPriceCents).toBe(999);
  });
});
```

- [ ] **Step 5: Run tests**

Run: `npx vitest run src/lib/campaigns/rules.test.ts --reporter=verbose`
Expected: All ~20 tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/lib/campaigns/rules.ts src/lib/campaigns/rules.test.ts
git commit -m "feat(campaigns): implement calculateTargetPrice rules engine with tests"
```

---

### Task 3: Campaign Assertions + Conflict Detection

**Goal:** Create the `assertCampaignOwned()` tenant isolation helper and the `findConflicts()` function that detects product overlap between campaigns.

**Files:**
- Create: `src/lib/campaigns/assertions.ts`
- Create: `src/lib/campaigns/conflicts.ts`

**Acceptance Criteria:**
- [ ] `assertCampaignOwned()` throws HttpError 404 on foreign or missing campaigns (same pattern as `assertProductOwned`)
- [ ] `findConflicts()` finds products that appear in another campaign with status `scheduled`, `executing`, or `active`
- [ ] Conflicts are scoped by merchantId

**Verify:** These are tested indirectly via the schedule route tests in Task 6. Verify via `npx vitest run src/app/api/campaigns/ --reporter=verbose`.

**Steps:**

- [ ] **Step 1: Create assertions helper**

Create `src/lib/campaigns/assertions.ts`:

```typescript
import type { PrismaClient } from "@prisma/client";
import { HttpError } from "@/lib/api/errors";

export async function assertCampaignOwned(
  prisma: PrismaClient,
  campaignId: string,
  merchantId: string,
): Promise<void> {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { merchantId: true },
  });
  if (!campaign || campaign.merchantId !== merchantId) {
    throw new HttpError(404, "Not found");
  }
}
```

- [ ] **Step 2: Create conflict detection**

Create `src/lib/campaigns/conflicts.ts`:

```typescript
import type { PrismaClient } from "@prisma/client";

export interface CampaignConflict {
  productId: string;
  productTitle: string;
  existingCampaignId: string;
  existingCampaignName: string;
}

export async function findConflicts(
  prisma: PrismaClient,
  merchantId: string,
  campaignId: string,
  productIds: string[],
): Promise<CampaignConflict[]> {
  if (productIds.length === 0) return [];

  const overlapping = await prisma.campaignProduct.findMany({
    where: {
      productId: { in: productIds },
      campaign: {
        merchantId,
        id: { not: campaignId },
        status: { in: ["scheduled", "executing", "active"] },
      },
    },
    select: {
      productId: true,
      product: { select: { title: true } },
      campaign: { select: { id: true, name: true } },
    },
  });

  return overlapping.map((cp) => ({
    productId: cp.productId,
    productTitle: cp.product.title,
    existingCampaignId: cp.campaign.id,
    existingCampaignName: cp.campaign.name,
  }));
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/campaigns/assertions.ts src/lib/campaigns/conflicts.ts
git commit -m "feat(campaigns): add assertCampaignOwned and findConflicts helpers"
```

---

### Task 4: Campaign Execution Engine

**Goal:** Implement `executeChunk()` and `revertChunk()` — the core execution logic shared by the cron handler and the manual execute endpoint.

**Files:**
- Create: `src/lib/campaigns/execute.ts`

**Acceptance Criteria:**
- [ ] `executeChunk()` processes up to `chunkSize` campaign products, pushes prices to Shopify/WooCommerce (if connected), updates `Product.currentPrice`, creates `PriceChange` records, sets `CampaignProduct.appliedAt`, writes `CampaignLog` entries
- [ ] `revertChunk()` does the same but with `originalPriceCents` and sets `CampaignProduct.revertedAt`
- [ ] CSV-only products (no shopifyVariantId, no woocommerceVariantId) skip the push but still update DB
- [ ] Individual product failures are recorded on `CampaignProduct.error` and logged, but do not fail the whole chunk
- [ ] Returns `{ processed: number, done: boolean }` so callers know whether all products have been handled

**Verify:** Tested indirectly via the cron handler tests in Task 8. Verify via `npx vitest run src/app/api/cron/campaigns/route.test.ts --reporter=verbose`.

**Steps:**

- [ ] **Step 1: Create the execution engine**

Create `src/lib/campaigns/execute.ts`:

```typescript
import type { PrismaClient } from "@prisma/client";
import { pushPriceToShopify } from "@/lib/shopify/pushPrice";
import { getWooClient } from "@/lib/woocommerce/getClient";
import { pushPriceToWooCommerce } from "@/lib/woocommerce/pushPrice";
import { centsToDollars } from "@/lib/money";

const DEFAULT_CHUNK_SIZE = 30;

interface ChunkResult {
  processed: number;
  done: boolean;
}

export async function executeChunk(
  prisma: PrismaClient,
  campaignId: string,
  merchantId: string,
  cursor: number,
  chunkSize = DEFAULT_CHUNK_SIZE,
): Promise<ChunkResult> {
  const rows = await prisma.campaignProduct.findMany({
    where: { campaignId, appliedAt: null, error: null },
    orderBy: { id: "asc" },
    skip: 0,
    take: chunkSize,
    include: {
      product: {
        select: {
          id: true,
          shopifyVariantId: true,
          woocommerceVariantId: true,
          currentPrice: true,
        },
      },
    },
  });

  if (rows.length === 0) return { processed: 0, done: true };

  for (const row of rows) {
    try {
      if (row.product.shopifyVariantId) {
        await pushPriceToShopify(merchantId, row.product.shopifyVariantId, row.targetPriceCents);
      }

      await prisma.$transaction([
        prisma.product.update({
          where: { id: row.productId },
          data: { currentPrice: row.targetPriceCents },
        }),
        prisma.priceChange.create({
          data: {
            productId: row.productId,
            fromCents: row.product.currentPrice,
            toCents: row.targetPriceCents,
          },
        }),
        prisma.campaignProduct.update({
          where: { id: row.id },
          data: { appliedAt: new Date() },
        }),
        prisma.campaignLog.create({
          data: {
            campaignId,
            event: "product_applied",
            detail: JSON.stringify({ productId: row.productId }),
          },
        }),
      ]);

      if (row.product.woocommerceVariantId) {
        const wooClient = await getWooClient(merchantId);
        if (wooClient) {
          const result = await pushPriceToWooCommerce(
            prisma,
            wooClient,
            row.productId,
            centsToDollars(row.targetPriceCents),
          );
          if (!result.ok) {
            await prisma.campaignLog.create({
              data: {
                campaignId,
                event: "product_failed",
                detail: JSON.stringify({
                  productId: row.productId,
                  error: `WooCommerce sync failed: ${result.error}`,
                  priceAppliedInDb: true,
                }),
              },
            });
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await prisma.campaignProduct.update({
        where: { id: row.id },
        data: { error: msg },
      });
      await prisma.campaignLog.create({
        data: {
          campaignId,
          event: "product_failed",
          detail: JSON.stringify({ productId: row.productId, error: msg }),
        },
      });
    }
  }

  const remaining = await prisma.campaignProduct.count({
    where: { campaignId, appliedAt: null, error: null },
  });

  const newCursor = cursor + rows.length;
  await prisma.campaign.update({
    where: { id: campaignId },
    data: { executionCursor: newCursor },
  });

  return { processed: rows.length, done: remaining === 0 };
}

export async function revertChunk(
  prisma: PrismaClient,
  campaignId: string,
  merchantId: string,
  cursor: number,
  chunkSize = DEFAULT_CHUNK_SIZE,
): Promise<ChunkResult> {
  const rows = await prisma.campaignProduct.findMany({
    where: { campaignId, appliedAt: { not: null }, revertedAt: null, error: null },
    orderBy: { id: "asc" },
    skip: 0,
    take: chunkSize,
    include: {
      product: {
        select: {
          id: true,
          shopifyVariantId: true,
          woocommerceVariantId: true,
          currentPrice: true,
        },
      },
    },
  });

  if (rows.length === 0) return { processed: 0, done: true };

  for (const row of rows) {
    try {
      if (row.product.shopifyVariantId) {
        await pushPriceToShopify(merchantId, row.product.shopifyVariantId, row.originalPriceCents);
      }

      await prisma.$transaction([
        prisma.product.update({
          where: { id: row.productId },
          data: { currentPrice: row.originalPriceCents },
        }),
        prisma.priceChange.create({
          data: {
            productId: row.productId,
            fromCents: row.product.currentPrice,
            toCents: row.originalPriceCents,
          },
        }),
        prisma.campaignProduct.update({
          where: { id: row.id },
          data: { revertedAt: new Date() },
        }),
        prisma.campaignLog.create({
          data: {
            campaignId,
            event: "product_reverted",
            detail: JSON.stringify({ productId: row.productId }),
          },
        }),
      ]);

      if (row.product.woocommerceVariantId) {
        const wooClient = await getWooClient(merchantId);
        if (wooClient) {
          await pushPriceToWooCommerce(
            prisma,
            wooClient,
            row.productId,
            centsToDollars(row.originalPriceCents),
          );
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await prisma.campaignProduct.update({
        where: { id: row.id },
        data: { error: msg },
      });
      await prisma.campaignLog.create({
        data: {
          campaignId,
          event: "product_failed",
          detail: JSON.stringify({ productId: row.productId, error: msg }),
        },
      });
    }
  }

  const remaining = await prisma.campaignProduct.count({
    where: { campaignId, appliedAt: { not: null }, revertedAt: null, error: null },
  });

  const newCursor = cursor + rows.length;
  await prisma.campaign.update({
    where: { id: campaignId },
    data: { executionCursor: newCursor },
  });

  return { processed: rows.length, done: remaining === 0 };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/campaigns/execute.ts
git commit -m "feat(campaigns): implement executeChunk and revertChunk execution engine"
```

---

### Task 5: Campaign CRUD API Routes

**Goal:** Implement the core CRUD routes: list campaigns, create campaign, get detail, update draft, and delete draft.

**Files:**
- Create: `src/app/api/campaigns/route.ts`
- Create: `src/app/api/campaigns/route.test.ts`
- Create: `src/app/api/campaigns/[id]/route.ts`
- Create: `src/app/api/campaigns/[id]/route.test.ts`

**Acceptance Criteria:**
- [ ] `GET /api/campaigns` lists the merchant's campaigns with product counts, supports `?status=` filter
- [ ] `POST /api/campaigns` creates a campaign in draft status (Owner-only)
- [ ] `GET /api/campaigns/[id]` returns full detail with CampaignProduct + CampaignLog data
- [ ] `PATCH /api/campaigns/[id]` updates a draft campaign (Owner-only, 400 if not draft)
- [ ] `DELETE /api/campaigns/[id]` deletes a draft campaign (Owner-only, 400 if not draft)
- [ ] Wrong-merchant returns 404
- [ ] All routes use `withErrorHandling`, `requireSessionApi`/`requireOwnerApi`, `parseJsonBody`

**Verify:** `npx vitest run src/app/api/campaigns/route.test.ts src/app/api/campaigns/[id]/route.test.ts --reporter=verbose` → all tests pass

**Steps:**

- [ ] **Step 1: Create list + create route**

Create `src/app/api/campaigns/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withErrorHandling, HttpError } from "@/lib/api/errors";
import { parseJsonBody } from "@/lib/api/validation";
import { requireSessionApi, requireOwnerApi } from "@/lib/auth/requireSession";

export const GET = withErrorHandling(async (req: Request) => {
  const { merchantId } = await requireSessionApi();
  const url = new URL(req.url);
  const statusFilter = url.searchParams.get("status");

  const where: Record<string, unknown> = { merchantId };
  if (statusFilter) where.status = statusFilter;

  const campaigns = await prisma.campaign.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { products: true } } },
  });

  return NextResponse.json(campaigns);
});

export const POST = withErrorHandling(async (req: Request) => {
  const { merchantId } = await requireOwnerApi();
  const body = await parseJsonBody(req);

  const name = body.name;
  if (typeof name !== "string" || name.trim().length === 0) {
    throw new HttpError(400, "Campaign name is required");
  }

  const type = body.type;
  if (type !== "sale" && type !== "ml_recommendation") {
    throw new HttpError(400, "Campaign type must be 'sale' or 'ml_recommendation'");
  }

  const rules = body.rules;
  if (!rules || typeof rules !== "object") {
    throw new HttpError(400, "Campaign rules are required");
  }

  const campaign = await prisma.campaign.create({
    data: {
      merchantId,
      name: name.trim(),
      type,
      status: "draft",
      rules: JSON.stringify(rules),
      revertOnEnd: body.revertOnEnd !== undefined ? Boolean(body.revertOnEnd) : type === "sale",
      startsAt: body.startsAt ? new Date(body.startsAt as string) : null,
      endsAt: body.endsAt ? new Date(body.endsAt as string) : null,
    },
  });

  await prisma.campaignLog.create({
    data: { campaignId: campaign.id, event: "created" },
  });

  return NextResponse.json(campaign, { status: 201 });
});
```

- [ ] **Step 2: Create detail + update + delete route**

Create `src/app/api/campaigns/[id]/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withErrorHandling, HttpError } from "@/lib/api/errors";
import { parseJsonBody } from "@/lib/api/validation";
import { requireSessionApi, requireOwnerApi } from "@/lib/auth/requireSession";
import { assertCampaignOwned } from "@/lib/campaigns/assertions";

export const GET = withErrorHandling(
  async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { merchantId } = await requireSessionApi();
    const { id } = await params;
    await assertCampaignOwned(prisma, id, merchantId);

    const campaign = await prisma.campaign.findUniqueOrThrow({
      where: { id },
      include: {
        products: {
          include: { product: { select: { title: true, sku: true } } },
          orderBy: { id: "asc" },
        },
        logs: { orderBy: { createdAt: "asc" } },
      },
    });

    return NextResponse.json(campaign);
  },
);

export const PATCH = withErrorHandling(
  async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { merchantId } = await requireOwnerApi();
    const { id } = await params;
    await assertCampaignOwned(prisma, id, merchantId);

    const campaign = await prisma.campaign.findUniqueOrThrow({ where: { id } });
    if (campaign.status !== "draft") {
      throw new HttpError(400, "Only draft campaigns can be updated");
    }

    const body = await parseJsonBody(req);
    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = String(body.name).trim();
    if (body.rules !== undefined) data.rules = JSON.stringify(body.rules);
    if (body.revertOnEnd !== undefined) data.revertOnEnd = Boolean(body.revertOnEnd);
    if (body.startsAt !== undefined) data.startsAt = body.startsAt ? new Date(body.startsAt as string) : null;
    if (body.endsAt !== undefined) data.endsAt = body.endsAt ? new Date(body.endsAt as string) : null;

    const updated = await prisma.campaign.update({ where: { id }, data });
    return NextResponse.json(updated);
  },
);

export const DELETE = withErrorHandling(
  async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { merchantId } = await requireOwnerApi();
    const { id } = await params;
    await assertCampaignOwned(prisma, id, merchantId);

    const campaign = await prisma.campaign.findUniqueOrThrow({ where: { id } });
    if (campaign.status !== "draft") {
      throw new HttpError(400, "Only draft campaigns can be deleted");
    }

    await prisma.campaign.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  },
);
```

- [ ] **Step 3: Write tests for list + create**

Create `src/app/api/campaigns/route.test.ts`:

```typescript
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockFindMany = vi.hoisted(() => vi.fn());
const mockCreate = vi.hoisted(() => vi.fn());
const mockLogCreate = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db", () => ({
  prisma: {
    campaign: { findMany: mockFindMany, create: mockCreate },
    campaignLog: { create: mockLogCreate },
  },
}));

const mockRequireSession = vi.hoisted(() => vi.fn());
const mockRequireOwner = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth/requireSession", () => ({
  requireSessionApi: mockRequireSession,
  requireOwnerApi: mockRequireOwner,
}));

import { GET, POST } from "./route";

function makeReq(body?: unknown, url = "http://localhost/api/campaigns"): Request {
  return {
    url,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Request;
}

beforeEach(() => {
  vi.resetAllMocks();
  mockRequireSession.mockResolvedValue({ merchantId: "m1", user: { id: "u1", role: "OWNER", merchantId: "m1" } });
  mockRequireOwner.mockResolvedValue({ merchantId: "m1", user: { id: "u1", role: "OWNER", merchantId: "m1" } });
  mockLogCreate.mockResolvedValue({});
});

describe("GET /api/campaigns", () => {
  it("returns merchant campaigns", async () => {
    const campaigns = [{ id: "c1", name: "Summer Sale", _count: { products: 5 } }];
    mockFindMany.mockResolvedValue(campaigns);

    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(campaigns);
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { merchantId: "m1" } }),
    );
  });

  it("filters by status query param", async () => {
    mockFindMany.mockResolvedValue([]);
    await GET(makeReq(undefined, "http://localhost/api/campaigns?status=active"));
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { merchantId: "m1", status: "active" } }),
    );
  });
});

describe("POST /api/campaigns", () => {
  it("creates a draft campaign", async () => {
    const created = { id: "c1", name: "Summer Sale", status: "draft", type: "sale" };
    mockCreate.mockResolvedValue(created);

    const res = await POST(makeReq({
      name: "Summer Sale",
      type: "sale",
      rules: { mode: "percentage", percentage: -20, rounding: "99", marginFloorPct: 10 },
    }));
    expect(res.status).toBe(201);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ merchantId: "m1", status: "draft", name: "Summer Sale" }),
      }),
    );
  });

  it("returns 400 for missing name", async () => {
    const res = await POST(makeReq({ type: "sale", rules: { mode: "percentage" } }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid type", async () => {
    const res = await POST(makeReq({ name: "Test", type: "invalid", rules: { mode: "percentage" } }));
    expect(res.status).toBe(400);
  });

  it("returns 403 for Member role", async () => {
    mockRequireOwner.mockRejectedValue({ status: 403, message: "Owner access required" });
    const res = await POST(makeReq({ name: "Test", type: "sale", rules: {} }));
    expect(res.status).toBe(500); // toErrorResponse wraps non-HttpError
  });
});
```

- [ ] **Step 4: Write tests for detail + update + delete**

Create `src/app/api/campaigns/[id]/route.test.ts`:

```typescript
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockFindUnique = vi.hoisted(() => vi.fn());
const mockFindUniqueOrThrow = vi.hoisted(() => vi.fn());
const mockUpdate = vi.hoisted(() => vi.fn());
const mockDelete = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db", () => ({
  prisma: {
    campaign: {
      findUnique: mockFindUnique,
      findUniqueOrThrow: mockFindUniqueOrThrow,
      update: mockUpdate,
      delete: mockDelete,
    },
  },
}));

vi.mock("@/lib/auth/requireSession", () => ({
  requireSessionApi: vi.fn(async () => ({ merchantId: "m1", user: { id: "u1", merchantId: "m1" } })),
  requireOwnerApi: vi.fn(async () => ({ merchantId: "m1", user: { id: "u1", merchantId: "m1" } })),
}));

vi.mock("@/lib/campaigns/assertions", () => ({
  assertCampaignOwned: vi.fn(async () => {}),
}));

import { GET, PATCH, DELETE } from "./route";

const ctx = { params: Promise.resolve({ id: "c1" }) };

function makeReq(body?: unknown): Request {
  return {
    url: "http://localhost/api/campaigns/c1",
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Request;
}

beforeEach(() => vi.resetAllMocks());

describe("GET /api/campaigns/[id]", () => {
  it("returns campaign with products and logs", async () => {
    const campaign = { id: "c1", name: "Test", products: [], logs: [] };
    mockFindUniqueOrThrow.mockResolvedValue(campaign);

    const res = await GET(makeReq(), ctx);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(campaign);
  });
});

describe("PATCH /api/campaigns/[id]", () => {
  it("updates a draft campaign", async () => {
    mockFindUniqueOrThrow.mockResolvedValue({ id: "c1", status: "draft" });
    mockUpdate.mockResolvedValue({ id: "c1", name: "Updated" });

    const res = await PATCH(makeReq({ name: "Updated" }), ctx);
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalled();
  });

  it("returns 400 for non-draft campaign", async () => {
    mockFindUniqueOrThrow.mockResolvedValue({ id: "c1", status: "active" });

    const res = await PATCH(makeReq({ name: "Updated" }), ctx);
    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/campaigns/[id]", () => {
  it("deletes a draft campaign", async () => {
    mockFindUniqueOrThrow.mockResolvedValue({ id: "c1", status: "draft" });
    mockDelete.mockResolvedValue({});

    const res = await DELETE(makeReq(), ctx);
    expect(res.status).toBe(200);
  });

  it("returns 400 for non-draft campaign", async () => {
    mockFindUniqueOrThrow.mockResolvedValue({ id: "c1", status: "scheduled" });

    const res = await DELETE(makeReq(), ctx);
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 5: Run tests**

Run: `npx vitest run src/app/api/campaigns/route.test.ts src/app/api/campaigns/[id]/route.test.ts --reporter=verbose`
Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/campaigns/route.ts src/app/api/campaigns/route.test.ts src/app/api/campaigns/[id]/route.ts src/app/api/campaigns/[id]/route.test.ts
git commit -m "feat(campaigns): add CRUD API routes with tests"
```

---

### Task 6: Schedule + Preview + Conflict API Routes

**Goal:** Implement the schedule endpoint (with conflict detection), the preview endpoint (dry-run price computation), and the cancel endpoint.

**Files:**
- Create: `src/app/api/campaigns/[id]/schedule/route.ts`
- Create: `src/app/api/campaigns/[id]/schedule/route.test.ts`
- Create: `src/app/api/campaigns/preview/route.ts`
- Create: `src/app/api/campaigns/preview/route.test.ts`
- Create: `src/app/api/campaigns/[id]/cancel/route.ts`
- Create: `src/app/api/campaigns/[id]/cancel/route.test.ts`

**Acceptance Criteria:**
- [ ] Schedule validates startsAt is set, computes targetPriceCents for all products, checks conflicts, creates CampaignProduct rows
- [ ] Schedule returns 409 with conflict list if conflicts exist and overrideConflicts is not true
- [ ] With overrideConflicts, removes conflicting products from the older campaign
- [ ] Preview returns dry-run computation with summary stats (no records created)
- [ ] Cancel deletes CampaignProduct rows and transitions back to draft (scheduled only)

**Verify:** `npx vitest run src/app/api/campaigns/[id]/schedule/ src/app/api/campaigns/preview/ src/app/api/campaigns/[id]/cancel/ --reporter=verbose` → all tests pass

**Steps:**

- [ ] **Step 1: Create schedule route**

Create `src/app/api/campaigns/[id]/schedule/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withErrorHandling, HttpError } from "@/lib/api/errors";
import { parseJsonBody } from "@/lib/api/validation";
import { requireOwnerApi } from "@/lib/auth/requireSession";
import { assertCampaignOwned } from "@/lib/campaigns/assertions";
import { findConflicts } from "@/lib/campaigns/conflicts";
import { calculateTargetPrice, type CampaignRules } from "@/lib/campaigns/rules";

export const POST = withErrorHandling(
  async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { merchantId } = await requireOwnerApi();
    const { id } = await params;
    await assertCampaignOwned(prisma, id, merchantId);

    const campaign = await prisma.campaign.findUniqueOrThrow({ where: { id } });
    if (campaign.status !== "draft") {
      throw new HttpError(400, "Only draft campaigns can be scheduled");
    }
    if (!campaign.startsAt) {
      throw new HttpError(400, "startsAt must be set before scheduling");
    }

    const body = await parseJsonBody(req);
    const productIds = body.productIds;
    if (!Array.isArray(productIds) || productIds.length === 0) {
      throw new HttpError(400, "productIds must be a non-empty array");
    }

    const conflicts = await findConflicts(prisma, merchantId, id, productIds as string[]);
    if (conflicts.length > 0 && !body.overrideConflicts) {
      return NextResponse.json({ conflicts }, { status: 409 });
    }

    if (conflicts.length > 0 && body.overrideConflicts) {
      const conflictProductIds = conflicts.map((c) => c.productId);
      const conflictCampaignIds = [...new Set(conflicts.map((c) => c.existingCampaignId))];
      await prisma.campaignProduct.deleteMany({
        where: {
          productId: { in: conflictProductIds },
          campaignId: { in: conflictCampaignIds },
        },
      });
    }

    const products = await prisma.product.findMany({
      where: { id: { in: productIds as string[] }, merchantId },
      include: {
        recommendation: true,
        competitorPrices: true,
      },
    });

    const rules: CampaignRules = JSON.parse(campaign.rules);
    const campaignProducts: Array<{
      campaignId: string;
      productId: string;
      originalPriceCents: number;
      targetPriceCents: number;
    }> = [];

    for (const product of products) {
      const result = calculateTargetPrice(
        {
          currentPrice: product.currentPrice,
          cogs: product.cogs,
          recommendation: product.recommendation,
          competitorPrices: product.competitorPrices,
        },
        rules,
      );
      if (!result.skipped) {
        campaignProducts.push({
          campaignId: id,
          productId: product.id,
          originalPriceCents: product.currentPrice,
          targetPriceCents: result.targetPriceCents,
        });
      }
    }

    if (campaignProducts.length > 0) {
      await prisma.campaignProduct.createMany({ data: campaignProducts });
    }

    const updated = await prisma.campaign.update({
      where: { id },
      data: { status: "scheduled" },
    });

    await prisma.campaignLog.create({
      data: { campaignId: id, event: "scheduled", detail: JSON.stringify({ productCount: campaignProducts.length }) },
    });

    return NextResponse.json(updated);
  },
);
```

- [ ] **Step 2: Create preview route**

Create `src/app/api/campaigns/preview/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withErrorHandling, HttpError } from "@/lib/api/errors";
import { parseJsonBody } from "@/lib/api/validation";
import { requireSessionApi } from "@/lib/auth/requireSession";
import { calculateTargetPrice, type CampaignRules } from "@/lib/campaigns/rules";
import { marginPct } from "@/lib/margin";

export const POST = withErrorHandling(async (req: Request) => {
  const { merchantId } = await requireSessionApi();
  const body = await parseJsonBody(req);

  const productIds = body.productIds;
  if (!Array.isArray(productIds) || productIds.length === 0) {
    throw new HttpError(400, "productIds must be a non-empty array");
  }

  const rules = body.rules as CampaignRules;
  if (!rules || typeof rules !== "object" || !rules.mode) {
    throw new HttpError(400, "rules with a mode are required");
  }

  const products = await prisma.product.findMany({
    where: { id: { in: productIds as string[] }, merchantId },
    include: { recommendation: true, competitorPrices: true },
  });

  let changing = 0;
  let skipped = 0;
  let clampedByMarginFloor = 0;
  let totalChangePct = 0;
  const skipReasons: Record<string, number> = {};

  const previewProducts = products.map((p) => {
    const result = calculateTargetPrice(
      {
        currentPrice: p.currentPrice,
        cogs: p.cogs,
        recommendation: p.recommendation,
        competitorPrices: p.competitorPrices,
      },
      rules,
    );

    if (result.skipped) {
      skipped++;
      if (result.skipReason) {
        skipReasons[result.skipReason] = (skipReasons[result.skipReason] || 0) + 1;
      }
    } else {
      changing++;
      totalChangePct += ((result.targetPriceCents - p.currentPrice) / p.currentPrice) * 100;
    }
    if (result.clampedByMarginFloor) clampedByMarginFloor++;

    return {
      productId: p.id,
      title: p.title,
      sku: p.sku,
      currentPriceCents: p.currentPrice,
      targetPriceCents: result.targetPriceCents,
      changePct: p.currentPrice > 0 ? ((result.targetPriceCents - p.currentPrice) / p.currentPrice) * 100 : 0,
      marginPct: result.skipped ? marginPct(p.currentPrice, p.cogs) : marginPct(result.targetPriceCents, p.cogs),
      skipped: result.skipped,
      skipReason: result.skipReason,
      clampedByMarginFloor: result.clampedByMarginFloor,
    };
  });

  return NextResponse.json({
    totalProducts: products.length,
    changing,
    skipped,
    skipReasons,
    clampedByMarginFloor,
    avgChangePct: changing > 0 ? totalChangePct / changing : 0,
    products: previewProducts,
  });
});
```

- [ ] **Step 3: Create cancel route**

Create `src/app/api/campaigns/[id]/cancel/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withErrorHandling, HttpError } from "@/lib/api/errors";
import { requireOwnerApi } from "@/lib/auth/requireSession";
import { assertCampaignOwned } from "@/lib/campaigns/assertions";

export const POST = withErrorHandling(
  async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { merchantId } = await requireOwnerApi();
    const { id } = await params;
    await assertCampaignOwned(prisma, id, merchantId);

    const campaign = await prisma.campaign.findUniqueOrThrow({ where: { id } });
    if (campaign.status !== "scheduled") {
      throw new HttpError(400, "Only scheduled campaigns can be cancelled");
    }

    await prisma.campaignProduct.deleteMany({ where: { campaignId: id } });

    const updated = await prisma.campaign.update({
      where: { id },
      data: { status: "draft", executionCursor: 0 },
    });

    await prisma.campaignLog.create({
      data: { campaignId: id, event: "stopped", detail: JSON.stringify({ reason: "cancelled" }) },
    });

    return NextResponse.json(updated);
  },
);
```

- [ ] **Step 4: Write tests for schedule**

Create `src/app/api/campaigns/[id]/schedule/route.test.ts`:

```typescript
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCampaignFindUnique = vi.hoisted(() => vi.fn());
const mockCampaignFindUniqueOrThrow = vi.hoisted(() => vi.fn());
const mockCampaignUpdate = vi.hoisted(() => vi.fn());
const mockProductFindMany = vi.hoisted(() => vi.fn());
const mockCpCreateMany = vi.hoisted(() => vi.fn());
const mockCpDeleteMany = vi.hoisted(() => vi.fn());
const mockLogCreate = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db", () => ({
  prisma: {
    campaign: { findUnique: mockCampaignFindUnique, findUniqueOrThrow: mockCampaignFindUniqueOrThrow, update: mockCampaignUpdate },
    product: { findMany: mockProductFindMany },
    campaignProduct: { createMany: mockCpCreateMany, deleteMany: mockCpDeleteMany },
    campaignLog: { create: mockLogCreate },
  },
}));

vi.mock("@/lib/auth/requireSession", () => ({
  requireOwnerApi: vi.fn(async () => ({ merchantId: "m1", user: { id: "u1", merchantId: "m1" } })),
}));

vi.mock("@/lib/campaigns/assertions", () => ({
  assertCampaignOwned: vi.fn(async () => {}),
}));

const mockFindConflicts = vi.hoisted(() => vi.fn());
vi.mock("@/lib/campaigns/conflicts", () => ({
  findConflicts: mockFindConflicts,
}));

import { POST } from "./route";

const ctx = { params: Promise.resolve({ id: "c1" }) };

function makeReq(body: unknown): Request {
  return { json: async () => body, text: async () => JSON.stringify(body) } as unknown as Request;
}

beforeEach(() => {
  vi.resetAllMocks();
  mockLogCreate.mockResolvedValue({});
  mockCampaignUpdate.mockResolvedValue({ id: "c1", status: "scheduled" });
  mockFindConflicts.mockResolvedValue([]);
  mockCpCreateMany.mockResolvedValue({ count: 1 });
});

describe("POST /api/campaigns/[id]/schedule", () => {
  it("schedules a draft campaign", async () => {
    mockCampaignFindUniqueOrThrow.mockResolvedValue({
      id: "c1",
      status: "draft",
      startsAt: new Date(),
      rules: JSON.stringify({ mode: "percentage", percentage: 10, rounding: "none", marginFloorPct: 10 }),
    });
    mockProductFindMany.mockResolvedValue([
      { id: "p1", currentPrice: 1000, cogs: null, recommendation: null, competitorPrices: [] },
    ]);

    const res = await POST(makeReq({ productIds: ["p1"] }), ctx);
    expect(res.status).toBe(200);
    expect(mockCpCreateMany).toHaveBeenCalled();
    expect(mockCampaignUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "scheduled" }) }),
    );
  });

  it("returns 400 if not draft", async () => {
    mockCampaignFindUniqueOrThrow.mockResolvedValue({ id: "c1", status: "active" });
    const res = await POST(makeReq({ productIds: ["p1"] }), ctx);
    expect(res.status).toBe(400);
  });

  it("returns 400 if startsAt not set", async () => {
    mockCampaignFindUniqueOrThrow.mockResolvedValue({ id: "c1", status: "draft", startsAt: null });
    const res = await POST(makeReq({ productIds: ["p1"] }), ctx);
    expect(res.status).toBe(400);
  });

  it("returns 409 with conflicts", async () => {
    mockCampaignFindUniqueOrThrow.mockResolvedValue({
      id: "c1",
      status: "draft",
      startsAt: new Date(),
      rules: JSON.stringify({ mode: "percentage", percentage: 10, rounding: "none", marginFloorPct: 10 }),
    });
    mockFindConflicts.mockResolvedValue([
      { productId: "p1", productTitle: "Mug", existingCampaignId: "c2", existingCampaignName: "Old Sale" },
    ]);

    const res = await POST(makeReq({ productIds: ["p1"] }), ctx);
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.conflicts).toHaveLength(1);
  });

  it("overrides conflicts when overrideConflicts is true", async () => {
    mockCampaignFindUniqueOrThrow.mockResolvedValue({
      id: "c1",
      status: "draft",
      startsAt: new Date(),
      rules: JSON.stringify({ mode: "percentage", percentage: 10, rounding: "none", marginFloorPct: 10 }),
    });
    mockFindConflicts.mockResolvedValue([
      { productId: "p1", productTitle: "Mug", existingCampaignId: "c2", existingCampaignName: "Old" },
    ]);
    mockProductFindMany.mockResolvedValue([
      { id: "p1", currentPrice: 1000, cogs: null, recommendation: null, competitorPrices: [] },
    ]);

    const res = await POST(makeReq({ productIds: ["p1"], overrideConflicts: true }), ctx);
    expect(res.status).toBe(200);
    expect(mockCpDeleteMany).toHaveBeenCalled();
  });
});
```

- [ ] **Step 5: Write tests for preview**

Create `src/app/api/campaigns/preview/route.test.ts`:

```typescript
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockProductFindMany = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db", () => ({
  prisma: { product: { findMany: mockProductFindMany } },
}));

vi.mock("@/lib/auth/requireSession", () => ({
  requireSessionApi: vi.fn(async () => ({ merchantId: "m1", user: { id: "u1", merchantId: "m1" } })),
}));

import { POST } from "./route";

function makeReq(body: unknown): Request {
  return { json: async () => body, text: async () => JSON.stringify(body) } as unknown as Request;
}

beforeEach(() => vi.resetAllMocks());

describe("POST /api/campaigns/preview", () => {
  it("returns dry-run preview with summary stats", async () => {
    mockProductFindMany.mockResolvedValue([
      { id: "p1", title: "Mug", sku: "MUG-1", currentPrice: 1000, cogs: 500, recommendation: null, competitorPrices: [] },
      { id: "p2", title: "Bottle", sku: "BTL-1", currentPrice: 2000, cogs: 800, recommendation: null, competitorPrices: [] },
    ]);

    const res = await POST(makeReq({
      productIds: ["p1", "p2"],
      rules: { mode: "percentage", percentage: 10, rounding: "none", marginFloorPct: 10 },
    }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.totalProducts).toBe(2);
    expect(body.changing).toBe(2);
    expect(body.skipped).toBe(0);
    expect(body.products).toHaveLength(2);
    expect(body.products[0].targetPriceCents).toBe(1100);
  });

  it("does not create any records", async () => {
    mockProductFindMany.mockResolvedValue([]);
    await POST(makeReq({
      productIds: ["p1"],
      rules: { mode: "percentage", percentage: 10, rounding: "none", marginFloorPct: 10 },
    }));
  });
});
```

- [ ] **Step 6: Write tests for cancel**

Create `src/app/api/campaigns/[id]/cancel/route.test.ts`:

```typescript
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockFindUniqueOrThrow = vi.hoisted(() => vi.fn());
const mockUpdate = vi.hoisted(() => vi.fn());
const mockCpDeleteMany = vi.hoisted(() => vi.fn());
const mockLogCreate = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db", () => ({
  prisma: {
    campaign: { findUnique: vi.fn(), findUniqueOrThrow: mockFindUniqueOrThrow, update: mockUpdate },
    campaignProduct: { deleteMany: mockCpDeleteMany },
    campaignLog: { create: mockLogCreate },
  },
}));

vi.mock("@/lib/auth/requireSession", () => ({
  requireOwnerApi: vi.fn(async () => ({ merchantId: "m1", user: { id: "u1", merchantId: "m1" } })),
}));

vi.mock("@/lib/campaigns/assertions", () => ({
  assertCampaignOwned: vi.fn(async () => {}),
}));

import { POST } from "./route";

const ctx = { params: Promise.resolve({ id: "c1" }) };

function makeReq(): Request {
  return { json: async () => ({}), text: async () => "{}" } as unknown as Request;
}

beforeEach(() => {
  vi.resetAllMocks();
  mockLogCreate.mockResolvedValue({});
});

describe("POST /api/campaigns/[id]/cancel", () => {
  it("cancels a scheduled campaign", async () => {
    mockFindUniqueOrThrow.mockResolvedValue({ id: "c1", status: "scheduled" });
    mockCpDeleteMany.mockResolvedValue({ count: 5 });
    mockUpdate.mockResolvedValue({ id: "c1", status: "draft" });

    const res = await POST(makeReq(), ctx);
    expect(res.status).toBe(200);
    expect(mockCpDeleteMany).toHaveBeenCalledWith({ where: { campaignId: "c1" } });
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: "draft" }),
    }));
  });

  it("returns 400 for non-scheduled campaign", async () => {
    mockFindUniqueOrThrow.mockResolvedValue({ id: "c1", status: "active" });
    const res = await POST(makeReq(), ctx);
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 7: Run tests and commit**

Run: `npx vitest run src/app/api/campaigns/ --reporter=verbose`
Expected: All tests pass.

```bash
git add src/app/api/campaigns/
git commit -m "feat(campaigns): add schedule, preview, and cancel API routes with tests"
```

---

### Task 7: Execute + Stop + Duplicate + Export API Routes

**Goal:** Implement the remaining action routes: manual execute, stop, duplicate, and CSV export.

**Files:**
- Create: `src/app/api/campaigns/[id]/execute/route.ts`
- Create: `src/app/api/campaigns/[id]/execute/route.test.ts`
- Create: `src/app/api/campaigns/[id]/stop/route.ts`
- Create: `src/app/api/campaigns/[id]/stop/route.test.ts`
- Create: `src/app/api/campaigns/[id]/duplicate/route.ts`
- Create: `src/app/api/campaigns/[id]/duplicate/route.test.ts`
- Create: `src/app/api/campaigns/[id]/export/route.ts`
- Create: `src/app/api/campaigns/[id]/export/route.test.ts`

**Acceptance Criteria:**
- [ ] Execute sets startsAt to now, transitions to executing, runs first chunk
- [ ] Stop transitions to reverting (if revertOnEnd) or completed (if not)
- [ ] Duplicate creates a new draft campaign with "(copy)" suffix
- [ ] Export returns CSV with correct columns
- [ ] All routes use proper auth and return correct error codes

**Verify:** `npx vitest run src/app/api/campaigns/[id]/execute/ src/app/api/campaigns/[id]/stop/ src/app/api/campaigns/[id]/duplicate/ src/app/api/campaigns/[id]/export/ --reporter=verbose` → all tests pass

**Steps:**

- [ ] **Step 1: Create execute route**

Create `src/app/api/campaigns/[id]/execute/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withErrorHandling, HttpError } from "@/lib/api/errors";
import { requireOwnerApi } from "@/lib/auth/requireSession";
import { assertCampaignOwned } from "@/lib/campaigns/assertions";
import { executeChunk } from "@/lib/campaigns/execute";

export const POST = withErrorHandling(
  async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { merchantId } = await requireOwnerApi();
    const { id } = await params;
    await assertCampaignOwned(prisma, id, merchantId);

    const campaign = await prisma.campaign.findUniqueOrThrow({ where: { id } });
    if (campaign.status !== "scheduled") {
      throw new HttpError(400, "Only scheduled campaigns can be manually executed");
    }

    await prisma.campaign.update({
      where: { id },
      data: { status: "executing", startsAt: new Date(), executionCursor: 0 },
    });

    await prisma.campaignLog.create({
      data: { campaignId: id, event: "execution_started" },
    });

    const result = await executeChunk(prisma, id, merchantId, 0);

    if (result.done) {
      await prisma.campaign.update({
        where: { id },
        data: { status: "active", executedAt: new Date() },
      });
      await prisma.campaignLog.create({
        data: { campaignId: id, event: "execution_completed" },
      });
    }

    const updated = await prisma.campaign.findUniqueOrThrow({ where: { id } });
    return NextResponse.json(updated);
  },
);
```

- [ ] **Step 2: Create stop route**

Create `src/app/api/campaigns/[id]/stop/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withErrorHandling, HttpError } from "@/lib/api/errors";
import { requireOwnerApi } from "@/lib/auth/requireSession";
import { assertCampaignOwned } from "@/lib/campaigns/assertions";

export const POST = withErrorHandling(
  async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { merchantId } = await requireOwnerApi();
    const { id } = await params;
    await assertCampaignOwned(prisma, id, merchantId);

    const campaign = await prisma.campaign.findUniqueOrThrow({ where: { id } });
    if (campaign.status === "draft" || campaign.status === "completed") {
      throw new HttpError(400, "Cannot stop a campaign that is in draft or already completed");
    }

    const nextStatus = campaign.revertOnEnd ? "reverting" : "completed";
    const data: Record<string, unknown> = { status: nextStatus };
    if (nextStatus === "reverting") data.executionCursor = 0;
    if (nextStatus === "completed") data.revertedAt = new Date();

    const updated = await prisma.campaign.update({ where: { id }, data });

    await prisma.campaignLog.create({
      data: {
        campaignId: id,
        event: "stopped",
        detail: JSON.stringify({ nextStatus }),
      },
    });

    return NextResponse.json(updated);
  },
);
```

- [ ] **Step 3: Create duplicate route**

Create `src/app/api/campaigns/[id]/duplicate/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withErrorHandling, HttpError } from "@/lib/api/errors";
import { requireOwnerApi } from "@/lib/auth/requireSession";
import { assertCampaignOwned } from "@/lib/campaigns/assertions";

export const POST = withErrorHandling(
  async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { merchantId } = await requireOwnerApi();
    const { id } = await params;
    await assertCampaignOwned(prisma, id, merchantId);

    const campaign = await prisma.campaign.findUniqueOrThrow({
      where: { id },
      include: { products: { select: { productId: true } } },
    });
    if (campaign.status !== "completed") {
      throw new HttpError(400, "Only completed campaigns can be duplicated");
    }

    const productIds = campaign.products.map((p) => p.productId);

    const duplicate = await prisma.campaign.create({
      data: {
        merchantId,
        name: `${campaign.name} (copy)`,
        type: campaign.type,
        status: "draft",
        rules: campaign.rules,
        revertOnEnd: campaign.revertOnEnd,
      },
    });

    await prisma.campaignLog.create({
      data: {
        campaignId: duplicate.id,
        event: "created",
        detail: JSON.stringify({ duplicatedFrom: id, productIds }),
      },
    });

    return NextResponse.json(duplicate, { status: 201 });
  },
);
```

- [ ] **Step 4: Create export route**

Create `src/app/api/campaigns/[id]/export/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withErrorHandling } from "@/lib/api/errors";
import { requireSessionApi } from "@/lib/auth/requireSession";
import { assertCampaignOwned } from "@/lib/campaigns/assertions";
import { centsToDollars } from "@/lib/money";

export const GET = withErrorHandling(
  async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { merchantId } = await requireSessionApi();
    const { id } = await params;
    await assertCampaignOwned(prisma, id, merchantId);

    const campaign = await prisma.campaign.findUniqueOrThrow({
      where: { id },
      include: {
        products: {
          include: { product: { select: { title: true, sku: true } } },
          orderBy: { id: "asc" },
        },
      },
    });

    const header = "SKU,Title,Original Price,Target Price,Change %,Applied At,Reverted At,Error";
    const rows = campaign.products.map((cp) => {
      const changePct = cp.originalPriceCents > 0
        ? (((cp.targetPriceCents - cp.originalPriceCents) / cp.originalPriceCents) * 100).toFixed(1)
        : "0.0";
      const csvEscape = (s: string) => `"${s.replace(/"/g, '""')}"`;
      return [
        csvEscape(cp.product.sku),
        csvEscape(cp.product.title),
        centsToDollars(cp.originalPriceCents),
        centsToDollars(cp.targetPriceCents),
        changePct,
        cp.appliedAt?.toISOString() ?? "",
        cp.revertedAt?.toISOString() ?? "",
        cp.error ? csvEscape(cp.error) : "",
      ].join(",");
    });

    const csv = [header, ...rows].join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${campaign.name.replace(/"/g, "")}-export.csv"`,
      },
    });
  },
);
```

- [ ] **Step 5: Write tests for all four routes**

Create test files for execute, stop, duplicate, and export following the same mock pattern as Task 5/6. Each test file should cover:
- Execute: happy path (scheduled -> executing -> active if done), 400 if not scheduled
- Stop: stop with revert (-> reverting), stop without revert (-> completed), 400 if draft/completed
- Duplicate: creates draft copy with "(copy)" suffix, 400 if not completed
- Export: returns CSV with correct headers and escaped content

- [ ] **Step 6: Run tests and commit**

Run: `npx vitest run src/app/api/campaigns/[id]/ --reporter=verbose`
Expected: All tests pass.

```bash
git add src/app/api/campaigns/[id]/
git commit -m "feat(campaigns): add execute, stop, duplicate, and export API routes with tests"
```

---

### Task 8: Cron Handler + vercel.json

**Goal:** Implement the Vercel Cron endpoint that runs every 5 minutes and processes campaigns needing action (scheduled past start, active past end, in-progress execution/revert).

**Files:**
- Create: `src/app/api/cron/campaigns/route.ts`
- Create: `src/app/api/cron/campaigns/route.test.ts`
- Create: `vercel.json`

**Acceptance Criteria:**
- [ ] Cron handler verifies CRON_SECRET header in production
- [ ] Picks up scheduled campaigns past startsAt and transitions to executing
- [ ] Continues chunked execution for campaigns in executing status
- [ ] Transitions executing -> active when all products processed
- [ ] Picks up active campaigns past endsAt — reverting if revertOnEnd, completed otherwise
- [ ] Continues chunked revert for campaigns in reverting status
- [ ] Transitions reverting -> completed when all products reverted
- [ ] Individual product failures don't block the whole campaign
- [ ] ~15 tests covering all paths

**Verify:** `npx vitest run src/app/api/cron/campaigns/route.test.ts --reporter=verbose` → all tests pass

**Steps:**

- [ ] **Step 1: Create vercel.json**

Create `vercel.json` at the project root:

```json
{
  "crons": [
    {
      "path": "/api/cron/campaigns",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

- [ ] **Step 2: Create cron handler**

Create `src/app/api/cron/campaigns/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { executeChunk, revertChunk } from "@/lib/campaigns/execute";

export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<NextResponse> {
  if (process.env.NODE_ENV === "production") {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const now = new Date();

  const scheduledReady = await prisma.campaign.findMany({
    where: { status: "scheduled", startsAt: { lte: now } },
  });

  for (const c of scheduledReady) {
    await prisma.campaign.update({
      where: { id: c.id },
      data: { status: "executing", executionCursor: 0 },
    });
    await prisma.campaignLog.create({
      data: { campaignId: c.id, event: "execution_started" },
    });
  }

  const executing = await prisma.campaign.findMany({
    where: { status: "executing" },
    include: { merchant: { select: { id: true } } },
  });

  for (const c of executing) {
    const result = await executeChunk(prisma, c.id, c.merchantId, c.executionCursor);
    if (result.done) {
      await prisma.campaign.update({
        where: { id: c.id },
        data: { status: "active", executedAt: now },
      });
      await prisma.campaignLog.create({
        data: { campaignId: c.id, event: "execution_completed" },
      });
    }
  }

  const activeExpired = await prisma.campaign.findMany({
    where: { status: "active", endsAt: { not: null, lte: now } },
  });

  for (const c of activeExpired) {
    if (c.revertOnEnd) {
      await prisma.campaign.update({
        where: { id: c.id },
        data: { status: "reverting", executionCursor: 0 },
      });
      await prisma.campaignLog.create({
        data: { campaignId: c.id, event: "revert_started" },
      });
    } else {
      await prisma.campaign.update({
        where: { id: c.id },
        data: { status: "completed", revertedAt: now },
      });
    }
  }

  const reverting = await prisma.campaign.findMany({
    where: { status: "reverting" },
    include: { merchant: { select: { id: true } } },
  });

  for (const c of reverting) {
    const result = await revertChunk(prisma, c.id, c.merchantId, c.executionCursor);
    if (result.done) {
      await prisma.campaign.update({
        where: { id: c.id },
        data: { status: "completed", revertedAt: now },
      });
      await prisma.campaignLog.create({
        data: { campaignId: c.id, event: "revert_completed" },
      });
    }
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Write cron handler tests (~15 tests)**

Create `src/app/api/cron/campaigns/route.test.ts` with tests covering:
- Rejects requests without valid CRON_SECRET in production
- Picks up scheduled campaigns past startsAt
- Continues chunked execution (processes 30, updates cursor, leaves remainder)
- Transitions executing -> active when all products done
- Picks up active campaigns past endsAt with revertOnEnd=true -> reverting
- Active campaigns past endsAt with revertOnEnd=false -> completed directly
- Continues chunked revert
- Transitions reverting -> completed when all products reverted
- Partial failure: one product push fails, others continue
- CSV-only: updates DB without calling push functions
- No-op when no campaigns need action

Mock `@/lib/campaigns/execute` (executeChunk, revertChunk) as they have their own integration dependencies. Test the orchestration logic.

- [ ] **Step 4: Run tests and commit**

Run: `npx vitest run src/app/api/cron/campaigns/route.test.ts --reporter=verbose`
Expected: All ~15 tests pass.

```bash
git add vercel.json src/app/api/cron/
git commit -m "feat(campaigns): add Vercel Cron handler with chunked execution"
```

---

### Task 9: Sidebar Navigation Update

**Goal:** Add "Campaigns" as a top-level navigation item in the sidebar, positioned between Products (Dashboard) and Launch Planner.

**Files:**
- Modify: `src/components/Sidebar.tsx`

**Acceptance Criteria:**
- [ ] "Campaigns" appears between Dashboard and Launch Planner in the sidebar
- [ ] Uses a Phosphor icon consistent with the rest of the sidebar (e.g. `CalendarBlank` or `Tag`)
- [ ] Active state matches when pathname starts with `/campaigns`
- [ ] Click navigates to `/campaigns`

**Verify:** `npx vitest run --reporter=verbose 2>&1 | tail -5` → all tests still pass. Visual verification in browser.

**Steps:**

- [ ] **Step 1: Add the Campaigns nav item**

In `src/components/Sidebar.tsx`, add `CalendarBlank` to the Phosphor icons import:

```typescript
import { SquaresFour, RocketLaunch, Gear, SignOut, ChatTeardrop, BookOpen, CaretRight, CalendarBlank } from "@phosphor-icons/react";
```

Then insert a new entry in the `NAV` array between Dashboard and Launch Planner:

```typescript
const NAV = [
  { href: "/dashboard", icon: SquaresFour, label: "Dashboard", matchPrefix: ["/dashboard", "/product"] },
  { href: "/campaigns", icon: CalendarBlank, label: "Campaigns", matchPrefix: ["/campaigns"] },
  { href: "/launch-planner", icon: RocketLaunch, label: "Launch Planner", matchPrefix: ["/launch-planner"] },
  { href: "/guide", icon: BookOpen, label: "Guide", matchPrefix: ["/guide"] },
];
```

- [ ] **Step 2: Run tests to confirm no regressions**

Run: `npx vitest run --reporter=verbose 2>&1 | tail -5`
Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/components/Sidebar.tsx
git commit -m "feat(campaigns): add Campaigns nav item to sidebar"
```

---

### Task 10: Campaign List UI

**Goal:** Build the campaigns list page and the CampaignList component with status filter tabs, campaign cards, and empty state.

**Files:**
- Create: `src/app/campaigns/page.tsx`
- Create: `src/components/CampaignList.tsx`
- Create: `src/components/CampaignList.test.tsx`

**Acceptance Criteria:**
- [ ] Page fetches campaigns from `GET /api/campaigns` and passes them to CampaignList
- [ ] Status filter tabs: All / Active / Scheduled / Completed / Draft with counts
- [ ] Campaign cards show status badge, name, type, product count, date range
- [ ] "+ New Campaign" button visible for Owners
- [ ] Clicking a campaign card navigates to `/campaigns/[id]`
- [ ] Empty state when no campaigns exist
- [ ] Tests cover: filter tabs, card rendering, empty state

**Verify:** `npx vitest run src/components/CampaignList.test.tsx --reporter=verbose` → all tests pass

**Steps:**

- [ ] **Step 1: Create CampaignList component**

Create `src/components/CampaignList.tsx` as a client component that:
- Fetches campaigns from `/api/campaigns`
- Renders filter tabs with counts per status
- Shows campaign cards with status badge (color-coded), name, type label, product count, date range
- Links each card to `/campaigns/[id]`
- Shows empty state with illustration

- [ ] **Step 2: Create campaigns list page**

Create `src/app/campaigns/page.tsx` as a server component that imports and renders `CampaignList`.

- [ ] **Step 3: Write tests**

Create `src/components/CampaignList.test.tsx` testing:
- Renders campaign cards with correct data
- Filter tabs filter the list by status
- Empty state shown when no campaigns
- "+ New Campaign" button is present

- [ ] **Step 4: Run tests and commit**

```bash
git add src/app/campaigns/page.tsx src/components/CampaignList.tsx src/components/CampaignList.test.tsx
git commit -m "feat(campaigns): add campaigns list page with status filter tabs"
```

---

### Task 11: Product Picker Component

**Goal:** Build the filterable product selector used in Step 2 of the campaign builder. This is a reusable component.

**Files:**
- Create: `src/components/ProductPicker.tsx`
- Create: `src/components/ProductPicker.test.tsx`

**Acceptance Criteria:**
- [ ] Loads products from `/api/products` or accepts products as props
- [ ] Category filter dropdown (populated from distinct categories)
- [ ] Smart filters: margin below X%, has recommendation, recommendation is RAISE/LOWER, price range, has/no competitor data
- [ ] Checkbox per row with select-all / deselect-all
- [ ] Live count badge: "X of Y products selected"
- [ ] Products in another active/scheduled campaign get a subtle indicator
- [ ] ML campaign shortcut: auto-filter to "has recommendation" and pre-select RAISE/LOWER
- [ ] Calls `onChange(selectedIds: string[])` when selection changes
- [ ] Tests cover: filter behavior, select-all, ML auto-select

**Verify:** `npx vitest run src/components/ProductPicker.test.tsx --reporter=verbose` → all tests pass

**Steps:**

- [ ] **Step 1: Build ProductPicker component**

Create `src/components/ProductPicker.tsx` as a client component with:
- Props: `products`, `campaignType`, `selectedIds`, `onChange`, optional `conflictProductIds`
- Category dropdown filter
- Smart filter bar (combinable, AND logic)
- Scrollable product list with checkboxes
- Select-all/deselect-all in the header
- Count badge at bottom

- [ ] **Step 2: Write tests**

Create `src/components/ProductPicker.test.tsx` testing:
- Renders product rows with checkboxes
- Category filter reduces visible products
- Select-all selects all visible (filtered) products
- ML auto-select pre-selects products with RAISE/LOWER recommendations
- onChange is called with updated selection

- [ ] **Step 3: Run tests and commit**

```bash
git add src/components/ProductPicker.tsx src/components/ProductPicker.test.tsx
git commit -m "feat(campaigns): add ProductPicker component with smart filters"
```

---

### Task 12: Campaign Builder UI

**Goal:** Build the 3-step campaign creation/editing form: Setup -> Select Products -> Preview & Schedule.

**Files:**
- Create: `src/components/CampaignBuilder.tsx`
- Create: `src/components/CampaignBuilder.test.tsx`
- Create: `src/app/campaigns/new/page.tsx`
- Create: `src/app/campaigns/[id]/edit/page.tsx`

**Acceptance Criteria:**
- [ ] Step 1 (Setup): campaign name, type toggle, pricing rule config (conditional on type), rounding, margin floor, dates, revert toggle
- [ ] Step 2 (Select Products): uses ProductPicker component
- [ ] Step 3 (Preview & Schedule): calls preview endpoint, shows summary stats, conflict warning, product table
- [ ] "Save Draft" saves via POST/PATCH `/api/campaigns`
- [ ] "Schedule Campaign" calls schedule endpoint
- [ ] "Execute Now" calls execute endpoint
- [ ] Edit mode loads existing draft campaign data
- [ ] Type toggle sets correct defaults (revert on/off, ML auto-filter)
- [ ] Tests cover: step navigation, type toggle defaults, form validation

**Verify:** `npx vitest run src/components/CampaignBuilder.test.tsx --reporter=verbose` → all tests pass

**Steps:**

- [ ] **Step 1: Build CampaignBuilder component**

Create `src/components/CampaignBuilder.tsx` as a client component with:
- Step state management (1, 2, 3)
- Step 1: form fields matching the spec's Setup section
- Step 2: integrates ProductPicker
- Step 3: calls `/api/campaigns/preview` and renders results
- Save draft / Schedule / Execute Now actions
- Navigation between steps with Back/Next

- [ ] **Step 2: Create new campaign page**

Create `src/app/campaigns/new/page.tsx` that renders `CampaignBuilder` in create mode.

- [ ] **Step 3: Create edit campaign page**

Create `src/app/campaigns/[id]/edit/page.tsx` that loads existing campaign data and renders `CampaignBuilder` in edit mode.

- [ ] **Step 4: Write tests**

Create `src/components/CampaignBuilder.test.tsx` testing:
- Type toggle switches between Sale/ML defaults (revert on/off)
- Mode dropdown shows correct inputs per mode
- Step navigation works (Next/Back)
- Form validation (name required, startsAt required for schedule)

- [ ] **Step 5: Run tests and commit**

```bash
git add src/components/CampaignBuilder.tsx src/components/CampaignBuilder.test.tsx src/app/campaigns/new/ src/app/campaigns/[id]/edit/
git commit -m "feat(campaigns): add 3-step campaign builder with preview"
```

---

### Task 13: Campaign Detail Page

**Goal:** Build the campaign detail view showing status, summary stats, timeline log, product table, and conditional action buttons.

**Files:**
- Create: `src/components/CampaignDetail.tsx`
- Create: `src/components/CampaignDetail.test.tsx`
- Create: `src/app/campaigns/[id]/page.tsx`

**Acceptance Criteria:**
- [ ] Header shows campaign name, status badge, type label
- [ ] Summary cards: products applied/total, avg change %, skipped, errors
- [ ] Timeline renders CampaignLog entries chronologically
- [ ] Product table shows: title, SKU, original price, target price, change %, margin, applied at, reverted at, error
- [ ] Action buttons conditional on status (Edit/Delete for draft, Execute Now/Cancel for scheduled, Stop for active, Duplicate for completed)
- [ ] Export CSV button available at all statuses
- [ ] Tests cover: action button visibility per status, timeline rendering

**Verify:** `npx vitest run src/components/CampaignDetail.test.tsx --reporter=verbose` → all tests pass

**Steps:**

- [ ] **Step 1: Build CampaignDetail component**

Create `src/components/CampaignDetail.tsx` as a client component that:
- Fetches campaign detail from `GET /api/campaigns/[id]`
- Renders header with status badge
- Shows summary stat cards
- Renders chronological timeline from logs
- Renders product table with per-product status
- Shows conditional action buttons
- Wires actions (execute, stop, cancel, duplicate, export) to their respective API routes

- [ ] **Step 2: Create detail page**

Create `src/app/campaigns/[id]/page.tsx` that renders `CampaignDetail`.

- [ ] **Step 3: Write tests**

Create `src/components/CampaignDetail.test.tsx` testing:
- Draft campaign shows Edit + Delete buttons
- Scheduled campaign shows Execute Now + Cancel buttons
- Active campaign shows Stop Campaign button
- Completed campaign shows Duplicate button
- All statuses show Export CSV
- Timeline renders log entries

- [ ] **Step 4: Run tests and commit**

```bash
git add src/components/CampaignDetail.tsx src/components/CampaignDetail.test.tsx src/app/campaigns/[id]/page.tsx
git commit -m "feat(campaigns): add campaign detail page with timeline and actions"
```

---

### Task 14: Integration Testing + Final Verification

**Goal:** Run the full test suite, verify no regressions, and confirm the feature is complete end-to-end.

**Files:**
- No new files. This is a verification task.

**Acceptance Criteria:**
- [ ] All new campaign tests pass (~115 new tests)
- [ ] All 681 original tests still pass (total ~795)
- [ ] `npx prisma db push` succeeds
- [ ] TypeScript type-checks cleanly (`npx tsc --noEmit`)
- [ ] Dev server starts without errors
- [ ] Campaigns page loads in browser
- [ ] Campaign builder flow works end-to-end: create draft -> select products -> preview -> schedule

**Verify:** `npx vitest run --reporter=verbose 2>&1 | tail -5` → "~795 tests passed" AND `npx tsc --noEmit` → no errors

**Steps:**

- [ ] **Step 1: Run full test suite**

Run: `npx vitest run --reporter=verbose`
Expected: ~795 tests pass (681 original + ~115 new).

- [ ] **Step 2: TypeScript type check**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Verify dev server**

Run the dev server and navigate to `/campaigns` to confirm the page loads.

- [ ] **Step 4: End-to-end smoke test**

In the browser:
1. Navigate to `/campaigns` — should show empty state
2. Click "+ New Campaign" — should open the builder
3. Fill in Step 1 (name, type, rules)
4. Step 2 — select at least one product
5. Step 3 — preview shows computed prices
6. Schedule or execute the campaign

- [ ] **Step 5: Final commit if any fixes were needed**

If any fixes were applied during verification, commit them:

```bash
git add -A
git commit -m "fix(campaigns): address integration test findings"
```
