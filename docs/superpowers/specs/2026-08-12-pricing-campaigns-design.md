# Pricing Campaigns — Design Spec

**Date:** 2026-08-12
**Status:** Approved
**Phase:** Phase 2 of the Measure → Analyze → Execute integration (Phase 3: Profit Tracking Dashboard is a separate spec)

## Overview

Close the gap between "Zorin recommends RAISE 8%" and "price actually changes in the store." Currently all price changes are manual user clicks via the single-product Apply button or the bulk-apply flow. This feature adds a campaigns engine that lets merchants define pricing rules, select products, schedule execution, and have prices automatically applied to and reverted from their Shopify/WooCommerce store.

### Two Campaign Flavors, One Engine

1. **Scheduled Sale** — merchant defines pricing rules (e.g. "20% off all accessories"), picks products, sets start/end dates. Prices auto-apply at start, auto-revert at end.
2. **ML Recommendation Batch** — merchant selects products with existing Zorin RAISE/LOWER recommendations, applies them all at once or on a schedule. Prices persist (no revert by default).

Both flavors share the same data model, execution engine, and UI — they differ only in how the target price is calculated and the default revert behavior.

### CSV-Only Merchants

Merchants without a connected Shopify/WooCommerce store get campaigns as a tracking and planning tool. Campaign execution updates prices in Zorin's database and creates PriceChange records, but does not push to any external store. A CSV export of the new prices is available for manual upload. Revert works the same way for CSV merchants — it restores `Product.currentPrice` in Zorin's DB and generates a revert CSV for the merchant to apply manually.

---

## Data Model

Three new tables, one modified table. Money stored as integer cents everywhere, consistent with the rest of the codebase.

### `Campaign`

| Field | Type | Notes |
|---|---|---|
| `id` | `String @id @default(cuid())` | |
| `merchantId` | `String` (FK → Merchant) | Tenant isolation |
| `name` | `String` | Merchant-chosen label, e.g. "Summer Sale" or "August ML Repricing" |
| `type` | `String` | `"sale"` or `"ml_recommendation"` |
| `status` | `String` | `"draft"` / `"scheduled"` / `"executing"` / `"active"` / `"reverting"` / `"completed"` |
| `rules` | `String` | JSON string — the pricing rule config (see Rules Engine section) |
| `revertOnEnd` | `Boolean` | Default `true` for sale, `false` for ml_recommendation |
| `startsAt` | `DateTime?` | Nullable in draft state; required to schedule |
| `endsAt` | `DateTime?` | Nullable — open-ended campaigns have no end |
| `executionCursor` | `Int @default(0)` | Tracks chunked progress during execution/revert |
| `executedAt` | `DateTime?` | When execution fully completed |
| `revertedAt` | `DateTime?` | When revert fully completed |
| `createdAt` | `DateTime @default(now())` | |

Relations: `merchant Merchant @relation(fields: [merchantId], references: [id])`, `products CampaignProduct[]`, `logs CampaignLog[]`.

### `CampaignProduct`

| Field | Type | Notes |
|---|---|---|
| `id` | `String @id @default(cuid())` | |
| `campaignId` | `String` (FK → Campaign, cascade delete) | |
| `productId` | `String` (FK → Product) | |
| `originalPriceCents` | `Int` | Snapshot of `Product.currentPrice` at campaign creation |
| `targetPriceCents` | `Int` | Computed from rules at schedule time |
| `appliedAt` | `DateTime?` | When this product's price was actually pushed |
| `revertedAt` | `DateTime?` | When this product's price was actually reverted |
| `error` | `String?` | If the push/revert failed for this product |

Relations: `campaign Campaign @relation(fields: [campaignId], references: [id], onDelete: Cascade)`, `product Product @relation(fields: [productId], references: [id])`.

Unique constraint: `@@unique([campaignId, productId])` — a product can only appear once per campaign.

### `CampaignLog`

