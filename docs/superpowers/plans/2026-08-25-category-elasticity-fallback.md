# Category-Level Elasticity Fallback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:subagent-driven-development (recommended) or superpowers-extended-cc:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give merchants a data-backed price recommendation for SKUs whose own sales history can't support a real elasticity regression — a category → catalog → global fallback cascade, clearly flagged as an estimate, instead of the current dead end ("No model").

**Architecture:** Fix Shopify/WooCommerce sync to pull a real product category first (both currently hardcode the platform name). Add a pure `categoryFallback.ts` module that picks a fallback elasticity from sibling products' real `ElasticityModel` rows. Wire it into `POST /api/products/[id]/recommend` and the CSV-import `bulkML.ts` path as a new branch — reached only when a real per-SKU model doesn't exist but cogs and a units baseline do. No new `ElasticityModel` row is ever created for a fallback SKU; only `Recommendation.rulesJson` gains fallback metadata. UI gets a new "Estimated" `ModelHealthBadge` tier, fallback-aware reasoning text, two secondary suggestions (Van Westendorp survey, price test), and the "Fit Model" button auto-chains into "Get Recommendation" on failure instead of dead-ending.

**Tech Stack:** Next.js 16 API routes, Prisma 7, Vitest 4, React (client components).

**User decisions (already made):**
- Fix Shopify/WooCommerce category sync as part of this project, not deferred.
- Full fallback (creates a real recommendation for currently-unfittable SKUs), not just a narrower prior-constant swap.
- Three-level cascade: category → catalog → global constant.
- New "Estimated" badge tier, distinct from Strong/Fair/Weak/None.
- Surface both Van Westendorp survey and price-test suggestions alongside a fallback recommendation.
- Compute the fallback on-the-fly every time; no new cached/precomputed table.
- Auto-chain "Fit Model" → "Get Recommendation" in the UI on failure.
- Non-goal: a SKU with zero sales data and no `estUnits` stays Launch Planner's territory, untouched by this project.

Spec: `docs/superpowers/specs/2026-08-25-category-elasticity-fallback-design.md`

---

### Task 1: Shopify sync pulls the real product category

**Goal:** Shopify-synced products get their real `product_type` as `category` instead of the hardcoded literal `"Shopify"`.

**Files:**
- Modify: `src/lib/shopify/client.ts:1-10` (`ShopifyVariant` interface), `:34-39` (`RawProduct` interface), `:141-152` (`fetchAllProducts` flatMap)
- Modify: `src/lib/shopify/syncProducts.ts:79-90` (product creation)
- Test: `src/lib/shopify/syncProducts.test.ts`

**Acceptance Criteria:**
- [ ] `ShopifyVariant` carries a `productType: string | null` field, populated from the Shopify product's `product_type`.
- [ ] A newly-created Shopify-synced product's `category` is `v.productType?.trim() || "Uncategorized"`, never the literal `"Shopify"`.
- [ ] Updating an existing product does not touch `category` (matches current behavior — `category` is only set on `create`, never on `update`).

**Verify:** `npx vitest run src/lib/shopify/syncProducts.test.ts src/lib/shopify/client.test.ts` → all pass.

**Steps:**

- [ ] **Step 1: Write the failing tests**

Add to `src/lib/shopify/syncProducts.test.ts`, inside the `describe("syncProducts", ...)` block (after the existing title-logic tests):

```ts
  // ── Category ─────────────────────────────────────────────────────────────

  it("uses the real product_type as category for a new product", async () => {
    const prisma = mockPrisma();
    await syncProducts(prisma as never, "m1", [
      variant({ productType: "Skincare" }),
    ]);

    expect(prisma.product.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ category: "Skincare" }),
      }),
    );
  });

  it("falls back to Uncategorized when product_type is empty", async () => {
    const prisma = mockPrisma();
    await syncProducts(prisma as never, "m1", [
      variant({ productType: "" }),
    ]);

    expect(prisma.product.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ category: "Uncategorized" }),
      }),
    );
  });

  it("falls back to Uncategorized when product_type is null", async () => {
    const prisma = mockPrisma();
    await syncProducts(prisma as never, "m1", [
      variant({ productType: null }),
    ]);

    expect(prisma.product.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ category: "Uncategorized" }),
      }),
    );
  });
```

Update the `variant()` fixture helper at the top of the same file to include the new field:

```ts
function variant(over: Partial<ShopifyVariant> = {}): ShopifyVariant {
  return {
    id: 1001,
    product_id: 500,
    title: "Default Title",
    product_title: "Linen Shirt",
    sku: "TEE-100",
    price: "29.99",
    inventory_quantity: 10,
    imageUrl: null,
    productType: "Apparel",
    ...over,
  };
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/shopify/syncProducts.test.ts`
Expected: FAIL — `Property 'productType' does not exist` (type error) or the three new tests fail because `category` is still hardcoded to `"Shopify"`.

- [ ] **Step 3: Add `productType` to the client's types and fetch mapping**

In `src/lib/shopify/client.ts`, update `ShopifyVariant`:

```ts
export interface ShopifyVariant {
  id: number;
  product_id: number;
  title: string;           // variant title ("Small", or "Default Title" for single-variant)
  product_title: string;   // parent product title
  sku: string;
  price: string;           // "29.99"
  inventory_quantity: number;
  imageUrl: string | null; // product's featured image (product.image.src), or null if the product has no photo
  productType: string | null; // Shopify's product_type field, or null if the product has none set
}
```

Update `RawProduct`:

```ts
interface RawProduct {
  id: number;
  title: string;
  product_type?: string;
  image?: { src: string };
  variants: RawVariant[];
}
```

Update the `fetchAllProducts` flatMap:

```ts
      const variants: ShopifyVariant[] = body.products.flatMap((product) =>
        product.variants.map((v) => ({
          id: v.id,
          product_id: v.product_id,
          title: v.title,
          product_title: product.title,
          sku: v.sku,
          price: v.price,
          inventory_quantity: v.inventory_quantity,
          imageUrl: product.image?.src ?? null,
          productType: product.product_type?.trim() || null,
        })),
      );
```

- [ ] **Step 4: Update `syncProducts.ts`'s create call**

In `src/lib/shopify/syncProducts.ts`, change the `create` block:

```ts
    } else {
      await prisma.product.create({
        data: {
          merchantId,
          sku: v.sku,
          title,
          currentPrice: priceCents,
          shopifyVariantId,
          imageUrl: v.imageUrl,
          category: v.productType?.trim() || "Uncategorized",
        },
      });
      created++;
    }
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/lib/shopify/syncProducts.test.ts`
Expected: PASS, all tests including the 3 new ones.

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors (repo has pre-existing unrelated errors in some test files — filter for `shopify` in the output).

- [ ] **Step 7: Commit**

```bash
git add src/lib/shopify/client.ts src/lib/shopify/syncProducts.ts src/lib/shopify/syncProducts.test.ts
git commit -m "feat: sync real Shopify product_type as category, not the platform name"
```

```json:metadata
{"files": ["src/lib/shopify/client.ts", "src/lib/shopify/syncProducts.ts", "src/lib/shopify/syncProducts.test.ts"], "verifyCommand": "npx vitest run src/lib/shopify/syncProducts.test.ts", "acceptanceCriteria": ["ShopifyVariant carries productType", "new products get real category, falling back to Uncategorized", "update path unchanged"], "modelTier": "mechanical"}
```

---

### Task 2: WooCommerce sync pulls the real product category

**Goal:** WooCommerce-synced products get their real first category name as `category` instead of the hardcoded literal `"WooCommerce"`; variable-product variations inherit the parent's category.

**Files:**
- Modify: `src/lib/woocommerce/client.ts:1-8` (`WooNormalizedProduct`), `:24-31` (`RawProduct`)
- Modify: `src/lib/woocommerce/syncProducts.ts:62-76` (product creation)
- Test: `src/lib/woocommerce/syncProducts.test.ts`

