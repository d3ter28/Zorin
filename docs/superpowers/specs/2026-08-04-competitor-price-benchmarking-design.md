# Competitor Price Benchmarking — Design

## Problem

`calculateLaunchPlan.ts` already accepts a `competitorPricesCents[]` array and uses it to anchor a recommended launch price against the market (min/median/max, positioned by budget/mid-market/premium). But Launch Planner is a fully standalone calculator page (`/launch-planner`), not connected to any `Product` record — competitor prices are typed into a plain text field each visit and vanish on refresh. A merchant has no way to build a comparables list once and reuse it, and no way to see competitor pricing anywhere outside that one calculator session.

## Goal

Let a merchant maintain a persisted list of competitor prices per product, view it on the product detail page with summary stats (min/median/max), and optionally carry that list into Launch Planner to prefill the competitor-prices input when planning a launch price for that specific product.

## Non-goals

- No automated price scraping or live competitor tracking. Manual entry only — avoids scraping-reliability, ToS, and legal exposure entirely for this version.
- No historical price-change tracking for a given competitor entry (no "price dropped from $49 to $45" timeline). Each row is a single current snapshot; a merchant who wants to update a price edits or replaces the row.
- No live two-way sync between the product page's comparables list and Launch Planner's input — Launch Planner prefills from the saved list on load, but edits made in the calculator during a session are not written back. This keeps Launch Planner's existing "pure calculator, no side effects" model intact.

## Architecture

Two pieces:

1. **Persisted comparables** (authenticated, merchant-only) — a new `CompetitorPrice` model, one row per competitor/product pair, CRUD'd from a card on the product detail page.
2. **Launch Planner prefill** — Launch Planner remains a standalone page and calculator, but gains an optional `?productId=` entry point. When present, it fetches that product's saved competitor prices on load and prefills the existing competitor-prices field (still editable, still not persisted from that screen — same as today).

## Data model

```prisma
model CompetitorPrice {
  id             String   @id @default(cuid())
  productId      String
  product        Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  merchantId     String
  competitorName String
  priceCents     Int
  url            String?
  capturedAt     DateTime @default(now())
}
```

- `merchantId` is denormalized onto the row (same pattern as `SalesRecord`) so ownership checks in API routes don't require a join through `Product` on every request.
- `capturedAt` defaults to creation time and is never auto-updated — it's the "as of" date shown in the UI so a merchant can judge staleness. Editing a row's price updates `priceCents` but should also bump `capturedAt` (treat an edit as a fresh observation).
- No `@@unique` constraint on `(productId, competitorName)` — a merchant may legitimately track the same competitor's price for two different SKUs, or record two observations from the same competitor at different times if they want a light history. Not enforcing uniqueness keeps this simple; revisit only if duplicate clutter turns out to be a real problem.

## API routes

| Route | Auth | Purpose |
|---|---|---|
| `GET /api/products/[id]/competitor-prices` | Merchant | List competitor prices for a product, sorted by `priceCents` ascending |
| `POST /api/products/[id]/competitor-prices` | Merchant | Add one row (`competitorName`, `priceCents`, optional `url`) |
| `PATCH /api/products/[id]/competitor-prices/[cpId]` | Merchant | Edit a row; bumps `capturedAt` to now |
| `DELETE /api/products/[id]/competitor-prices/[cpId]` | Merchant | Remove a row |

Validation: `competitorName` non-empty, `priceCents` a positive integer, `url` (if present) a valid absolute URL via `new URL(...)` — same permissive-URL validation approach already used for the CSV `image_url` column, since competitor product pages are arbitrary external domains that can't be allowlisted ahead of time.

All four routes follow the existing per-product route ownership pattern (verify the product belongs to `session.merchantId` before reading/writing), same as `flag-promotions` and `price-history`.

## Shared stats logic

`calculateLaunchPlan.ts` already contains `calculateMarketStats()` / `percentile()` (private to that file) computing min/median/q1/q3 from a price array. Extract this into `src/lib/pricing/marketStats.ts` as a shared, exported utility:

```typescript
export interface MarketStats {
  minCents: number;
  maxCents: number;
  medianCents: number;
  q1Cents: number;
  q3Cents: number;
}
export function calculateMarketStats(pricesCents: number[]): MarketStats
```

`calculateLaunchPlan.ts` imports this instead of its private copy (pure refactor, no behavior change — covered by its existing tests). The new `CompetitorPricesCard` UI uses the same function to show min/median/max above the comparables table, so the numbers a merchant sees on the product page match exactly what Launch Planner will compute from the same data.

## UI

- **Product detail page**: new `CompetitorPricesCard.tsx`, positioned near the existing pricing-related cards (`RecommendationCard`, `PriceSurveyCard`). Shows summary stats (min/median/max) when ≥1 row exists, a simple table (competitor name, price, optional link-out via `url`, captured date, edit/remove), and an inline add-row form. Empty state: "No competitor prices yet — add one to benchmark this product against the market."
- **Launch Planner** (`LaunchPlanner.tsx`): reads `productId` from `useSearchParams()`. If present, fetches `GET /api/products/[id]/competitor-prices` on mount and prefills the competitor-prices field with the joined price list (still a plain editable text input, unchanged from today — this is a prefill, not a structural change to that field). If the fetch fails or returns zero rows, the field simply starts empty, same as the current no-`productId` behavior.
- **Entry point**: a "Plan launch price →" link on the product detail page (next to or inside `CompetitorPricesCard`) pointing to `/launch-planner?productId=<id>`.

## Testing

- `marketStats.ts`: unit tests for the extracted function (min/median/q1/q3 at various array sizes including 0/1/even/odd lengths) — largely a move of `calculateLaunchPlan.test.ts`'s existing market-stats coverage, not new cases.
- `calculateLaunchPlan.test.ts`: re-run unchanged after the refactor to confirm no behavior regression.
- API routes: `vi.mock`-based route tests covering CRUD + ownership checks (a merchant cannot read/edit/delete another merchant's `CompetitorPrice` rows via a guessed product/row id), validation rejection (bad URL, non-positive price, empty name).
- `LaunchPlanner.tsx`: extend existing `LaunchPlanner.test.tsx` with a case for `?productId=` prefill (mocked fetch returns rows → field populated) and a case for the fetch failing/returning empty (field stays empty, no error state blocking the rest of the calculator).
- No dedicated test for `CompetitorPricesCard.tsx` beyond what the implementation plan decides is warranted, consistent with this codebase's selective component-test coverage.

## Migration

Additive-only new table (`CompetitorPrice`) plus a new relation field on `Product`. Same shape as every prior additive feature in this project (`PriceSurvey`, `ProcessedWebhook`, etc.) — no existing-data collision risk, so Vercel's build-time `prisma db push` should apply cleanly; still worth the manual `prisma db push --schema=prisma/schema.production.prisma` confirmation pass used for every prior production schema change in this project.

## Out of scope (explicitly deferred)

- Automated/scraped competitor price tracking.
- Historical price-change timeline per competitor.
- Live sync between Launch Planner's in-session edits and the saved comparables list.
- Cross-merchant aggregated category benchmarks ("what similar businesses charge") — a much larger data-network-effect feature, not a natural extension of this one.
