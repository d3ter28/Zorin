# Broader UI Coverage — Design

**Date:** 2026-07-03
**Status:** Approved

## Goal

Complete test coverage of `ManageCompetitors` and `ProductsTable` — the states left out of the refresh-state work: empty states, loading skeleton, load-error/retry, status lines, and the selection/apply flow. No component changes; tests characterize existing behavior.

## Approach

Extend the two existing test files (`src/components/ManageCompetitors.test.tsx`, `src/components/ProductsTable.test.tsx`) with new `describe` blocks, reusing the existing fixtures and helpers (`stubFetch`, `renderLoaded`, `json`). No new infrastructure — the `ui` jsdom project from the refresh-state work picks these up automatically.

Out of scope: `CogsInput`, `Dashboard`, `IngestUpload`, `ProductUpload`, `RecommendationCard`, `WhatIfSlider`.

## Design notes

- **Relative time:** `relativeTime` in ManageCompetitors uses `Date.now()`. Tests construct `lastObservedAt` arithmetically from the current time (e.g., `new Date(Date.now() - 2 * 3600_000).toISOString()` → assert text contains "confirmed 2h ago"). Deterministic without fake timers; avoid boundary values (exactly 60m) that could flip during test execution.
- **Apply-flow fixtures:** the existing ROWS fixture is all-"hold" (no checkboxes, no apply bar). Add an `ACTIONABLE_ROWS` fixture where p1 is `"raise"` and p2 is `"lower"` (and one `"hold"` row p3 to prove holds get no checkbox). The component pre-selects all non-hold rows on load.
- **stubFetch extension:** the ProductsTable helper must also route `POST /api/apply/bulk` and allow the `GET /api/products` response to vary (empty rows, error, or a controllable pending promise) — generalize it rather than duplicating it per test block.

## Test plan

### ManageCompetitors (+5 tests, new `describe("ManageCompetitors status lines")` block)

1. **Empty state:** `competitors={[]}` → "No competitor prices yet. Import a CSV from the dashboard." rendered; no `<ul>`.
2. **Fresh competitor:** `lastObservedAt` 2h ago, `isStale: false` → status line "confirmed 2h ago".
3. **Stale competitor:** `isStale: true` → "⚠ stale" rendered; no "confirmed" text for that row.
4. **No-URL competitor:** `url: ""` → "no URL — add one via CSV to enable auto-refresh" hint rendered.
5. **URL-bearing competitor:** hint absent.

### ProductsTable (+9 tests)

New `describe("ProductsTable load states")` block:

1. **Loading skeleton:** while `GET /api/products` is pending (never-resolving promise) → no "Refresh all prices" button, no table.
2. **Load error + retry:** first GET fails (`!ok`), → "Couldn't load products." and a Retry button; second GET succeeds → clicking Retry renders the table.
3. **Empty state:** GET returns `[]` → "No products yet" heading; no refresh button.

New `describe("ProductsTable selection and apply")` block (uses `ACTIONABLE_ROWS`):

4. **Checkbox presence:** actionable rows render a checkbox (`aria-label` "Select {title}"); the hold row does not.
5. **Pre-selection:** non-hold rows selected on load → apply bar shows "2 changes selected" and button "Apply 2 changes".
6. **Toggle:** unchecking one → "1 change selected"; unchecking both → apply bar disappears.
7. **Apply busy:** `POST /api/apply/bulk` pending → button "Applying…", disabled.
8. **Apply success:** POST body contains the selected ids; on success the table re-fetches (`GET /api/products` called twice).
9. **Apply error:** POST `!ok` → "Couldn't apply changes — try again." shown in the bar; button re-enabled.

## Verification

`npm test` → 193 existing + 14 new = **207 passing**, one command.