| Field | Type | Notes |
|---|---|---|
| `id` | `String @id @default(cuid())` | |
| `campaignId` | `String` (FK → Campaign) | |
| `event` | `String` | One of: `"created"`, `"scheduled"`, `"execution_started"`, `"product_applied"`, `"product_failed"`, `"execution_completed"`, `"revert_started"`, `"product_reverted"`, `"revert_completed"`, `"stopped"` |
| `detail` | `String?` | JSON string — context (product ID, error message, etc.) |
| `createdAt` | `DateTime @default(now())` | |

Relations: `campaign Campaign @relation(fields: [campaignId], references: [id], onDelete: Cascade)`.

### `Product` — modified

Add one new relation:
```
campaignProducts CampaignProduct[]
```

### Schema changes

Both `prisma/schema.prisma` (SQLite dev) and `prisma/schema.production.prisma` (PostgreSQL prod) must be updated identically in structure. Applied via `prisma db push` (no migration files, consistent with every prior schema change in this project). All new fields are either nullable or have defaults — purely additive, zero migration risk.

---

## Campaign Status Machine

### Status Flow

```
draft → scheduled → executing → active → reverting → completed
                                  ↓
                              completed  (if revertOnEnd = false and endsAt reached, or manually stopped with revertOnEnd = false)
```

### Status Definitions

- **`draft`** — campaign created but not confirmed. Merchant is editing products/rules. No `CampaignProduct` rows exist yet (products are tracked client-side until schedule).
- **`scheduled`** — merchant confirmed via the schedule endpoint. `startsAt` is set. `CampaignProduct` rows exist with computed `targetPriceCents`. Waiting for cron pickup.
- **`executing`** — cron is actively pushing prices. `executionCursor` tracks how many `CampaignProduct` rows have been processed.
- **`active`** — all products repriced successfully. Campaign is "live." Waiting for `endsAt` or manual stop.
- **`reverting`** — `endsAt` reached (or manual stop with `revertOnEnd = true`). Cron is restoring original prices. `executionCursor` resets to 0 for the revert pass.
- **`completed`** — terminal state. Either prices were reverted, or it was a no-revert campaign that ended.

### Manual Actions

- **Stop early** — available at any status after `draft`. If `revertOnEnd = true`, transitions to `reverting`. If `revertOnEnd = false`, transitions directly to `completed`.
- **Execute now** — available on `scheduled` campaigns. Sets `startsAt` to now, transitions to `executing`, and runs the first chunk immediately in the same request (not waiting for the next cron tick).
- **Cancel** — available on `scheduled` campaigns only. Deletes all `CampaignProduct` rows and transitions back to `draft` so the merchant can edit and re-schedule.
- **Delete** — only available on `draft` campaigns. Deletes the Campaign row (no CampaignProduct rows exist in draft).
- **Duplicate** — available on `completed` campaigns. Creates a new `draft` campaign with the same name (appended " (copy)"), same rules, and the same product IDs (but no `CampaignProduct` rows — those are created at schedule time with fresh price snapshots).

---

## Cron Execution Engine

### Architecture: Vercel Cron + Chunked Execution

A single Vercel Cron endpoint (`/api/cron/campaigns`) runs every 5 minutes. The handler queries for campaigns needing action and processes up to 30 products per campaign per invocation.

### Vercel Cron Configuration

Add to `vercel.json` (new file):
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

### Cron Handler Logic

