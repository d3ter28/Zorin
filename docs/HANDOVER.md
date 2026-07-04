# PriceIQ — Handover Doc

**Date:** 2026-07-04
**Project root:** `C:\Users\pohde\projects\priceiq`
**Current branch:** `master`
**Status:** ML pivot cleanup complete. Competitor scraping, discovery, and rule-based recommendation engine removed. **115 tests passing.** Working tree clean.

---

## ML Pricing Pivot (2026-07-04)

### What was removed
The competitor price scraping, discovery, and rule-based recommendation engine were removed as part of a product pivot.

Deleted modules:
- `src/lib/scrape/` — competitor URL scraper, price extractor, auto-refresh
- `src/lib/discovery/` — Brave Search API integration, competitor discovery
- `src/lib/recommendation.ts` + `comparison.ts` + `apply.ts` — rule-based price recommendations
- `src/lib/ingest/` — competitor price CSV ingestion
- `src/lib/ai/` — LLM recommendation phrasing
- All related API routes (`/api/refresh`, `/api/ingest`, `/api/apply`, `/api/products/[id]/discover`, etc.)
- Prisma models: `CompetitorPrice`, `CompetitorPriceObservation`, `CompetitorDomain`

### New direction
ML-based pricing: merchants upload their own sales/price history CSV, the app fits a price elasticity model per product, and generates demand forecasting + profit simulation + automated price recommendations.

### What survives and is reusable
- Auth, DB, product CRUD, COGS — unchanged
- `WhatIfSlider`, `RecommendationCard` — shell will be rewired to ML outputs
- `ProductUpload` — pattern reused for sales history CSV upload
- `src/lib/money.ts`, `src/lib/margin.ts` — useful for profit simulation

---

## 1. What PriceIQ is

An AI-native pricing tool for online store owners. The user uploads their **product catalog** and the app will generate ML-based pricing recommendations per product, with margin protection. Money is stored as **integer cents** everywhere. Auth is email + password; each account is its own isolated merchant — 1 user = 1 merchant. Demo login: `demo@priceiq.example` / `demo1234`.

---

## 2. Auth + multi-tenant (complete, merged)

Email + password authentication with full merchant isolation.

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
- **By-id endpoints** (`GET /api/products/[id]`) use `findFirst({ where: { id, merchantId } })` — a foreign `id` returns `404`, not `403`, to avoid leaking record existence.
- **Catalog upload** scopes writes to the session's `merchantId`.
- All auth-gated routes use `withErrorHandling` so `HttpError(401)` becomes a JSON `401` response, not a `500`.

---

## 3. Product catalog CSV import (complete, merged)

- `src/lib/products/parseProductCsv.ts`, `importProducts.ts`, route `POST /api/products/catalog`, `ProductUpload.tsx`.
- Upserts by `(merchantId, sku)`.

---

## 4. Key technical facts / gotchas

- **Stack:** Next.js **16.2.9** (App Router, **Turbopack**), TypeScript, Prisma **7** + `@prisma/adapter-better-sqlite3` (SQLite `dev.db`), Vitest **4**, Tailwind **v4** (OKLCH tokens). Path alias `@/` → `src/`.
- **AGENTS.md/CLAUDE.md:** this Next.js has breaking changes vs training data. **Read `node_modules/next/dist/docs/` before writing Next code.** Async route `params` is `Promise<{id}>` — must be awaited; client components use `use(params)`.
- **Windows working-dir drift (Bash tool):** commands run from `C:\Users\pohde` (home), not the project. **Always prefix git/npm/tsx with `cd /c/Users/pohde/projects/priceiq &&`** or they fail "not a git repository".
- **Tests:** Vitest projects — unit (node, src/**/*.test.ts) + ui (jsdom, src/**/*.test.tsx via @testing-library/react). **115 passing.**
- **DB:** no migrations. `npx prisma db push` to sync; `npm run seed` (8 products; **stop the dev server first — SQLite lock**).
- **Dev server:** background it (`run_in_background: true`); http://localhost:3000.
- **Money:** integer cents. `formatCents` / `dollarsToCents` in `src/lib/money.ts`.

### Dev-server route-tree corruption (hit + fixed previously)
A long-running Turbopack dev server can end up 404-ing nested `[id]/*` routes. **Fix: kill node, `rm -rf .next`, restart `npm run dev`.**

---

## 5. Next steps

1. **Sales history CSV upload** — merchants upload their own price/sales history. Reuse `ProductUpload` pattern; target `POST /api/products/sales-history`.
2. **Price elasticity model** — fit per-product demand curve from uploaded history. Store model params in DB.
3. **Profit simulation** — use `src/lib/money.ts` + `src/lib/margin.ts` to simulate demand and margin at candidate prices.
4. **ML recommendation** — automated raise/lower/hold recommendation from elasticity model, wired into `RecommendationCard` + `WhatIfSlider`.

Auth hardening deferred:
- **Rate limiting** on `/api/auth/login` and `/api/auth/signup`.
- **Password reset** flow.
- **CSRF hardening** beyond `sameSite=strict`.
- **Session revocation on password change.**

---

## 6. How to resume

From `C:\Users\pohde\projects\priceiq` (prefix Bash cmds with `cd /c/Users/pohde/projects/priceiq &&`):
```bash
npm test            # expect 115 passing
npx prisma db push  # should say "already in sync"
npm run seed        # reseed demo merchant + 8 products (STOP dev server first — SQLite lock)
npm run dev         # background it; http://localhost:3000 — lands on /login
npm run build       # typecheck + production build
```

**Demo login:** `demo@priceiq.example` / `demo1234` — seeds one merchant with 8 products.

Hitting the app now starts at `/login`. After logging in, the dashboard shows only that merchant's products. Sign up a second account to verify isolation — its product list starts empty.
