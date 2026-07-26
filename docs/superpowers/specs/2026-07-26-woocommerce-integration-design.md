# WooCommerce Integration Design

## Goal

Add WooCommerce as a second platform integration for PriceIQ, enabling merchants to connect their self-hosted WooCommerce store, sync product catalog and order history, and push approved price changes back — mirroring the existing Shopify integration exactly.

## Architecture

Direct parallel to the Shopify integration. No shared abstraction layer between the two platforms. Five lib files, four API routes, one UI component, and two schema additions. The WooCommerce REST API v3 is used throughout.

**Tech Stack:** WooCommerce REST API v3, Basic auth (consumer key/secret), Next.js API routes, Prisma/SQLite, AES encryption (re-use existing crypto module).

## User Decisions

- Auth: Consumer Key/Secret (Option A) — merchant pastes store URL + key + secret
- Sync model: Manual sync only (Option A) — no scheduled jobs or webhooks
- Product scope: Simple + variable products (Option B) — each variation becomes its own PriceIQ product matched by SKU

---

## Section 1 — Data Model

### New model: `WooCommerceConnection`

```prisma
model WooCommerceConnection {
  id              String    @id @default(cuid())
  merchantId      String    @unique
  merchant        Merchant  @relation(fields: [merchantId], references: [id], onDelete: Cascade)
  storeUrl        String    // e.g. "https://mystore.com" (no trailing slash)
  encryptedKey    String    // AES-encrypted consumer key
  encryptedSecret String    // AES-encrypted consumer secret
  lastSyncedAt    DateTime?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}
```

Add to `Merchant`:
```prisma
wooCommerceConnection WooCommerceConnection?
```

### New fields on `Product`

```prisma
woocommerceVariantId String?  // WC product ID (simple) or variation ID (variable)
woocommerceParentId  String?  // null for simple; WC parent product ID for variations
```

The parent ID is required because price updates for variable product variations use the endpoint `PUT /products/{parentId}/variations/{variationId}`. Simple products use `PUT /products/{id}`.

---

## Section 2 — Client and Service Functions

All files under `src/lib/woocommerce/`.

### `client.ts` — `WooCommerceClient`

Constructor: `(storeUrl: string, consumerKey: string, consumerSecret: string)`

Auth: `Authorization: Basic base64("key:secret")` header on every request.

Base URL: `https://{storeUrl}/wp-json/wc/v3`

Retry logic: up to 3 retries on 429 with `Retry-After` backoff, matching Shopify client behaviour.

**Methods:**

| Method | Endpoint | Returns |
|---|---|---|
| `verifyConnection()` | `GET /system_status` | `{ storeName: string }` |
| `fetchAllProducts()` | `GET /products?per_page=100` + `GET /products/{id}/variations?per_page=100` per variable product | `AsyncGenerator<WooProduct[]>` |
| `fetchOrders(sinceDate)` | `GET /orders?after={ISO}&status=completed,processing&per_page=100` | `AsyncGenerator<WooOrder[]>` |
| `updateProductPrice(productId, priceDollars)` | `PUT /products/{productId}` | `void` |
| `updateVariationPrice(parentId, variationId, priceDollars)` | `PUT /products/{parentId}/variations/{variationId}` | `void` |

**Types:**

```ts
interface WooProduct {
  id: number;
  type: "simple" | "variable";
  name: string;
  sku: string;
  price: string;         // current sale price
  regular_price: string;
}

interface WooVariation {
  id: number;
  sku: string;
  regular_price: string;
}

interface WooOrder {
  id: number;
  date_created: string;  // ISO 8601
  line_items: WooLineItem[];
}

interface WooLineItem {
  product_id: number;
  variation_id: number;  // 0 for simple products
  quantity: number;
  price: string;         // price at time of order
}
```

Pagination: WooCommerce uses `Link` response header with `rel="next"` — same pattern as Shopify client.

### `syncProducts.ts`

```ts
syncWooProducts(prisma, merchantId, client): Promise<{ created, updated, skipped }>
```

Logic:
1. Fetch all products via `client.fetchAllProducts()`
2. For each simple product: upsert to `Product` by SKU (create if new, update `woocommerceVariantId` if exists). Set `woocommerceVariantId = String(product.id)`, `woocommerceParentId = null`.
3. For each variable product: fetch variations, upsert each by SKU. Set `woocommerceVariantId = String(variation.id)`, `woocommerceParentId = String(product.id)`.
4. Skip products/variations with empty SKU (log as skipped).
5. Return counts.

New products created with `currentPrice` from `regular_price` (converted to cents), `category = "Uncategorized"`, `cogs = null`.

### `syncOrders.ts`

```ts
syncWooOrders(prisma, merchantId, orders: WooOrder[]): Promise<{ upserted, skipped }>
```

Logic mirrors `src/lib/shopify/syncOrders.ts` exactly:
1. Build map of `woocommerceVariantId → productId` for the merchant.
2. For simple product line items: match on `String(line_item.product_id)`.
3. For variation line items: match on `String(line_item.variation_id)`.
4. Aggregate by `(productId, date)`, additive upsert into `SalesRecord`.

### `pushPrice.ts`

```ts
pushPriceToWooCommerce(prisma, client, productId: string, priceDollars: string): Promise<{ ok: boolean; error?: string }>
```