1. Verify `CRON_SECRET` header (Vercel sends this automatically; in dev, skip verification if `NODE_ENV !== "production"`).
2. Query for campaigns needing action (scoped by merchant — process all merchants' campaigns in one pass):
   - `status = "scheduled"` AND `startsAt <= now` → transition to `"executing"`, reset `executionCursor` to 0
   - `status = "executing"` → continue chunked execution
   - `status = "active"` AND `endsAt IS NOT NULL` AND `endsAt <= now` → if `revertOnEnd = true`, transition to `"reverting"` and reset `executionCursor` to 0; if `revertOnEnd = false`, transition to `"completed"`
   - `status = "reverting"` → continue chunked revert
3. For each campaign needing execution:
   - Load `CampaignProduct` rows ordered by `id`, skip first `executionCursor` rows
   - Take next 30 rows
   - For each row:
     - **Execution path:** Call `pushPriceToShopify()` or `pushPriceToWooCommerce()` if the product has a connected variant ID. For CSV-only products (no `shopifyVariantId` and no `woocommerceVariantId`), skip the push. In all cases: update `Product.currentPrice` to `targetPriceCents`, create a `PriceChange` record, set `CampaignProduct.appliedAt`, write a `CampaignLog` entry.
     - **Revert path:** Same as execution but using `originalPriceCents` instead of `targetPriceCents`. Set `CampaignProduct.revertedAt`.
     - **On push failure:** Record error on `CampaignProduct.error`, write a `"product_failed"` log entry, continue to next product (don't fail the whole campaign).
   - Increment `executionCursor` by the number of rows processed
   - If all rows are processed: transition status (`executing` → `active` with `executedAt = now`, `reverting` → `completed` with `revertedAt = now`)

### Chunk Size Rationale

30 products per invocation stays well within Vercel's 60-second function timeout. Each price push involves one API call (~200–500ms with rate-limit retry). 30 × 500ms = 15 seconds worst case, leaving headroom for DB operations and logging. A merchant with 150 products (the ICP ceiling) fully executes across 5 cron ticks (~25 minutes worst case).

### Portability

The cron handler is a standard Next.js API route. The only Vercel-specific element is the `vercel.json` cron config and the `CRON_SECRET` header check. To move to another host: replace `vercel.json` with the host's equivalent cron config, and swap the auth check. Zero changes to business logic.

---

## Pricing Rules Engine

### `calculateTargetPrice(product, rules)`

Pure function. Input: a product record (with `currentPrice`, `cogs`, existing `Recommendation` if any, `CompetitorPrice[]`). Output: `{ targetPriceCents: number, skipped: boolean, skipReason?: string }`.

Located in: `src/lib/campaigns/rules.ts`

### Rule Modes

Determined by `rules.mode`:

1. **`"percentage"`** — `currentPrice * (1 + rules.percentage / 100)`. A `percentage` of `10` means raise 10%, `-20` means lower 20%.

2. **`"ml_recommendation"`** — pull `suggestedPriceCents` from the product's existing `Recommendation.rulesJson`. If no recommendation exists, product is skipped with `skipReason: "no_recommendation"`.

3. **`"competitor_match"`** — look up the product's `CompetitorPrice` records, compute market stats via existing `calculateMarketStats()` from `src/lib/pricing/marketStats.ts`. Apply: `marketStats[rules.competitorStrategy] * (1 + rules.competitorOffset / 100)`. If no competitor prices exist, product is skipped with `skipReason: "no_competitor_data"`.

4. **`"fixed_price"`** — use `rules.fixedPriceCents` directly.

### Rules JSON Schema

Stored in `Campaign.rules` as a JSON string:

```typescript
interface CampaignRules {
  mode: "percentage" | "ml_recommendation" | "competitor_match" | "fixed_price";
  percentage?: number;           // for percentage mode
  competitorStrategy?: "min" | "median";  // for competitor_match
  competitorOffset?: number;     // for competitor_match, e.g. -5 = undercut by 5%
  fixedPriceCents?: number;      // for fixed_price mode
  rounding: "none" | "99" | "95";
  marginFloorPct: number;        // default 10, never go below this margin
}
```

### Post-Mode Adjustments

Applied to all modes in order after the base target price is computed:

1. **Margin floor** — if `product.cogs` is set and target price would put margin below `rules.marginFloorPct`, clamp upward to `cogs / (1 - marginFloorPct / 100)`. If `cogs` is null, skip the floor check.

2. **Rounding** — if `"99"`: round target to nearest whole dollar, subtract 1 cent. If `"95"`: round to nearest whole dollar, subtract 5 cents. `"none"`: leave as-is. All rounding operates on cents.

3. **No-change detection** — if `targetPriceCents === product.currentPrice` after all adjustments, product is skipped with `skipReason: "no_change"`.

### Preview Endpoint

`POST /api/campaigns/preview` accepts `{ productIds: string[], rules: CampaignRules }` and returns:

```typescript
{
  totalProducts: number;
  changing: number;
  skipped: number;
  skipReasons: { [reason: string]: number };  // e.g. { "no_recommendation": 3, "no_change": 2 }
  clampedByMarginFloor: number;
  avgChangePct: number;
  products: Array<{
    productId: string;
    title: string;
    sku: string;
    currentPriceCents: number;
    targetPriceCents: number;
    changePct: number;
    marginPct: number | null;
    skipped: boolean;
    skipReason?: string;
    clampedByMarginFloor: boolean;
  }>;
}
```

This endpoint does not create any records — it's a pure dry-run computation.

---

## Conflict Detection

### When Conflicts Are Checked

At schedule time (`POST /api/campaigns/[id]/schedule`), before creating `CampaignProduct` rows.

### What Counts as a Conflict

A product is conflicting if it appears in another campaign that is currently `"scheduled"`, `"executing"`, or `"active"` for the same merchant.

### How Conflicts Are Surfaced

The schedule endpoint returns conflicts in its response:

```typescript
{
  conflicts: Array<{
    productId: string;
    productTitle: string;
    existingCampaignId: string;
    existingCampaignName: string;
  }>;
}
```

If conflicts exist, the endpoint returns HTTP 409 with the conflict list. The UI shows a warning with the conflicting products and the existing campaign name, and offers two choices:

1. **Remove conflicting products from this campaign** — merchant deselects those products
2. **Override** — re-submit the schedule request with `{ overrideConflicts: true }`. The endpoint removes the conflicting products from the *older* campaign (deletes their `CampaignProduct` rows) and proceeds.

### No Priority System

There is no campaign priority ranking. Conflicts are resolved at creation time, not at execution time. Once a campaign is scheduled, its product list is locked and non-overlapping.

---

## API Routes

All routes follow existing patterns: `requireSessionApi`/`requireOwnerApi` for auth, `withErrorHandling` for error wrapping, `parseJsonBody` for request parsing, `toErrorResponse` for error responses.

| Method | Route | Auth | Purpose |
|---|---|---|---|
| `GET` | `/api/campaigns` | `requireSessionApi` | List merchant's campaigns. Query params: `status` (optional filter). Returns array of campaigns with product counts and summary stats. |
| `POST` | `/api/campaigns` | `requireOwnerApi` | Create a new campaign in `"draft"` status. Body: `{ name, type, rules, revertOnEnd?, startsAt?, endsAt? }`. |
| `GET` | `/api/campaigns/[id]` | `requireSessionApi` | Get full campaign detail including `CampaignProduct[]` with joined product titles/SKUs and `CampaignLog[]`. |
| `PATCH` | `/api/campaigns/[id]` | `requireOwnerApi` | Update a draft campaign. Body: any subset of `{ name, rules, revertOnEnd, startsAt, endsAt }`. Returns 400 if campaign is not in `"draft"` status. |
| `DELETE` | `/api/campaigns/[id]` | `requireOwnerApi` | Delete a campaign. Returns 400 if campaign is not in `"draft"` status. |
| `POST` | `/api/campaigns/[id]/schedule` | `requireOwnerApi` | Transition draft → scheduled. Body: `{ productIds: string[], overrideConflicts?: boolean }`. Validates rules, computes `targetPriceCents` for all products via `calculateTargetPrice()`, checks conflicts, creates `CampaignProduct` rows. Returns 409 with conflict list if conflicts exist and `overrideConflicts` is not `true`. Returns 400 if `startsAt` is not set. |
| `POST` | `/api/campaigns/[id]/execute` | `requireOwnerApi` | Manual "run now." Sets `startsAt` to now, transitions to `"executing"`, processes the first chunk (up to 30 products) in the same request. Returns the campaign with updated status. |
| `POST` | `/api/campaigns/[id]/stop` | `requireOwnerApi` | Stop a campaign early. If `revertOnEnd = true`, transitions to `"reverting"`. If `revertOnEnd = false`, transitions to `"completed"`. Returns 400 if campaign is in `"draft"` or already `"completed"`. |
| `POST` | `/api/campaigns/preview` | `requireSessionApi` | Dry-run price computation. Body: `{ productIds: string[], rules: CampaignRules }`. Returns preview response (see Rules Engine section). Does not create any records. |
| `GET` | `/api/campaigns/[id]/export` | `requireSessionApi` | Download CSV of campaign products with columns: SKU, Title, Original Price, Target Price, Change %, Applied At, Reverted At, Error. |
| `POST` | `/api/campaigns/[id]/cancel` | `requireOwnerApi` | Cancel a scheduled campaign. Deletes all `CampaignProduct` rows, transitions back to `"draft"`. Returns 400 if not in `"scheduled"` status. |
| `POST` | `/api/campaigns/[id]/duplicate` | `requireOwnerApi` | Duplicate a completed campaign. Creates a new `"draft"` campaign with the same name (+" (copy)"), rules, and a `productIds` list stored in `rules` JSON for re-selection at schedule time. Returns 400 if not in `"completed"` status. |
| `GET` | `/api/cron/campaigns` | `CRON_SECRET` header | Cron handler. Not user-facing. |

### Auth Notes

- **Owner-only for all mutations.** Consistent with billing, integrations, and team management. Members can view campaigns and use preview but cannot create, edit, schedule, execute, or stop.
- **Tenant isolation.** Every query scopes by `merchantId` from the session. The `assertCampaignOwned` helper (analogous to `assertProductOwned`) validates that the campaign belongs to the session's merchant before any operation.

---

## UI

### Sidebar

New top-level sidebar item **"Campaigns"** between Products and Launch Planner. Uses the existing sidebar link pattern. Icon: a calendar or tag icon (consistent with Tailwind's Heroicons set already used in the app).

### Campaigns List Page (`/campaigns`)

- **Header:** "Campaigns" title + "+ New Campaign" button (Owner-only)
- **Status filter tabs:** All / Active / Scheduled / Completed / Draft — filter the list, counts in each tab
- **Campaign rows:** Card-style rows (not a table), each showing:
  - Status badge (color-coded: green=active, blue=scheduled, gray=completed, outline=draft)
  - Campaign name
  - Type label + product count + date range
  - Right side: applied/total count, avg change %, revert status
  - Click navigates to detail page

### Campaign Builder (`/campaigns/new` and `/campaigns/[id]/edit`)

Three-step flow:

**Step 1 — Setup:**
- Campaign name (text input)
- Campaign type toggle: "Scheduled Sale" (selected by default) / "Apply ML Recommendations"
- Pricing rule config (conditional on type — hidden for ML type):
  - Mode dropdown: Percentage change / Match competitor / Fixed price
  - Mode-specific inputs (percentage field, competitor strategy + offset, fixed price field)
- Rounding dropdown: Round to .99 / Round to .95 / No rounding
- Margin floor input (default 10%)
- Start date / End date (datetime inputs; end date optional)
- Revert toggle: "Revert prices when campaign ends" (default on for sale, off for ML)
- Footer: "Save Draft" + "Next: Select Products →"

**Step 2 — Select Products:**
- Filter bar:
  - Category dropdown (populated from merchant's distinct product categories)
  - Smart filters (combinable, AND logic): margin below X%, has recommendation, recommendation is RAISE/LOWER, price range ($min–$max), has/no competitor data
- Product list:
  - Checkbox per row + select all / deselect all
  - Columns: checkbox, title, SKU, current price, margin, recommendation
  - Products in another active/scheduled campaign get a subtle indicator
  - Live count badge: "23 of 47 products selected"
- **ML campaign shortcut:** When type is `"ml_recommendation"`, auto-filter to "has recommendation" and pre-select all RAISE/LOWER products
- Footer: "← Back" + "Next: Preview →"

**Step 3 — Preview & Schedule:**
- Summary stat cards: products changing, avg % change, skipped count, clamped-by-margin-floor count
- Conflict warning (if any): amber banner showing overlapping products and the conflicting campaign name, with "Remove from this campaign" / "Override" options
- Product table: title, SKU, current price, new price, change %, margin — with margin-floor indicators
- CSV-only note: "Prices will be updated in Zorin's database. Download a CSV after execution to update your store manually."
- Footer: "← Back" + "Schedule Campaign →" + "Execute Now"

### Campaign Detail Page (`/campaigns/[id]`)

- **Header:** Campaign name, status badge, type label
- **Summary cards:** Products applied/total, avg change %, skipped, errors
- **Timeline:** Chronological log from `CampaignLog` entries
- **Product table:** Title, SKU, original price, target price, change %, margin, applied at, reverted at, error — with status per product
- **Actions** (conditional on status):
  - `draft` → "Edit" + "Delete"
  - `scheduled` → "Execute Now" + "Cancel" (back to draft)
  - `active` → "Stop Campaign"
  - `completed` → "Duplicate Campaign"
  - All statuses → "Export CSV"

---

## Testing Strategy

Following existing patterns: Vitest, `vi.fn()` mocks for fetch in component tests, `HttpError` for route error testing, `requireSessionApi`/`requireOwnerApi` mocking.

### Pure Logic (~20 tests)

`src/lib/campaigns/rules.test.ts`:
- `calculateTargetPrice()` — one test per rule mode: percentage (positive and negative), ml_recommendation (with and without existing recommendation), competitor_match (min and median strategy, with and without competitor data), fixed_price
- Rounding: .99 and .95 modes, edge cases (price already ends in .99)
- Margin floor: clamping behavior, null COGS bypass
- No-change detection: target equals current
- Combined: percentage + rounding + margin floor applied in correct order

### API Routes (~40 tests)

Per-route test files following the existing `*.test.ts` pattern:
- `src/app/api/campaigns/route.test.ts` — GET list (with status filter, empty state), POST create (happy path, validation, Member-gets-403)
- `src/app/api/campaigns/[id]/route.test.ts` — GET detail (happy path, not-found, wrong-merchant), PATCH update (happy path, non-draft-400), DELETE (happy path, non-draft-400)
- `src/app/api/campaigns/[id]/schedule/route.test.ts` — happy path, conflict detection (409 with conflict list), override conflicts, missing startsAt, non-draft-400, targetPriceCents computation verification
- `src/app/api/campaigns/[id]/execute/route.test.ts` — manual trigger, status transition, first-chunk processing
- `src/app/api/campaigns/[id]/stop/route.test.ts` — stop with revert, stop without revert, invalid-status-400
- `src/app/api/campaigns/[id]/cancel/route.test.ts` — cancel deletes CampaignProduct rows and transitions to draft, non-scheduled-400
- `src/app/api/campaigns/[id]/duplicate/route.test.ts` — duplicate creates draft copy, non-completed-400
- `src/app/api/campaigns/preview/route.test.ts` — dry-run computation, no records created
- `src/app/api/campaigns/[id]/export/route.test.ts` — CSV format verification

### Cron Handler (~15 tests)

`src/app/api/cron/campaigns/route.test.ts`:
- Picks up scheduled campaigns past startsAt
- Picks up active campaigns past endsAt
- Chunked execution: processes 30, updates cursor, leaves remainder
- Full execution: transitions executing → active
- Revert flow: transitions active → reverting → completed
- Partial failure: one product push fails, others continue, error recorded
- CSV-only: updates DB without calling push functions
- No-revert campaign: active → completed (skips reverting)
- CRON_SECRET auth (rejects without valid secret)
- No-op when no campaigns need action

### UI Components (~20 tests)

- `CampaignBuilder.test.tsx` — rule mode switching renders correct inputs, type toggle sets correct defaults (revert on/off), form validation
- `ProductPicker.test.tsx` — filter behavior, select-all/deselect-all, conflict indicators, ML auto-select
- `CampaignList.test.tsx` — status filter tabs, correct rendering per status, empty state
- `CampaignDetail.test.tsx` — action buttons conditional on status, timeline rendering, product table

### Estimated Total

~115 new tests, bringing the suite from 681 to ~795.

---

## Non-Goals (Explicitly Out of Scope)

- **Recurring campaigns** (e.g. "every Friday at 6pm") — a separate scheduling feature, not part of v1
- **A/B price testing** — campaigns apply one price per product, no split-testing
- **Campaign templates** — merchants create campaigns from scratch or duplicate completed ones
- **Notifications/emails** — no email when a campaign starts/ends/fails. Status is visible on the campaigns list page. Email notifications are a follow-up.
- **Tier gating** — campaigns are available to all plan tiers in v1. Tier-based limits (max active campaigns, max products per campaign) are a follow-up.
- **Phase 3 integration** — profit tracking, campaign performance reporting ("Campaign X increased net profit by $2,300") are designed in a separate spec after this feature ships.

---

## Key Files (New and Modified)

### New Files

| File | Purpose |
|---|---|
| `prisma/schema.prisma` | Add Campaign, CampaignProduct, CampaignLog models + Product relation |
| `prisma/schema.production.prisma` | Same changes as above |
| `vercel.json` | Vercel Cron configuration |
| `src/lib/campaigns/rules.ts` | `calculateTargetPrice()` pure function |
| `src/lib/campaigns/conflicts.ts` | `findConflicts()` query function |
| `src/lib/campaigns/execute.ts` | `executeChunk()` and `revertChunk()` — shared by cron and manual execute |
| `src/app/api/campaigns/route.ts` | GET list, POST create |
| `src/app/api/campaigns/[id]/route.ts` | GET detail, PATCH update, DELETE |
| `src/app/api/campaigns/[id]/schedule/route.ts` | POST schedule |
| `src/app/api/campaigns/[id]/execute/route.ts` | POST manual execute |
| `src/app/api/campaigns/[id]/stop/route.ts` | POST stop |
| `src/app/api/campaigns/[id]/cancel/route.ts` | POST cancel (scheduled → draft) |
| `src/app/api/campaigns/[id]/duplicate/route.ts` | POST duplicate (completed → new draft) |
| `src/app/api/campaigns/[id]/export/route.ts` | GET CSV export |
| `src/app/api/campaigns/preview/route.ts` | POST preview |
| `src/app/api/cron/campaigns/route.ts` | GET cron handler |
| `src/app/campaigns/page.tsx` | Campaigns list page |
| `src/app/campaigns/new/page.tsx` | Campaign builder (new) |
| `src/app/campaigns/[id]/page.tsx` | Campaign detail page |
| `src/app/campaigns/[id]/edit/page.tsx` | Campaign builder (edit draft) |
| `src/components/CampaignBuilder.tsx` | 3-step campaign builder form |
| `src/components/CampaignList.tsx` | Campaign list with status filter tabs |
| `src/components/CampaignDetail.tsx` | Campaign detail view with timeline + products |
| `src/components/ProductPicker.tsx` | Filterable product selector with checkboxes |
| All corresponding `*.test.ts` / `*.test.tsx` files | ~110 tests |

### Modified Files

| File | Change |
|---|---|
| `src/components/Sidebar.tsx` | Add "Campaigns" nav item between Products and Launch Planner |

---

## Environment Variables

| Variable | Purpose | Required |
|---|---|---|
| `CRON_SECRET` | Vercel-provided secret for authenticating cron requests | Production only (Vercel sets automatically) |

No new environment variables need to be manually configured. `CRON_SECRET` is automatically available in Vercel deployments when a cron job is configured.
