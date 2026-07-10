# PriceIQ — Handover Doc

**Date:** 2026-07-09
**Project root:** `C:\Users\pohde\projects\priceiq`
**Current branch:** `master`
**Status:** Phase 1 + Phase 2 + Phase 3 confidence model + Dashboard redesign + Shopify integration — **COMPLETE. 241 tests passing.**

---

## Session Summary

### Phase 1 — ML Pricing Core (2026-07-04 → 2026-07-05)

Executed via Subagent-Driven Development across two sessions. Each task was implemented by a fresh subagent, reviewed by a separate reviewer, and a final whole-branch review conducted with all findings fixed.

| Task | Description | Commits |
|------|-------------|---------|
| 1 | SalesRecord + ElasticityModel DB schema | `8f33ac7` |
| 5 | Log-log OLS elasticity model fitting | `795855d` |
| 2 | Sales history CSV parser | `d8c6665` |
| 6 | Profit simulation + recommendation engine | `c415cfa`, `c77a380` |
| 3 | Sales history import + API route | `9157b5f` |
| 4 | Sales history upload UI | `5111a32` |
| 7 | Fit-model + recommend API routes | `05f7412` |
| 8 | Rewire RecommendationCard + WhatIfSlider to ML | `77dbb36` |
| — | Final review fixes | `5483e05` |

### Phase 2 — SMB Polish (2026-07-05 → 2026-07-07)

Dashboard redesign, trust signals, and retention-driving features.

| Task | Description | Commits |
|------|-------------|---------|
| — | Dark sidebar AppShell + nav | `e390c70`, `cbf33c9` |
| — | Dashboard tabs + top opportunities panel | `0e5fc5d` |
| — | Portfolio sales trend chart | `69d622e` |
| — | CSV export route + download button | `bae5577` |
| — | Fix hold in OpportunityRow type | `0e5fc5d` |

### Dashboard Redesign (2026-07-08)

| Task | Description | Commits |
|------|-------------|---------|
| 1 | AppShell + dark sidebar nav (all authenticated pages) | `e390c70`, `cbf33c9` |
| 2 | Dashboard tabs (Overview/Products) + Top Opportunities panel | `0e5fc5d` |
| 3 | Portfolio sales trend chart (SVG, monthly aggregation from SalesRecord) | `69d622e` |
| 4 | Export CSV route + download button in dashboard header | `bae5577` |

### Phase 3 — Confidence-Weighted Elasticity (2026-07-08)

Executed via Subagent-Driven Development (4 tasks). All 4 tasks passed spec + code quality review.

| Task | Description | Commits |
|------|-------------|---------|
| 1 | Time-decay WLS in fitElasticityModel + effectiveSampleSize | `a304616`, `1320572` |
| 2 | bayesianShrinkage + computeConfidenceScore utilities | `ff8af38`, `e543b44` |
| 3 | Wire confidence pipeline in fit-model + recommend routes | `40d30b3` |
| 4 | Surface confidenceScore in ModelHealthBadge + all UI call sites | `9344442`, `5a7e3d8`, `a58db8f`, `8448364` |

### Shopify Integration (2026-07-09)

Executed via Subagent-Driven Development (7 tasks). All passed spec + code quality review. Merchants connect a Shopify store, click "Sync now", and products/orders flow directly into the ML pricing pipeline — no CSV required.

| Task | Description | Commits |
|------|-------------|---------|
| 1 | Schema: `ShopifyConnection` model + `Product.shopifyVariantId` | `eeaef38` |
| 2 | AES-256-GCM token encryption (`encryptToken`/`decryptToken`) | `ffd9ac8`, `558730a` |
| 3 | `ShopifyClient`: REST API client with Link pagination + 429 retry | `b6d1718` |
| 4 | `syncProducts`: variant import, SKU-match to existing products | `07eb298` |
| 5 | `syncOrders`: additive SalesRecord upsert (no double-count on re-sync) | `2083c2e` |
| 6 | API routes: connect / disconnect / sync / status | `decb859`, `8a6255f` |
| 7 | Settings UI: ShopifyConnectionCard (5-state, confirm on disconnect) | `c956b7a`, `979e670` |

---

## ML Pipeline (end-to-end flow)

