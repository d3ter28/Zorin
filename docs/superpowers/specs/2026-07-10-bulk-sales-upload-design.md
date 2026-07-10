# Bulk Sales Upload with Auto-ML — Design Spec

**Date:** 2026-07-10
**Status:** Approved

## Summary

Eliminate per-product friction for non-Shopify merchants: one CSV upload on the dashboard imports sales history for all products at once (matched by SKU), then automatically fits elasticity models and generates pricing recommendations for every product that received data.

## Problem

Currently, merchants without Shopify must:
1. Navigate into each product page individually
2. Upload a sales history CSV (one product at a time)
3. Click "Fit Model"
4. Click "Get Recommendation"

For a catalog of 100 products, that's 400 manual actions. The backend already supports multi-product CSV parsing (`importSalesHistory` matches rows to products by SKU), but the UI only exposes it on per-product pages and doesn't trigger the ML pipeline afterward.

## Design Decisions

| Decision | Choice |
|---|---|
| Upload placement | Dashboard Products tab (alongside existing catalog upload) |
| Auto-ML trigger | After import, auto-fit + auto-recommend for all affected products |
| Products without COGS | Auto-fit only, skip recommendation (tell user why) |
| Products with < 3 records | Skip fit (insufficient data), report which ones |
| Backward compatibility | `autoML` query param — omitting it preserves current behavior |

## Architecture

### Modified: `POST /api/products/sales-history`

Accepts optional `?autoML=true` query parameter. When set, after the existing import step:

1. Collect the set of product IDs that received new sales records
2. For each product: attempt `fitElasticityModel` (requires ≥ 3 non-promotional records)
3. For each product that got a model AND has `cogs` set: run `generateRecommendation`
4. Return enriched response with ML results

When `autoML` is absent or false: current behavior unchanged.

### New: `src/lib/salesHistory/bulkML.ts`

Extracts the fit + recommend loop as a testable pure function:

```ts
export interface BulkMLResult {
  fitted: number;
  recommended: number;
  fitSkipped: string[];       // product titles with < 3 records
  recommendSkipped: string[]; // product titles without COGS
}

export async function runBulkML(
  prisma: PrismaSurface,
  productIds: string[],
): Promise<BulkMLResult>
```

Internally calls the same `fitElasticityModel` + `bayesianShrinkage` + `generateRecommendation` logic as the per-product API routes, just in a loop.

### Modified: `src/components/SalesHistoryUpload.tsx`

- Add `autoML?: boolean` prop (default `true`)
- When `autoML` is true, POST to `/api/products/sales-history?autoML=true`
- Render enriched result state:
  - "Imported {n} records across {m} products"
  - "Fitted {n} models, generated {n} recommendations"
  - Collapsible lists for skipped products (fit/recommend)

### Modified: `src/components/Dashboard.tsx`

- Add `<SalesHistoryUpload autoML onSuccess={refresh} />` to the Products tab, below `<ProductUpload>`

## Response Shape

```ts
// Existing fields (always returned)
{
  imported: number;
  skipped: number;
  unknownSkus: string[];
  errors: { line: number; raw: string; reason: string }[];
}

// ML fields (only when autoML=true)
{
  fitted: number;
  recommended: number;
  fitSkipped: string[];
  recommendSkipped: string[];
}
```

## UI States

**Idle:** "Upload Sales History" card with file picker and "Download sample CSV" link.

**Uploading:** Button shows "Processing…" (disabled). This may take a few seconds for large files since ML runs server-side.

**Success:** Shows import summary + ML summary. Example:
- "Imported 847 records across 42 products"
- "Fitted 38 models, generated 35 recommendations"
- "4 products need more data" (expandable: product titles)
- "3 products need COGS for recommendations" (expandable: product titles)

**Error:** Fatal parse errors or network failure shown as today.

## Edge Cases

- **Re-upload same file:** `salesRecord.upsert` on `(productId, date)` — idempotent, no duplicates. Models re-fit with same data produce same result.
- **Product already has a model:** Re-fit with all records (old + new). Model improves with more data.
- **Product already has a recommendation:** Regenerated from updated model. Old recommendation overwritten.
- **Empty CSV or all rows invalid:** Returns 400 with parse errors, no ML triggered.
- **No products matched any SKU:** `imported: 0`, `unknownSkus` populated, no ML triggered.
- **Large file (1000+ products):** Sequential processing per product. Could be slow (~5-10s) but acceptable for a one-time upload. No timeout risk with standard Vercel limits.

## CSV Format

```csv
sku,date,units_sold,price
MUG-008,2024-01-05,12,29.99
MUG-008,2024-01-12,8,29.99
BTL-002,2024-01-07,5,22.00
BTL-002,2024-01-21,9,22.00
LMP-001,2024-01-15,2,35.00
```

- `sku` — matches `product.sku` in the merchant's catalog
- `date` — YYYY-MM-DD format
- `units_sold` — positive integer
- `price` — dollar amount (converted to cents internally)
- Row order does not matter
- Products can be interleaved

## Files Changed

| File | Change |
|---|---|
| `src/app/api/products/sales-history/route.ts` | Add `autoML` query param, call `runBulkML` after import |
| `src/lib/salesHistory/bulkML.ts` | New — fit + recommend loop for a set of product IDs |
| `src/components/SalesHistoryUpload.tsx` | Add `autoML` prop, render enriched success state |
| `src/components/Dashboard.tsx` | Add `<SalesHistoryUpload>` to Products tab |

## Testing

- `bulkML.ts` — unit tests: happy path (fit + recommend), no COGS (fit only), insufficient records (skip fit), empty product list
- `sales-history/route.ts` — integration test: `autoML=true` returns ML fields, `autoML` omitted returns current shape
- `SalesHistoryUpload.tsx` — component test: renders ML summary when response includes ML fields
