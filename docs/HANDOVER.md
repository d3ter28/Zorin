# PriceIQ — Handover Doc

**Date:** 2026-07-04
**Project root:** `C:\Users\pohde\projects\priceiq`
**Current branch:** `master`
**Status:** Competitor Discovery **implemented, verified live, merged**. Auth + multi-tenant complete. Phase B (scheduled auto-refresh) complete. All UI components tested. **353 tests passing.** Working tree clean.

---

## 1. What PriceIQ is

An AI-native pricing tool for online store owners. The user uploads their **product catalog** and **competitor prices** (both via CSV) and the app gives plain-English **raise / lower / hold** recommendations per product, with margin protection. Money is stored as **integer cents** everywhere. Auth is email + password; each account is its own isolated merchant — 1 user = 1 merchant. Demo login: `demo@priceiq.example` / `demo1234`.

Decision engine is rules-based (`src/lib/recommendation.ts`); an LLM only phrases the result, with a deterministic fallback so the app never depends on the network.

---

## 2. Most recent work (2026-07-04) — Competitor Discovery

Merchants can now discover competitor product URLs automatically instead of manually entering them in CSVs. Built via subagent-driven development (13-task TDD plan, fresh implementer + two-stage review per task), then merged fast-forward to `master`. **All 300 tests passing. Working tree clean.**

### Discovery flow (end-to-end)

1. **Settings page** (`/settings`): Save a list of competitor domains (e.g. `walmart.com`, `target.com`) used for targeted search.
2. **Product page → "Find competitors" button**: Choose mode (saved list search / web search / both), run discovery.
3. **Review candidates**: Each candidate is scrape-verified with a live price shown inline. Price sanity-band: 10%–10× of merchant's own price (rejects outliers).
4. **Confirm selection**: Merchant reviews and selects which candidates to add. Confirmed competitors flow into the existing hourly auto-refresh pipeline (Phase B).

### Architecture

- **`src/lib/discovery/`** — orchestration and provider abstraction:
  - `SearchProvider` interface: `search(query, context?) → {url, title, snippet}[]`
  - `braveProvider.ts` — Brave Search API client (requires `BRAVE_SEARCH_API_KEY`; free tier: 2,000 queries/month)
  - `fixtureProvider.ts` — canned fixture results, returns URLs pointing at `public/demo-competitor.html` for local demo without a key
  - `discoverCompetitors(query, options) → {candidates[], hasMore}` — orchestrator: searches via configured provider, scrapes each URL for live price, filters by sanity band (10%–10× of `merchantPrice`), dedupes by domain
- **`src/app/api/settings/competitors/`** — saved domains per merchant:
  - `GET` — returns `{domains: string[]}`
  - `PUT` — body `{domains}`, persists via `CompetitorDomain` model (Prisma upsert per-merchant)
- **`src/app/api/products/[id]/discover/`** — discovery run endpoint:
  - `POST` — body `{query, mode, merchantPrice}` → calls `discoverCompetitors`, returns `{candidates[]}`
- **`src/app/api/products/[id]/competitors/`** — confirm endpoint:
  - `POST` — body `{urls}` → writes via `recordObservation` with `source="discovery"` (flow into existing refresh pipeline)
- **`src/components/DiscoverCompetitors.tsx`** — product page modal: query input, mode selector, results table with live prices, selection checkboxes, confirm button.
- **`src/components/CompetitorSettings.tsx`** — settings page: domain list input, save/clear/validate, error handling.

### Configuration

- **`BRAVE_SEARCH_API_KEY`** — enables real web search via Brave Search API (free tier: 2,000 queries/month).
- **`SEARCH_PROVIDER=fixture`** — uses canned fixture results (no key needed) pointing at `public/demo-competitor.html` for local demo.

### Key design decisions

- **Search API called only at discovery time.** Confirmed URLs are scraped directly by the existing Phase A pipeline (zero ongoing API cost beyond the upfront search calls).
- **All candidates are scrape-verified with a live price before shown to merchant.** Sanity band: 10%–10× of merchant's own price. Rejects outliers and bad-scrape cases.
- **Candidates are never auto-added.** Merchant reviews and confirms selection; discovery is opt-in per product.
- **Source tracking.** Confirmed URLs are recorded with `source="discovery"` so the system can distinguish discovery-added competitors from CSV-uploaded ones.

