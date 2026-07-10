# Bulk Sales Upload with Auto-ML — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:subagent-driven-development (recommended) or superpowers-extended-cc:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One CSV upload on the dashboard imports sales history for all products and auto-triggers the ML pipeline (fit + recommend) for every affected product.

**Architecture:** Extend the existing `/api/products/sales-history` route with an `autoML=true` query param that, after import, runs fit+recommend in a loop over affected products. A new `bulkML.ts` module encapsulates the ML loop. The `SalesHistoryUpload` component moves to the Dashboard Products tab and renders enriched results.

**Tech Stack:** Next.js 16.2.9 App Router, TypeScript, Prisma 7 + SQLite, Vitest 4, Tailwind v4

**User decisions (already made):**
- Upload placement: Dashboard Products tab (alongside existing catalog upload)
- Auto-ML: auto-fit + auto-recommend after bulk upload
- Products without COGS: auto-fit only, skip recommendation (tell user why)

---

## File Map

| File | Responsibility |
|------|---------------|
| `src/lib/salesHistory/bulkML.ts` (new) | Fit + recommend loop for a set of product IDs |
| `src/lib/salesHistory/bulkML.test.ts` (new) | Unit tests for bulkML |
| `src/app/api/products/sales-history/route.ts` | Add `autoML` param, call `runBulkML` after import |
| `src/app/api/products/sales-history/route.test.ts` | Add tests for autoML behavior |
| `src/lib/salesHistory/importSalesHistory.ts` | Return `importedProductIds` in result |
| `src/lib/salesHistory/importSalesHistory.test.ts` | Update tests for new return field |
| `src/components/SalesHistoryUpload.tsx` | Add `autoML` prop, enriched result rendering |
| `src/components/SalesHistoryUpload.test.tsx` | Update tests for new ML result display |
| `src/components/Dashboard.tsx` | Add `<SalesHistoryUpload>` to Products tab |

---

### Task 1: Create `runBulkML` service function

**Goal:** A `runBulkML(prisma, productIds)` function that fits elasticity models and generates recommendations for a list of product IDs, returning counts of what succeeded and what was skipped.

**Files:**
- Create: `src/lib/salesHistory/bulkML.ts`
- Create: `src/lib/salesHistory/bulkML.test.ts`

**Acceptance Criteria:**
- [ ] `runBulkML` fits a model for each product that has >= 3 non-promotional sales records
- [ ] Products with < 3 records are collected in `fitSkipped[]` (by title)
- [ ] Products that got a model AND have `cogs` set get a recommendation generated
- [ ] Products that got a model but lack `cogs` are collected in `recommendSkipped[]` (by title)
- [ ] Models are upserted to `ElasticityModel` table (same as fit-model route)
- [ ] Recommendations are upserted to `Recommendation` table (same as recommend route)
- [ ] Returns `{ fitted, recommended, fitSkipped, recommendSkipped }`

**Verify:** `npx vitest run src/lib/salesHistory/bulkML.test.ts` -> all passed

**Steps:**

- [ ] **Step 1: Create `src/lib/salesHistory/bulkML.ts`**

