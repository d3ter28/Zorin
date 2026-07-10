# Shopify Integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** Eliminate CSV friction by syncing Shopify products and orders directly into PriceIQ — merchants connect their store, click "Sync", and get ML-powered pricing recommendations without touching a spreadsheet.

**Approach:** Custom app (merchant pastes their Shopify Admin API access token — no OAuth callback URL needed, works on localhost). Per-variant product mapping (one PriceIQ Product per Shopify variant). Full sync on connect, manual "Sync now" button for ongoing. Webhook handler deferred until deployment.

**Tech Stack:** Next.js 16.2.9 (App Router, Turbopack), TypeScript, Prisma 7 + better-sqlite3, Vitest 4, Tailwind v4. Path alias `@/` → `src/`. Money = integer cents. Read `node_modules/next/dist/docs/` before writing Next code. Async route params are `Promise<{id}>` — must be awaited.

**User decisions (already made):**
- "Custom app first, convert to public OAuth later when deployed"
- "Per-variant mapping (a Shopify product with 3 variants = 3 PriceIQ products)"
- "Encrypt access tokens at rest (AES-256-GCM)"
- "Webhook handler is stretch/deferred (no public URL yet)"

**Bash prefix required:** `cd /c/Users/pohde/projects/priceiq &&` — Bash tool runs from home dir, not project root.

---

## What Already Exists

| Module | Status |
|---|---|
| Auth (login/signup/logout/session) | ✅ Complete |
| Multi-tenant isolation (merchantId scoping) | ✅ Complete |
| Product catalog CSV upload + CRUD | ✅ Complete |
| Sales history CSV upload + import | ✅ Complete |
| Elasticity model fitting (WLS + Bayesian shrinkage) | ✅ Complete |
| Confidence score + recommendation engine | ✅ Complete |
| Portfolio dashboard + bulk-apply | ✅ Complete |
| Settings page | ✅ Shell — placeholder "Settings coming soon" |
| `importProducts.ts` (SKU→ID map, upsert, invalidate recs) | ✅ Pattern to reuse |
| `importSalesHistory.ts` (upsert SalesRecord by productId+date) | ✅ Pattern to reuse |
| `dollarsToCents` in `src/lib/money.ts` | ✅ Reuse for price conversion |

---

## Task 1: Schema — ShopifyConnection model + Product.shopifyVariantId

**Goal:** Add the DB model for storing encrypted Shopify credentials and a variant ID field on Product for reverse mapping.

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `.env.example`

**Acceptance Criteria:**
- [ ] `ShopifyConnection` model: `id` (cuid), `merchantId` (String, unique, FK → Merchant, cascade delete), `shopDomain` (String), `encryptedToken` (String), `lastSyncedAt` (DateTime?), `createdAt`, `updatedAt` (@updatedAt)
- [ ] `Merchant` model gets `shopifyConnection ShopifyConnection?` relation
- [ ] `Product` model gets `shopifyVariantId String?` field
- [ ] `.env.example` includes `SHOPIFY_ENCRYPTION_KEY=""` with comment explaining it must be a 64-char hex string (32 bytes)
- [ ] `npx prisma db push` exits 0
- [ ] `npm test` still passes (170 tests)

**Verify:** `cd /c/Users/pohde/projects/priceiq && npx prisma db push && npx prisma generate && npm test`

**Steps:**

- [ ] **Step 1: Update `prisma/schema.prisma`**

Add to `Merchant` model:
```prisma
  shopifyConnection ShopifyConnection?
```

Add to `Product` model:
```prisma
  shopifyVariantId String?
```

Add after the `Session` model:
```prisma
model ShopifyConnection {
  id             String    @id @default(cuid())
  merchantId     String    @unique
  merchant       Merchant  @relation(fields: [merchantId], references: [id], onDelete: Cascade)
  shopDomain     String
  encryptedToken String
  lastSyncedAt   DateTime?
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
}
```

- [ ] **Step 2: Update `.env.example`**

Add:
```
# 32-byte key for encrypting Shopify access tokens (64 hex chars)
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
SHOPIFY_ENCRYPTION_KEY=""
```

- [ ] **Step 3: Push schema and verify**

```bash
cd /c/Users/pohde/projects/priceiq && npx prisma db push && npx prisma generate
```

- [ ] **Step 4: Run tests**

```bash
cd /c/Users/pohde/projects/priceiq && npm test
```

- [ ] **Step 5: Commit**

```bash
cd /c/Users/pohde/projects/priceiq && git add prisma/schema.prisma .env.example && git commit -m "feat: add ShopifyConnection schema + Product.shopifyVariantId"
```

---

## Task 2: Token encryption module

**Goal:** AES-256-GCM encrypt/decrypt for Shopify access tokens using Node.js built-in `crypto`.