1. Merchant uploads sales history CSV → `POST /api/products/sales-history`
2. Merchant clicks "Fit Model" → `POST /api/products/[id]/fit-model`
   - Fits **Weighted Least Squares** log-log elasticity model (time-decay: `2^(−daysAgo/90)`)
   - Returns `elasticity`, `intercept`, `r2`, `dataPoints`, `effectiveSampleSize`
3. Bayesian shrinkage applied → shrinks raw elasticity toward retail prior (−1.2) based on `effectiveSampleSize`
4. Confidence score computed: `r2 × min(1, ESS/20)`, clamped [0,1]
5. Merchant clicks "Get Recommendation" → `POST /api/products/[id]/recommend`
   - Scan width is confidence-adjusted: ±10% at confidence=0, ±30% at confidence=1
   - Returns raise/lower/hold with reasoning; appends "Limited data" note if confidence < 0.4
6. `RecommendationCard` displays action, reasoning, expected profit lift, model quality
7. `ModelHealthBadge` tier is confidence-based: ≥0.7 = Strong, ≥0.4 = Fair, <0.4 = Weak
8. `WhatIfSlider` lets merchant apply the suggested price

---

## Key Files

### Elasticity library (`src/lib/elasticity/`)

| File | Purpose |
|------|---------|
| `fitElasticityModel.ts` | WLS log-log regression with time-decay weights; returns `effectiveSampleSize` |
| `bayesianShrinkage.ts` | James-Stein shrinkage toward retail prior (−1.2), weight = n/(n+k), k=5 |
| `confidenceScore.ts` | `computeConfidenceScore(r2, ESS)` = r² × min(1, ESS/20), clamped [0,1] |
| `simulateProfit.ts` | Demand/profit prediction at a candidate price |
| `generateRecommendation.ts` | Price scan → raise/lower/hold; confidence-adjusted scan width |

### API routes

| Route | Purpose |
|-------|---------|
| `POST /api/products/sales-history` | CSV upload → upsert SalesRecord rows |
| `POST /api/products/[id]/fit-model` | WLS fit → upsert ElasticityModel (stores shrunkElasticity, ESS, confidenceScore, priorApplied) |
| `POST /api/products/[id]/recommend` | Generate recommendation → upsert Recommendation |
| `GET /api/products/[id]/demand-curve` | Returns model + confidenceScore for chart |
| `GET /api/products` | Portfolio list with modelHealth (includes confidenceScore) |
| `GET /api/reports/pricing?format=csv` | CSV export of full product + recommendation data |
| `GET /api/products/export` | Dashboard CSV export (sku, title, price, cogs, margin, recommendation) |
| `GET /api/products/portfolio/trend` | Monthly avg price trend from SalesRecord (12-month lookback) |
| `POST /api/shopify/connect` | Normalize domain, verify token, encrypt, upsert ShopifyConnection |
| `POST /api/shopify/disconnect` | Delete ShopifyConnection |
| `POST /api/shopify/sync` | Fetch all products + orders, run syncProducts + syncOrders, update lastSyncedAt |
| `GET /api/shopify/status` | `{ connected, shopDomain?, lastSyncedAt? }` |

### UI components

| Component | Purpose |
|-----------|---------|
| `ModelHealthBadge.tsx` | Confidence-based tier badge (Strong/Fair/Weak/None); tooltip shows "Confidence: X%" |
| `RecommendationCard.tsx` | Displays ML recommendation; receives confidenceScore for badge |
| `DemandCurve.tsx` | SVG demand curve chart; passes confidenceScore to badge |
| `ProductsTable.tsx` | Portfolio table; modelHealth includes confidenceScore |
| `AppShell.tsx` | Layout wrapper: dark sidebar + scrollable content area |
| `Sidebar.tsx` | Dark nav: Dashboard / Settings links, active state, logout |
| `PortfolioTrendChart.tsx` | SVG line chart of monthly avg price from SalesRecord |
| `ShopifyConnectionCard.tsx` | 5-state Shopify connection UI (loading/disconnected/connecting/connected/syncing) |

---

## Prisma Schema — Key Models

```prisma
model ElasticityModel {
  effectiveSampleSize Float   @default(0)  // sum of time-decay weights
  confidenceScore     Float   @default(0)  // r2 × min(1, ESS/20)
  priorApplied        Boolean @default(false)
  // + elasticity (shrunk), intercept, r2, dataPoints, fittedAt
}
```