**Acceptance Criteria:**
- [ ] `WooNormalizedProduct` carries a `category: string | null` field, populated from the product's first `categories[]` entry name.
- [ ] A newly-created product's `category` is `p.category?.trim() || "Uncategorized"`, never the literal `"WooCommerce"`.
- [ ] The existing test at `syncProducts.test.ts:37-49` (asserting `category: "WooCommerce"`) is updated to assert `category: "Uncategorized"` (its `product()` fixture doesn't set a category), since that's now the correct default-fixture expectation.

**Verify:** `npx vitest run src/lib/woocommerce/syncProducts.test.ts` → all pass.

**Steps:**

- [ ] **Step 1: Write the failing tests**

First, find and update the existing test that hardcodes the old category value. In `src/lib/woocommerce/syncProducts.test.ts`, change:

```ts
  it("creates a new simple product with correct fields", async () => {
    const prisma = mockPrisma([]);
    const result = await syncWooProducts(prisma as never, "m1", [product()]);

    expect(prisma.product.create).toHaveBeenCalledWith({
      data: {
        merchantId: "m1",
        sku: "SHIRT-001",
        title: "Test Shirt",
        currentPrice: 1999,
        woocommerceVariantId: "101",
        woocommerceParentId: null,
        imageUrl: null,
        category: "Uncategorized",
      },
    });
    expect(result).toEqual({ created: 1, updated: 0, skipped: 0, skippedReasons: [] });
  });
```

Update the `product()` fixture helper to include the new field:

```ts
function product(over: Partial<WooNormalizedProduct> = {}): WooNormalizedProduct {
  return {
    id: 101,
    parentId: null,
    name: "Test Shirt",
    sku: "SHIRT-001",
    regularPriceDollars: "19.99",
    imageUrl: null,
    category: null,
    ...over,
  };
}
```

Add new tests after it:

```ts
  it("uses the real category name as category for a new product", async () => {
    const prisma = mockPrisma([]);
    await syncWooProducts(prisma as never, "m1", [
      product({ category: "Skincare" }),
    ]);

    expect(prisma.product.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ category: "Skincare" }),
      }),
    );
  });

  it("falls back to Uncategorized when category is an empty string", async () => {
    const prisma = mockPrisma([]);
    await syncWooProducts(prisma as never, "m1", [
      product({ category: "" }),
    ]);

    expect(prisma.product.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ category: "Uncategorized" }),
      }),
    );
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/woocommerce/syncProducts.test.ts`
Expected: FAIL — type error on `category` not existing on `WooNormalizedProduct`, and the updated first test fails because `category` is still hardcoded to `"WooCommerce"`.

- [ ] **Step 3: Add `categories` to the client's raw type and `category` to the normalized type**

In `src/lib/woocommerce/client.ts`, update `WooNormalizedProduct`:

```ts
export interface WooNormalizedProduct {
  id: number;
  parentId: number | null;
  name: string;
  sku: string;
  regularPriceDollars: string;
  imageUrl: string | null;
  category: string | null;
}
```

Update `RawProduct`:

```ts
interface RawProduct {
  id: number;
  type: "simple" | "variable";
  name: string;
  sku: string;
  regular_price: string;
  images?: Array<{ src: string }>;
  categories?: Array<{ id: number; name: string; slug: string }>;
}
```

- [ ] **Step 4: Find and update the raw-to-normalized mapping**

Read the rest of `client.ts` to find where `RawProduct`/`RawVariation` get mapped into `WooNormalizedProduct[]` (the equivalent of Shopify's `fetchAllProducts` flatMap) — this is further down in the same file, past line 40. Add `category: product.categories?.[0]?.name?.trim() || null` to the simple-product mapping. For variable-product variations (mapped from `RawVariation`, which has no `categories` field of its own), set `category` to the **parent product's** `category` value computed the same way — i.e. thread the parent's resolved category string into the variation-mapping loop, the same way `imageUrl` fallback already threads the parent's image into variations without their own.

- [ ] **Step 5: Update `syncProducts.ts`'s create call**

In `src/lib/woocommerce/syncProducts.ts`, change the `create` block:

```ts
    } else {
      await prisma.product.create({
        data: {
          merchantId,
          sku: p.sku,
          title: p.name,
          currentPrice,
          woocommerceVariantId,
          woocommerceParentId,
          imageUrl: p.imageUrl,
          category: p.category?.trim() || "Uncategorized",
        },
      });
      created++;
    }
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run src/lib/woocommerce/syncProducts.test.ts`
Expected: PASS, all tests including the updated and new ones.

- [ ] **Step 7: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 8: Commit**

```bash
git add src/lib/woocommerce/client.ts src/lib/woocommerce/syncProducts.ts src/lib/woocommerce/syncProducts.test.ts
git commit -m "feat: sync real WooCommerce category as category, not the platform name"
```

```json:metadata
{"files": ["src/lib/woocommerce/client.ts", "src/lib/woocommerce/syncProducts.ts", "src/lib/woocommerce/syncProducts.test.ts"], "verifyCommand": "npx vitest run src/lib/woocommerce/syncProducts.test.ts", "acceptanceCriteria": ["WooNormalizedProduct carries category", "new products get real category, falling back to Uncategorized", "variations inherit parent category"], "modelTier": "mechanical"}
```

---

### Task 3: `categoryFallback.ts` — pure fallback-elasticity selection + cascade

**Goal:** A pure module that picks a fallback elasticity for a SKU that can't be fit on its own, from sibling products' real `ElasticityModel` data, cascading category → catalog → global constant.

**Files:**
- Create: `src/lib/elasticity/categoryFallback.ts`
- Create: `src/lib/elasticity/categoryFallback.test.ts`
- Modify: `src/lib/elasticity/bayesianShrinkage.ts` (export the prior as a named constant)
- Modify: `src/lib/elasticity/bayesianShrinkage.test.ts` (use the exported constant instead of a local `-1.2` literal, no behavior change)

**Acceptance Criteria:**
- [ ] `bayesianShrinkage.ts` exports `GLOBAL_PRIOR_ELASTICITY = -1.2` and uses it as the default `priorElasticity` param (same value, now named and reusable).
- [ ] `selectFallbackElasticity(siblings)` filters to `confidenceScore >= 0.4`, requires ≥3 qualifying siblings, returns their median elasticity; returns `null` otherwise.
- [ ] `computeCategoryFallback(prisma, merchantId, productId)` tries category-scope siblings first, then catalog-scope (any category, excluding self), then falls back to `GLOBAL_PRIOR_ELASTICITY`, returning `{ elasticity, level, sourceCount, categoryName? }`.

**Verify:** `npx vitest run src/lib/elasticity/categoryFallback.test.ts src/lib/elasticity/bayesianShrinkage.test.ts` → all pass.

**Steps:**

- [ ] **Step 1: Write the failing tests for the pure selection function**

Create `src/lib/elasticity/categoryFallback.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { selectFallbackElasticity, computeCategoryFallback } from "./categoryFallback";
import { GLOBAL_PRIOR_ELASTICITY } from "./bayesianShrinkage";

describe("selectFallbackElasticity", () => {
  it("returns the median elasticity of qualifying siblings", () => {
    const siblings = [
      { elasticity: -1.0, confidenceScore: 0.5 },
      { elasticity: -2.0, confidenceScore: 0.6 },
      { elasticity: -3.0, confidenceScore: 0.7 },
    ];
    expect(selectFallbackElasticity(siblings)).toBeCloseTo(-2.0);
  });

  it("excludes siblings below the 0.4 confidence bar", () => {
    const siblings = [
      { elasticity: -1.0, confidenceScore: 0.1 },
      { elasticity: -2.0, confidenceScore: 0.6 },
      { elasticity: -3.0, confidenceScore: 0.7 },
      { elasticity: -4.0, confidenceScore: 0.9 },
    ];
    // -1.0 excluded (confidence 0.1) — median of [-2, -3, -4] is -3
    expect(selectFallbackElasticity(siblings)).toBeCloseTo(-3.0);
  });

  it("returns null when fewer than 3 siblings qualify", () => {
    const siblings = [
      { elasticity: -1.0, confidenceScore: 0.5 },
      { elasticity: -2.0, confidenceScore: 0.6 },
    ];
    expect(selectFallbackElasticity(siblings)).toBeNull();
  });

  it("returns null for an empty list", () => {
    expect(selectFallbackElasticity([])).toBeNull();
  });

  it("computes an even-length median as the average of the two middle values", () => {
    const siblings = [
      { elasticity: -1.0, confidenceScore: 0.5 },
      { elasticity: -2.0, confidenceScore: 0.5 },
      { elasticity: -3.0, confidenceScore: 0.5 },
      { elasticity: -4.0, confidenceScore: 0.5 },
    ];
    // sorted: -4,-3,-2,-1 → middle two are -3,-2 → avg -2.5
    expect(selectFallbackElasticity(siblings)).toBeCloseTo(-2.5);
  });
});

describe("computeCategoryFallback", () => {
  function fakePrisma(categorySiblings: { elasticity: number; confidenceScore: number | null }[], catalogSiblings: { elasticity: number; confidenceScore: number | null }[]) {
    return {
      product: {
        findUnique: vi.fn().mockResolvedValue({ id: "p1", category: "Skincare" }),
      },
      elasticityModel: {
        findMany: vi
          .fn()
          // First call: category-scope query
          .mockResolvedValueOnce(
            categorySiblings.map((s) => ({ elasticity: s.elasticity, confidenceScore: s.confidenceScore, product: { category: "Skincare" } }))
          )
          // Second call (only reached if category-scope insufficient): catalog-scope query
          .mockResolvedValueOnce(
            catalogSiblings.map((s) => ({ elasticity: s.elasticity, confidenceScore: s.confidenceScore, product: { category: "Other" } }))
          ),
      },
    };
  }

  it("uses category-level fallback when enough category siblings qualify", async () => {
    const prisma = fakePrisma(
      [
        { elasticity: -1.0, confidenceScore: 0.5 },
        { elasticity: -2.0, confidenceScore: 0.5 },
        { elasticity: -3.0, confidenceScore: 0.5 },
      ],
      []
    );
    const result = await computeCategoryFallback(prisma as never, "m1", "p1");
    expect(result.level).toBe("category");
    expect(result.elasticity).toBeCloseTo(-2.0);
    expect(result.sourceCount).toBe(3);
    expect(result.categoryName).toBe("Skincare");
    expect(prisma.elasticityModel.findMany).toHaveBeenCalledTimes(1); // catalog query never reached
  });

  it("falls back to catalog level when category has too few qualifying siblings", async () => {
    const prisma = fakePrisma(
      [{ elasticity: -1.0, confidenceScore: 0.5 }], // only 1, not enough
      [
        { elasticity: -1.5, confidenceScore: 0.5 },
        { elasticity: -2.5, confidenceScore: 0.5 },
        { elasticity: -3.5, confidenceScore: 0.5 },
      ]
    );
    const result = await computeCategoryFallback(prisma as never, "m1", "p1");
    expect(result.level).toBe("catalog");
    expect(result.elasticity).toBeCloseTo(-2.5);
    expect(result.sourceCount).toBe(3);
  });

  it("falls back to the global constant when neither level has enough siblings", async () => {
    const prisma = fakePrisma([], []);
    const result = await computeCategoryFallback(prisma as never, "m1", "p1");
    expect(result.level).toBe("global");
    expect(result.elasticity).toBe(GLOBAL_PRIOR_ELASTICITY);
    expect(result.sourceCount).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/elasticity/categoryFallback.test.ts`
Expected: FAIL — module `./categoryFallback` does not exist.

- [ ] **Step 3: Export the named constant from `bayesianShrinkage.ts`**

Modify `src/lib/elasticity/bayesianShrinkage.ts`:

```ts
export interface ShrinkageResult {
  shrunkElasticity: number;
  priorApplied: boolean;
}

/** The retail-wide default elasticity used when a SKU has no usable data of its own or its siblings'. */
export const GLOBAL_PRIOR_ELASTICITY = -1.2;

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
  priorElasticity = GLOBAL_PRIOR_ELASTICITY,
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

In `src/lib/elasticity/bayesianShrinkage.test.ts`, replace the local `const PRIOR = -1.2;` with an import:

```ts
import { describe, it, expect } from "vitest";
import { bayesianShrinkage, GLOBAL_PRIOR_ELASTICITY } from "./bayesianShrinkage";

describe("bayesianShrinkage", () => {
  const PRIOR = GLOBAL_PRIOR_ELASTICITY;
  const K = 5; // priorStrength
  // ... rest of file unchanged
```

- [ ] **Step 4: Write `categoryFallback.ts`**

Create `src/lib/elasticity/categoryFallback.ts`:

```ts
import type { PrismaClient } from "@prisma/client";
import { GLOBAL_PRIOR_ELASTICITY } from "./bayesianShrinkage";

const MIN_SIBLING_CONFIDENCE = 0.4;
const MIN_QUALIFYING_SIBLINGS = 3;

export interface SiblingModel {
  elasticity: number;
  confidenceScore: number | null;
}

export type FallbackLevel = "category" | "catalog" | "global";

export interface FallbackResult {
  elasticity: number;
  level: FallbackLevel;
  sourceCount: number;
  categoryName?: string;
}

/** Median elasticity from siblings with confidenceScore >= 0.4, or null if fewer than 3 qualify. */
export function selectFallbackElasticity(siblings: SiblingModel[]): number | null {
  const qualifying = siblings
    .filter((s) => (s.confidenceScore ?? 0) >= MIN_SIBLING_CONFIDENCE)
    .map((s) => s.elasticity)
    .sort((a, b) => a - b);

  if (qualifying.length < MIN_QUALIFYING_SIBLINGS) return null;

  const mid = Math.floor(qualifying.length / 2);
  return qualifying.length % 2 === 0
    ? (qualifying[mid - 1] + qualifying[mid]) / 2
    : qualifying[mid];
}

type PrismaSurface = Pick<PrismaClient, "product" | "elasticityModel">;

/**
 * Cascades category -> catalog -> global constant to find a fallback elasticity
 * for a SKU that can't be fit on its own. Never queries the SKU's own row.
 */
export async function computeCategoryFallback(
  prisma: PrismaSurface,
  merchantId: string,
  productId: string
): Promise<FallbackResult> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { category: true },
  });
  const categoryName = product?.category;

  if (categoryName) {
    const categorySiblings = await prisma.elasticityModel.findMany({
      where: {
        product: { merchantId, category: categoryName, id: { not: productId } },
      },
      select: { elasticity: true, confidenceScore: true },
    });
    const categoryElasticity = selectFallbackElasticity(categorySiblings);
    if (categoryElasticity !== null) {
      return {
        elasticity: categoryElasticity,
        level: "category",
        sourceCount: categorySiblings.filter((s) => (s.confidenceScore ?? 0) >= MIN_SIBLING_CONFIDENCE).length,
        categoryName,
      };
    }
  }

  const catalogSiblings = await prisma.elasticityModel.findMany({
    where: {
      product: { merchantId, id: { not: productId } },
    },
    select: { elasticity: true, confidenceScore: true },
  });
  const catalogElasticity = selectFallbackElasticity(catalogSiblings);
  if (catalogElasticity !== null) {
    return {
      elasticity: catalogElasticity,
      level: "catalog",
      sourceCount: catalogSiblings.filter((s) => (s.confidenceScore ?? 0) >= MIN_SIBLING_CONFIDENCE).length,
    };
  }

  return { elasticity: GLOBAL_PRIOR_ELASTICITY, level: "global", sourceCount: 0 };
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/lib/elasticity/categoryFallback.test.ts src/lib/elasticity/bayesianShrinkage.test.ts`
Expected: PASS, all tests.

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 7: Commit**

```bash
git add src/lib/elasticity/categoryFallback.ts src/lib/elasticity/categoryFallback.test.ts src/lib/elasticity/bayesianShrinkage.ts src/lib/elasticity/bayesianShrinkage.test.ts
git commit -m "feat: add category/catalog/global elasticity fallback cascade"
```

```json:metadata
{"files": ["src/lib/elasticity/categoryFallback.ts", "src/lib/elasticity/categoryFallback.test.ts", "src/lib/elasticity/bayesianShrinkage.ts", "src/lib/elasticity/bayesianShrinkage.test.ts"], "verifyCommand": "npx vitest run src/lib/elasticity/categoryFallback.test.ts src/lib/elasticity/bayesianShrinkage.test.ts", "acceptanceCriteria": ["median-of-qualifying-siblings selection correct", "cascade tries category then catalog then global in order", "GLOBAL_PRIOR_ELASTICITY exported and reused"], "modelTier": "standard"}
```

---

### Task 4: Wire the fallback into `POST /api/products/[id]/recommend`

**Goal:** When a product has no real `ElasticityModel`, the recommend route now attempts the category/catalog/global fallback (if cogs and a units baseline exist) instead of always 400ing.

**Files:**
- Modify: `src/app/api/products/[id]/recommend/route.ts`
- Modify: `src/app/api/products/[id]/recommend/route.test.ts`

**Acceptance Criteria:**
- [ ] `cogs === null` still 400s with `"COGS required to generate recommendation"`, checked before the model/fallback logic (order changed from today: cogs is now checked first).
- [ ] No `elasticityModel`, no sales records, and no `estUnits` → still 400s with `"No elasticity model — fit model first"`.
- [ ] No `elasticityModel`, but cogs set and (≥1 sales record OR `estUnits` set) → computes a fallback via `computeCategoryFallback`, builds an intercept from the SKU's own units baseline, calls `generateRecommendation()`, and persists a `Recommendation` with `rulesJson.fallbackLevel` set. No `ElasticityModel` row is created.
- [ ] A real `elasticityModel` present → unchanged existing behavior (no fallback logic touched).

**Verify:** `npx vitest run src/app/api/products/[id]/recommend/route.test.ts` → all pass, including 4 new fallback-path tests.

**Steps:**

- [ ] **Step 1: Write the failing tests**

Add to `src/app/api/products/[id]/recommend/route.test.ts`. First update the mocks at the top of the file to add `salesRecord.findMany` and `elasticityModel.findMany`, and mock `computeCategoryFallback`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const { findFirst, upsert, findManySalesRecords, findManyModels } = vi.hoisted(() => ({
  findFirst: vi.fn(),
  upsert: vi.fn(),
  findManySalesRecords: vi.fn(),
  findManyModels: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    product: { findFirst },
    recommendation: { upsert },
    salesRecord: { findMany: findManySalesRecords },
    elasticityModel: { findMany: findManyModels },
  },
}));

vi.mock("@/lib/auth/requireSession", () => ({
  requireSessionApi: vi.fn(async () => ({
    merchantId: "m1",
    user: { id: "u1", email: "demo@zorin.example", merchantId: "m1" },
  })),
}));

import { POST } from "./route";

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const req = () => ({}) as unknown as Request;

const elasticityModel = {
  id: "em1",
  productId: "p1",
  elasticity: -1.5,
  intercept: 12.0,
  r2: 0.85,
  dataPoints: 10,
  fittedAt: new Date(),
};

const productWithModel = {
  id: "p1",
  merchantId: "m1",
  currentPrice: 1000,
  cogs: 400,
  category: "Skincare",
  estUnits: null,
  elasticityModel,
};

beforeEach(() => {
  findFirst.mockReset();
  upsert.mockReset();
  findManySalesRecords.mockReset().mockResolvedValue([]);
  findManyModels.mockReset().mockResolvedValue([]);
});
```

(Existing tests below this point stay as-is — they all mock `findFirst` with a product that has `elasticityModel` set, and don't touch `salesRecord`/`elasticityModel.findMany`, so they're unaffected by these two new mocks defaulting to empty arrays.)

Add new tests at the end of the `describe` block:

```ts
  it("falls back to a category-sourced recommendation when no elasticityModel exists but sales records and cogs do", async () => {
    findFirst.mockResolvedValue({
      ...productWithModel,
      elasticityModel: null,
    });
    findManySalesRecords.mockResolvedValue([
      { priceCents: 1000, unitsSold: 5, date: new Date() },
      { priceCents: 1000, unitsSold: 7, date: new Date() },
    ]);
    findManyModels.mockResolvedValueOnce([
      { elasticity: -1.0, confidenceScore: 0.5 },
      { elasticity: -2.0, confidenceScore: 0.5 },
      { elasticity: -3.0, confidenceScore: 0.5 },
    ]);
    upsert.mockResolvedValue({});

    const res = await POST(req(), ctx("p1"));
    expect(res.status).toBe(200);

    const call = upsert.mock.calls[0][0];
    const rulesJson = JSON.parse(call.create.rulesJson);
    expect(rulesJson.fallbackLevel).toBe("category");
    expect(rulesJson.fallbackCategoryName).toBe("Skincare");
    expect(rulesJson.fallbackSourceCount).toBe(3);
  });

  it("falls back to a catalog-sourced recommendation when the category has too few qualifying siblings", async () => {
    findFirst.mockResolvedValue({
      ...productWithModel,
      elasticityModel: null,
    });
    findManySalesRecords.mockResolvedValue([
      { priceCents: 1000, unitsSold: 5, date: new Date() },
    ]);
    findManyModels
      .mockResolvedValueOnce([]) // category scope: nothing
      .mockResolvedValueOnce([
        { elasticity: -1.5, confidenceScore: 0.5 },
        { elasticity: -2.5, confidenceScore: 0.5 },
        { elasticity: -3.5, confidenceScore: 0.5 },
      ]); // catalog scope
    upsert.mockResolvedValue({});

    const res = await POST(req(), ctx("p1"));
    expect(res.status).toBe(200);

    const rulesJson = JSON.parse(upsert.mock.calls[0][0].create.rulesJson);
    expect(rulesJson.fallbackLevel).toBe("catalog");
  });

  it("uses estUnits as the baseline when there are zero sales records", async () => {
    findFirst.mockResolvedValue({
      ...productWithModel,
      elasticityModel: null,
      estUnits: 20,
    });
    findManySalesRecords.mockResolvedValue([]);
    findManyModels.mockResolvedValue([]); // nothing qualifies anywhere -> global
    upsert.mockResolvedValue({});

    const res = await POST(req(), ctx("p1"));
    expect(res.status).toBe(200);

    const rulesJson = JSON.parse(upsert.mock.calls[0][0].create.rulesJson);
    expect(rulesJson.fallbackLevel).toBe("global");
  });

  it("still 400s when there is no elasticityModel AND no sales records AND no estUnits", async () => {
    findFirst.mockResolvedValue({
      ...productWithModel,
      elasticityModel: null,
      estUnits: null,
    });
    findManySalesRecords.mockResolvedValue([]);

    const res = await POST(req(), ctx("p1"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/model/i);
    expect(upsert).not.toHaveBeenCalled();
  });

  it("checks cogs before attempting a fallback", async () => {
    findFirst.mockResolvedValue({
      ...productWithModel,
      elasticityModel: null,
      cogs: null,
    });

    const res = await POST(req(), ctx("p1"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/cogs/i);
    expect(findManySalesRecords).not.toHaveBeenCalled(); // never got as far as checking baseline
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/app/api/products/[id]/recommend/route.test.ts`
Expected: FAIL — 5 new tests fail because the route doesn't implement fallback logic yet.

- [ ] **Step 3: Implement the fallback branch in the route**

Replace `src/app/api/products/[id]/recommend/route.ts` in full:

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { HttpError, withErrorHandling } from "@/lib/api/errors";
import { requireSessionApi } from "@/lib/auth/requireSession";
import { generateRecommendation } from "@/lib/elasticity/generateRecommendation";
import { computeCategoryFallback } from "@/lib/elasticity/categoryFallback";

export const POST = withErrorHandling(
  async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { merchantId } = await requireSessionApi();
    const { id } = await params;

    const product = await prisma.product.findFirst({
      where: { id, merchantId },
      include: { elasticityModel: true },
    });
    if (!product) throw new HttpError(404, "Not found");
    if (product.cogs === null) throw new HttpError(400, "COGS required to generate recommendation");

    if (product.elasticityModel) {
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
        currentUnitsEstimate: rec.currentUnitsEstimate,
        projectedUnitsEstimate: rec.projectedUnitsEstimate,
        currentProfitCents: rec.currentProfitCents,
        projectedProfitCents: rec.projectedProfitCents,
        profitLiftCents: rec.profitLiftCents,
      });

      await prisma.recommendation.upsert({
        where: { productId: id },
        create: { productId: id, action: rec.action, deltaPct: rec.deltaPct, phrasing: rec.reasoning, rulesJson },
        update: { action: rec.action, deltaPct: rec.deltaPct, phrasing: rec.reasoning, rulesJson, generatedAt: new Date() },
      });

      return NextResponse.json(rec);
    }

    // No real per-SKU model — try the category/catalog/global fallback.
    const records = await prisma.salesRecord.findMany({
      where: { productId: id, promotionFlag: false },
      select: { unitsSold: true },
    });

    const avgUnits =
      records.length > 0
        ? records.reduce((sum, r) => sum + r.unitsSold, 0) / records.length
        : (product.estUnits ?? null);

    if (avgUnits === null || avgUnits <= 0) {
      throw new HttpError(400, "No elasticity model — fit model first");
    }

    const fallback = await computeCategoryFallback(prisma, merchantId, id);
    const intercept = Math.log(avgUnits) - fallback.elasticity * Math.log(product.currentPrice);

    const rec = generateRecommendation(
      { elasticity: fallback.elasticity, intercept, r2: 0, dataPoints: 0 },
      product.currentPrice,
      product.cogs,
      0.10,
      0
    );

    const rulesJson = JSON.stringify({
      suggestedPriceCents: rec.suggestedPriceCents,
      expectedProfitLiftPct: rec.expectedProfitLiftPct,
      elasticity: fallback.elasticity,
      r2: null,
      dataPoints: 0,
      confidenceScore: 0,
      currentUnitsEstimate: rec.currentUnitsEstimate,
      projectedUnitsEstimate: rec.projectedUnitsEstimate,
      currentProfitCents: rec.currentProfitCents,
      projectedProfitCents: rec.projectedProfitCents,
      profitLiftCents: rec.profitLiftCents,
      fallbackLevel: fallback.level,
      fallbackCategoryName: fallback.categoryName,
      fallbackSourceCount: fallback.sourceCount,
    });

    await prisma.recommendation.upsert({
      where: { productId: id },
      create: { productId: id, action: rec.action, deltaPct: rec.deltaPct, phrasing: rec.reasoning, rulesJson },
      update: { action: rec.action, deltaPct: rec.deltaPct, phrasing: rec.reasoning, rulesJson, generatedAt: new Date() },
    });

    return NextResponse.json({ ...rec, fallbackLevel: fallback.level, fallbackCategoryName: fallback.categoryName, fallbackSourceCount: fallback.sourceCount });
  }
);
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/app/api/products/[id]/recommend/route.test.ts`
Expected: PASS, all tests including the 5 new ones and the pre-existing ones (cogs-null test still passes since cogs is still checked, just earlier).

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors. `Product.estUnits` and `Product.category` are already real schema fields — no migration needed for this task.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/products/[id]/recommend/route.ts src/app/api/products/[id]/recommend/route.test.ts
git commit -m "feat: fall back to category/catalog/global elasticity when no per-SKU model exists"
```

