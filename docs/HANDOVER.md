# PriceIQ — Handover Doc

**Date:** 2026-07-03
**Project root:** `C:\Users\pohde\projects\priceiq`
**Current branch:** `master`
**Status:** SSRF hardening complete (Phase A security), demo helpers committed. Phase B (scheduled auto-refresh) designed and planned — **implementation not yet started**. 168 tests passing. Working tree clean except 1 untracked plan file.

---

## 1. What PriceIQ is

An AI-native pricing tool for online store owners. The user uploads their **product catalog** and **competitor prices** (both via CSV) and the app gives plain-English **raise / lower / hold** recommendations per product, with margin protection. Money is stored as **integer cents** everywhere. Single seeded merchant, no auth (still an MVP slice).

Decision engine is rules-based (`src/lib/recommendation.ts`); an LLM only phrases the result, with a deterministic fallback so the app never depends on the network.

---

## 2. Most recent work (this session) — SSRF Hardening + Phase B Design

### SSRF Hardening (complete, merged to `master`, HEAD = `3d747c3`)

Added full SSRF protection to the Phase A scraping pipeline via **subagent-driven development** (fresh subagent per task, spec review + code-quality review after each). **168 tests passing.**

#### New files
- **`src/lib/scrape/urlGuard.ts`** — `isPrivateIp(ip)` classifies IPv4/v6 (loopback, RFC1918, link-local/metadata 169.254.x, CGNAT 100.64/10, ULA fc00::/7, v4-mapped including hex form `::ffff:xxxx:xxxx`). `validateScrapeUrl(url, opts)` enforces scheme allowlist + DNS blocking; injectable `GuardDeps.lookup` for tests.
- **`src/lib/scrape/urlGuard.test.ts`** — 35 tests.

#### Modified files
- **`src/lib/scrape/fetcher.ts`** — `fetchPage` now calls `validateScrapeUrl` before each hop; `redirect:"manual"` + per-hop re-validation (max 5 hops); `BLOCKED = Object.freeze({ok:false,status:0,html:"",blocked:true})` sentinel; `defaultAllowPrivate()` returns true in dev/test (`NODE_ENV !== "production"` or `SCRAPE_ALLOW_PRIVATE=1`).
- **`src/lib/scrape/scrapeOne.ts`** — `ScrapeFailureReason` now includes `"blocked_url"`; checks `res.blocked` before `res.status === 0` so blocked fetches don't map to `"timeout"`.
- **`src/lib/scrape/fetcher.test.ts`** — 10 tests (7 new SSRF cases including missing-Location header).
- **`src/lib/scrape/scrapeOne.test.ts`** — 7 tests.

#### Key design choices
- Accepted residual risk: DNS-rebinding TOCTOU (fix = connection-level IP pinning via custom undici dispatcher; deferred for this MVP).
- `allowPrivate` skips IP checks only — scheme allowlist still enforced.
- `AbortError` from timeout returns immediately (no retry); other network errors retry once.

#### Commit range (oldest → newest)
```
e1d50a7 feat: private-IP classification for scrape URL guard
08fda2e fix: handle hex-form IPv4-mapped IPv6 in isPrivateIp
a5467ca feat: validateScrapeUrl — scheme allowlist + DNS private-IP blocking
48df421 fix: convert docblocks to // comments; strengthen test stubs
92fc4bc feat: SSRF guard in fetchPage with per-hop redirect re-validation
9ff49ab fix: freeze BLOCKED singleton; no retry on timeout; convert docblocks to //
03fe291 feat: surface SSRF-blocked scrapes as blocked_url failure reason
56f9f40 docs: SSRF hardening complete; fix pre-existing scrapeOne docblocks
5caf3ca chore: commit local demo helpers as fixtures
3d747c3 docs: Phase B scheduled-refresh design spec; SSRF plan doc
```

### Phase B: Scheduled Auto-Refresh (complete, merged)

Design spec: `docs/superpowers/specs/2026-07-03-scheduled-refresh-design.md`
Plan: `docs/superpowers/plans/2026-07-03-scheduled-refresh.md`

**Approach:** in-process scheduler started from Next.js `instrumentation.ts`; no external cron, no new dependencies.

- `autoRefresh.ts` — hourly in-process scheduler started from `src/instrumentation.ts`; refreshes competitor prices older than 24h via `refreshProduct`; first tick ~30s after boot; one log line per tick; disable with `AUTO_REFRESH=0`.

All logic lives in **`src/lib/scrape/autoRefresh.ts`** (unit-tested); instrumentation shell is excluded from unit tests.

---

## 3. Phase A — Competitor Price Scraping (merged)

**Goal:** merchants supply competitor product URLs once (via a CSV `competitor_url` column); the system re-scrapes those URLs **on demand** to keep competitor prices — and therefore recommendations — current, removing manual CSV re-uploads.