```ts
import type { PrismaClient } from "@prisma/client";
import { fitElasticityModel } from "@/lib/elasticity/fitElasticityModel";
import { bayesianShrinkage } from "@/lib/elasticity/bayesianShrinkage";
import { computeConfidenceScore } from "@/lib/elasticity/confidenceScore";
import { generateRecommendation } from "@/lib/elasticity/generateRecommendation";

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
    select: { id: true, title: true, currentPrice: true, cogs: true },
  });

  for (const product of products) {
    const records = await prisma.salesRecord.findMany({
      where: { productId: product.id, promotionFlag: false },
      select: { priceCents: true, unitsSold: true, date: true },
    });

    const raw = fitElasticityModel(records);
    if (!raw) {
      result.fitSkipped.push(product.title);
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

    if (product.cogs === null) {
      result.recommendSkipped.push(product.title);
      continue;
    }

    const rec = generateRecommendation(
      { ...modelData, minPriceCents: raw.minPriceCents, maxPriceCents: raw.maxPriceCents },
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

- [ ] **Step 2: Write tests in `src/lib/salesHistory/bulkML.test.ts`**

Test cases using `vi.hoisted` + `vi.mock` pattern:
1. Happy path: product with 5 records + COGS -> fitted=1, recommended=1
2. Product with 2 records -> fitSkipped contains title
3. Product with 5 records but no COGS -> fitted=1, recommendSkipped contains title
4. Empty productIds array -> returns all zeros, no DB calls

Mock: `prisma.product.findMany`, `prisma.salesRecord.findMany`, `prisma.elasticityModel.upsert`, `prisma.recommendation.upsert`, `fitElasticityModel`.

- [ ] **Step 3: Run tests, verify pass**

```bash
cd /c/Users/pohde/projects/priceiq && npx vitest run src/lib/salesHistory/bulkML.test.ts
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/salesHistory/bulkML.ts src/lib/salesHistory/bulkML.test.ts
git commit -m "feat: add runBulkML service for batch fit + recommend"
```

---

### Task 2: Wire `autoML` into the sales-history API route

**Goal:** `POST /api/products/sales-history?autoML=true` runs the ML pipeline after import and returns enriched response with `fitted`, `recommended`, `fitSkipped`, `recommendSkipped` fields.

**Files:**
- Modify: `src/app/api/products/sales-history/route.ts`
- Modify: `src/app/api/products/sales-history/route.test.ts`
- Modify: `src/lib/salesHistory/importSalesHistory.ts`
- Modify: `src/lib/salesHistory/importSalesHistory.test.ts`

**Acceptance Criteria:**
- [ ] When `autoML=true` query param is set, calls `runBulkML` with the imported product IDs
- [ ] Response includes ML fields: `{ fitted, recommended, fitSkipped, recommendSkipped }`
- [ ] When `autoML` is absent/false, response shape is unchanged (no ML fields)
- [ ] `importSalesHistory` returns `importedProductIds: string[]` in its result
- [ ] Existing tests still pass (backward compatible)

**Verify:** `npx vitest run src/app/api/products/sales-history/route.test.ts src/lib/salesHistory/importSalesHistory.test.ts` -> all passed

**Steps:**

- [ ] **Step 1: Extend `importSalesHistory` return type**

In `src/lib/salesHistory/importSalesHistory.ts`, add `importedProductIds` to `ImportResult`:

```ts
export interface ImportResult {
  imported: number;
  unknownSkus: string[];
  importedProductIds: string[];
}
```

In the function body, collect product IDs into a Set as rows are processed:

```ts
const importedIds = new Set<string>();
// ... inside the loop, after successful upsert:
importedIds.add(productId);
// ... at return:
return { imported, unknownSkus, importedProductIds: [...importedIds] };
```

- [ ] **Step 2: Update existing `importSalesHistory` tests**

The existing tests assert on `{ imported, unknownSkus }`. Add `importedProductIds` to assertions. Existing tests should not break since the new field is additive.

- [ ] **Step 3: Wire `runBulkML` in the route**

In `src/app/api/products/sales-history/route.ts`:

```ts
import { runBulkML } from "@/lib/salesHistory/bulkML";

// After const { imported, unknownSkus, importedProductIds } = await importSalesHistory(...)
const url = new URL(req.url);
const autoML = url.searchParams.get("autoML") === "true";

let mlResult = null;
if (autoML && importedProductIds.length > 0) {
  mlResult = await runBulkML(prisma, importedProductIds);
}