### Commit range (oldest → newest)
```
850b07c feat: allow 'discovery' as an observation source
8c6c337 feat: CompetitorDomain schema for saved competitor lists
0de4788 feat: normalizeDomain for competitor domain input
269bd3a feat: SearchProvider interface + provider selection
86bfbe7 feat: fixture search provider for keyless demo
02f12d4 feat: Brave Search provider
e45f6b0 feat: discoverCompetitors orchestrator (search, filter, scrape-verify)
f2ad8f5 feat: GET/PUT /api/settings/competitors
360553e feat: discovery API route
811d4a4 feat: confirm competitors route
fd9a93e feat: DiscoverCompetitors component + mount on product page
212eb4f feat: CompetitorSettings component, /settings page, dashboard link
```

---

## 2a. Prior work (2026-07-04) — Auth + multi-tenant

Email + password authentication with full merchant isolation. Built via subagent-driven development; smoke-tested live with curl.

### Auth library (`src/lib/auth/`)

- **`password.ts`** — `hashPassword` / `verifyPassword` using argon2id. Dev/CI fall back to bcrypt-compatible stubs when native bindings unavailable.
- **`session.ts`** — opaque token sessions stored in the `Session` table. `createSession(prisma, userId)` mints a 32-byte hex token with a 30-day expiry. `getSessionUser(prisma, token)` validates token + expiry, returns `SessionUser {id, merchantId}`. `setSessionCookie(res, token, expiresAt)` writes an httpOnly, sameSite=lax cookie (`priceiq_session`); logout clears it inline. `SESSION_COOKIE` constant.
- **`requireSession.ts`** — `getSession()` reads the cookie and calls `getSessionUser`; returns `SessionInfo {user, merchantId} | null`. `requireSessionApi()` throws `HttpError(401)` if no session (caught by `withErrorHandling`). `requireSessionPage()` calls `redirect("/login")` for server components.

### Auth API routes

- **`POST /api/auth/signup`** — creates a `Merchant` + `User` in one transaction; hashes password; mints session; sets cookie. Returns `{ok:true}`.
- **`POST /api/auth/login`** — constant-time lookup (always runs `verifyPassword` even when email not found to prevent timing oracle). Returns `{ok:true}` + session cookie on success, `401` on bad credentials.
- **`POST /api/auth/logout`** — clears the session row from DB and clears the cookie. Returns `{ok:true}`.

### Scoping rules (cross-tenant isolation)

- **List endpoints** (`GET /api/products`) filter by `merchantId` from the session — a merchant only sees their own products.
- **By-id endpoints** (`GET /api/products/[id]` and all nested routes) use `findFirst({ where: { id, merchantId } })` — a foreign `id` returns `404`, not `403`, to avoid leaking record existence.
- **Bulk ops** (`POST /api/apply/bulk`, `POST /api/refresh`) accept `productIds[]` but ownership is verified per-item; foreign ids are silently skipped.
- **Scrape / ingest / catalog upload** all scope writes to the session's `merchantId`.
- All auth-gated routes use `withErrorHandling` so `HttpError(401)` becomes a JSON `401` response, not a `500`.

---

## 2a. Most recent work (2026-07-03) — Phase B implementation + UI tests

All three built via **subagent-driven development** (fresh implementer subagent per task, spec-compliance review + code-quality review after each, final whole-branch review at the end).

### Phase B: Scheduled Auto-Refresh (complete, merged, live-verified)

Competitor prices now refresh automatically every hour while the server runs.

- **`src/lib/scrape/autoRefresh.ts`** (+ 13 tests in `autoRefresh.test.ts`) — all the logic:
  - `findDueProductIds(prisma, now)` — products with a URL-bearing competitor whose `lastObservedAt` is older than `REFRESH_AFTER_MS` (24h); JS `Set` dedup.
  - `runScheduledRefresh(prisma, now, deps?)` — one tick: loops due ids through Phase A's `refreshProduct`, per-product try/catch (one bad product can't kill the tick), logs exactly one line: `[auto-refresh] N products: refreshed X, failed Y`.
  - `startAutoRefresh(deps?)` — first tick 30s after boot (`setTimeout`), then hourly (`setInterval`, `TICK_MS`); `started` guard (register() can fire twice in dev), `inFlight` guard (skip overlapping ticks), `AUTO_REFRESH=0` kill-switch; `_resetAutoRefreshForTests()` for teardown. `defaultRunTick` lazy-imports `../db` so loading the module never opens SQLite.