Built via **subagent-driven-development** (12-task TDD plan, fresh implementer + two-stage review per task), then a final whole-branch review, then merged fast-forward to `master`. **HEAD = `8862969`.**

### Scraping pipeline (`src/lib/scrape/`, each with a `.test.ts`)
- `urlGuard.ts` — SSRF guard: `isPrivateIp` (IPv4/v6 classification) + `validateScrapeUrl` (scheme allowlist, private-IP blocking, injectable DNS lookup). `fetchPage` re-validates every redirect hop (max 5). Dev/demo bypass: `NODE_ENV !== "production"` or `SCRAPE_ALLOW_PRIVATE=1`. Accepted residual risk: DNS-rebinding TOCTOU (connection-level IP pinning would close it).
- `fetcher.ts` → `fetchPage` — the ONLY network seam; **failure-as-data, never throws.** Uses `redirect:"manual"` with per-hop re-validation via `urlGuard`.
- `extractPrice.ts` — pure HTML→price. Ladder: **JSON-LD `offers.price` → OG `product:price:amount` → visible `.price`**. Uses cheerio.
- `scrapeOne.ts` — fetch + extract + **plausibility gate** (rejects >5× swings). Returns `{ok:true,priceCents} | {ok:false,reason}`. Surfaces `"blocked_url"` as a failure reason.
- `recordObservation.ts` — shared write path: history row + current-price projection upsert; both set `isStale:false`.
- `staleness.ts` — staleness threshold logic + `markStale` writer.
- `refreshProduct.ts` — orchestrates one product: loops competitors, **preserves last-good price on failure**, marks stale, **invalidates cached recommendation if `refreshed > 0`**. URL-less competitors are skipped with reason `no_url` (counts as failed).

### API routes
- `POST /api/products/[id]/refresh` — refresh one product. Returns `RefreshSummary {productId, refreshed, failed, results[]}`.
- `POST /api/refresh` — bulk; body `{productIds: string[]}` → `{refreshed, failed}`.

### UI
- `src/components/ManageCompetitors.tsx` — per-product panel; **"Refresh now"** button; per-competitor status line (`confirmed <relative time>` or `⚠ stale`; "no URL" hint when not auto-refreshable).
- `src/components/ProductsTable.tsx` — dashboard **"Refresh all prices"** button + live status message.
- `src/components/IngestUpload.tsx` — helper text updated for the 4-column CSV.

### Correctness fix (`8862969`)
Stale competitors are now excluded from the displayed median/market-position (`src/app/api/products/route.ts`) and the what-if slider median (`src/app/product/[id]/page.tsx`), matching `decideForProduct` which already filtered them. Dashboard, product page, and recommendation now agree.

### Feature commit range (oldest → newest)
```
100ec56 docs: implementation plan for competitor price scraping (Phase A)
d776f03 feat: schema for competitor price history + staleness
9c0b1c7 chore: add cheerio for HTML price extraction
d1a5376 feat: pure price extraction from page HTML (JSON-LD/OG/selector)
88c3403 feat: page fetcher returning failures as data
37154d8 feat: scrapeOne — fetch, extract, plausibility gate
b5a9801 feat: shared recordObservation persistence (history + projection)
1fa2405 feat: staleness threshold logic + markStale writer
6fd24be feat: exclude stale competitors from pricing decisions
795cb5d feat: refreshProduct orchestration with staleness + invalidation
d41b86a feat: CSV competitor_url column + ingest through shared recordObservation
fbad87f test: assert unknown-SKU ingest writes no observation row
614ca1d feat: refresh API routes (single + bulk)
c3552b5 feat: manage-competitors UI + refresh buttons + CSV url column
8862969 fix: exclude stale competitors from displayed median/position
```

### Local-demo helpers (committed `5caf3ca`)
- `public/demo-competitor.html` — static scrape target: JSON-LD price `13.25` + OG fallback, for SKU `MUG-008`. Served at http://localhost:3000/demo-competitor.html.
- `test-data/demo-scrape.csv` — `MUG-008 → LocalDemoShop @ 15.00` pointing at the demo page (demo: 15.00 → 13.25 on refresh).
- `test-data/random-competitors.csv` — 23 randomized rows across 8 real SKUs; mix of `*.example` URLs and blank URLs.

### Verified working (last manual test)
`POST /api/products/cmqzfk2b5000r1gieh35y2mfi/refresh` (MUG-008 Ceramic Mug) →
`{"refreshed":1,"failed":2,"results":[{"LocalDemoShop":ok,1325},{"MarketCo":no_url},{"RivalShop":no_url}]}`. LocalDemoShop persisted at 1325 cents. Stale-filtered median/position confirmed.

---

## 4. Prior work still on `master` (earlier sessions)

