# Competitor Discovery — Design Spec

**Date:** 2026-07-04
**Status:** Approved by user

## Goal

Remove the biggest friction in PriceIQ: merchants currently must supply competitor product URLs manually via CSV. Discovery lets a merchant click "Find competitors" on a product and get back price-verified candidate product pages — either from their own saved competitor list, from open web search, or both — review them, and confirm the ones they want tracked. Confirmed competitors flow into the existing scrape/refresh pipeline unchanged.

## Decisions (locked with user)

- **Both modes:** merchant-named competitors (saved list) AND open AI/web discovery.
- **Search backend:** Brave Search API (free tier 2,000 queries/month), behind a provider interface so it is swappable.
- **Review-and-confirm:** candidates are never auto-added; merchant checks/unchecks then saves.
- **Per-product UI** on the product page (bulk discovery deferred).
- **Saved merchant-level competitor list** (entered once in settings, used for every product).
- **Graceful degradation without an API key:** feature shows a setup hint; manual CSV flow unaffected; a fixture provider enables local demo.
- **Verification approach:** search → scrape-verify → review. Every candidate shown to the merchant has been fetched through the existing `scrapeOne` pipeline and has a confirmed live price.

## Cost model

Search API calls happen only at discovery time (a few queries per run). Confirmed URLs are stored; the existing hourly auto-refresh scrapes them directly at zero API cost.

## Architecture

New module `src/lib/discovery/`, mirroring `src/lib/scrape/` conventions (failure-as-data, injectable deps, one network seam):

- **`searchProvider.ts`** — types + the only search-network seam.
  `SearchResult = { url: string; title: string; snippet: string }`
  `SearchProvider = { search(query: string): Promise<SearchProviderResult> }` where
  `SearchProviderResult = { ok: true; results: SearchResult[] } | { ok: false; reason: "unavailable" | "rate_limited" | "http_error" | "network_error" }`. Never throws.
  Also exports `getSearchProvider()`: returns the Brave provider when `BRAVE_SEARCH_API_KEY` is set, the fixture provider when `SEARCH_PROVIDER=fixture`, otherwise `null` (feature unavailable).
- **`braveProvider.ts`** — Brave Search API implementation (REST, `X-Subscription-Token` header). Maps HTTP 429 → `rate_limited`, other non-2xx → `http_error`, fetch throw → `network_error`.
- **`fixtureProvider.ts`** — canned results pointing at local demo pages (e.g. `http://localhost:3000/demo-competitor.html`) so the full flow is demoable without a key.
- **`discoverCompetitors.ts`** — orchestrator:
  1. Build queries: per saved domain `"<product title>" site:<domain>` (saved mode); one open query `"<product title>" buy price` (open mode); both for mode `both`.
  2. Call provider per query; merge results.
  3. Filter: dedup by registrable domain (keep first result per domain); drop the merchant's own `storeUrl` domain; drop domains already tracked as competitors for this product.
  4. Cap at **8 candidates** (bounds scrape time and API usage).
  5. Scrape-verify each candidate via existing `scrapeOne` (SSRF guard applies). No prior price exists, so instead of the 5× plausibility gate, apply a sanity band: reject extracted prices below 10% or above 10× of the product's own `currentPrice`.
  6. Return `{ candidates: [{url, domain, title, priceCents}], skipped: [{url, reason}] }`.

## Schema

One new model; no changes to existing models except the back-relation on `Merchant`:

```prisma
model CompetitorDomain {
  id         String   @id @default(cuid())
  merchantId String
  merchant   Merchant @relation(fields: [merchantId], references: [id])
  domain     String   // normalized, e.g. "walmart.com"
  createdAt  DateTime @default(now())

  @@unique([merchantId, domain])
}
```

Candidates are **not persisted** — they live only in the discover API response; the merchant confirms in-session. Confirmed candidates become ordinary `CompetitorPrice` rows (with URL) via `recordObservation`, whose `source` union gains `"discovery"`.

## API routes

All session-scoped via `requireSessionApi` + `withErrorHandling`; by-id routes ownership-checked (foreign id → 404).

- **`GET /api/settings/competitors`** → `{ domains: string[] }`.
- **`PUT /api/settings/competitors`** — body `{ domains: string[] }`, replaces the list. Each entry normalized (lowercase, strip protocol/`www.`/path); invalid entries rejected per-item with reasons; valid ones saved.
- **`POST /api/products/[id]/discover`** — body `{ mode: "saved" | "open" | "both" }`. Runs the orchestrator. Returns `200` with `{ candidates, skipped, providerError? }`. Provider failures (rate limit, network) return `200` with empty candidates and `providerError` string — not a 500. No provider configured → `503 { reason: "no_provider" }`. Mode `saved`/`both` with an empty saved list → `400`.
- **`POST /api/products/[id]/competitors`** — confirm. Body `{ candidates: [{ url, competitorName, priceCents }] }`. Writes each via `recordObservation` (source `"discovery"`), creating/updating `CompetitorPrice` rows with URLs so hourly auto-refresh takes over from then on. Returns `{ added: number }`.

`competitorName` defaults to the candidate's domain; editable in the review UI before confirm.

## UI

- **`src/components/DiscoverCompetitors.tsx`** — on the product page beside ManageCompetitors. "Find competitors" button + mode choice (saved / web / both; saved options disabled with a hint when the saved list is empty). Busy state ("Searching…" — runs take several seconds due to scrape verification). Review list: one row per candidate with checkbox (default checked), domain, page title, live price, editable name field. "Add selected" → confirm endpoint → `window.location.reload()` (same pattern as ManageCompetitors). Empty result: "No competitors found with a confirmed price." Skipped count shown ("12 results found, 3 verified"). No provider: hint "Competitor discovery requires a search API key (BRAVE_SEARCH_API_KEY)."
- **`src/components/CompetitorSettings.tsx`** on a new **`/settings`** page (linked from the dashboard header): list saved domains, add/remove, saves via PUT.

## Error handling

Failure-as-data throughout `src/lib/discovery/`. Routes surface provider failures as data (`providerError`), per-candidate scrape failures as `skipped[{url, reason}]`. `withErrorHandling` handles auth/validation errors as today. The UI shows "Search failed — try again." on `providerError` and renders whatever candidates did verify.

## Testing

Same conventions as the repo (Vitest projects: unit node / ui jsdom):

- `braveProvider.test.ts` — response parsing, missing key, 429/500, network error (stubbed fetch).
- `fixtureProvider.test.ts` — shape sanity.
- `discoverCompetitors.test.ts` — query building per mode, merge/dedup, own-store + already-tracked filtering, 8-cap, sanity band, scrape-verify wiring, skipped reasons (injected provider + scrapeOne).
- Route tests — discover (modes, no-provider 503, empty-saved-list 400, providerError passthrough), confirm (writes via recordObservation, ownership 404, validation), settings (normalization, per-item rejection, auth).
- UI tests — DiscoverCompetitors: idle / busy / review render / selection toggling / name editing / confirm POST body / empty / providerError / no-provider hint. CompetitorSettings: list / add / remove / save. Use the established `stubApi` pattern.

## Demo without a key

`SEARCH_PROVIDER=fixture` selects the fixture provider. Fixture results point at `public/demo-competitor.html`, so discover → review → confirm → auto-refresh is fully demoable locally.

## Out of scope (deferred)

- Bulk discovery across all products.
- LLM-based same-product ranking (bolt-on later if match quality is poor).
- Persisted review queue / re-surfacing skipped candidates.
- Automatic re-discovery when a tracked URL goes dead.
