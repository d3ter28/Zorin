# PriceIQ — Slice 1 Design

**Date:** 2026-06-28
**Status:** Approved (design); pending implementation plan
**Project location:** `C:\Users\pohde\projects\priceiq`

## 1. Product Context

PriceIQ is an AI-native, SMB-friendly pricing tool for online store owners (Shopify and
general ecommerce). The full product tracks competitor prices, analyzes margins, and delivers
plain-English pricing recommendations.

The full product is a platform of several independent subsystems:

1. Store integration / ingestion (Shopify OAuth + generic URL crawler)
2. Competitor discovery
3. Competitor scraping
4. Margin & analytics engine
5. AI recommendation layer
6. Dashboard / web app (auth, billing, UI)

Building all six at once would produce a vague, wrong-everywhere design. Instead we build a
**thin vertical slice** first that proves the core value loop, then layer the rest as separate
spec → plan → build cycles.

## 2. Slice 1 Scope

**Goal:** A single-merchant dashboard, seeded with mock data, that:

- Lists the merchant's products with current price, COGS input, and computed margin
- Compares each product against tracked competitors (median / min / position)
- Produces a plain-English AI pricing recommendation per product (raise / lower / hold)
- Lets the merchant explore prices interactively (what-if slider)
- Surfaces how trustworthy each recommendation is (data-confidence indicator)

**In scope:**

- Mock/seed data (no scraping)
- Single seeded merchant, **no auth**
- Product list + margin
- Price comparison view
- AI recommendation (rules decide, LLM phrases)
- What-if price slider (client-side math)
- Data-confidence / freshness indicator
- Margin-floor warning badge
- Revenue-opportunity column (rough estimate)

**Explicitly OUT of scope (see Future Work):** Shopify OAuth, live scraping, competitor
discovery, auth / multi-tenancy, billing, category benchmarking, discount / net-revenue
analysis, price-change alerts, repricing automation.

## 3. Architecture

One Next.js (App Router) + TypeScript application.

| Layer | Responsibility |
|---|---|
| **Data** | Prisma + SQLite. Seed script loads one merchant, ~8 products, ~3 competitors each. |
| **Domain (`/lib`)** | Pure TS, no I/O: `margin.ts`, `comparison.ts`, `recommendation.ts` (rules engine). Fully unit-testable. |
| **AI (`/lib/ai`)** | `phraseRecommendation()` — takes the rules-engine *Decision* object, calls Claude for plain-English copy. Deterministic fallback when no API key. |
| **API routes** | `GET /api/products`, `POST /api/products/:id/cogs`, `POST /api/products/:id/recommendation`. |
| **UI** | Dashboard table + per-product detail panel. |

**Key boundary — rules decide, LLM only phrases.** The recommendation logic is a pure function
returning a structured `Decision`. Claude never sees raw data and never invents numbers; it only
turns the decision's human-readable `reasons` into polished copy. This makes pricing logic
testable, auditable, and keeps the AI swappable and optional.

## 4. Data Model

Prisma models in SQLite. **All money stored as integer cents** to avoid floating-point drift.

```
Merchant
  id, name, storeUrl, createdAt
  products  Product[]

Product
  id, merchantId, title, sku
  currentPrice   Int      // cents
  cogs           Int?     // cents, merchant-entered; null = margin unknown
  category       String   // used later for benchmarking
  estUnits       Int?     // rough monthly units, for revenue-opportunity estimate
  createdAt
  competitors    CompetitorPrice[]

CompetitorPrice
  id, productId
  competitorName String
  competitorUrl  String?
  price          Int      // cents
  observedAt     DateTime // seed = now; seam for real scraping later

Recommendation             // cached last recommendation per product
  id, productId (unique)
  action         String    // "raise" | "lower" | "hold"
  deltaPct       Float     // signed suggested change; 0 for hold
  rulesJson      String    // serialized Decision (reasons, signals, inputs)
  phrasing       String    // plain-English text (LLM or fallback)
  generatedAt    DateTime
```

**Decisions:**

- Money as integer cents everywhere.
- `cogs` nullable — margin is "unknown" when absent; rules degrade gracefully (advise on
  competitive position only).
- `CompetitorPrice` as time-stamped observations (not a single price field) — this is the seam
  where real scraping plugs in later with zero schema change.
- `Recommendation` cached to avoid re-calling the LLM on every page load.
- **On COGS update: invalidate the cached recommendation** (delete it). It is regenerated on
  demand the next time the product's detail panel is opened.

