# Competitor Price Scraping — Design (Phase A)

**Date:** 2026-06-30
**Project:** PriceIQ
**Status:** Approved design, pre-implementation

## 1. Problem

Today a merchant uploads competitor prices via CSV. When a competitor changes a
price, the merchant must notice it, find the new value, edit the CSV, and
re-upload. In practice the data goes stale, which quietly undermines every
raise/lower/hold recommendation (recommendations are only as good as the
freshness of the competitor prices behind them).

**Goal:** remove the *recurring* manual work. The merchant points the system at
each competitor's product page once; from then on the system re-checks those
pages and updates prices itself, so recommendations always reflect current
prices.

## 2. Scope

**In scope (Phase A — "merchant-supplied URLs"):**
- The merchant supplies a competitor product URL per competitor (one-time setup).
- The system fetches those URLs and extracts the current price.
- Price history is stored; the decision engine reads the latest price per
  competitor, unchanged.
- On-demand refresh now; the same engine is callable by a scheduler later.
- A free, self-hosted fetcher (no paid scraping service in v1).

**Explicitly deferred (not built in v1, architecture left ready):**
- **Phase B — auto-discovery:** the system finds competitor listings itself
  (identifier match → embedding/LLM ranking → merchant confirmation). Phase B
  feeds competitor URLs into the *same* pipeline Phase A consumes; it is a new
  front door, not a new engine.
- Headless-browser (Playwright) fetching for JS-rendered pages.
- Paid scraping-as-a-service fallback for anti-bot-protected sites
  (Amazon/Walmart/Cloudflare).
