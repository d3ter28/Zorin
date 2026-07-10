---
title: PriceIQ Handover
tags:
  - priceiq
  - handover
  - saas
status: active
updated: 2026-07-08
phase: Phase 2 complete
tests: 153 passing
---

# PriceIQ Handover

## Overview

ML-powered pricing tool for online merchants. One user = one merchant, full tenant isolation. Money stored as integer cents everywhere.

| | |
|---|---|
| **Stack** | Next.js 16.2.9 (App Router, Turbopack), TypeScript, Prisma 7 + better-sqlite3, Vitest 4, Tailwind v4 (OKLCH tokens) |
| **Root** | `C:\Users\pohde\projects\priceiq` (master branch) |
| **Demo login** | `demo@priceiq.example` / `demo1234` (8 products) |
| **Dev server** | `npm run dev` → `http://localhost:3000` |
| **Tests** | `npm test` → 153 passing |

---

## Critical Gotchas

> [!WARNING] Shell paths
> Bash tool runs from `C:\Users\pohde`, **not** the project. Always prefix:
> `cd /c/Users/pohde/projects/priceiq &&`

> [!WARNING] Next.js breaking changes
> Read `node_modules/next/dist/docs/` before writing any Next.js code — this version differs from training data.
> - Async route params must be awaited: `Promise<{id}>`
> - Client components use `use(params)` not `await params`

> [!WARNING] Database
> No migrations. Use `npx prisma db push` to sync schema.
> Stop the dev server before `npm run seed` (SQLite file lock).

> [!INFO] Import aliases
> `@/lib/db` (not `@/lib/prisma`), `@/lib/auth/requireSession`

---

## Architecture

### Routes

| Path | Auth | Purpose |
|------|------|---------|
| `/` | Public | Marketing landing page |
| `/dashboard` | Required | Product list + portfolio stats |
| `/product/[id]` | Required | Product detail, ML tools |
| `/login` | Public | Login form |
| `/signup` | Public | Signup form |

### API shape

```
/api/auth/login              POST  - rate-limited (10 req / 15 min per IP)
/api/auth/logout             POST
/api/auth/signup             POST
/api/products                GET   - list with modelHealth field
/api/products/portfolio      GET   - aggregate stats
/api/products/[id]           GET
/api/products/[id]/fit-model POST
/api/products/[id]/recommend POST
/api/products/[id]/recommendation GET
/api/products/[id]/demand-curve   GET
/api/products/[id]/apply          POST  - price change + history entry
/api/products/[id]/price-history  GET
/api/products/[id]/sales-records  GET   - last 100, includes promotionFlag
/api/products/[id]/flag-promotions POST (auto-detect) / PATCH (manual toggle)
/api/products/[id]/what-if        GET
```

### Auth pattern

```typescript
// API routes
const { merchantId } = await requireSessionApi();

// Page routes (server component)
const user = await requireSessionPage();

// Ownership guard
await assertProductOwned(productId, merchantId);
```

### Error handling

All API routes use `withErrorHandling(handler)` + `throw new HttpError(status, message)`.

---

## Key Files

```
prisma/schema.prisma                   DB schema
src/app/page.tsx                       Marketing landing page
src/app/dashboard/page.tsx             Authenticated dashboard
src/app/product/[id]/page.tsx          Product detail (client component)

src/app/api/products/route.ts          Product list
src/app/api/products/portfolio/route.ts Portfolio aggregates
src/app/api/products/[id]/apply/route.ts  Apply price + log PriceChange
src/app/api/products/[id]/price-history/route.ts
src/app/api/products/[id]/demand-curve/route.ts
src/app/api/products/[id]/sales-records/route.ts
src/app/api/products/[id]/flag-promotions/route.ts
src/app/api/auth/login/route.ts        Rate-limited login

src/lib/elasticity/                    ML: fit, simulate, recommend
  fitModel.ts                          Log-log OLS elasticity
  simulate.ts                          Revenue/profit projection
  recommend.ts                         Action: raise / lower / hold
  detectPromotions.ts                  Z-score outlier flagging

src/lib/auth/
  session.ts                           createSession (prunes expired), getSessionUser
  rateLimit.ts                         In-memory sliding-window limiter
  password.ts                          Argon2id hash/verify
  requireSession.ts                    Auth guards

src/components/
  ModelHealthBadge.tsx                 Strong / Fair / Weak / None badge
  RecommendationCard.tsx               ML rec with badge
  DemandCurve.tsx                      Pure SVG price vs units chart
  PriceHistory.tsx                     Price change timeline
  PromotionFlags.tsx                   Flag table + auto-detect
  PortfolioStats.tsx                   Dashboard aggregate cards
  WhatIfSlider.tsx                     Price simulator
  ProductsTable.tsx                    Dashboard product list

src/components/marketing/             Landing page sections
  Navbar / Hero / LogoWall / HowItWorks / Features / Pricing / Footer
```