```json:metadata
{"files": ["src/app/api/products/[id]/recommend/route.ts", "src/app/api/products/[id]/recommend/route.test.ts"], "verifyCommand": "npx vitest run src/app/api/products/[id]/recommend/route.test.ts", "acceptanceCriteria": ["cogs checked before fallback attempt", "fallback attempted only with a units baseline", "rulesJson carries fallbackLevel/fallbackCategoryName/fallbackSourceCount", "real elasticityModel path unchanged"], "modelTier": "standard"}
```

---

### Task 5: Wire the fallback into the CSV-import `bulkML.ts` path

**Goal:** The CSV-import autoML flow gets the same fallback attempt when `fitElasticityModel` returns `null`, instead of always skipping.

**Files:**
- Modify: `src/lib/salesHistory/bulkML.ts`
- Modify: `src/lib/salesHistory/bulkML.test.ts`

**Acceptance Criteria:**
- [ ] When `fitElasticityModel` returns `null` but the product has cogs and a units baseline (sales records or `estUnits`), a fallback `Recommendation` is created (no `ElasticityModel` row), and `result.recommended` increments while `result.fitted` does not.
- [ ] When `fitElasticityModel` returns `null` and there's no baseline at all, behavior is unchanged: pushed to `fitSkipped`, no recommendation attempted.
- [ ] Existing behavior for products that DO fit (raw regression succeeds) is completely unchanged.