The `elasticity` field stored is the **shrunk** value (Bayesian shrinkage applied), not the raw OLS value.

---

## MVP Gaps (not yet built)

| Gap | Severity |
|-----|----------|
| **Billing / payments (Stripe)** | Hard blocker to charge customers |
| **Password reset via email** | Users who forget password are locked out |
| **Production database (Postgres)** | SQLite is local-only |
| **Deployment** | Not hosted anywhere |
| **Email verification** | Medium |

---

## What's Next

| Item | Description | Priority |
|------|-------------|----------|
| **Billing (Stripe)** | Hard blocker to charge customers | 🔴 Critical |
| **Deployment** | Not hosted anywhere; SQLite → Postgres needed first | 🔴 Critical |
| **Password reset** | Users who forget password are locked out | 🟡 High |
| **Shopify webhooks** | Real-time product/order sync (needs public URL — deferred) | 🟡 High |
| **Multi-user / team roles** | Owner / Analyst / Viewer | 🟢 Medium |
| **Postgres migration** | SQLite is local-only; required for production hosting | 🟢 Medium |
| **Cross-product cannibalization detection** | Advanced ML | 🔵 Later |
| **Developer REST API** | API key auth for integrations | 🔵 Later |

Full roadmap: `docs/superpowers/plans/2026-07-04-priceiq-roadmap.md`

**Recommended next:** Billing (Stripe) + deployment — everything else is nice-to-have until there's a way to charge customers.

---

## How to Resume

### Quick check
```bash
cd /c/Users/pohde/projects/priceiq
npm test            # expect 241 passing
npx prisma db push  # should say "already in sync"
```

### Key technical facts / gotchas

- **Stack:** Next.js **16.2.9** (App Router, Turbopack), TypeScript, Prisma **7** + `@prisma/adapter-better-sqlite3`, Vitest **4**, Tailwind **v4**
- **AGENTS.md:** Read `node_modules/next/dist/docs/` before writing Next code. Async route `params` is `Promise<{id}>` — must be awaited.
- **Windows working-dir drift (Bash tool):** Always prefix with `cd /c/Users/pohde/projects/priceiq &&`
- **DB:** `npx prisma db push && npx prisma generate` to sync (both required for schema changes); `npm run seed` for demo data (**stop dev server first — SQLite lock**)
- **Money:** integer cents everywhere. `formatCents` / `dollarsToCents` in `src/lib/money.ts`
- **Demo login:** `demo@priceiq.example` / `demo1234`
- **Tailwind v4:** Color classes use OKLCH syntax e.g. `bg-[color:oklch(0.96_0.04_150)]`
- **Dev-server route-tree corruption:** Long-running Turbopack can 404 nested routes. Fix: kill node, `rm -rf .next`, restart.
- **Import paths:** Use `@/lib/db` (not `@/lib/prisma`), `@/lib/auth/requireSession` (not `requireSessionApi`)
- **Error handling:** Routes use `withErrorHandling` wrapper + `HttpError` throws
- **confidenceScore in badge:** `ModelHealthBadge` uses confidence-based tiers when `confidenceScore` is passed; falls back to legacy r²/dataPoints thresholds when null (for old data)
- **Portfolio route gap (task chip pending):** `src/app/api/products/portfolio/route.ts` still uses hardcoded r²/dataPoints thresholds for `modelsStrong`/`modelsFair`/`modelsWeak` counts — diverges from badge tiers. Fix: extract `getTier` into `src/lib/elasticity/tier.ts` and use in both places.
- **Shopify — custom app only:** Uses merchant-pasted Admin API access token (not OAuth). Tokens encrypted at rest with AES-256-GCM; key in `SHOPIFY_ENCRYPTION_KEY` env var (64 hex chars). Webhook handler is deferred (needs public URL).
- **Shopify sync is additive:** `syncOrders` increments `unitsSold` on existing SalesRecords rather than replacing — re-syncing the same period is safe. `syncProducts` matches by SKU (case-insensitive) to link CSV-imported products to Shopify variants.
- **Shopify lib:** `src/lib/shopify/` — `crypto.ts`, `client.ts`, `syncProducts.ts`, `syncOrders.ts`
