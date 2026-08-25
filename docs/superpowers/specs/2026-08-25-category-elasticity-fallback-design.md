# Category-Level Elasticity Fallback — Design Spec

**Date:** 2026-08-25
**Status:** Approved (brainstorm), pending plan

## Goal

Give a merchant a data-backed price recommendation even for SKUs whose own sales history can't support a real elasticity regression — the majority case in practice, not the exception. Close the gap honestly: never pretend a borrowed number is the SKU's own data.

## Problem it closes

A test against a real public retail dataset (131,706 transaction lines, 5,242 SKUs) found that only 665 SKUs had enough price movement to even attempt a regression, and only 121 produced a statistically significant result. The remaining ~4,577 SKUs get **nothing today**: `fitElasticityModel()` (`src/lib/elasticity/fitElasticityModel.ts`) requires ≥3 valid sales records and returns `null` if the price series is too flat to solve (`denom === 0`). Both the interactive `POST /api/products/[id]/fit-model` route and the CSV-import `bulkML.ts` path treat `null` as a dead end — no `ElasticityModel` row, no `Recommendation`, the product just shows "No model."

`src/lib/elasticity/bayesianShrinkage.ts` already shrinks a *noisy-but-existing* raw estimate toward a hardcoded global prior (`-1.2`) when sample size is small — but this only ever applies to the minority of SKUs that produced *some* raw fit. It never fills in for the majority that couldn't be fit at all. This project closes that majority gap.

**Non-goal:** a SKU with zero sales history at all (not even one record, and no merchant-supplied `estUnits`) is Launch Planner's territory, an existing separate feature. This project doesn't touch that case.

## User decisions (made during brainstorm)

