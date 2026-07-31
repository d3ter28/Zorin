# Shopify + WooCommerce Real-Time Webhooks — Design

## Problem

Product and order sync currently only happens when a merchant clicks "Sync now" (Settings page). Price changes made in Shopify/WooCommerce and new orders don't reach Zorin until the merchant manually syncs, so the products table and elasticity model can be stale indefinitely.

## Goal

Add webhook-driven real-time sync for both platforms, without removing the manual sync path (needed for initial backfill and as a recovery mechanism if a webhook delivery is ever missed).

## Architecture

Two new webhook receiver endpoints:

- `POST /api/webhooks/shopify` — single shared endpoint across all merchants. Tenant resolved via the `X-Shopify-Shop-Domain` request header, looked up against `ShopifyConnection.shopDomain` (now unique).
- `POST /api/webhooks/woocommerce/[connectionId]` — per-merchant URL, since WooCommerce doesn't send a reliable store-identifying header. The opaque cuid path segment plus HMAC verification is belt-and-suspenders.

Both endpoints: verify signature → parse payload → dedupe by delivery ID → call the *existing* `syncProducts`/`syncOrders` functions with a single-item array. No new incremental-handler logic — both functions are already SKU-match-upsert (products) or additive-by-date upsert (orders), so a webhook payload wrapped in an array of 1 is a valid call.

Processing is synchronous within the request (no job queue). Both platforms retry on non-2xx responses, and the sync writes are cheap single-row DB operations, so a queue would be premature infrastructure for the current scale.

Webhook registration happens via API immediately after a successful `/connect` call — not configured manually in either platform's admin UI. Disconnect best-effort deletes the registered webhooks before removing the local connection row.

## Data model changes

```prisma
model ShopifyConnection {
  id                  String    @id @default(cuid())
  merchantId          String    @unique
  merchant            Merchant  @relation(fields: [merchantId], references: [id], onDelete: Cascade)
  shopDomain          String    @unique   // NEW: unique, needed for webhook tenant lookup
  encryptedToken       String
  encryptedApiSecret  String    // NEW: for HMAC verification of inbound webhooks
  webhookIds          String    // NEW: JSON array of registered Shopify webhook IDs
  lastSyncedAt        DateTime?
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt
}

model WooCommerceConnection {
  id                      String    @id @default(cuid())
  merchantId              String    @unique
  merchant                Merchant  @relation(fields: [merchantId], references: [id], onDelete: Cascade)
  storeUrl                String
  encryptedKey            String
  encryptedSecret         String
  encryptedWebhookSecret  String    // NEW: Zorin-generated, used to sign/verify WC webhooks
  webhookIds              String    // NEW: JSON array of registered WooCommerce webhook IDs
  lastSyncedAt            DateTime?
  createdAt               DateTime  @default(now())
  updatedAt               DateTime  @updatedAt
}

model ProcessedWebhook {
  id         String   @id @default(cuid())
  deliveryId String   @unique   // X-Shopify-Webhook-Id / WooCommerce delivery ID
  createdAt  DateTime @default(now())
}
```

- `encryptedApiSecret` and `encryptedWebhookSecret` reuse the existing AES-256-GCM encrypt/decrypt helpers already used for the access token/consumer key+secret — no new crypto code.
- `encryptedWebhookSecret` is generated server-side (`crypto.randomBytes(32).toString("hex")`) at connect time — the merchant never sees or enters it; it's purely an internal HMAC key shared between Zorin and the webhook subscription it creates with WooCommerce.
- `webhookIds` stored as a JSON string, matching the existing convention of avoiding native array/JSON column types in this schema.
- `ProcessedWebhook` has no pruning job yet — table stays small at current scale; a manual cleanup query is sufficient if it ever matters.

## Connect / disconnect flow changes

