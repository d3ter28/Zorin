# Phase B: Scheduled Competitor Price Refresh — Design

**Date:** 2026-07-03
**Status:** Approved by user (brainstorming session)
**Builds on:** Phase A on-demand scraping (`refreshProduct`, `/api/refresh`), merged to `master`.

## Goal

Competitor prices refresh automatically while the server runs, so recommendations stay current without anyone clicking "Refresh now" or re-uploading CSVs.

## Decisions (locked)

- **Mechanism:** in-process scheduler started from Next.js `instrumentation.ts` (`register()` hook). No external cron, no new dependencies.
- **Cadence:** wake every hour (`TICK_MS = 60 * 60 * 1000`); refresh competitor prices older than 24 hours (`REFRESH_AFTER_MS = 24 * 60 * 60 * 1000`). Both well under the 14-day staleness threshold, so prices refresh long before they stop feeding the decision engine.
- **Visibility:** server logs only — one summary line per tick. No status API or UI.
- **Enablement:** on by default; `AUTO_REFRESH=0` disables.
- **First tick:** ~30 seconds after boot (don't wait an hour after starting the server).

## Components

### `src/lib/scrape/autoRefresh.ts` (new; all logic, unit-tested)

- `findDueProductIds(prisma, now): Promise<string[]>` — distinct product ids that have ≥1 competitor with a non-null `url` AND `lastObservedAt` older than `REFRESH_AFTER_MS`. URL-less competitors never make a product due (they can't be refreshed).
- `runScheduledRefresh(prisma, now, deps?): Promise<{products, refreshed, failed}>` — gets due ids, loops the existing `refreshProduct` (injected for tests), aggregates counts, logs one line: `[auto-refresh] N products: refreshed X, failed Y`. A throw from one product is caught and counted as failed; remaining products still run.
- `startAutoRefresh(): void` — module-level `started` flag (Next dev can call `register()` more than once); respects `AUTO_REFRESH=0`; in-flight flag skips a tick while the previous run is still going; wraps each tick in try/catch so a crash never unschedules the interval; schedules first run ~30s after boot, then every `TICK_MS`.

### `src/instrumentation.ts` (new; thin shell, not unit-tested)

`register()` calls `startAutoRefresh()` only when `process.env.NEXT_RUNTIME === "nodejs"`.

## Data flow

tick → `findDueProductIds` → for each id: `refreshProduct(prisma, id)` (reuses Phase A: SSRF-guarded scrape, last-good preservation, staleness marking, recommendation invalidation) → aggregate → log summary. No new DB tables or schema changes.

## Error handling

- Per-product try/catch inside `runScheduledRefresh`: one bad product (DB hiccup, unexpected throw) counts as failed and doesn't stop the loop.
- Per-tick try/catch inside `startAutoRefresh`: a whole-tick crash logs and the interval keeps running.
- Scrape-level failures are already failure-as-data from Phase A.

## Testing

Unit tests (Vitest, node env, mock prisma, injected `now` and `refreshProduct`):

- Due selection: 23h-old → not due; 25h-old → due; URL-less competitors excluded; distinct product ids (two due competitors on one product → one id).
- Aggregation: counts summed across products; summary logged once.
- Error isolation: first product throws → counted failed, second still refreshed.
- `startAutoRefresh`: second call is a no-op (started guard); `AUTO_REFRESH=0` → no timer; overlapping tick skipped (in-flight flag).

The `setInterval`/instrumentation shell is excluded from unit tests per project convention; verified manually in the running dev server (boot, watch for the ~30s first-tick log line).

## Out of scope

Status UI, per-merchant schedules, jitter/backoff politeness beyond the existing 10s fetch timeout, catch-up for time the server was off (next tick after boot covers it), production process managers.