**Verify:** `npx vitest run src/lib/salesHistory/bulkML.test.ts` → all pass, including 2 new fallback-path tests.

**Steps:**

- [ ] **Step 1: Write the failing tests**

Add to `src/lib/salesHistory/bulkML.test.ts`. First add the new mock to the hoisted mocks block and the `fakePrisma` object at the top of the file:

```ts
const mocks = vi.hoisted(() => ({
  productFindMany: vi.fn(),
  salesRecordFindMany: vi.fn(),
  elasticityModelUpsert: vi.fn(),
  elasticityModelFindMany: vi.fn(),
  productFindUnique: vi.fn(),
  recommendationUpsert: vi.fn(),
  fitElasticityModel: vi.fn(),
  bayesianShrinkage: vi.fn(),
  computeConfidenceScore: vi.fn(),
  generateRecommendation: vi.fn(),
}));

// ... existing vi.mock calls unchanged ...

import { runBulkML } from "./bulkML";

const fakePrisma = {
  product: { findMany: mocks.productFindMany, findUnique: mocks.productFindUnique },
  salesRecord: { findMany: mocks.salesRecordFindMany },
  elasticityModel: { upsert: mocks.elasticityModelUpsert, findMany: mocks.elasticityModelFindMany },
  recommendation: { upsert: mocks.recommendationUpsert },
} as any;
```