---

## Completed Work

### Marketing landing page

Full public landing page at `/`. Dashboard moved to `/dashboard`.

Sections: Navbar → Hero (asymmetric split) → LogoWall (5 platforms) → HowItWorks (gap-px grid) → Features (bento `md:grid-cols-3`) → Pricing (2 plans) → Footer.

Design: emerald-600 accent, zinc neutrals, Geist font, dark mode variants, `motion/react` entry animations. Built per taste-skill (no em-dashes, eyebrow ≤ 2, hero ≤ 2 lines at `md:text-5xl`).

### Task 9 — Model health badge

Badge tiers based on elasticity model quality:

| Tier | R² | Data points |
|------|----|-------------|
| Strong | ≥ 0.7 | ≥ 30 |
| Fair | ≥ 0.5 | ≥ 10 |
| Weak | any | any (model exists) |
| None | — | no model |

Shown in `ProductsTable` (size sm) and `RecommendationCard` (size md).

### Task 10 — Demand curve chart

`DemandCurve.tsx` — pure SVG, plots units vs price from log-log model. "Now" marker at current price, "Rec." marker at suggested price. Fetches from `/api/products/[id]/demand-curve`.

### Task 11 — Price change history

- `POST /api/products/[id]/apply` — validates new price, `prisma.$transaction` to update `currentPrice`, create `PriceChange` row, delete stale `Recommendation`
- `GET /api/products/[id]/price-history` — last 20 changes, desc
- `PriceHistory.tsx` — up/down arrows, from→to prices, date/time

### Task 12 — Portfolio dashboard

`GET /api/products/portfolio` aggregates across all merchant products:

```typescript
{
  totalProducts, avgMargin, avgProfitLiftPct,
  belowFloor,              // products with margin < 15%
  modelHealth: { strong, fair, weak, none },
  actions: { raise, lower, hold }
}
```

`PortfolioStats.tsx` shows 4 stat cards + segmented model health bar.

### Task 13 — Promotion flagging

`detectPromotions.ts` — log-space residuals vs fitted log-log model, flags records where z-score > 2.0. Promotions skew elasticity fits upward, so they're excluded from `fit-model`.

- `POST /api/products/[id]/flag-promotions` — auto-detects and bulk updates
- `PATCH /api/products/[id]/flag-promotions` — manual `{ recordId, flagged }` toggle
- `PromotionFlags.tsx` — table with per-row toggle + Auto-detect button (disabled without model)

### Task 14 — Auth hardening

**Rate limiting** (`src/lib/auth/rateLimit.ts`):
- In-memory sliding window: 10 attempts / 15 min per IP
- Auto-prunes stale entries every 10 min via `setInterval`
- Applied to `POST /api/auth/login`: extracts IP from `x-forwarded-for` → `x-real-ip` → `"unknown"`
- Clears bucket on successful login

**Session pruning** (`src/lib/auth/session.ts`):
- `createSession()` deletes expired sessions for the user before inserting a new one
- `getSessionUser()` already deleted expired sessions on lookup (unchanged)

**Constant-time auth** (`login/route.ts`):
- Always runs `verifyPassword` even when user not found (dummy hash) — prevents timing oracle on email existence

---

## Phase status

| | Task | Status |
|-|------|--------|
| Phase 1 | ML core (fit, simulate, recommend, upload) | ✅ Complete |
| Phase 2 | 9 — Model health badge | ✅ Complete |
| | 10 — Demand curve | ✅ Complete |
| | 11 — Price change history | ✅ Complete |
| | 12 — Portfolio dashboard | ✅ Complete |
| | 13 — Promotion flagging | ✅ Complete |
| | 14 — Auth hardening | ✅ Complete |

**153 tests passing. All Phase 2 tasks done.**

---

## Next session

No pending tasks. Possible Phase 3 directions:
- Email notifications (price rec ready, weekly digest)
- CSV export of price history / sales records
- Multi-currency support
- Stripe billing for Growth tier
- Role-based access (team members per merchant)
