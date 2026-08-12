# Profit Tracking Dashboard — Design Spec

**Date:** 2026-08-12
**Status:** Approved (brainstorm), pending plan
**Phase:** 3 of the two-phase pricing-execution + profit-context initiative (Phase 2 = Pricing Campaigns, shipped 2026-08-12)

## Goal

Give the merchant a single place that answers "how's my money actually doing" — real P&L over time, which products earn or bleed, and whether each pricing campaign moved profit. This is the **context layer** that makes Zorin's recommendations and campaigns quantifiable ("raise 8%" → "that added $340/mo"), and the piece meant to justify moving off free trial into paid tiers.

## Problem it closes

Today:
- `GET /api/products/portfolio` returns a **point-in-time snapshot** (current avg margin, forward-looking profit *opportunity* via `simulateProfit`). Not historical actuals.
- `GET /api/products/portfolio/trend` returns monthly **price + units** from `SalesRecord`, but **deliberately no profit/COGS**.
- `SalesRecord` stores `unitsSold` + `priceCents` per product per date, but **COGS is only a single current value on `Product`** — no record of past cost.
- The Campaigns feature (`Campaign`, `CampaignProduct` with `originalPriceCents`/`targetPriceCents`/`appliedAt`/`revertedAt`, `PriceChange`, `CampaignLog`) is ready to be attributed against but nothing reports on it.

## User decisions (made during brainstorm)

1. **All three pieces are equal priority** — portfolio P&L trend, per-product profit, campaign performance. The combination is the pitch; none dropped.
2. **COGS history via a `CogsChange` audit trail.** Pre-tracking figures fall back to current COGS and are labeled "estimated from current costs." This also delivers the Phase-3 "COGS change audit trail" bullet.
3. **Campaign attribution = before/after comparison (headline) + raw actuals (always shown), labeled "vs prior period" — never "caused by."** No elasticity counterfactual, no seasonality adjustment.
4. **Surface = one new top-level "Profit" page** with three stacked sections (summary cards → P&L trend → per-product leaderboard → campaign performance list).
5. **One implementation plan**, internally sequenced foundation-first.

## Architecture

```
SalesRecord (units + price, synced from orders)
        +
CogsChange (cost history, new)          →   src/lib/profit/computeProfit.ts   →   3 thin API routes   →   3 components on /profit
        ↑                                     (pure math, flags estimates)
Product.cogs (current, fallback)
Campaign / CampaignProduct  ─────────────────────────────────────────────────────→  feeds section 3 (applied products + date windows)
```

Money is integer cents everywhere. The math lives in one pure, Prisma-free module (same separation as `marketStats.ts` / `vanWestendorp.ts`) so it is exhaustively unit-testable; routes fetch rows and hand them in.

## Components

### 1. `CogsChange` Prisma model (new)

```prisma
model CogsChange {
  id         String   @id @default(cuid())
  productId  String
  product    Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  merchantId String
  fromCents  Int?     // null = first time COGS was ever set
  toCents    Int
  source     String   // "manual_edit" | "csv_import"
  changedAt  DateTime @default(now())

  @@index([productId, changedAt])
}
```
- `Product` gains a `cogsChanges CogsChange[]` relation.
- Additive-only; same no-migration-risk shape as prior schema changes. A migration file is generated (`prisma migrate dev`) consistent with the campaigns feature's re-adoption of migrations.
- **Wiring:** append a row wherever COGS changes:
  - `PATCH /api/products/[id]/cogs` (inline edit) — `source: "manual_edit"`, `fromCents` = the product's COGS before the write.
  - CSV import path (`importProducts.ts`) — `source: "csv_import"`, only when the imported COGS differs from the existing value (or is first-set). Products whose COGS is unchanged by an import do NOT get a row.
- Backfill: none. History starts at tracking-start; everything before falls back to current COGS.

### 2. `src/lib/profit/computeProfit.ts` (new, pure)

Core primitive:
```
cogsInEffectOn(changes: CogsChangeRow[], currentCogs: number | null, date: Date):
    { cogsCents: number | null, estimated: boolean }
```
- Walks `changes` (sorted) to find the `toCents` whose `changedAt <= date` and is the latest such. If the date predates all changes (or no changes exist), returns `{ cogsCents: currentCogs, estimated: true }`. If `currentCogs` is also null, `cogsCents: null` (product has no cost data at all — excluded from profit sums, surfaced as "no COGS").

Helpers built on the primitive (all pure, take already-fetched rows):
- `monthlyPnL(salesRows, cogsChangesByProduct, currentCogsByProduct, months)` → `[{ month, revenueCents, cogsCents, grossProfitCents, estimated }]` — `estimated: true` on any month that consumed a fallback COGS.
- `productProfit(salesRows, ..., windowStart, windowEnd)` → per-product `{ productId, units, revenueCents, cogsCents, grossProfitCents, marginPct, estimated }`.
- `windowProfitForProducts(salesRows, ..., productIds, start, end)` → `{ grossProfitCents, revenueCents, units, estimated, hasSales }` — the primitive the campaign report calls for both its during- and prior-windows.