Add to `beforeEach`:

```ts
beforeEach(() => {
  vi.resetAllMocks();
  mocks.elasticityModelFindMany.mockResolvedValue([]);
});
```

Add new tests at the end of the `describe("runBulkML", ...)` block:

```ts
  it("falls back to a category/catalog/global recommendation when fitElasticityModel returns null but a units baseline exists", async () => {
    mocks.productFindMany.mockResolvedValue([
      { id: "p1", title: "Flat-Priced Widget", currentPrice: 1500, cogs: 800, category: "Widgets", estUnits: 10, merchantId: "m1" },
    ]);
    mocks.salesRecordFindMany.mockResolvedValue([
      { priceCents: 1500, unitsSold: 5, date: new Date() },
      { priceCents: 1500, unitsSold: 5, date: new Date() },
    ]);
    mocks.fitElasticityModel.mockReturnValue(null);
    mocks.productFindUnique.mockResolvedValue({ category: "Widgets" });
    mocks.elasticityModelFindMany.mockResolvedValueOnce([
      { elasticity: -1.0, confidenceScore: 0.5 },
      { elasticity: -2.0, confidenceScore: 0.5 },
      { elasticity: -3.0, confidenceScore: 0.5 },
    ]);
    mocks.generateRecommendation.mockReturnValue({
      action: "hold",
      suggestedPriceCents: 1500,
      deltaPct: 0,
      reasoning: "estimated",
      expectedProfitLiftPct: 0,
      currentUnitsEstimate: 5,
      projectedUnitsEstimate: 5,
      currentProfitCents: 3500,
      projectedProfitCents: 3500,
      profitLiftCents: 0,
    });
    mocks.recommendationUpsert.mockResolvedValue({});

    const result = await runBulkML(fakePrisma, ["p1"]);

    expect(result.fitted).toBe(0);
    expect(result.recommended).toBe(1);
    expect(result.fitSkipped).toEqual([]);
    expect(mocks.elasticityModelUpsert).not.toHaveBeenCalled();
    expect(mocks.recommendationUpsert).toHaveBeenCalledOnce();
    const rulesJson = JSON.parse(mocks.recommendationUpsert.mock.calls[0][0].create.rulesJson);
    expect(rulesJson.fallbackLevel).toBe("category");
  });

  it("keeps a product in fitSkipped and does not attempt a fallback recommendation when there is no units baseline at all", async () => {
    mocks.productFindMany.mockResolvedValue([
      { id: "p2", title: "No Data Product", currentPrice: 1500, cogs: 800, category: "Widgets", estUnits: null, merchantId: "m1" },
    ]);
    mocks.salesRecordFindMany.mockResolvedValue([]);
    mocks.fitElasticityModel.mockReturnValue(null);

    const result = await runBulkML(fakePrisma, ["p2"]);

    expect(result.fitted).toBe(0);
    expect(result.recommended).toBe(0);
    expect(result.fitSkipped).toEqual(["No Data Product"]);
    expect(mocks.recommendationUpsert).not.toHaveBeenCalled();
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/salesHistory/bulkML.test.ts`
Expected: FAIL — 2 new tests fail because `runBulkML` doesn't attempt a fallback yet.

- [ ] **Step 3: Implement the fallback branch in `bulkML.ts`**

Modify `src/lib/salesHistory/bulkML.ts`. Update the import and the product query's `select`, then change the `if (!raw)` branch:

```ts
import type { PrismaClient } from "@prisma/client";
import { fitElasticityModel } from "@/lib/elasticity/fitElasticityModel";
import { bayesianShrinkage } from "@/lib/elasticity/bayesianShrinkage";
import { computeConfidenceScore } from "@/lib/elasticity/confidenceScore";
import { generateRecommendation } from "@/lib/elasticity/generateRecommendation";
import { computeCategoryFallback } from "@/lib/elasticity/categoryFallback";

export interface BulkMLResult {
  fitted: number;
  recommended: number;
  fitSkipped: string[];
  recommendSkipped: string[];
}

type PrismaSurface = Pick<PrismaClient, "product" | "salesRecord" | "elasticityModel" | "recommendation">;

export async function runBulkML(
  prisma: PrismaSurface,
  productIds: string[],
): Promise<BulkMLResult> {
  const result: BulkMLResult = { fitted: 0, recommended: 0, fitSkipped: [], recommendSkipped: [] };
  if (productIds.length === 0) return result;

  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, title: true, currentPrice: true, cogs: true, estUnits: true, merchantId: true },
  });

  for (const product of products) {
    // Sequential per-product query — acceptable for typical batch sizes (<100 products)
    const records = await prisma.salesRecord.findMany({
      where: { productId: product.id, promotionFlag: false },
      select: { priceCents: true, unitsSold: true, date: true },
    });

    const raw = fitElasticityModel(records);
    if (!raw) {
      if (product.cogs === null) {
        result.fitSkipped.push(product.title);
        continue;
      }
      const avgUnits =
        records.length > 0
          ? records.reduce((sum, r) => sum + r.unitsSold, 0) / records.length
          : (product.estUnits ?? null);

      if (avgUnits === null || avgUnits <= 0) {
        result.fitSkipped.push(product.title);
        continue;
      }

      const fallback = await computeCategoryFallback(prisma, product.merchantId, product.id);
      const intercept = Math.log(avgUnits) - fallback.elasticity * Math.log(product.currentPrice);

      const rec = generateRecommendation(
        { elasticity: fallback.elasticity, intercept, r2: 0, dataPoints: 0 },
        product.currentPrice,
        product.cogs,
        0.10,
        0
      );

      const rulesJson = JSON.stringify({
        suggestedPriceCents: rec.suggestedPriceCents,
        expectedProfitLiftPct: rec.expectedProfitLiftPct,
        elasticity: fallback.elasticity,
        r2: null,
        dataPoints: 0,
        confidenceScore: 0,
        currentUnitsEstimate: rec.currentUnitsEstimate,
        projectedUnitsEstimate: rec.projectedUnitsEstimate,
        currentProfitCents: rec.currentProfitCents,
        projectedProfitCents: rec.projectedProfitCents,
        profitLiftCents: rec.profitLiftCents,
        fallbackLevel: fallback.level,
        fallbackCategoryName: fallback.categoryName,
        fallbackSourceCount: fallback.sourceCount,
      });

      await prisma.recommendation.upsert({
        where: { productId: product.id },
        create: { productId: product.id, action: rec.action, deltaPct: rec.deltaPct, phrasing: rec.reasoning, rulesJson },
        update: { action: rec.action, deltaPct: rec.deltaPct, phrasing: rec.reasoning, rulesJson, generatedAt: new Date() },
      });
      result.recommended++;
      continue;
    }

    const { shrunkElasticity, priorApplied } = bayesianShrinkage(raw.elasticity, raw.effectiveSampleSize);
    const confidenceScore = computeConfidenceScore(raw.r2, raw.effectiveSampleSize);
    const adjustedIntercept = raw.weightedMeanLogUnits - shrunkElasticity * raw.weightedMeanLogPrice;

    const modelData = {
      elasticity: shrunkElasticity,
      intercept: adjustedIntercept,
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
      where: { productId: product.id },
      create: { productId: product.id, ...modelData },
      update: modelData,
    });
    result.fitted++;

    if (product.cogs == null) {
      result.recommendSkipped.push(product.title);
      continue;
    }

    const rec = generateRecommendation(
      modelData,
      product.currentPrice,
      product.cogs,
      0.10,
      confidenceScore,
    );

    const rulesJson = JSON.stringify({
      suggestedPriceCents: rec.suggestedPriceCents,
      expectedProfitLiftPct: rec.expectedProfitLiftPct,
      elasticity: shrunkElasticity,
      r2: raw.r2,
      dataPoints: raw.dataPoints,
      confidenceScore,
      currentUnitsEstimate: rec.currentUnitsEstimate,
      projectedUnitsEstimate: rec.projectedUnitsEstimate,
      currentProfitCents: rec.currentProfitCents,
      projectedProfitCents: rec.projectedProfitCents,
      profitLiftCents: rec.profitLiftCents,
    });

    await prisma.recommendation.upsert({
      where: { productId: product.id },
      create: { productId: product.id, action: rec.action, deltaPct: rec.deltaPct, phrasing: rec.reasoning, rulesJson },
      update: { action: rec.action, deltaPct: rec.deltaPct, phrasing: rec.reasoning, rulesJson, generatedAt: new Date() },
    });
    result.recommended++;
  }

  return result;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/salesHistory/bulkML.test.ts`
Expected: PASS, all tests including the 2 new ones and all pre-existing ones (unaffected — they all provide a `raw` fit via `mockReturnValue(rawFit)`, never hitting the new branch).

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/salesHistory/bulkML.ts src/lib/salesHistory/bulkML.test.ts
git commit -m "feat: attempt category/catalog/global fallback in CSV-import autoML path"
```

```json:metadata
{"files": ["src/lib/salesHistory/bulkML.ts", "src/lib/salesHistory/bulkML.test.ts"], "verifyCommand": "npx vitest run src/lib/salesHistory/bulkML.test.ts", "acceptanceCriteria": ["fallback attempted only with cogs + units baseline", "fitted stays 0, recommended increments for a fallback SKU", "no-baseline case unchanged (fitSkipped, no recommendation)", "existing real-fit tests unaffected"], "modelTier": "standard"}
```

---

### Task 6: UI — "Estimated" badge tier, fallback reasoning, secondary suggestions

**Goal:** `RecommendationCard` visually distinguishes a fallback-sourced recommendation from a real per-SKU fit, with an explicit reasoning sentence and two secondary suggestions (Van Westendorp survey, price test).

**Files:**
- Modify: `src/components/ModelHealthBadge.tsx`
- Modify: `src/components/RecommendationCard.tsx`
- Modify: `src/app/product/[id]/page.tsx` (`parseRecView`, `MLRecView` usage — passing the two new fields through)
- Modify: `src/components/ModelHealthBadge.test.tsx`
- Modify: `src/components/RecommendationCard.test.tsx`

**Acceptance Criteria:**
- [ ] `ModelHealthBadge` renders a new "Estimated" tier (distinct color from Strong/Fair/Weak/None) when passed `isFallback: true`, regardless of `r2`/`confidenceScore` values.
- [ ] `RecommendationCard`'s reasoning text for a fallback recommendation reads e.g. *"Estimated from your Skincare category (3 similar products)."* / *"Estimated from your whole catalog (3 products)."* / *"Estimated from typical retail elasticity (no comparable products yet)."*
- [ ] Two secondary suggestion links render only when `fallbackLevel` is set: a Van Westendorp survey link and price-test copy.
- [ ] Existing non-fallback rendering (all prior `RecommendationCard`/`ModelHealthBadge` tests) is unchanged.

**Verify:** `npx vitest run src/components/RecommendationCard.test.tsx src/components/ModelHealthBadge.test.tsx` → all pass.

**Steps:**

- [ ] **Step 1: Check for an existing `ModelHealthBadge.test.tsx`**

Run: `ls src/components/ModelHealthBadge.test.tsx 2>&1 || echo "not found"`

If not found, create it fresh with baseline coverage of the existing 4 tiers plus the new one (below). If found, add the new tests to the existing file's `describe` block.

- [ ] **Step 2: Write the failing tests**

Add (or create) `src/components/ModelHealthBadge.test.tsx`:

```tsx
import { render, screen, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ModelHealthBadge } from "./ModelHealthBadge";

afterEach(cleanup);