1. **Fix the Shopify/WooCommerce category-sync gap as part of this project**, not deferred. `Product.category` is only genuinely useful (merchant-supplied, via CSV) today — Shopify sync hardcodes `category: "Shopify"` and WooCommerce sync hardcodes `category: "WooCommerce"` for every synced product regardless of platform. Without fixing this first, a category-level fallback would silently group by "entire Shopify catalog" for any synced merchant, which is most of them.
2. **Full fallback, not a narrow prior-constant swap.** Build a new code path that produces a real (clearly flagged) recommendation for SKUs that currently get nothing, not just a better prior for the smaller slice that already fits.
3. **Three-level cascade:** category → whole catalog → global constant. Falls back further only when the current level doesn't have enough qualifying peers.
4. **New "Estimated" badge tier**, distinct from Strong/Fair/Weak/None — a fallback-sourced recommendation must be visually and textually distinguishable from a real per-SKU fit, not blended into the existing "Weak" tier.
5. **Surface both secondary suggestions** alongside a fallback recommendation: a pointer to the existing Van Westendorp survey (stated-preference data, doesn't need historical price variation at all) and a suggestion to run a deliberate short price test (generates real variation going forward). Both mechanisms already exist; this only surfaces them at the right moment.
6. **On-the-fly computation, no new cached table.** Catalog sizes in Zorin's ICP (10-150 SKUs) make a live aggregation query trivial — a cached/precomputed `CategoryElasticityModel` table would add real staleness-management complexity for no measurable benefit at this scale.
7. **Auto-chain the UI buttons.** If "Fit Model" fails with "insufficient data," automatically call "Get Recommendation" right after instead of leaving the merchant at a dead-end error — one click either gets a real fit or transparently falls through to a fallback recommendation.

## Architecture

```
Shopify sync (product_type) ──┐
WooCommerce sync (categories[0].name) ──┤→ Product.category (real value, not platform name)
CSV import (category column, unchanged) ┘

fitElasticityModel() returns null
        │
        ▼
Has cogs + a units baseline (≥1 sales record OR estUnits)?
        │ no                              │ yes
        ▼                                 ▼
  400 (unchanged,                  categoryFallback.ts (pure)
  Launch Planner's job)           category → catalog → global cascade
                                          │
                                          ▼
                          generateRecommendation() with borrowed elasticity
                          + this SKU's own intercept (from its own baseline units)
                                          │
                                          ▼
                    Recommendation row only (rulesJson.fallbackLevel set)
                    — NO ElasticityModel row created for this SKU
                                          │
                                          ▼
              RecommendationCard: "Estimated" badge + fallback reasoning
              + Van Westendorp survey suggestion + price-test suggestion
```

## Components

### 1. Shopify/WooCommerce category sync fix

- `src/lib/shopify/client.ts`: add `product_type` to `RawProduct` and `productType` to `ShopifyVariant`; thread it through `fetchAllProducts()`'s flatMap.
- `src/lib/shopify/syncProducts.ts`: `category: v.productType?.trim() || "Uncategorized"` instead of the hardcoded `"Shopify"`.
- `src/lib/woocommerce/client.ts`: add `categories?: Array<{id, name, slug}>` to `RawProduct`; expose `category: categories?.[0]?.name ?? null` on `WooNormalizedProduct`. Variable-product variations inherit the parent's category (WooCommerce categories live on the parent only — same inheritance pattern already used for image fallback).
- `src/lib/woocommerce/syncProducts.ts`: `category: p.category?.trim() || "Uncategorized"` instead of `"WooCommerce"`.
- **No backfill.** Already-synced products keep their old `"Shopify"`/`"WooCommerce"` category value until the next sync run touches them (sync already runs periodically via webhooks + manual "Sync now").

### 2. `src/lib/elasticity/categoryFallback.ts` (new, pure math + one thin orchestrator)

Pure function, no Prisma inside (same separation as `marketStats.ts`/`computeProfit.ts`):
```ts
selectFallbackElasticity(siblings: { elasticity: number; confidenceScore: number }[]): number | null
```
- Filters to `confidenceScore >= 0.4` (the existing "Fair" bar) so weak/unreliable sibling fits can't contaminate the estimate.
- Requires at least 3 qualifying siblings; returns their median elasticity, or `null` if under that bar.

Orchestrator (does the Prisma queries, calls the pure function):
1. Query sibling `Product`+`ElasticityModel` rows: same merchant, same `category`, excluding self. Try `selectFallbackElasticity`.
2. If `null`, query same merchant, any category, excluding self. Try again at catalog scope.
3. If still `null`, use `GLOBAL_PRIOR_ELASTICITY = -1.2` (exported as a shared named constant from `bayesianShrinkage.ts` — same value, no longer a duplicated magic number).

Returns `{ elasticity, level: "category" | "catalog" | "global", sourceCount: number, categoryName?: string }`.

**Units baseline** (for the intercept, since elasticity only defines the curve's slope, not its level): the SKU's own average actual units sold if it has ≥1 real sales record, otherwise its own merchant-supplied `Product.estUnits`. Never borrowed from siblings — only the elasticity (slope) is borrowed, the SKU's own volume level is always its own.

### 3. Wiring — `POST /api/products/[id]/recommend`, `bulkML.ts`

`recommend/route.ts:17` currently throws `400` when `!product.elasticityModel`. Changed order of checks when there's no real model:
1. `product.cogs === null` → still `400 "COGS required to generate recommendation"`, unchanged, checked first (same as today, just reordered ahead of the model check instead of after it).
2. No units baseline at all (zero sales records and no `estUnits`) → still `400 "No elasticity model — fit model first"`, unchanged wording (genuinely no data — Launch Planner's case).
3. Otherwise (cogs present, baseline present, just no real model) → run the Section 2 cascade, build an intercept from the SKU's own baseline, call `generateRecommendation()` with the borrowed elasticity — same function, same math, just different inputs.

Persist only a `Recommendation` row — **no `ElasticityModel` row** for this SKU (accurate: no real per-SKU model exists). `rulesJson` gains `fallbackLevel: "category" | "catalog" | "global"`, `fallbackCategoryName?`, `fallbackSourceCount?`, alongside the existing fields (`suggestedPriceCents`, `expectedProfitLiftPct`, `currentUnitsEstimate`, etc. — unchanged shape otherwise).

`bulkML.ts` gets the identical fallback attempt at the same point it currently does `fitSkipped.push(...); continue`. A SKU that fails real fitting but succeeds via fallback: `fitted` stays unincremented (no real model), `recommended++` (a Recommendation row was created). `BulkMLResult`'s shape is unchanged — no new counter needed.

### 4. UI — badge, reasoning, secondary suggestions

- `MLRecView` (`RecommendationCard.tsx`) gains `fallbackLevel?: "category" | "catalog" | "global" | null`, `fallbackCategoryName?: string | null`.
- `ModelHealthBadge` gets a new tier check **before** the existing r2/confidenceScore branching: if `fallbackLevel` is set, render a new "Estimated" tier (distinct color/label from Strong/Fair/Weak/None) regardless of any numeric confidence value — this is a categorical flag, not a point on the existing confidence scale.
- Reasoning text for a fallback recommendation states the source plainly, e.g. *"Estimated from your Skincare category (4 similar products)"* / *"Estimated from your whole catalog (6 products)"* / *"Estimated from typical retail elasticity (no comparable products yet)"*.
- Below the fallback recommendation, two inline suggestions: *"Or ask customers directly → Create a Van Westendorp survey"* (links to the existing `PriceSurveyCard` flow) and *"Or run a 2-week price test to get a real reading"* (short copy, no new mechanism — just changing the price and waiting is already how real data accumulates).

### 5. UI — button auto-chain

`MLActionButtons` (`product/[id]/page.tsx`): `fitModel()`'s catch block, when the error is specifically "insufficient data," calls `getRecommendation()` immediately after instead of just surfacing the error. One click either yields a real fit (unchanged happy path) or transparently falls through to a fallback recommendation — no dead end. No new messaging needed in the button component itself; the "Estimated" badge and reasoning text already explain what happened once the result renders.

## Testing approach

- `categoryFallback.ts`: pure unit tests for `selectFallbackElasticity` (enough siblings / not enough / confidence filtering / median correctness) and the cascade order (category succeeds → catalog never queried; category fails, catalog succeeds; both fail → global constant).
- `recommend/route.test.ts`: new cases for the fallback path (no elasticityModel + cogs + baseline units → fallback recommendation persisted with correct `fallbackLevel`; no elasticityModel + no baseline at all → still 400).
- `bulkML.test.ts`: fallback attempted and counted correctly when `fitElasticityModel` returns null but a fallback succeeds.
- `RecommendationCard.test.tsx`: new "Estimated" tier renders correctly, reasoning text reflects `fallbackLevel`/`fallbackCategoryName`, secondary suggestions render only for fallback recommendations (not real fits).
- `syncProducts.test.ts` (both Shopify and WooCommerce): category now reflects `product_type`/`categories[0].name` instead of the hardcoded platform string; falls back to `"Uncategorized"` when the source field is empty; WooCommerce variation inherits parent category.
- Live browser verification once implemented: seed a merchant with several products in the same category (some with real price variation, one without), confirm the flat-priced product surfaces an "Estimated" recommendation sourced from its category siblings, and that the reasoning text and secondary suggestions render correctly.