return NextResponse.json({
  imported,
  skipped: unknownSkus.length,
  errors,
  unknownSkus,
  ...(mlResult && {
    fitted: mlResult.fitted,
    recommended: mlResult.recommended,
    fitSkipped: mlResult.fitSkipped,
    recommendSkipped: mlResult.recommendSkipped,
  }),
});
```

- [ ] **Step 4: Add route tests for autoML**

Test cases:
1. `?autoML=true` with valid CSV -> response has `fitted`, `recommended` fields
2. No param -> response does NOT have ML fields
3. `?autoML=true` but 0 imported rows -> response does NOT have ML fields

- [ ] **Step 5: Run tests**

```bash
cd /c/Users/pohde/projects/priceiq && npx vitest run src/app/api/products/sales-history/route.test.ts src/lib/salesHistory/importSalesHistory.test.ts
```

- [ ] **Step 6: Commit**

```bash
git add src/app/api/products/sales-history/route.ts src/app/api/products/sales-history/route.test.ts src/lib/salesHistory/importSalesHistory.ts src/lib/salesHistory/importSalesHistory.test.ts
git commit -m "feat: add autoML param to sales-history route for batch fit+recommend"
```

---

### Task 3: Update `SalesHistoryUpload` component and add to Dashboard

**Goal:** The `SalesHistoryUpload` component passes `autoML=true` to the API, renders enriched ML results (fitted/recommended/skipped counts), and is placed on the Dashboard Products tab.

**Files:**
- Modify: `src/components/SalesHistoryUpload.tsx`
- Modify: `src/components/SalesHistoryUpload.test.tsx`
- Modify: `src/components/Dashboard.tsx`

**Acceptance Criteria:**
- [ ] `SalesHistoryUpload` accepts `autoML?: boolean` prop (defaults to `true`)
- [ ] When `autoML` is true, POSTs to `/api/products/sales-history?autoML=true`
- [ ] Success state shows: "Imported N records" + "Fitted N models, generated N recommendations"
- [ ] When `fitSkipped` is non-empty, shows "N products need more data" with expandable list
- [ ] When `recommendSkipped` is non-empty, shows "N products need COGS" with expandable list
- [ ] Dashboard Products tab renders `<SalesHistoryUpload autoML onSuccess={refresh} />` between ProductUpload and ProductsTable
- [ ] No TypeScript errors: `npx tsc --noEmit`

**Verify:** `npx vitest run src/components/SalesHistoryUpload.test.tsx` -> all passed; `npx tsc --noEmit` -> no errors

**Steps:**

- [ ] **Step 1: Update `SalesHistoryUpload.tsx`**

Add `autoML` prop. Expand `UploadResult` interface. Update fetch URL. Add ML summary to success state:

```tsx
interface UploadResult {
  imported: number;
  skipped: number;
  errors: { line: number; reason: string }[];
  unknownSkus: string[];
  fitted?: number;
  recommended?: number;
  fitSkipped?: string[];
  recommendSkipped?: string[];
}

export function SalesHistoryUpload({ onSuccess, autoML = true }: { onSuccess?: () => void; autoML?: boolean }) {
  // ... in handleFile:
  const url = autoML ? "/api/products/sales-history?autoML=true" : "/api/products/sales-history";
  const res = await fetch(url, { method: "POST", body: form });
```

In success render, after existing import line:

```tsx
{result.fitted != null && (
  <p className="text-positive font-medium">
    Fitted {result.fitted} model{result.fitted !== 1 ? "s" : ""}, generated {result.recommended} recommendation{result.recommended !== 1 ? "s" : ""}
  </p>
)}
{result.fitSkipped && result.fitSkipped.length > 0 && (
  <details className="mt-1">
    <summary className="cursor-pointer text-warning">
      {result.fitSkipped.length} product{result.fitSkipped.length !== 1 ? "s" : ""} need more data
    </summary>
    <ul className="ml-4 mt-1 text-muted">
      {result.fitSkipped.map((t) => <li key={t}>{t}</li>)}
    </ul>
  </details>
)}
{result.recommendSkipped && result.recommendSkipped.length > 0 && (
  <details className="mt-1">
    <summary className="cursor-pointer text-warning">
      {result.recommendSkipped.length} product{result.recommendSkipped.length !== 1 ? "s" : ""} need COGS for recommendations
    </summary>
    <ul className="ml-4 mt-1 text-muted">
      {result.recommendSkipped.map((t) => <li key={t}>{t}</li>)}
    </ul>
  </details>
)}
```

- [ ] **Step 2: Update `Dashboard.tsx`**

```tsx
import { SalesHistoryUpload } from "./SalesHistoryUpload";

// In the products tab:
{tab === "products" && (
  <div className="space-y-6">
    <ProductUpload onImported={refresh} />
    <SalesHistoryUpload autoML onSuccess={refresh} />
    <ProductsTable refreshToken={refreshToken} />
  </div>
)}
```

- [ ] **Step 3: Update `SalesHistoryUpload.test.tsx`**

Add test: when response includes ML fields (`fitted`, `recommended`, `fitSkipped`, `recommendSkipped`), renders:
- "Fitted 3 models, generated 2 recommendations" text
- "1 product needs COGS for recommendations" summary element

- [ ] **Step 4: Verify**

```bash
cd /c/Users/pohde/projects/priceiq && npx vitest run src/components/SalesHistoryUpload.test.tsx && npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/components/SalesHistoryUpload.tsx src/components/SalesHistoryUpload.test.tsx src/components/Dashboard.tsx
git commit -m "feat: add bulk sales upload with auto-ML to dashboard"
```