describe("ModelHealthBadge", () => {
  it("renders None when r2 is null", () => {
    render(<ModelHealthBadge r2={null} dataPoints={null} />);
    expect(screen.getByText("No model")).toBeTruthy();
  });

  it("renders Strong for high confidence", () => {
    render(<ModelHealthBadge r2={0.9} dataPoints={40} confidenceScore={0.8} />);
    expect(screen.getByText(/Strong/)).toBeTruthy();
  });

  it("renders Estimated when isFallback is true, regardless of r2/confidenceScore", () => {
    render(<ModelHealthBadge r2={null} dataPoints={null} isFallback />);
    expect(screen.getByText("Estimated")).toBeTruthy();
  });

  it("renders Estimated even when r2/confidenceScore would otherwise indicate Strong", () => {
    render(<ModelHealthBadge r2={0.95} dataPoints={50} confidenceScore={0.9} isFallback />);
    expect(screen.getByText("Estimated")).toBeTruthy();
    expect(screen.queryByText(/Strong/)).toBeNull();
  });
});
```

Add to `src/components/RecommendationCard.test.tsx`, after the existing `WhyThisPrice`-related tests:

```tsx
  it("fallback: shows the Estimated badge and category-sourced reasoning", () => {
    render(
      <RecommendationCard
        rec={rec({
          action: "raise",
          fallbackLevel: "category",
          fallbackCategoryName: "Skincare",
          fallbackSourceCount: 3,
        })}
        currentPriceCents={7999}
      />
    );
    expect(screen.getByText("Estimated")).toBeTruthy();
    expect(screen.getByText(/Estimated from your Skincare category \(3 similar products\)/)).toBeTruthy();
  });

  it("fallback: catalog level reasoning omits a category name", () => {
    render(
      <RecommendationCard
        rec={rec({ action: "raise", fallbackLevel: "catalog", fallbackSourceCount: 5 })}
        currentPriceCents={7999}
      />
    );
    expect(screen.getByText(/Estimated from your whole catalog \(5 products\)/)).toBeTruthy();
  });

  it("fallback: global level reasoning has no source count", () => {
    render(
      <RecommendationCard
        rec={rec({ action: "raise", fallbackLevel: "global", fallbackSourceCount: 0 })}
        currentPriceCents={7999}
      />
    );
    expect(screen.getByText(/Estimated from typical retail elasticity/)).toBeTruthy();
  });

  it("fallback: renders the Van Westendorp and price-test suggestions", () => {
    render(
      <RecommendationCard
        rec={rec({ action: "raise", fallbackLevel: "category", fallbackCategoryName: "Skincare", fallbackSourceCount: 3 })}
        currentPriceCents={7999}
      />
    );
    expect(screen.getByText(/Create a Van Westendorp survey/)).toBeTruthy();
    expect(screen.getByText(/run a 2-week price test/)).toBeTruthy();
  });

  it("non-fallback: does not render the Estimated badge or secondary suggestions", () => {
    render(<RecommendationCard rec={rec({ action: "raise" })} currentPriceCents={7999} />);
    expect(screen.queryByText("Estimated")).toBeNull();
    expect(screen.queryByText(/Van Westendorp/)).toBeNull();
  });
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run src/components/RecommendationCard.test.tsx src/components/ModelHealthBadge.test.tsx`
Expected: FAIL — `isFallback`/`fallbackLevel` props don't exist yet.

- [ ] **Step 4: Add the "Estimated" tier to `ModelHealthBadge`**

Modify `src/components/ModelHealthBadge.tsx`:

```tsx
interface Props {
  r2: number | null;
  dataPoints: number | null;
  confidenceScore?: number | null;
  isFallback?: boolean;
  size?: "sm" | "md";
}

type Tier = "strong" | "fair" | "weak" | "none" | "estimated";

function getTier(
  r2: number | null | undefined,
  dataPoints: number | null | undefined,
  confidenceScore?: number | null,
  isFallback?: boolean
): Tier {
  if (isFallback) return "estimated";
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
  strong:    { label: "Strong",    dot: "bg-positive",  text: "text-positive", bg: "bg-[color:oklch(0.96_0.04_150)]" },
  fair:      { label: "Fair",      dot: "bg-warning",   text: "text-warning",  bg: "bg-[color:oklch(0.96_0.04_65)]"  },
  weak:      { label: "Weak",      dot: "bg-danger",    text: "text-danger",   bg: "bg-danger-soft"                   },
  none:      { label: "No model",  dot: "bg-faint",     text: "text-faint",    bg: "bg-panel"                         },
  estimated: { label: "Estimated", dot: "bg-accent",    text: "text-accent",   bg: "bg-accent-soft"                   },
};

