# Profit Opportunity Card — Design Spec

**Date:** 2026-07-10
**Status:** Approved

## Summary

Add a fifth stat card to the dashboard Overview tab that shows the total estimated gross profit uplift if all current recommendations are applied. When no models or recommendations exist, display a prompt directing the user to fit models.

## Layout

The existing 4-card stat row (`Products`, `Actionable`, `Below Margin Floor`, `Avg Profit Lift`) gains a fifth card: **Profit Opportunity**. The grid moves from `sm:grid-cols-4` to `sm:grid-cols-5` (or wraps on smaller screens — follow existing responsive pattern).

## The Number

**Formula (per product):**

```
currentGrossProfit = simulateProfit(model, currentPrice, cogs).predictedGrossProfitCents
opportunityCents   = currentGrossProfit × expectedProfitLiftPct
```

Only products that satisfy **all** of:
- Have a fitted `ElasticityModel`
- Have a `Recommendation` with `action ∈ { raise, lower }` (exclude hold)
- Have a non-null `cogs`

Sum `opportunityCents` across all qualifying products → `profitOpportunityCents`.

`expectedProfitLiftPct` is already stored in `recommendation.rulesJson`. Parse it server-side.

**Label:** `est. if all recs applied` — no monthly/annual commitment since unit volumes are user-supplied estimates.

## States

| Condition | Display |
|---|---|
| `profitOpportunityCents > 0` | Green value `+$X` with sub-label `est. if all recs applied` |
| `profitOpportunityCents === 0` and recommendations exist | `+$0` with sub-label `est. if all recs applied` |
| No models or no non-hold recommendations | Dashed border, prompt text `Fit models to unlock profit opportunities`, link `Go to Products →` that switches to the Products tab |

## Data Flow

```
portfolio/route.ts
  └── products (already queried with elasticityModel + recommendation)
        └── for each product with model + non-hold rec + cogs:
              simulateProfit(model, currentPrice, cogs) → currentGrossProfit
              opportunityCents = currentGrossProfit × rulesJson.expectedProfitLiftPct
        └── sum → profitOpportunityCents
  └── return { ...existing, profitOpportunityCents }

PortfolioStats.tsx
  └── PortfolioData interface: add profitOpportunityCents: number | null
  └── Render 5th StatCard or prompt card
```

`simulateProfit` is a pure function in `src/lib/elasticity/simulateProfit.ts` — import directly in the route, no API call needed.

## Files Changed

| File | Change |
|---|---|
| `src/app/api/products/portfolio/route.ts` | Import `simulateProfit`, compute and return `profitOpportunityCents` |
| `src/components/PortfolioStats.tsx` | Add field to `PortfolioData`, add `onGoToProducts?: () => void` prop, add 5th card (value state + prompt state), widen grid |
| `src/components/Dashboard.tsx` | Pass `onGoToProducts={() => setTab("products")}` to `PortfolioStats` |

No schema changes. No new files.

## Edge Cases

- Product has a model but `cogs` is null → skip (can't compute margin-aware profit)
- `expectedProfitLiftPct` missing or unparseable from `rulesJson` → skip that product, don't throw
- `predictedGrossProfitCents ≤ 0` (margin-negative) → skip (opportunity would be misleading)
- All products skipped → `profitOpportunityCents = 0` → show prompt (no recs that qualify)
