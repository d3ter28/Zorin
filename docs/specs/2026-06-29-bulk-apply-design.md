# Bulk Apply Recommendations — Design

**Date:** 2026-06-29
**Status:** Approved, ready for planning

## Goal

Turn the dashboard into a review-and-act surface. Every product shows a live
recommendation; the user checks the ones they want and applies them all in one
click, instead of drilling into each product page individually.

## Background

Today the insight→action loop is closed only one product at a time: the user
opens a product page, sees a recommendation, and clicks Apply. The dashboard's
recommendation column reads a *stored* recommendation that is cleared on every
CSV upload, so right after an upload it is mostly blank and gives the user
nothing to act on in bulk.

## Decisions

- **Interaction model:** select-then-apply. Non-hold rows get a pre-checked
  checkbox; a sticky bar applies the checked rows. (Not one-button "apply all" —
  bulk price changes are consequential and users want to deselect ones they
  disagree with.)
- **Recommendation freshness:** the dashboard computes a fresh decision for every
  product on load via the existing `decideForProduct`. Every row always shows an
  action; the column is never blank. (Not lazy/stored-only, which would leave
  most rows uncheckable after an upload and defeat the feature.)
- **Authority:** the bulk endpoint recomputes server-side. The suggested price on
  screen is a hint; the server is authoritative, so a stale or spoofed client
  price cannot be written.
- **Resilience:** unknown/deleted product ids are skipped (counted), not fatal. A
  bulk action should not fail wholesale because one product changed mid-session.

## Units

### 1. `applyDecision` — shared helper

New function extracting the logic the single-apply route already performs.
Location: `src/lib/apply.ts` (or alongside `recommendation.ts`).

```ts
// Recompute server-side, write if changed, clear stale recommendation.
async function applyDecision(productId: string): Promise<{
  applied: boolean;
  action: string;
  currentPrice: number;
}>
```

Behavior: load product + competitors → `decideForProduct` → if
`suggestedPrice !== currentPrice`, update the price and `deleteMany` the stored
recommendation; otherwise no-op. Returns whether a change was made.

Both the single-apply route and the new bulk route become thin wrappers around
this helper — no duplicated price-writing logic.

### 2. `/api/products` — modify

Compute a fresh decision per product and add two fields to each row:

```ts
recommendedAction: "raise" | "lower" | "hold";  // replaces recommendationAction: string | null
suggestedPrice: number;                          // cents
```

`recommendedAction` is always present (never null). The `Row` interface in
`ProductsTable` is updated to match.

### 3. `/api/apply/bulk` — new

```ts
// Request
POST /api/apply/bulk
{ "productIds": ["abc", "def"] }

// Response
{ "applied": 4, "skipped": 1 }   // skipped = resolved to hold, no-op, or unknown id
```

For each id it calls `applyDecision`. Invalid/empty/missing-array body → 400 via
`withErrorHandling` + a validation check. Unknown ids are skipped, counted toward
`skipped`, never fatal.

### 4. `ProductsTable` — modify

- **Checkbox column** (leading): non-hold rows get a pre-checked checkbox; hold
  rows get none.
- **Suggested price inline** in the recommendation column, e.g. `$18.00 → $24.00`
  for non-hold rows; `Hold` for hold rows.
- **Sticky action bar** at the bottom of the viewport, visible only when ≥1 box is
  checked: shows live count + `Apply N changes` button. Button disables and shows
  `Applying…` while in flight.
- **On success:** `window.location.reload()` — table re-fetches, applied rows now
  show `Hold` at their new price, bar disappears. Consistent with existing
  single-apply and CSV-upload reload pattern.
- **On error:** stop the spinner, show an inline message
  (`Couldn't apply changes — try again.`) above the bar; do not reload.

Local state only (no new global state):

```ts
const [selected, setSelected] = useState<Set<string>>(new Set());
const [applying, setApplying] = useState(false);
```

`selected` initializes to all non-hold product ids once rows load.

## Testing (TDD)

- `applyDecision` — mocked Prisma: applies on change, no-op on hold, clears
  recommendation.
- `/api/apply/bulk` — applies multiple, skips holds/unknowns, correct counts,
  400 on bad body.
- `/api/products` — row includes `recommendedAction` + `suggestedPrice` from a
  fresh decision.
- `/api/products/[id]/apply` — existing tests pass against the refactored helper.

## Out of scope

- Select-all/none toggle (trivial to add later).
- Undo / price history (separate slice).
- Pushing prices to external platforms (Shopify etc.).
- Manual price override.
