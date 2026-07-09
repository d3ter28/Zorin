# Shopify Price Write-Back — Design Spec

**Date:** 2026-07-10
**Status:** Approved

## Summary

Close the loop between PriceIQ and Shopify: when a user applies a price change (single or bulk), push the new price to the Shopify Admin API before committing locally. If the Shopify push fails, the local change rolls back — keeping PriceIQ and Shopify in sync at all times.

## Current State

- `ShopifyClient` (read-only): `fetchAllProducts()`, `fetchOrders()`, `verifyConnection()`
- `syncProducts.ts`: pulls Shopify variants into PriceIQ, sets `product.shopifyVariantId`
- Apply routes (`/api/products/[id]/apply`, `/api/products/bulk-apply`): update local DB only
- `ShopifyConnection` stores encrypted access token per merchant
- `Product.shopifyVariantId` (nullable): links a PriceIQ product to a Shopify variant

## Design Decisions

| Decision | Choice |
|---|---|
| Push timing | Synchronous — user waits for Shopify response |
| Failure mode | Rollback local change if Shopify fails |
| Bulk partial failure | Per-product independence — successes commit, failures rollback individually |
| Products without variant ID | Apply locally only (unchanged behavior) |

## Architecture

### New: `ShopifyClient.updateVariantPrice()`

```ts
async updateVariantPrice(variantId: string, priceDollars: string): Promise<void>
```

Calls `PUT /admin/api/2024-01/variants/{variantId}.json` with body:
```json
{ "variant": { "id": <variantId>, "price": "<priceDollars>" } }
```

Reuses the existing retry/rate-limit logic in the `request()` helper (extended to support PUT).

### New: `pushPriceToShopify()` service function

A thin orchestration layer in `src/lib/shopify/pushPrice.ts`:

```ts
export async function pushPriceToShopify(
  merchantId: string,
  shopifyVariantId: string,
  newPriceCents: number,
): Promise<void>
```

1. Loads the merchant's `ShopifyConnection` from DB
2. Decrypts the access token
3. Instantiates `ShopifyClient`
4. Calls `updateVariantPrice(variantId, centsToDollars(newPriceCents))`
5. Throws on failure (caller handles rollback)

### Modified: Single apply route (`/api/products/[id]/apply`)

Current flow:
```
validate → DB transaction (update price, create PriceChange, delete rec) → return ok
```

New flow:
```
validate → if (product.shopifyVariantId && merchantHasConnection):
              pushPriceToShopify(merchantId, variantId, newPrice)
           → DB transaction (same as before) → return ok
```

If `pushPriceToShopify` throws, the route throws an HttpError (502 for Shopify API errors, 500 for unexpected). The DB transaction never runs.

### Modified: Bulk apply route (`/api/products/bulk-apply`)

Each product is processed independently (already uses `Promise.all` with individual error handling). Extended to:

1. If product has `shopifyVariantId` and merchant has connection → push to Shopify first
2. If push succeeds → commit local transaction
3. If push fails → skip local transaction, record in `failed` array

Response shape changes:
```ts
{ applied: number; skipped: number; failed: { id: string; title: string; reason: string }[] }
```

### Modified: `ShopifyClient.request()` (private)

Currently only does GET. Extend to accept method + body:

```ts
private async request(
  url: string,
  options?: { method?: string; body?: unknown }
): Promise<{ data: unknown; linkHeader: string | null }>
```

All existing callers pass no options (default GET). New `updateVariantPrice` passes `{ method: 'PUT', body: {...} }`.

## UI Changes

Minimal — the existing error toast in `ProductsTable` already handles apply failures. For bulk apply, the response now includes `failed` array. The UI should show:

- If all succeed: same success toast as today
- If some fail: "Applied X prices. Y failed to sync to Shopify." with expandable detail (product titles + reasons)
- If all fail: error toast with reason

## Edge Cases

- **Product has `shopifyVariantId` but merchant disconnected Shopify** — `ShopifyConnection` lookup returns null → apply locally only (graceful degradation, not an error)
- **Stale variant ID (product deleted in Shopify)** — Shopify returns 404 → that product fails, others continue. Error message: "Variant not found in Shopify — resync your catalog"
- **Rate limited during bulk** — existing retry logic handles 429 with Retry-After. If retries exhausted, that product fails.
- **Price format** — Shopify expects string dollars ("29.99"). Add a `centsToDollars(cents: number): string` helper to `src/lib/money.ts` (inverse of the existing `dollarsToCents`).

## Files Changed

| File | Change |
|---|---|
| `src/lib/shopify/client.ts` | Extend `request()` for PUT, add `updateVariantPrice()` |
| `src/lib/shopify/pushPrice.ts` | New — orchestrates connection lookup + push |
| `src/app/api/products/[id]/apply/route.ts` | Call `pushPriceToShopify` before DB transaction |
| `src/app/api/products/bulk-apply/route.ts` | Call `pushPriceToShopify` per product, track failures |
| `src/components/ProductsTable.tsx` | Show per-product failure detail for bulk apply |

## Testing

- `ShopifyClient.updateVariantPrice` — unit test with mocked fetch (success, 404, 429 retry, 500)
- `pushPriceToShopify` — unit test with mocked DB + mocked client (happy path, no connection, decrypt failure)
- Apply route — integration test asserting Shopify is called before DB commit, and DB rolls back on Shopify failure
- Bulk apply route — test partial success scenario (2 succeed, 1 fails Shopify → response has applied=2, failed=[{...}])