Logic:
1. Fetch product's `woocommerceVariantId` and `woocommerceParentId`.
2. If no `woocommerceVariantId` → return `{ ok: false, error: "not linked to WooCommerce" }`.
3. If `woocommerceParentId` is set → call `client.updateVariationPrice(parentId, variantId, priceDollars)`.
4. Otherwise → call `client.updateProductPrice(variantId, priceDollars)`.
5. Catch and return errors without throwing.

### `crypto.ts`

Re-export `encrypt` and `decrypt` from `src/lib/shopify/crypto.ts`. No duplication.

```ts
export { encrypt, decrypt } from "@/lib/shopify/crypto";
```

---

## Section 3 — API Routes

All under `src/app/api/woocommerce/`.

### `POST /api/woocommerce/connect`

Request body:
```ts
{ storeUrl: string; consumerKey: string; consumerSecret: string }
```

Steps:
1. Validate body fields non-empty.
2. Normalise `storeUrl`: strip trailing slash, ensure `https://` prefix.
3. Instantiate `WooCommerceClient` and call `verifyConnection()`. Return 400 if it fails.
4. Encrypt key and secret with `encrypt()`.
5. Upsert `WooCommerceConnection` for the merchant.
6. Return `{ storeName }`.

### `POST /api/woocommerce/disconnect`

Steps:
1. Delete `WooCommerceConnection` for merchant.
2. Clear `woocommerceVariantId` and `woocommerceParentId` on all merchant's products (`updateMany`).
3. Return `{ ok: true }`.

### `GET /api/woocommerce/status`

Returns:
```ts
{
  connected: boolean;
  storeUrl?: string;
  lastSyncedAt?: string | null;
}
```

### `POST /api/woocommerce/sync`

Steps:
1. Load connection, decrypt credentials.
2. Instantiate `WooCommerceClient`.
3. Run `syncWooProducts()` — fetch all products, upsert.
4. Run `fetchOrders(sinceDate)` where `sinceDate = lastSyncedAt ?? 24 months ago`.
5. Collect order batches, pass to `syncWooOrders()`.
6. Update `lastSyncedAt = now()`.
7. Return `{ productsCreated, productsUpdated, ordersImported }`.

### Modified: `POST /api/products/[id]/apply`

After recording the `PriceChange`, if the product has `woocommerceVariantId`:
1. Load the merchant's `WooCommerceConnection`.
2. Call `pushPriceToWooCommerce()`.
3. Include `woocommercePushed: boolean` in the response (failure is logged, not blocking).

### Modified: `POST /api/products/bulk-apply`

Same as single apply: after each price change, attempt WooCommerce push if linked. Collect per-product results into `woocommerceResults: { productId, pushed, error? }[]` in the response. Failures do not block other products.

---

## Section 4 — UI Component

### `src/components/WooCommerceConnectionCard.tsx`

Client component. Lives on the Dashboard settings panel alongside `ShopifyConnectionCard`.

**State A — Not connected:**
- WooCommerce logo/icon + "Not connected" label
- Three inputs: Store URL, Consumer Key, Consumer Secret
- "Connect" button (calls `POST /api/woocommerce/connect`)
- "Where do I find these?" help link — expands inline tooltip: "In your WordPress admin go to WooCommerce → Settings → Advanced → REST API → Add key. Set permissions to Read/Write."
- Error message on failed connect

**State B — Connected:**
- Icon + store domain + green "Connected" badge
- Last synced timestamp + product/order counts (from status endpoint)
- "Sync Now" button (calls `POST /api/woocommerce/sync`, shows spinner + result counts)
- "Disconnect" button (calls `POST /api/woocommerce/disconnect`, confirms before acting)

---

## File Map

| Action | Path |
|---|---|
| Create | `src/lib/woocommerce/client.ts` |
| Create | `src/lib/woocommerce/client.test.ts` |
| Create | `src/lib/woocommerce/syncProducts.ts` |
| Create | `src/lib/woocommerce/syncProducts.test.ts` |
| Create | `src/lib/woocommerce/syncOrders.ts` |
| Create | `src/lib/woocommerce/syncOrders.test.ts` |
| Create | `src/lib/woocommerce/pushPrice.ts` |
| Create | `src/lib/woocommerce/pushPrice.test.ts` |
| Create | `src/lib/woocommerce/crypto.ts` |
| Create | `src/app/api/woocommerce/connect/route.ts` |
| Create | `src/app/api/woocommerce/connect/route.test.ts` |
| Create | `src/app/api/woocommerce/disconnect/route.ts` |
| Create | `src/app/api/woocommerce/disconnect/route.test.ts` |
| Create | `src/app/api/woocommerce/status/route.ts` |
| Create | `src/app/api/woocommerce/status/route.test.ts` |
| Create | `src/app/api/woocommerce/sync/route.ts` |
| Create | `src/app/api/woocommerce/sync/route.test.ts` |
| Create | `src/components/WooCommerceConnectionCard.tsx` |
| Create | `src/components/WooCommerceConnectionCard.test.tsx` |
| Modify | `src/app/api/products/[id]/apply/route.ts` |
| Modify | `src/app/api/products/bulk-apply/route.ts` |
| Modify | `prisma/schema.prisma` |
| Create | `prisma/migrations/…_woocommerce/migration.sql` |