**Shopify connect form** gains one more required field: "API secret key" (found on the same credentials page in Shopify admin as the access token merchants already copy). After the existing `verifyConnection()` call succeeds, Zorin registers three webhooks via `POST /admin/api/webhooks.json`:
- `products/update`
- `orders/create`
- `app/uninstalled`

All pointed at `https://tryzorin.com/api/webhooks/shopify`. The three returned webhook IDs are stored in `webhookIds`.

**WooCommerce connect** is unchanged from the merchant's side (still just store URL + consumer key/secret). After verification, Zorin generates the webhook secret itself, then registers two webhooks via `POST /wp-json/wc/v3/webhooks`:
- `product.updated`
- `order.created`

Pointed at the per-connection URL (`/api/webhooks/woocommerce/[connectionId]`). Returned webhook IDs stored in `webhookIds`.

**Disconnect** (both platforms): before deleting the connection row, best-effort call the delete-webhook endpoint for each stored ID, wrapped in try/catch. If the merchant already revoked API access, this call fails and that's fine — the local row is deleted regardless.

**`app/uninstalled` handling (Shopify only):** when this webhook fires, Zorin deletes the `ShopifyConnection` row outright, so a merchant who revoked/uninstalled the app doesn't have a silently-broken connection sitting in Settings. There is no equivalent "credentials revoked" event on WooCommerce's side, so WooCommerce connections do not get automatic cleanup — a known, accepted asymmetry.

## Webhook endpoint behavior

Shared shape for both endpoints:

1. Read the raw request body (required for HMAC verification — must check against the exact bytes before JSON-parsing, same pattern as the existing `/api/webhooks/stripe` handler).
2. Verify signature:
   - Shopify: HMAC-SHA256 of the raw body using the merchant's decrypted `encryptedApiSecret`, compared to the `X-Shopify-Hmac-Sha256` header.
   - WooCommerce: HMAC-SHA256 using the decrypted `encryptedWebhookSecret`, compared to the `X-WC-Webhook-Signature` header.
   - Mismatch → `401`, no processing.
3. Look up the connection (Shopify: by `shopDomain` header; WooCommerce: by `connectionId` path segment).
4. Check `ProcessedWebhook` for the delivery ID (`X-Shopify-Webhook-Id` / WooCommerce delivery ID header). If already present, return `200` immediately without reprocessing. Otherwise record it before/after processing.
5. Route on topic/event:
   - `products/update` / `product.updated` → wrap the payload in a 1-item array, call `syncProducts`.
   - `orders/create` / `order.created` → wrap the payload in a 1-item array, call `syncOrders`.
   - `app/uninstalled` → delete the `ShopifyConnection` row.
   - Unknown/unmapped topic → `200` (acknowledge, ignore) — avoids the platform retrying forever over an event Zorin doesn't handle.
6. Processing exception (e.g. DB error) → `500`, which triggers the platform's built-in retry. No custom retry logic needed on Zorin's side.

## Rate limiting

Both endpoints use the existing rate limiter (already applied to `/api/auth/*`), keyed by shop domain / connection ID rather than IP — legitimate traffic can legitimately burst from a single store during a sale.

## Testing plan

- Unit tests for the HMAC verify functions (valid signature, invalid signature, missing header) for both platforms.
- Route handler tests: mocked request with a valid signature asserts `syncProducts`/`syncOrders` is called with the correctly-shaped single-item array; a replayed `deliveryId` asserts the second call is a no-op; an `app/uninstalled` payload asserts the connection row is deleted.
- Registration/disconnect unit tests: connect calls the webhook-create API with the expected topics and URL and persists the returned IDs; disconnect calls delete for each stored ID and tolerates failure (already-revoked credentials) without blocking local row deletion.

## Out of scope

- No background job queue — processing stays synchronous per-request.
- No periodic reconciliation/nightly full sync — manual "Sync now" remains the recovery path if a webhook is ever missed.
- No automatic cleanup for WooCommerce connections on credential revocation (no such event exists in the WooCommerce webhook system).
