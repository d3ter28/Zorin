# PriceIQ — Apply Recommended Price (Slice 3)

**Date:** 2026-06-29
**Status:** Approved (design)
**Depends on:** Slice 1 (rules engine, recommendations) and Slice 2 (CSV ingestion) — merged to `master`

## 1. Problem

PriceIQ now ingests real competitor prices (Slice 2) and produces a margin-aware
recommendation with a concrete `suggestedPrice` for each product. But the merchant
cannot act on that recommendation inside the app — the loop is open. A recommendation
the merchant has to go execute somewhere else is just a suggestion, not a tool.

This slice closes the loop: a one-click **"Apply"** that writes the recommended price
to the product. This is the piece that turns PriceIQ from an interesting read-out into
a workable MVP.

## 2. Scope

**In scope:**
- A shared `decideForProduct` helper so the recommendation and apply endpoints compute
  the identical decision.
- A `POST /api/products/[id]/apply` endpoint that recomputes server-side, writes
  `currentPrice`, and invalidates the cached recommendation.
- An "Apply $X.XX" button on the existing `RecommendationCard`.

**Out of scope (deferred):** price-change history / audit trail, multi-product bulk
apply, undo, optimistic UI (we reload), and any change to the Slice-2 upload UI or its
known debts.

## 3. Design decisions (from brainstorming)

1. **Overwrite only** — applying writes `currentPrice`; no new table, no history. Mirrors
   how the cogs endpoint mutates a product field.
2. **Server-side recompute** — the button sends no price. The endpoint runs the decision
   on current data and applies *its* `suggestedPrice`. This guarantees a correct price
   even if competitor data changed after the card rendered, and prevents the client from
   submitting an arbitrary price.
3. **Hide on hold** — the button renders only for `raise`/`lower` actions. On `hold`,
   suggested == current, so there is nothing to apply.
4. **Focused slice** — no Slice-2 debt fixes bundled in.

## 4. Architecture

Three small units, each testable in isolation.

### 4.1 `decideForProduct` — shared decision helper

Added to `src/lib/recommendation.ts`. Takes a product with its competitor rows, builds
the observation array, and delegates to the existing `decide()`:

```ts
export function decideForProduct(product: {
  currentPrice: number;
  cogs: number | null;
  competitors: { price: number; observedAt: Date }[];
}): Decision {
  const obs = product.competitors.map((c) => ({
    price: c.price,
    observedAt: c.observedAt.toISOString(),
  }));
  return decide({ currentPrice: product.currentPrice, cogs: product.cogs }, obs);
}
```

**Why:** today the recommendation route inlines this mapping. The apply endpoint must
apply the *same* price the card displayed. One shared helper makes divergence impossible
and removes duplication. The existing recommendation route is refactored to call it.

### 4.2 `POST /api/products/[id]/apply` route

`src/app/api/products/[id]/apply/route.ts`. No request body. Wrapped in the existing
`withErrorHandling`.

```ts
export const POST = withErrorHandling(
  async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const product = await prisma.product.findUnique({
      where: { id },
      include: { competitors: true },
    });
    if (!product) throw new HttpError(404, "Not found");

    const decision = decideForProduct(product);
    const changed = decision.suggestedPrice !== product.currentPrice;
    if (changed) {
      await prisma.product.update({
        where: { id },
        data: { currentPrice: decision.suggestedPrice },
      });
      await prisma.recommendation.deleteMany({ where: { productId: id } });
    }
    return NextResponse.json({
      currentPrice: decision.suggestedPrice,
      action: decision.action,
      applied: changed,
    });
  },
);
```

- **raise/lower:** write the new price, delete the stale recommendation so it regenerates,
  return `applied: true`.
- **hold / no change:** no-op, return `applied: false`. Defensive — a direct call on a
  hold product cannot corrupt anything.

### 4.3 Apply button in `RecommendationCard`

`src/components/RecommendationCard.tsx`. The card already has
`decision.suggestedPrice` and `decision.action`, so no API/response change is needed.

- Render **"Apply $X.XX"** (`formatCents(suggestedPrice)`) only when
  `action !== "hold"`, beside the existing "Regenerate" button.
- On click: `POST /api/products/${productId}/apply`, show "Applying…" while in flight,
  then `window.location.reload()` so the page's current-price line, the WhatIfSlider, and
  the card all reflect the new price. After reload the action is `hold`, so the button
  disappears. Deliberately thin — matches the existing `IngestUpload` reload pattern.

## 5. Data flow

```
competitor data in DB
  → merchant clicks "Apply $X.XX"
  → POST /api/products/[id]/apply
  → decideForProduct(product)            -> Decision { suggestedPrice, action }
  → if changed: product.update(currentPrice) + recommendation.deleteMany
  → JSON { currentPrice, action, applied }
  → page reloads → card regenerates → now "hold"
```

## 6. Error handling

| Situation | Behavior |
|-----------|----------|
| Product not found | 404 (`HttpError` via wrapper) |
| Action is `hold` / suggested == current | 200, `applied: false`, no write |
| Valid raise/lower | 200, `applied: true`, price written, recommendation cleared |
| Unexpected DB failure | opaque 500 via existing wrapper (no stack leak) |

## 7. Testing

Matches existing conventions (unit + mocked-prisma route tests; UI verified by build +
manual, as with `IngestUpload`).

- **`decideForProduct` (unit):** maps competitor rows to observations and returns the
  decision `decide()` would for the same inputs (including the `observedAt` ISO mapping).
- **apply route (mocked prisma):**
  - raise/lower → `product.update` called with `{ currentPrice: suggestedPrice }`,
    `recommendation.deleteMany` called with the product id, response `applied: true`.
  - hold → no `update`, no `deleteMany`, response `applied: false`.
  - missing product → 404, no writes.
- **Refactor safety:** the recommendation route, now delegating to `decideForProduct`,
  keeps its existing tests green.
- Full suite (`npm test`) and `npm run build` stay green.

## 8. Definition of done

- `decideForProduct`, the apply route, and the card button implemented test-first.
- Recommendation route refactored to use `decideForProduct`; its tests still pass.
- All new tests pass alongside the existing 52.
- `npm run build` succeeds with no type errors; `/api/products/[id]/apply` in the route list.
- Manual end-to-end: applying a raise/lower recommendation changes the product's current
  price, clears the recommendation (regenerates to `hold`), and the button disappears.
- Branch finished via superpowers:finishing-a-development-branch.