export function ModelHealthBadge({ r2, dataPoints, confidenceScore, isFallback, size = "md" }: Props) {
  const tier = getTier(r2, dataPoints, confidenceScore, isFallback);
  const cfg = TIER_CONFIG[tier];

  const title =
    tier === "estimated"
      ? "Estimated from other products — not this product's own sales data"
      : tier === "none"
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
      {cfg.label}{tier !== "none" && tier !== "estimated" && " fit"}
      {tier !== "none" && tier !== "estimated" && (
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

(`bg-accent-soft`/`text-accent`/`bg-accent` are existing design tokens already used elsewhere in this codebase, e.g. `ShopifyConnectionCard.tsx`'s focus rings and `Sidebar.tsx`'s active-state highlight — safe reuse, no new CSS needed.)

- [ ] **Step 5: Update `MLRecView` and `RecommendationCard`**

Modify `src/components/RecommendationCard.tsx`:

```tsx
"use client";

import { ModelHealthBadge } from "./ModelHealthBadge";
import { formatCents } from "@/lib/money";

export interface MLRecView {
  action: "raise" | "lower" | "hold";
  suggestedPriceCents: number;
  reasoning: string;
  r2: number;
  dataPoints: number;
  expectedProfitLiftPct: number;
  confidenceScore?: number | null;
  currentUnitsEstimate?: number | null;
  projectedUnitsEstimate?: number | null;
  currentProfitCents?: number | null;
  projectedProfitCents?: number | null;
  profitLiftCents?: number | null;
  fallbackLevel?: "category" | "catalog" | "global" | null;
  fallbackCategoryName?: string | null;
  fallbackSourceCount?: number | null;
}

function fallbackReasoningText(rec: MLRecView): string {
  if (rec.fallbackLevel === "category") {
    return `Estimated from your ${rec.fallbackCategoryName} category (${rec.fallbackSourceCount} similar products).`;
  }
  if (rec.fallbackLevel === "catalog") {
    return `Estimated from your whole catalog (${rec.fallbackSourceCount} products).`;
  }
  return "Estimated from typical retail elasticity (no comparable products yet).";
}

function WhyThisPrice({ rec, currentPriceCents }: { rec: MLRecView; currentPriceCents: number }) {
  if (
    rec.currentUnitsEstimate == null ||
    rec.projectedUnitsEstimate == null ||
    rec.currentProfitCents == null ||
    rec.projectedProfitCents == null ||
    rec.profitLiftCents == null
  ) {
    return null;
  }

  const currentUnits = Math.round(rec.currentUnitsEstimate);
  const projectedUnits = Math.round(rec.projectedUnitsEstimate);
  const liftCents = rec.profitLiftCents;
  const liftIsGain = liftCents >= 0;

  const headline =
    rec.action === "hold"
      ? `At ${formatCents(currentPriceCents)}, you're projected to sell ~${currentUnits} units for ~${formatCents(rec.currentProfitCents)} gross profit — already close to the profit-maximizing price.`
      : `At ${formatCents(currentPriceCents)}, you're projected to sell ~${currentUnits} units for ~${formatCents(rec.currentProfitCents)} gross profit. At ${formatCents(rec.suggestedPriceCents)}, that shifts to ~${projectedUnits} units for ~${formatCents(rec.projectedProfitCents)} gross profit.`;

  return (
    <div className="mt-3 rounded-lg border border-line bg-panel p-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-faint">Why this price?</h3>
      <p className="mt-2 text-sm leading-relaxed text-ink">{headline}</p>
      {rec.action !== "hold" && (
        <p className={`mt-2 text-sm font-semibold ${liftIsGain ? "text-positive" : "text-warning"}`}>
          {liftIsGain ? "+" : ""}
          {formatCents(liftCents)} projected monthly gross profit {liftIsGain ? "gain" : "change"}
        </p>
      )}
    </div>
  );
}

function FallbackSuggestions() {
  return (
    <div className="mt-3 space-y-1 text-xs text-muted">
      <p>
        Or ask customers directly →{" "}
        <a href="#van-westendorp-survey" className="text-accent underline-offset-2 hover:underline">
          Create a Van Westendorp survey
        </a>
      </p>
      <p>Or run a 2-week price test to get a real reading.</p>
    </div>
  );
}

/**
 * Presentational recommendation summary backed by ML elasticity model.
 * The price control and Apply action live in WhatIfSlider; this card
 * just explains what the engine suggests.
 */
export function RecommendationCard({
  rec,
  currentPriceCents,
}: {
  rec: MLRecView | null;
  currentPriceCents?: number;
}) {
  if (!rec) {
    return (
      <div className="rounded-xl border border-dashed border-line bg-surface p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-faint">Recommendation</p>
        <p className="mt-2 text-sm font-medium text-muted">No recommendation yet</p>
        <p className="mt-1 text-xs text-faint leading-relaxed">
          Upload your sales history and click <span className="font-medium text-ink">Fit Model</span>, then{" "}
          <span className="font-medium text-ink">Get Recommendation</span> to see a data-backed price suggestion.
        </p>
        <div className="mt-4 flex gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-panel px-2.5 py-1 text-xs text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-line" />
            Upload sales data
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-panel px-2.5 py-1 text-xs text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-line" />
            Fit model
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-panel px-2.5 py-1 text-xs text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-line" />
            Get recommendation
          </span>
        </div>
      </div>
    );
  }

  const tone =
    rec.action === "raise"
      ? "text-positive"
      : rec.action === "lower"
        ? "text-warning"
        : "text-muted";

  const liftLabel = rec.expectedProfitLiftPct >= 0
    ? `+${(rec.expectedProfitLiftPct * 100).toFixed(1)}% expected profit lift`
    : `${(rec.expectedProfitLiftPct * 100).toFixed(1)}% expected profit change`;

  const isFallback = Boolean(rec.fallbackLevel);

  return (
    <div className="rounded-xl border border-line bg-surface p-5">
      <div className="flex items-center gap-2">
        <span className={`text-xs font-semibold uppercase tracking-wide ${tone}`}>
          {rec.action}
        </span>
        <span className="text-faint">·</span>
        <span className="text-xs text-faint">{liftLabel}</span>
      </div>
      <p className="mt-2 text-ink">{isFallback ? fallbackReasoningText(rec) : rec.reasoning}</p>
      {currentPriceCents != null && <WhyThisPrice rec={rec} currentPriceCents={currentPriceCents} />}
      {isFallback && <FallbackSuggestions />}
      <div className="mt-3">
        <ModelHealthBadge r2={rec.r2} dataPoints={rec.dataPoints} confidenceScore={rec.confidenceScore ?? null} isFallback={isFallback} />
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Thread the two new fields through `product/[id]/page.tsx`'s `parseRecView`**

Modify `src/app/product/[id]/page.tsx`. In `parseRecView`, update the `rules` type and the returned object:

```ts
function parseRecView(rec: RecData): MLRecView | null {
  try {
    const rules = JSON.parse(rec.rulesJson) as {
      suggestedPriceCents: number;
      expectedProfitLiftPct: number;
      r2: number;
      dataPoints: number;
      confidenceScore?: number;
      currentUnitsEstimate?: number;
      projectedUnitsEstimate?: number;
      currentProfitCents?: number;
      projectedProfitCents?: number;
      profitLiftCents?: number;
      fallbackLevel?: "category" | "catalog" | "global";
      fallbackCategoryName?: string;
      fallbackSourceCount?: number;
    };
    return {
      action: rec.action,
      suggestedPriceCents: rules.suggestedPriceCents,
      reasoning: rec.phrasing,
      r2: rules.r2,
      dataPoints: rules.dataPoints,
      expectedProfitLiftPct: rules.expectedProfitLiftPct,
      confidenceScore: rules.confidenceScore ?? null,
      currentUnitsEstimate: rules.currentUnitsEstimate ?? null,
      projectedUnitsEstimate: rules.projectedUnitsEstimate ?? null,
      currentProfitCents: rules.currentProfitCents ?? null,
      projectedProfitCents: rules.projectedProfitCents ?? null,
      profitLiftCents: rules.profitLiftCents ?? null,
      fallbackLevel: rules.fallbackLevel ?? null,
      fallbackCategoryName: rules.fallbackCategoryName ?? null,
      fallbackSourceCount: rules.fallbackSourceCount ?? null,
    };
  } catch {
    return null;
  }
}
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `npx vitest run src/components/RecommendationCard.test.tsx src/components/ModelHealthBadge.test.tsx`
Expected: PASS, all tests.

- [ ] **Step 8: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 9: Commit**

```bash
git add src/components/ModelHealthBadge.tsx src/components/ModelHealthBadge.test.tsx src/components/RecommendationCard.tsx src/components/RecommendationCard.test.tsx src/app/product/[id]/page.tsx
git commit -m "feat: add Estimated badge tier and fallback reasoning/suggestions to RecommendationCard"
```

```json:metadata
{"files": ["src/components/ModelHealthBadge.tsx", "src/components/ModelHealthBadge.test.tsx", "src/components/RecommendationCard.tsx", "src/components/RecommendationCard.test.tsx", "src/app/product/[id]/page.tsx"], "verifyCommand": "npx vitest run src/components/RecommendationCard.test.tsx src/components/ModelHealthBadge.test.tsx", "acceptanceCriteria": ["Estimated tier overrides r2/confidenceScore-based tiers", "fallback reasoning text correct per level", "secondary suggestions render only for fallback recs", "non-fallback rendering unchanged"], "modelTier": "standard"}
```

---

### Task 7: UI — auto-chain "Fit Model" into "Get Recommendation" on failure

**Goal:** Clicking "Fit Model" and hitting the "insufficient data" error automatically triggers "Get Recommendation" instead of leaving the merchant at a dead end.

**Files:**
- Modify: `src/app/product/[id]/page.tsx` (`MLActionButtons`'s `fitModel` function)

**Acceptance Criteria:**
- [ ] When `fit-model` returns the specific "Insufficient data" 400 error, `getRecommendation()` is called automatically right after.
- [ ] When `fit-model` fails with any other error (e.g. network failure), no auto-chain happens — the error still surfaces normally.
- [ ] When `fit-model` succeeds, behavior is completely unchanged (no auto-chain — the merchant still clicks "Get Recommendation" themselves, matching the existing two-step flow for a real fit).

**Verify:** `npx tsc --noEmit` clean; manual live-browser verification (no existing test file covers this page's client component — consistent with current project test coverage, which unit-tests `RecommendationCard` but not this wrapper page).

**Steps:**

- [ ] **Step 1: Modify `fitModel()` in `MLActionButtons`**

In `src/app/product/[id]/page.tsx`, change the `fitModel` function:

```tsx
  async function fitModel() {
    setFitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/products/${productId}/fit-model`, {
        method: "POST",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Fit model failed" }));
        const message = body.error ?? "Fit model failed";
        setFitting(false);
        if (/insufficient data/i.test(message)) {
          // Not enough price variation for a real per-SKU model — try the
          // category/catalog/global fallback instead of dead-ending here.
          await getRecommendation();
          return;
        }
        throw new Error(message);
      }
      setFitting(false);
      onComplete();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fit model failed");
      setFitting(false);
    }
  }
```

(`getRecommendation` is declared as a sibling function in the same component and is already stable/hoisted within the component body, so calling it from `fitModel` works without a dependency-order issue — both are plain `async function` declarations inside the same component function, not `useCallback`-memoized closures that would need reordering.)

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Manual live-browser verification**

Start the dev server, log in as the demo account, navigate to a product with sales records but a flat price (or seed one via the sales-history CSV upload endpoint with `autoML=false` first, then click Fit Model on the product page). Confirm:
- Clicking "Fit Model" on a flat-priced SKU shows "Fitting…" then transitions straight to a rendered "Estimated" recommendation, without an intermediate error message.
- Clicking "Fit Model" on a SKU with real price variation still shows the normal real-model result (unchanged).
- Clicking "Fit Model" on a SKU with literally zero sales data and no `estUnits` still shows the original "insufficient data" error (no infinite loop, no fallback recommendation attempted).

- [ ] **Step 4: Commit**

```bash
git add src/app/product/[id]/page.tsx
git commit -m "feat: auto-chain Fit Model into Get Recommendation on insufficient-data failure"
```

```json:metadata
{"files": ["src/app/product/[id]/page.tsx"], "verifyCommand": "npx tsc --noEmit", "acceptanceCriteria": ["insufficient-data failure auto-chains to getRecommendation", "other failures do not auto-chain", "successful fit unaffected"], "modelTier": "mechanical"}
```

---

## Final verification (after all 7 tasks)

```bash
npx vitest run
npx tsc --noEmit
```

Expected: full suite passes (904 + new tests from Tasks 1-6 — roughly 30 new test cases across the plan), zero type errors. Then a live-browser smoke test: seed a merchant with 3+ products in the same category (one with real price variation and a fitted model, two flat-priced), confirm the flat-priced products surface "Estimated" recommendations sourced from their category sibling, confirm the reasoning text and secondary suggestions render, and confirm the button auto-chain works end to end from a single "Fit Model" click.