- **Product catalog CSV import** (`805036f`): `src/lib/products/parseProductCsv.ts`, `importProducts.ts`, route `POST /api/products/catalog`, `ProductUpload.tsx`. Upserts by `(merchantId, sku)`, invalidates recommendations for updated products.
- **Margin-floor convergence fix** (`d966d14`): `floorPrice` uses `Math.ceil` (not `Math.round`) so the floor price always clears the 15% margin floor and bulk "Apply" converges to "hold".
- **Route-segment reserved-word bug (historical lesson):** a route folder named `import` broke Turbopack route codegen and poisoned all sibling `/api/products/[id]/*` routes. Renamed to `catalog`. **Never name a route segment after a JS reserved word under Turbopack.**

---

## 5. Key technical facts / gotchas

- **Stack:** Next.js **16.2.9** (App Router, **Turbopack**), TypeScript, Prisma **7** + `@prisma/adapter-better-sqlite3` (SQLite `dev.db`), Vitest **4**, Tailwind **v4** (OKLCH tokens). Path alias `@/` → `src/`.
- **AGENTS.md/CLAUDE.md:** this Next.js has breaking changes vs training data. **Read `node_modules/next/dist/docs/` before writing Next code.** Async route `params` is `Promise<{id}>` — must be awaited; client components use `use(params)`.
- **Windows working-dir drift (Bash tool):** commands run from `C:\Users\pohde` (home), not the project. **Always prefix git/npm/tsx with `cd /c/Users/pohde/projects/priceiq &&`** or they fail "not a git repository".
- **Tests:** Vitest, node env, `include: ["src/**/*.test.ts"]` — **no jsdom, no `.tsx`.** UI component tests are deliberately deferred; unit tests use Map/mock-backed prisma and don't touch the real DB. **168 passing.** Route registration and in-browser flows are NOT covered — verify those in the running app.
- **DB:** no migrations. `npx prisma db push` to sync; `npm run seed` (13 products; **stop the dev server first — SQLite lock**).
- **Dev server:** background it (`run_in_background: true`); http://localhost:3000.
- **Money:** integer cents. `formatCents` / `dollarsToCents` in `src/lib/money.ts`.
- **CSV format:** `sku, competitor_name, price, competitor_url` — `competitor_url` optional; supplying it enables auto-refresh for that competitor.
- **Decision engine** (`src/lib/recommendation.ts`): `MIN_MARGIN_FLOOR = 0.15`, `POSITION_BAND = 0.1`. Rule order: no comp data → hold; margin < floor → raise to floor; >10% above median → lower toward median (clamped at floor); >10% below → raise toward median; within band → hold. Stale competitors are filtered before deciding.

### Dev-server route-tree corruption (hit + fixed this session)
A long-running Turbopack dev server can end up 404-ing nested `[id]/*` routes (renders the HTML not-found page; RSC path resolves to `/_not-found`) even though `npm run build` registers them and `GET /api/products/[id]` works. **Fix: kill node, `rm -rf .next`, restart `npm run dev`.** Verify: `curl -o /dev/null -w "%{http_code}" .../[id]/refresh` → `405` for GET means the route matched.

---

## 6. Next steps

1. ~~**SSRF hardening**~~ **DONE** (`urlGuard.ts`, merged `3d747c3`). Residual: DNS-rebinding TOCTOU accepted for single-tenant MVP.
2. ~~**Phase B: scheduled/automatic refresh**~~ **DONE** (`autoRefresh.ts` + `src/instrumentation.ts`, merged). 181 tests passing (168 baseline + 13 new).
3. **UI component tests (deferred by design).** Add jsdom + `.tsx` support to cover `ManageCompetitors`/`ProductsTable` refresh states (idle/busy/error) and status-line rendering.
4. ~~Demo helpers~~ **committed** (`5caf3ca`).

---

## 7. How to resume

From `C:\Users\pohde\projects\priceiq` (prefix Bash cmds with `cd /c/Users/pohde/projects/priceiq &&`):
```bash
npm test            # expect 168 passing
npx prisma db push  # should say "already in sync"
npm run seed        # reseed 13 products (STOP dev server first — SQLite lock)
npm run dev         # background it; http://localhost:3000
npm run build       # typecheck + production build
```
**Demo a live scrape:** dashboard → upload `test-data/demo-scrape.csv` → open Ceramic Mug → "Refresh now" → LocalDemoShop moves toward 13.25. Edit the price in `public/demo-competitor.html` and re-refresh to watch it move. Competitors without URLs report `no_url` (expected).
```

---

## 8. Older context

For the original product vision, locked decisions, and deferred-feature list (auth/multi-tenant, real competitor discovery, Shopify OAuth, price-change alerts, billing), see specs/plans under `docs/specs/` and `docs/plans/`, and the Phase-A plan at `docs/superpowers/plans/` (commit `100ec56`).
