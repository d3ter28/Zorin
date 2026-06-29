# PriceIQ — Handover Doc

**Date:** 2026-06-30
**Project root:** `C:\Users\pohde\projects\priceiq`
**Current branch:** `master`
**Status:** MVP working end-to-end. Product import feature shipped; two runtime bugs fixed. Working tree clean (all committed).

---

## 1. What PriceIQ is

An AI-native pricing tool for online store owners. The user uploads their **product catalog** and **competitor prices** (both via CSV), and the app gives plain-English **raise / lower / hold** recommendations per product, with margin protection. Money is stored as **integer cents** everywhere. Single seeded merchant, no auth (this is still an MVP slice).

Decision engine is rules-based (`src/lib/recommendation.ts`); an LLM only phrases the result, with a deterministic fallback so the app never depends on the network.

## 2. Most recent work (this session)

Two features/fixes landed on `master`:

1. **Product catalog CSV import** (commit `805036f`) — mirrors the existing competitor ingest flow.
2. **Margin-floor convergence fix** (commit `d966d14`) — Bug #2 below.

Earlier in the session two runtime bugs the user found by manual testing were fixed:

- **Bug #1 — product detail page hung / 404'd.** Root cause: a route folder was named `import` (a JS reserved word), which **broke Turbopack's route codegen** and poisoned ALL sibling `/api/products/[id]/*` routes. Fix: renamed the folder `import` → `catalog` (route is now `/api/products/catalog`), updated the fetch path in `ProductUpload.tsx` and the route test's `describe`. A follow-on stale `.next/types/validator.ts` tsc error was cleared with `rm -rf .next` + `npm run build`. **Lesson: never name a route segment after a JS reserved word under Turbopack.**
- **Bug #2 — bulk "Apply N changes" never converged.** Root cause: `floorPrice` used `Math.round`, which for some COGS produced a price whose actual margin was *fractionally below* the 15% floor (e.g. cogs 2200 → `round(2588.24)=2588`, margin 14.99%). The engine kept recommending "raise to floor", apply wrote a no-op, and the product never reached "hold". Fix: `Math.round` → `Math.ceil` in `floorPrice` so the floor price always clears the margin floor. Done via TDD (RED test added, then GREEN).

## 3. The product import feature (commit `805036f`)

Files:
- `src/lib/products/parseProductCsv.ts` (+ `.test.ts`) — parses `sku,title,current_price,category,cogs,est_units` (6 cols; cogs/est_units optional; dollars→cents; rejects price ≤ 0).
- `src/lib/products/importProducts.ts` (+ `.test.ts`) — `importProducts(prisma, merchantId, parsed)`: upserts by `(merchantId, sku)`, invalidates stored recommendations for updated products (`touched`).
- `src/app/api/products/catalog/route.ts` (+ `route.test.ts`) — `POST`; resolves merchant via `prisma.merchant.findFirst()` or creates a default `{ name: "My Store", storeUrl: "" }`, then calls `importProducts`. 400 on empty body.
- `src/components/ProductUpload.tsx` — UI mirroring `IngestUpload`; POSTs to `/api/products/catalog`; summary shows added / updated / skipped + per-line errors.
- `src/components/Dashboard.tsx` (modified) — renders `<ProductUpload>` above `<IngestUpload>`.
- `test-data/products.csv`, `test-data/competitors.csv`, `test-data/products-with-errors.csv` — coffee-gear sample data engineered to exercise every decision branch:
  - GRD-100 Hand Grinder → **raise** (below median)
  - SCALE-200 → **lower** (above median)
  - KETTLE-300 → **hold** (near median)
  - FILTER-400 → **raise to floor** (margin below 15%)
  - TAMP-500 → **hold** (no competitor data)
  - MUG-600 → **lower to floor** (above median but clamps at margin floor)

## 4. Key technical facts / gotchas

- **Stack:** Next.js **16.2.9** (App Router, **Turbopack**), TypeScript, Prisma **7** + `@prisma/adapter-better-sqlite3` (SQLite), Vitest **4**, Tailwind **v4** (OKLCH design tokens). Path alias `@/` → `src/`.
- **AGENTS.md / CLAUDE.md warn this Next.js has breaking changes vs training data.** Read `node_modules/next/dist/docs/` before writing Next-specific code. Async route `params` is `Promise<{ id: string }>` — must be awaited.
- **Vitest config includes `src/**/*.test.ts` ONLY** — node env, no jsdom, no `.tsx` component tests. So unit tests do NOT cover route registration or in-browser apply convergence; both runtime bugs were found by manual testing. **Verify behavior in the running app, not just `npm test`.**
- **Working-directory drift in the Bash tool:** commands sometimes run from `C:\Users\pohde` (home) instead of the project. **Always prefix git/npm/tsx commands with `cd /c/Users/pohde/projects/priceiq &&`.**
- **SQLite lock:** stop the dev server before `npm run seed` (otherwise the DB is locked). After smoke-testing, re-seed to restore clean demo data.
- **Dev server must be backgrounded** with `run_in_background: true` (it dies if the spawning shell returns). Runs on http://localhost:3000.
- **Decision engine** (`src/lib/recommendation.ts`): `MIN_MARGIN_FLOOR = 0.15`, `POSITION_BAND = 0.1` (±10% of median = "at market"). Rule order: (1) no competitor data → hold; (2) margin < floor → raise to floor (overrides position); (3) >10% above median → lower toward median (clamped at floor); (4) >10% below median → raise toward median; (5) within band → hold. `decideForProduct` maps competitor rows → observations → `decide`.
- **Apply semantics** (`src/lib/apply.ts`): `applyDecision(productId)` recomputes the decision and only writes if `suggestedPrice !== currentPrice`, clearing the stored recommendation on change. A no-op recommendation (suggested === current) is what caused Bug #2's non-convergence.

## 5. Current repo state

- Branch `master`, **working tree clean.** All work committed.
- Test suite: **`npx vitest run` → 84/84 passing.**
- `test-data/` is **tracked** in the repo (sample fixtures for the import feature).

Recent git log:
```
d966d14 fix: round margin-floor price up so recommendations converge
805036f feat: product catalog CSV import
5b67995 feat: UI/UX pass — fix dead feedback states, add error/empty/loading states, OKLCH redesign
ad867a6 feat: wire what-if slider to Apply as manual override, drop dead Regenerate
68ea756 Merge fix-tsc-route-tests: clean up route-test type errors
```

## 6. How to resume

From `C:\Users\pohde\projects\priceiq`:
```bash
npm run dev            # background it; serves http://localhost:3000
npm run seed           # reseed clean demo data (STOP the dev server first — SQLite lock)
npx vitest run         # 84 tests, all green
npm run build          # typecheck + production build
```
Manual smoke test for the two fixed bugs: open an individual product detail page (Bug #1 — should load, not hang), and use bulk "Apply N changes" on the dashboard (Bug #2 — every selected change should apply and settle to "hold", no stuck rows).

## 7. Possible next steps (not started, not requested)

- Path to testing the MVP with real users (was discussed but not actioned).
- Auth / multi-tenant, real competitor scraping/discovery, Shopify OAuth, price-change alerts, billing — all still deferred (see git history for the original Slice 1 scope).

## 8. Older context

This doc replaces the original Slice 1 planning handover. For the original product vision, locked decisions, and deferred-feature list, see the specs/plans under `docs/specs/` and `docs/plans/`.