**Files:**
- Create: `src/lib/shopify/crypto.ts`
- Create: `src/lib/shopify/crypto.test.ts`

**Acceptance Criteria:**
- [ ] `encryptToken(plaintext: string): string` → returns `iv:ciphertext:authTag` hex format
- [ ] `decryptToken(encrypted: string): string` → returns original plaintext
- [ ] Round-trip: `decryptToken(encryptToken(x)) === x`
- [ ] Throws if `SHOPIFY_ENCRYPTION_KEY` is unset or not 64 hex chars (32 bytes)
- [ ] Throws on tampered ciphertext (GCM auth tag verification)
- [ ] Throws on malformed input (wrong number of colon-separated parts)
- [ ] Two encryptions of the same input produce different ciphertexts (random IV)
- [ ] All tests pass: `npm test -- crypto`

**Verify:** `cd /c/Users/pohde/projects/priceiq && npm test -- crypto`

**Steps:**

- [ ] **Step 1: Write failing tests**

`src/lib/shopify/crypto.test.ts`:
```typescript
import { describe, it, expect, beforeAll } from "vitest";
import { encryptToken, decryptToken } from "./crypto";
import { randomBytes } from "node:crypto";

beforeAll(() => {
  process.env.SHOPIFY_ENCRYPTION_KEY = randomBytes(32).toString("hex");
});

describe("encryptToken / decryptToken", () => {
  it("round-trips a token", () => {
    const token = "shpat_abc123xyz";
    expect(decryptToken(encryptToken(token))).toBe(token);
  });

  it("produces different ciphertexts for same input", () => {
    const token = "shpat_abc123xyz";
    expect(encryptToken(token)).not.toBe(encryptToken(token));
  });

  it("throws on tampered ciphertext", () => {
    const encrypted = encryptToken("shpat_test");
    const parts = encrypted.split(":");
    parts[1] = "00".repeat(parts[1].length / 2); // tamper ciphertext
    expect(() => decryptToken(parts.join(":"))).toThrow();
  });

  it("throws on malformed input", () => {
    expect(() => decryptToken("not:enough")).toThrow();
    expect(() => decryptToken("")).toThrow();
  });

  it("throws if SHOPIFY_ENCRYPTION_KEY is missing", () => {
    const saved = process.env.SHOPIFY_ENCRYPTION_KEY;
    delete process.env.SHOPIFY_ENCRYPTION_KEY;
    expect(() => encryptToken("test")).toThrow(/SHOPIFY_ENCRYPTION_KEY/);
    process.env.SHOPIFY_ENCRYPTION_KEY = saved;
  });
});
```

- [ ] **Step 2: Implement `crypto.ts`**

```typescript
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function getKey(): Buffer {
  const hex = process.env.SHOPIFY_ENCRYPTION_KEY;
  if (!hex || !/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error("SHOPIFY_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)");
  }
  return Buffer.from(hex, "hex");
}

export function encryptToken(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${encrypted.toString("hex")}:${authTag.toString("hex")}`;
}

export function decryptToken(encrypted: string): string {
  const key = getKey();
  const parts = encrypted.split(":");
  if (parts.length !== 3) throw new Error("malformed encrypted token");
  const [ivHex, ciphertextHex, authTagHex] = parts;
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  return decipher.update(ciphertextHex, "hex", "utf8") + decipher.final("utf8");
}
```

- [ ] **Step 3: Run tests**

```bash
cd /c/Users/pohde/projects/priceiq && npm test -- crypto
```

- [ ] **Step 4: Commit**

```bash
cd /c/Users/pohde/projects/priceiq && git add src/lib/shopify/crypto.ts src/lib/shopify/crypto.test.ts && git commit -m "feat: AES-256-GCM token encryption for Shopify integration"
```

---

## Task 3: Shopify Admin API client

**Goal:** Typed HTTP client for Shopify Admin REST API with pagination (Link header) and rate limiting (429 retry).

**Files:**
- Create: `src/lib/shopify/client.ts`
- Create: `src/lib/shopify/client.test.ts`

**Acceptance Criteria:**
- [ ] `ShopifyClient` class: constructor takes `shopDomain` and `accessToken`
- [ ] `verifyConnection(): Promise<{ shopName: string }>` — calls `GET /admin/api/2024-01/shop.json`, validates token
- [ ] `fetchAllProducts(): AsyncGenerator<ShopifyVariant[]>` — yields pages of flattened variants from `GET /admin/api/2024-01/products.json?limit=250`, follows `Link: <...>; rel="next"` pagination
- [ ] `fetchOrders(sinceDate: Date): AsyncGenerator<ShopifyOrder[]>` — yields pages from `GET /admin/api/2024-01/orders.json?status=any&created_at_min=...&limit=250`
- [ ] On 429: reads `Retry-After` header, waits (capped at 10s), retries up to 3 times
- [ ] On non-429 errors: throws with status code and Shopify error message
- [ ] All tests pass (mock `global.fetch`): `npm test -- shopify/client`

**Verify:** `cd /c/Users/pohde/projects/priceiq && npm test -- shopify/client`

**Type definitions:**
```typescript
export interface ShopifyVariant {
  id: number;              // Shopify variant ID (maps to Product.shopifyVariantId)
  product_id: number;
  title: string;           // variant title ("Small", or "Default Title" for single-variant)
  product_title: string;   // parent product title
  sku: string;
  price: string;           // "29.99"
  inventory_quantity: number;
}