## 5. Recommendation Engine (rules)

`recommendation.ts`: pure function `decide(product, competitorPrices) → Decision`.

**Signals computed:**

- `marginPct` = `(price − cogs) / price` (null if no COGS)
- `compMedian`, `compMin`, `compMax`
- `pctVsMedian` = `(price − compMedian) / compMedian`
- `marginFloorPrice` = lowest price that still clears the **minimum margin floor** (default **15%**)

**Rules — evaluated in this order, first match wins. Margin floor is checked FIRST.**

| # | Condition | Action |
|---|---|---|
| 1 | No competitor data | **hold** — "not enough competitor data" |
| 2 | Margin known **and** below the 15% floor | **raise** to `marginFloorPrice` — "price is below your margin floor" (overrides position rules) |
| 3 | Priced **above** median by >10% and margin healthy | **lower** toward median, never below `marginFloorPrice` |
| 4 | Priced **below** median by >10% and margin has headroom | **raise** toward median (capped) — capture left-on-table margin |
| 5 | Priced near median (±10%) | **hold** — "competitively positioned" |

**Precedence:** margin-floor-wins. Protecting profitability outranks matching the market.

Every branch returns:

```ts
Decision = {
  action: "raise" | "lower" | "hold",
  deltaPct: number,          // signed
  suggestedPrice: number,    // cents
  reasons: string[],         // human-readable facts, e.g.
                             // "You're 14% above the competitor median"
                             // "Lowering to the median still leaves a 32% margin"
  signals: { marginPct, compMedian, compMin, compMax, pctVsMedian,
             marginFloorPrice, competitorCount, oldestObservedAt }
}
```

The `reasons` array is what the LLM phrases — it never sees raw numbers it could miscompute.

**Config:** `MIN_MARGIN_FLOOR = 0.15`, stored as a constant; later becomes a per-merchant setting.

## 6. AI Phrasing Layer

`phraseRecommendation(decision) → string`. Input is the structured `Decision`; output is 1–2
sentences of plain-English advice.

- **Model:** `claude-haiku-4-5` (cheap, fast, sufficient for short copy). Called server-side.
  API key from `ANTHROPIC_API_KEY` env var.
- **Prompt contract:** Claude is instructed to *phrase, not decide* — it must not introduce
  numbers or actions absent from the `Decision`. All figures come from the rules.
- **Graceful fallback:** if the API key is missing or the call fails, a deterministic template
  renders the same `reasons` into readable text. The app never breaks because the LLM is
  unavailable; this also makes the flow testable without network access.
- **Caching:** stored in `Recommendation.phrasing`; regenerated only on demand.

## 7. UI

Tailwind, clean and functional. Two views:

1. **Products table (`/`):** columns — Title, Current Price, COGS (inline-editable),
   Margin %, Competitor Median, Position badge (above / at / below market), Margin-floor
   warning badge, Revenue-opportunity estimate, Recommendation chip (🔴 lower / 🟢 raise /
   ⚪ hold). Editing COGS posts to the API, recomputes margin live, and invalidates that row's
   cached recommendation.
2. **Product detail panel (`/product/[id]` or drawer):** your price vs. each competitor
   (bar list), the signals, the data-confidence indicator (competitor count + freshness of
   `observedAt`), the **what-if price slider** (drag a hypothetical price; margin % and market
   position update live, client-side, no LLM), and the plain-English recommendation with a
   **Regenerate** button.

## 8. Testing

- **Unit tests (priority, built test-first / TDD):** `margin.ts`, `comparison.ts`, and every
  branch of `recommendation.ts`. Edge cases: no COGS, no competitors, below-floor price,
  exact-median price, single competitor.
- **AI layer:** tested via the deterministic fallback (no live LLM in tests). A contract test
  asserts phrasing never introduces numbers absent from the `Decision`.
- **API routes:** integration tests against a seeded test SQLite DB.

## 9. Future Work (each its own spec → plan → build cycle)

- Category benchmarking (store averages vs. category norms)
- Discount / net-revenue analysis (needs order/sales history)
- Real scraping + Shopify OAuth + competitor discovery
- Price-change history & alerts (schema already supports time-stamped observations)
- Repricing rules / automation within guardrails
- Multi-tenant auth + billing

## 10. Migration Notes

- SQLite → Postgres is a Prisma datasource change; integer-cents money and observation-based
  competitor prices are already production-shaped.
- The rules/LLM split means the recommendation engine can be reused unchanged when real data
  replaces seed data.