- Scheduled/cron execution (requires a deployment we don't have yet).
- UI component tests (would require adding jsdom; same open call as the existing
  WhatIfSlider coverage gap).

## 3. Key decisions

| Decision | Choice | Rationale |
|---|---|---|
| Which page to scrape | Merchant-supplied URL per competitor (Phase A) | Human does the matching → accurate, buildable now. Auto-discovery deferred to B. |
| Where the merchant enters URLs | **Both** CSV column + per-product UI | CSV for bulk setup, UI for one-off edits. |
| What triggers a scrape | **Both** on-demand button now + scheduler-ready engine | Same code path; ship value without standing up infrastructure. |
| Data model | **Store history** + latest-price projection | History is cheap now, painful to retrofit; unlocks future alerts/trends. |
| Scrape failure handling | **Keep last price + staleness timestamp; drop from engine past threshold** | Never overwrite a real price with a guess; never decide on rotted data. |
| Fetch/extract strategy | **Static fetch + structured-data extraction**, adapter-shaped | Free, fast, stable across redesigns; Playwright/paid fetcher swap in later. |

## 4. Data model

Two changes (Prisma / SQLite). Money stays integer cents everywhere.

**New: immutable history table — one row per scrape.**
```prisma
model CompetitorPriceObservation {
  id             String   @id @default(cuid())
  productId      String
  product        Product  @relation(fields: [productId], references: [id])
  competitorName String
  competitorUrl  String
  price          Int      // integer cents
  source         String   // "csv" | "scrape"
  observedAt     DateTime @default(now())

  @@index([productId, competitorName, observedAt])
}
```

**Changed: `CompetitorPrice` stays the "current price per competitor" projection
the engine reads, keyed `[productId, competitorName]`, with new fields for
staleness:**
```prisma
  competitorUrl   String?    // already exists; now populated
  lastObservedAt  DateTime @default(now()) // last SUCCESSFUL confirmation; default keeps the migration safe for existing rows
  isStale         Boolean  @default(false)  // true once older than the threshold
```

**Rule:** every successful scrape writes one immutable `CompetitorPriceObservation`
(history) **and** upserts the `CompetitorPrice` projection (the fast "latest"
view the engine reads). CSV ingest writes the same way with `source: "csv"`.
History is the source of truth; the projection is the read-optimized latest.

## 5. Modules

New code under `src/lib/scrape/` (mirrors existing `src/lib/ingest/`). Small,
single-purpose units:

```
src/lib/scrape/
  fetcher.ts            # fetch(url) -> { ok, status, html }  — ONLY unit touching the network
  extractPrice.ts       # extractPrice(html) -> cents | null  — PURE: JSON-LD → OG → selector
  scrapeOne.ts          # fetch one URL + extract -> ScrapeResult (failure-as-data)
  recordObservation.ts  # ONLY unit writing competitor data: history row + projection upsert
  refreshProduct.ts     # scrape all competitor URLs for a product, record each
  staleness.ts          # PURE date logic: mark projections stale past threshold
```

**Boundaries:**
- `fetcher.ts` is the only network seam — a Playwright or paid-provider fetcher
  swaps in here later without touching anything else. Interface
  `(url) => Promise<FetchResult>`.
- `extractPrice.ts` is pure (HTML in, cents out) — the brittle part, isolated so
  it can be tested exhaustively against saved HTML fixtures with no mocking.
- `recordObservation.ts` is the single persistence path, used by **both** scrape
  and CSV ingest — one place that defines history + projection + recommendation
  invalidation.
- `refreshProduct.ts` is the orchestration entry point that both the on-demand
  button and the future scheduler call.

**Reused unchanged:** decision engine (`recommendation.ts`), `apply.ts`, and the
`CompetitorPrice` read path. Scraping is purely a new *source* feeding the
existing pipeline.

**Touched existing code:** `src/lib/ingest/applyIngest.ts` is refactored to write
through `recordObservation.ts`, so CSV and scrape share one persistence path and
CSV gains the `competitor_url` column + history.

## 6. Data flow (on-demand refresh)

```
Merchant clicks "Refresh prices" (product or dashboard)
  → POST /api/products/[id]/refresh   (or POST /api/refresh for bulk)
  → refreshProduct(productId)
      → load the product's competitor URLs (from CompetitorPrice rows)
      → for each URL: scrapeOne(url)
           → fetcher.fetch(url)        → html | failure
           → extractPrice(html)        → cents | null
           → recordObservation(...)    → history row + upsert projection   (success only)
      → staleness.markStale(productId) → flag projections past threshold
      → invalidate Recommendation      (reuses existing deleteMany)
  → response: { refreshed, failed, results[] } → UI updates
```

### Extraction ladder — `extractPrice(html)`
Priority order, first hit wins:
1. **JSON-LD** — parse every `<script type="application/ld+json">`; find a
   `Product`/`Offer`; read `offers.price` (+ `priceCurrency`). `offers` may be an
   object or an array. Most reliable.
2. **Open Graph meta** — `<meta property="product:price:amount">` /
   `og:price:amount`. Common on Shopify.
3. **CSS selector fallback** — small, per-host-overridable selector
   (`[itemprop=price]`, `.price`). Last resort.
4. **None found → `null`** → treated as a scrape failure.

Parsing uses **cheerio** (lightweight, no browser). Prices normalize to integer
cents via the existing `dollarsToCents`, then pass a **sanity check** to reject
placeholders like `$0` or unrelated prices: the price must be positive, and —
*when a prior price exists for that competitor* — within a plausible band of it
(the band check is skipped on the first-ever scrape, which has no baseline).
Locale/decimal formats (`1.299,00`) are normalized.

### Fetcher — `fetcher.fetch(url)`
`fetch` with a real `User-Agent`, ~10s timeout, one retry on network error.
Returns `{ ok, status, html }` rather than throwing — failures are data the
orchestrator handles, not exceptions.

## 7. Failure handling & staleness

**A scrape fails** when: fetch is non-200, times out, or `extractPrice` returns
`null` / fails the sanity check (reasons: `http_404`, `blocked`,
`no_price_found`, `timeout`).

**On failure:** do not write an observation and do not overwrite the projection.
The last good `CompetitorPrice` and its `lastObservedAt` stay put — a real price
is never replaced with a guess. The failure reason is returned in the
`ScrapeResult` so the UI can explain why a competitor didn't update.

**Staleness gate:**
- `staleness.ts` is pure: `isStale = (now - lastObservedAt) > STALE_AFTER`.
  `STALE_AFTER` is a single constant, default **14 days**.
- After each refresh, recompute `isStale` on the product's projections.
- **Engine change (single, well-contained):** `decideForProduct` filters out
  `isStale` competitors before computing the median. Rotted prices stop
  influencing recommendations, but the rows and history remain for the UI.

## 8. API & UI surface

**API (thin routes; logic in `src/lib/scrape/`; routes await async `params` per
Next 16):**
- `POST /api/products/[id]/refresh` — refresh one product's competitors.
- `POST /api/refresh` — bulk refresh (dashboard), loops `refreshProduct` like the
  existing bulk-apply route.

**UI:**
- **Per-product:** a "Manage competitors" panel — add/edit/remove a competitor
  (name + URL), a "Refresh now" button, and per-competitor status
  (`$X · confirmed 2h ago` / `⚠ stale 16d` / `✕ couldn't fetch`).
- **Dashboard:** a "Refresh all prices" button + a last-refreshed timestamp.
- **CSV:** the competitor template gains a `competitor_url` column; the parser
  maps it through.

## 9. Testing strategy

Inside the existing Vitest setup (`src/**/*.test.ts`, node env, no jsdom).

1. **`extractPrice` — exhaustive, pure, fixture-based** (highest value, no
   mocking): JSON-LD present; `offers` array/nested; OG fallback; selector
   fallback; no price → `null`; sanity-check rejects (`$0`, absurd values, locale
   formats); currency + decimal normalization to cents.
2. **`fetcher` — failure-as-data:** mock `fetch`; returns `{ok:false,status}`
   (never throws) on 404/timeout/network error; `{ok:true,html}` on 200.
3. **`recordObservation` — stateful prisma mock** (Map-backed, same pattern as
   `apply.convergence.test.ts`): one scrape writes a history row AND upserts the
   projection; CSV and scrape produce identical persistence; recommendation
   invalidated.
4. **`staleness` — pure date logic:** boundary cases around the 14-day threshold.
5. **Engine staleness filter — extends `recommendation.test.ts`:** a stale
   competitor is excluded from the median; the existing fixed-point convergence
   sweep still holds with stale rows present.
6. **`refreshProduct` orchestration — stateful integration test:** mixed batch
   (success / 404 / no-price); successes update, failures preserve last good
   price, staleness recomputed, summary counts correct.

**Out of scope for v1:** live network tests against real sites, Playwright/browser
fetching, paid-provider fallback, Phase B auto-discovery, UI component tests.

## 10. Future (Phase B hook)

Auto-discovery produces a competitor URL for a product and hands it to the same
`recordObservation`/`refreshProduct` pipeline. Planned shape (deferred):
identifier match (UPC/EAN/ASIN/brand+MPN) → embedding/LLM ranking of candidates →
merchant one-click confirmation → store the confirmation as labeled data for
later threshold tuning. No model training required to start.