### 3. API routes (thin wrappers)

- `GET /api/profit/trend` — monthly P&L over the last 24 months (mirrors `portfolio/trend`, adds revenue/COGS/grossProfit + `estimated` flag per month). Auth: `requireSessionApi`.
- `GET /api/profit/products?window=30|90|365` — per-product profit for the window, sorted; returns all products with cost data so the client can toggle Top earners ↔ Margin bleeders. Auth: `requireSessionApi`.
- `GET /api/profit/campaigns` — for each campaign that has at least one applied product, the before/after report (see methodology). Auth: `requireSessionApi`.
- Also a summary is derivable from `/api/profit/trend` (current month vs prior) — no separate route needed; the page computes summary cards from trend data to avoid a fourth round-trip.

### 4. Campaign performance methodology

For each campaign with ≥1 applied `CampaignProduct`:
- **During window:** `[firstAppliedAt → revertedAt ?? endsAt ?? now]`, length **N days**.
- **Prior window:** the **N days immediately before `firstAppliedAt`**.
- **Sum** `units × (price − cogsInEffectOn(date))` across the campaign's applied products, within each window, from `SalesRecord`.
- **Report:** products changed (count of applied rows), profit during window (raw actual, always shown), delta = `during − prior` labeled **"vs prior N days."**
- **Honesty guards:**
  1. Prior window has zero sales → show during-actual, mark delta **"no prior baseline"** (no fabricated percentage).
  2. Any product used fallback COGS → campaign row inherits the **"estimated"** flag.
  3. Campaign still `executing`/`active` → partial window, **"still running"** note, not a final verdict.
- **Explicitly not doing (YAGNI):** no seasonality adjustment, no elasticity counterfactual, no per-product attribution breakdown inside the report.

### 5. UI — one `/profit` page

- New sidebar nav item **Profit** (Phosphor icon, placed directly after **Campaigns** in the nav order), `AppShell` + `requireSessionPage`, `matchPrefix: ["/profit"]` — same pattern as the Campaigns nav entry.
- **Summary cards:** gross profit (with MoM delta), revenue, avg margin, COGS.
- **Section 1 — P&L trend:** pure-SVG monthly chart (revenue / COGS / gross profit), 24-month window, no new charting dependency (same approach as `PortfolioTrendChart`/`PriceSensitivityChart`). Pre-tracking months lightly marked "est. from current costs."
- **Section 2 — per-product leaderboard:** table (product, units, revenue, COGS, gross profit, margin%, trend arrow), **Top earners ↔ Margin bleeders** toggle, window switch (30/90/365 days). Margin-floor breaches flagged.
- **Section 3 — campaign performance:** list/table (campaign, ran, products changed, profit-in-window, "vs prior period" delta). Row links to the campaign detail page. Honest labels rendered ("no prior baseline", "still running", "estimated").
- Empty states for: no sales data, no COGS set, no campaigns yet.

## Error handling & edge cases

- Product with no COGS at all (null current + no history) → excluded from profit sums; the UI surfaces a "set COGS to see profit" affordance rather than showing $0.
- `promotionFlag` sales: the existing trend excludes them; **P&L trend follows the same convention (exclude promo rows)** for consistency; campaign windows, however, INCLUDE all sales in the window (a campaign IS effectively a promotion — excluding promo rows would erase the very sales we're measuring). This asymmetry is intentional and documented.
- Division-by-zero / empty windows return nulls, never NaN (mirrors existing `computeAvgChange` guards in `CampaignDetail`).
- Tenant isolation: every route scoped by `merchantId` from the session; per-product routes reuse the `assertProductOwned` 404-not-403 pattern where a product id is taken.

## Testing

- **`computeProfit`** carries heavy unit coverage: COGS change mid-window, sale predating any tracked change → `estimated` flag, zero-prior-baseline, empty sales, null-COGS exclusion, month-boundary bucketing.
- **API routes:** thin tests — auth/tenant isolation, response shape, honesty flags surfacing, promo-row handling.
- **Components:** @testing-library, mirroring `PortfolioTrendChart`/`CampaignDetail` — render + empty states + the "estimated" / "no prior baseline" / "still running" labels actually appearing.
- No new test infrastructure or dependencies.

## Out of scope (deferred)

- CSV export of the P&L (can add later with the existing `csvEscape` pattern if merchants ask).
- Historical COGS backfill.
- Elasticity-based campaign counterfactuals and seasonality adjustment.
- Per-product attribution inside campaign reports.

## Build sequence (one plan, ~10 tasks)

1. `CogsChange` schema + wire into COGS edit route and CSV import.
2. `computeProfit` pure module (fixture-tested).
3. `GET /api/profit/trend`.
4. `GET /api/profit/products`.
5. `GET /api/profit/campaigns`.
6. `/profit` page shell + nav + summary cards.
7. P&L trend chart component.
8. Per-product leaderboard component.
9. Campaign performance list component.
10. Integration + final verification.