- **`src/instrumentation.ts`** — thin Next.js shell: `register()` dynamically imports `startAutoRefresh` only when `NEXT_RUNTIME === "nodejs"` (static import would crash the edge runtime via prisma's Node APIs). Intentionally has no unit tests.
- **Live verification:** dev server boot showed `[auto-refresh] 8 products: refreshed 1, failed 43` at ~48s; `AUTO_REFRESH=0` boot showed no line for 60s+. High failed count is expected — most seeded competitors have no URL or `*.example` URLs.

Commits: `14d3228` → `84824de` → `80c24b9` → `998a73d` (+ `1f09c49` doc fix).

### UI refresh-state tests (complete, merged)

First `.tsx` test coverage in the repo. Spec: `docs/superpowers/specs/2026-07-03-ui-refresh-state-tests-design.md`.

- **`vitest.config.ts`** — now uses Vitest 4 `test.projects`: `unit` (node, `src/**/*.test.ts`) + `ui` (jsdom, `src/**/*.test.tsx`), both `extends: true`; `@vitejs/plugin-react` added at root (tsconfig has `"jsx": "preserve"`, so raw esbuild can't compile `.tsx` tests). New devDeps: `jsdom`, `@testing-library/react`, `@testing-library/dom`, `@testing-library/user-event`. **No `@testing-library/jest-dom`** — disabled-state assertions use the `.disabled` property.
- **`src/components/ManageCompetitors.test.tsx`** — 6 tests: idle / busy / success (stubs `window.location.reload` — jsdom's throws "Not implemented") / network error / non-ok / retry-clears-error.
- **`src/components/ProductsTable.test.tsx`** — 6 tests: load / busy / plural success ("Refreshed 2 prices." + re-fetch) / with-failures / singular / failure. `stubFetch` helper routes by URL and throws on unexpected fetches.

Commits: `6cad82e` → `735c3a4` → `eea23ae` → `390206c`.

### Broader UI coverage (complete, merged)

Spec: `docs/superpowers/specs/2026-07-03-broader-ui-coverage-design.md` (`fa13f06`)
Plan: `docs/superpowers/plans/2026-07-03-broader-ui-coverage.md` (`db4df76`)

3 tasks, +14 tests → **207 expected**: (1) ManageCompetitors status lines (empty/fresh "confirmed 2h ago"/stale/no-URL hint); (2) ProductsTable load states (skeleton/error+Retry/empty) with `stubFetch` generalized to `stubApi` (adds `/api/apply/bulk` routing, existing tests untouched); (3) ProductsTable selection/apply flow (checkboxes on actionable rows only, pre-selection, toggle counts, "Applying…" busy, POST body `{productIds:["p1","p2"]}`, apply error). Execute with `superpowers:subagent-driven-development`; the plan embeds full test code per task.

---

## 2b. Earlier same-day work — SSRF Hardening (complete, merged)

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

Phase B design docs: spec at `docs/superpowers/specs/2026-07-03-scheduled-refresh-design.md`, plan at `docs/superpowers/plans/2026-07-03-scheduled-refresh.md`.

---

## 3. Phase B — Scheduled Auto-Refresh (merged)

See section 2a below.

---

## 3a. Phase A — Competitor Price Scraping (merged)

**Goal:** merchants supply competitor product URLs once (via a CSV `competitor_url` column); the system re-scrapes those URLs **on demand** to keep competitor prices — and therefore recommendations — current, removing manual CSV re-uploads.

Built via **subagent-driven-development** (12-task TDD plan, fresh implementer + two-stage review per task), then a final whole-branch review, then merged fast-forward to `master`. **HEAD = `8862969`.**

### Scraping pipeline (`src/lib/scrape/`, each with a `.test.ts`)
- `urlGuard.ts` — SSRF guard: `isPrivateIp` (IPv4/v6 classification) + `validateScrapeUrl` (scheme allowlist, private-IP blocking, injectable DNS lookup). `fetchPage` re-validates every redirect hop (max 5). Dev/demo bypass: `NODE_ENV !== "production"` or `SCRAPE_ALLOW_PRIVATE=1`. DNS rebinding closed via connect-time pinning in `pinnedAgent.ts`.
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
- **Tests:** Vitest projects — unit (node, src/**/*.test.ts) + ui (jsdom, src/**/*.test.tsx via @testing-library/react). UI tests cover refresh states, status lines, load states, the selection/apply flow of ManageCompetitors/ProductsTable, CogsInput, and Dashboard wiring. **300 passing — all UI components tested.**
- **DB:** no migrations. `npx prisma db push` to sync; `npm run seed` (13 products; **stop the dev server first — SQLite lock**).
- **Dev server:** background it (`run_in_background: true`); http://localhost:3000.
- **Money:** integer cents. `formatCents` / `dollarsToCents` in `src/lib/money.ts`.
- **CSV format:** `sku, competitor_name, price, competitor_url` — `competitor_url` optional; supplying it enables auto-refresh for that competitor.
- **Decision engine** (`src/lib/recommendation.ts`): `MIN_MARGIN_FLOOR = 0.15`, `POSITION_BAND = 0.1`. Rule order: no comp data → hold; margin < floor → raise to floor; >10% above median → lower toward median (clamped at floor); >10% below → raise toward median; within band → hold. Stale competitors are filtered before deciding.

### Dev-server route-tree corruption (hit + fixed this session)
A long-running Turbopack dev server can end up 404-ing nested `[id]/*` routes (renders the HTML not-found page; RSC path resolves to `/_not-found`) even though `npm run build` registers them and `GET /api/products/[id]` works. **Fix: kill node, `rm -rf .next`, restart `npm run dev`.** Verify: `curl -o /dev/null -w "%{http_code}" .../[id]/refresh` → `405` for GET means the route matched.

---

## 6. Next steps

Remaining product work (in rough priority order):

1. **Price-change alerts** — notify merchants (email / webhook) when a competitor price moves significantly or a recommendation changes.
2. **Shopify OAuth** — replace the CSV upload flow with a Shopify app that pulls product catalog and pushes applied prices directly.
3. **Enhanced discovery** — extend the discovery layer with catalog-matching (e.g. "find similar products on Amazon by category") or more sophisticated domain-based targeting.

Auth hardening deferred from this phase:
- **Rate limiting** on `/api/auth/login` and `/api/auth/signup` (brute-force protection).
- **Password reset** flow (email token, expiry, one-time use).
- **CSRF hardening** beyond `sameSite=strict` (double-submit cookie or signed token) — `sameSite` is sufficient for cross-origin form posts but not for all attack surfaces.
- **Session revocation on password change** — current implementation does not invalidate existing sessions when a user changes their password.

---

## 7. How to resume

From `C:\Users\pohde\projects\priceiq` (prefix Bash cmds with `cd /c/Users/pohde/projects/priceiq &&`):
```bash
npm test            # expect 300 passing
npx prisma db push  # should say "already in sync"
npm run seed        # reseed demo merchant + 8 products (STOP dev server first — SQLite lock)
npm run dev         # background it; http://localhost:3000 — lands on /login
npm run build       # typecheck + production build
```

**Demo login:** `demo@priceiq.example` / `demo1234` — seeds one merchant with 8 products.

Hitting the app now starts at `/login`. After logging in, the dashboard shows only that merchant's products. Sign up a second account to verify isolation — its product list starts empty.

**Demo a live scrape:** log in → dashboard → upload `test-data/demo-scrape.csv` → open Ceramic Mug → "Refresh now" → LocalDemoShop moves toward 13.25. Edit the price in `public/demo-competitor.html` and re-refresh to watch it move. Competitors without URLs report `no_url` (expected).

---

## 8. Older context

For the original product vision, locked decisions, and deferred-feature list (auth/multi-tenant, real competitor discovery, Shopify OAuth, price-change alerts, billing), see specs/plans under `docs/specs/` and `docs/plans/`, and the Phase-A plan at `docs/superpowers/plans/` (commit `100ec56`).