export interface ShopifyOrder {
  id: number;
  created_at: string;      // ISO 8601
  line_items: ShopifyLineItem[];
}

export interface ShopifyLineItem {
  variant_id: number;
  quantity: number;
  price: string;
}
```

**Implementation notes:**
- Use global `fetch` (available in Node 18+)
- `fetchAllProducts` flattens `products[].variants[]` — each variant inherits parent's `title` as `product_title`
- Pagination: parse `Link` header with regex `<([^>]+)>;\s*rel="next"`
- Rate limiting: on 429, read `Retry-After` (seconds), `await new Promise(r => setTimeout(r, ms))`, retry up to 3 times
- Tests mock `global.fetch` with `vi.fn()`

---

## Task 4: Product sync logic

**Goal:** Import Shopify variants as PriceIQ products, matching existing products by SKU first (so CSV-imported products link up), creating new ones for unmatched variants.

**Files:**
- Create: `src/lib/shopify/syncProducts.ts`
- Create: `src/lib/shopify/syncProducts.test.ts`

**Acceptance Criteria:**
- [ ] `syncProducts(prisma, merchantId, variants: ShopifyVariant[]): Promise<SyncProductsResult>`
- [ ] Returns `{ created, updated, skipped, skippedReasons }`
- [ ] Match existing products by SKU first (case-insensitive) — links CSV-imported products to Shopify variants
- [ ] Matched products: update `currentPrice` (variant price → cents via `dollarsToCents` from `src/lib/money.ts`), set `shopifyVariantId`, update `title`
- [ ] Title: `"{product_title} - {variant_title}"` unless variant title is "Default Title" → just `product_title`
- [ ] Unmatched variants with non-empty SKU → create new Product (category defaults to `"Shopify"`)
- [ ] Variants with empty SKU → skip (counted in `skipped`, reason in `skippedReasons`)
- [ ] Updated products have recommendations invalidated (delete recs, same as `importProducts.ts` lines 70-73)
- [ ] Uses `PrismaSurface` pattern (`Pick<PrismaClient, "product" | "recommendation">`) for testability
- [ ] All tests pass: `npm test -- syncProducts`

**Verify:** `cd /c/Users/pohde/projects/priceiq && npm test -- syncProducts`

**Reuse:** Follow `src/lib/products/importProducts.ts` pattern exactly — SKU→ID map, row-by-row upsert, recommendation invalidation for touched products.

---

## Task 5: Order-to-SalesRecord sync logic

**Goal:** Convert Shopify orders into SalesRecords, aggregating line items by (variant, date) and ADDING to existing unitsSold (not replacing).

**Files:**
- Create: `src/lib/shopify/syncOrders.ts`
- Create: `src/lib/shopify/syncOrders.test.ts`

**Acceptance Criteria:**
- [ ] `syncOrders(prisma, merchantId, orders: ShopifyOrder[]): Promise<SyncOrdersResult>`
- [ ] Returns `{ upserted, skippedLineItems }`
- [ ] Aggregates line items by `(variant_id, date)` — multiple orders same day same variant sum quantities
- [ ] Date normalized to UTC midnight: `new Date(Date.UTC(y, m, d))`
- [ ] Maps `variant_id` → `productId` via `Product.shopifyVariantId` field
- [ ] Unknown variant_ids counted in `skippedLineItems`
- [ ] **Additive upsert:** if SalesRecord exists for (productId, date), INCREMENT `unitsSold` (read-then-update, not replace). This differs from CSV import which replaces
- [ ] `priceCents` set from line item price (via `dollarsToCents`)
- [ ] Uses `PrismaSurface` pattern for testability
- [ ] All tests pass: `npm test -- syncOrders`

**Verify:** `cd /c/Users/pohde/projects/priceiq && npm test -- syncOrders`

**Critical difference from `importSalesHistory.ts`:** That function replaces unitsSold on upsert. Shopify sync must ADD because re-syncing the same period would otherwise double-count. Pattern:
```typescript
const existing = await prisma.salesRecord.findUnique({
  where: { productId_date: { productId, date } },
});
if (existing) {
  await prisma.salesRecord.update({
    where: { id: existing.id },
    data: { unitsSold: existing.unitsSold + units },
  });
} else {
  await prisma.salesRecord.create({
    data: { productId, merchantId, date, unitsSold: units, priceCents },
  });
}
```

---

## Task 6: API routes (connect / disconnect / sync / status)

**Goal:** REST endpoints for the Settings UI to manage the Shopify connection.

**Files:**
- Create: `src/app/api/shopify/connect/route.ts`
- Create: `src/app/api/shopify/disconnect/route.ts`
- Create: `src/app/api/shopify/sync/route.ts`
- Create: `src/app/api/shopify/status/route.ts`

**Acceptance Criteria:**
- [ ] `POST /api/shopify/connect` — accepts `{ shopDomain, accessToken }`, normalizes domain (strip `https://`, strip trailing paths, ensure `.myshopify.com`), calls `verifyConnection()`, encrypts token, upserts ShopifyConnection. Returns `{ success: true, shopName }`. Returns 400 if missing fields, 401 if token invalid.
- [ ] `POST /api/shopify/disconnect` — deletes ShopifyConnection for merchant. Returns `{ success: true }`. Returns 404 if not connected.
- [ ] `POST /api/shopify/sync` — decrypts token, fetches all products + orders (since lastSyncedAt or 12 months ago), runs syncProducts + syncOrders, updates lastSyncedAt. Returns combined results. Returns 404 if not connected.
- [ ] `GET /api/shopify/status` — returns `{ connected, shopDomain?, lastSyncedAt? }`
- [ ] All routes use `requireSessionApi()` + `withErrorHandling()` (pattern from `src/lib/api/errors.ts`)

**Verify:** `cd /c/Users/pohde/projects/priceiq && npm test -- shopify`

**Route pattern (from existing routes):**
```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { HttpError, withErrorHandling } from "@/lib/api/errors";
import { requireSessionApi } from "@/lib/auth/requireSession";

export const POST = withErrorHandling(async (req: Request) => {
  const { merchantId } = await requireSessionApi();
  // ...
  return NextResponse.json(result);
});
```

---

## Task 7: Settings UI — Shopify connection card

**Goal:** Replace the Settings placeholder with a Shopify connection management UI.

**Files:**
- Create: `src/components/ShopifyConnectionCard.tsx`
- Create: `src/components/ShopifyConnectionCard.test.tsx`
- Modify: `src/app/settings/page.tsx`

**Acceptance Criteria:**
- [ ] Client component (`"use client"`) fetches `GET /api/shopify/status` on mount
- [ ] Disconnected state: form with `shopDomain` input + `accessToken` password input + "Connect" button
- [ ] Connecting state: button shows spinner/disabled
- [ ] Connected state: shows shop domain, last synced time (or "Never"), "Sync now" + "Disconnect" buttons
- [ ] Syncing state: "Sync now" disabled with spinner; results shown on completion (products created/updated, records imported)
- [ ] Disconnect: confirmation before calling API
- [ ] Error feedback for all failure cases
- [ ] Uses project's Tailwind tokens: `rounded-xl border border-line bg-surface p-5`, `text-ink`, `text-muted`, `btn`, etc. (match `ProductUpload.tsx` pattern)
- [ ] Settings page replaces "Settings coming soon" with `<ShopifyConnectionCard />`
- [ ] Tests: renders disconnected state, renders connected state, calls connect on form submit
- [ ] All tests pass: `npm test -- ShopifyConnectionCard`

**Verify:** `cd /c/Users/pohde/projects/priceiq && npm test -- ShopifyConnectionCard` + visual verification via dev server

---

## Task dependency graph

```
Task 1 (Schema)
  ├──→ Task 2 (Crypto)           ← parallel with Task 3
  ├──→ Task 3 (Shopify Client)   ← parallel with Task 2
  │      └──→ Task 4 (Product Sync)
  │             └──→ Task 5 (Order Sync)
  └──────────→ Task 6 (API Routes)  ← depends on 1-5
                 └──→ Task 7 (Settings UI)
```

Tasks 2 and 3 can run in parallel (no file overlap). All others are sequential.

---

## Verification (end-to-end)

1. `npx prisma db push && npx prisma generate` — schema in sync
2. `npm test` — all tests pass (170 existing + new)
3. Start dev server, go to Settings page
4. Enter a Shopify store domain + access token → Connect
5. Click "Sync now" → products appear in portfolio, sales records populate
6. Navigate to a synced product → fit model → get recommendation (full ML pipeline works on Shopify data)
