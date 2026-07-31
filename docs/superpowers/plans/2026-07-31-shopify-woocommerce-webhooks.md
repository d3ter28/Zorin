# Shopify + WooCommerce Real-Time Webhooks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:subagent-driven-development (recommended) or superpowers-extended-cc:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add webhook-driven real-time product/order sync for Shopify and WooCommerce, so price changes and new orders reach Zorin without waiting for a manual "Sync now" click.

**Architecture:** Two new webhook receiver routes (`/api/webhooks/shopify`, `/api/webhooks/woocommerce/[connectionId]`) verify an HMAC signature, dedupe by delivery ID, and route into the *existing* `syncProducts`/`syncWooProducts`/`syncOrders`/`syncWooOrders` functions with a single-item array. Registration happens via API immediately after a successful `/connect` call. Manual sync remains as the initial-backfill and recovery path.

**Tech Stack:** Next.js 16 App Router, TypeScript, Prisma 7 (SQLite dev / Postgres prod), Vitest 4, Node built-in `crypto` for HMAC (matches existing AES-256-GCM helpers' style).

**User decisions (already made):**
- Shopify webhook auth: ask merchants for their custom app's API secret key (stored encrypted), verified via HMAC — not a re-fetch/trust model.
- Scope: products + orders + Shopify `app/uninstalled` auto-cleanup (not products-only).
- Manual "Sync now" stays as a fallback/recovery path; not removed.
- Dedup via a `ProcessedWebhook` table keyed on delivery ID, not a content hash.

---

## Task 1: Schema — webhook fields + ProcessedWebhook model

**Goal:** Add the columns and model the rest of this plan depends on.

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `prisma/schema.production.prisma`

**Acceptance Criteria:**
- [ ] `ShopifyConnection.shopDomain` is `@unique`
- [ ] `ShopifyConnection` has `encryptedApiSecret String` and `webhookIds String` (JSON-encoded array)
- [ ] `WooCommerceConnection` has `encryptedWebhookSecret String` and `webhookIds String`
- [ ] New `ProcessedWebhook` model exists with a unique `deliveryId`
- [ ] Both `schema.prisma` and `schema.production.prisma` stay in sync (same additive shape, only datasource differs)

**Verify:** `npx prisma db push && npx prisma generate` → no errors; `npx prisma studio` shows the new columns/model (or query `sqlite3 prisma/dev.db ".schema ShopifyConnection"`)

**Steps:**

- [ ] **Step 1: Edit `prisma/schema.prisma`**

Replace the `ShopifyConnection` model:

```prisma
model ShopifyConnection {
  id                 String    @id @default(cuid())
  merchantId         String    @unique
  merchant           Merchant  @relation(fields: [merchantId], references: [id], onDelete: Cascade)
  shopDomain         String    @unique
  encryptedToken     String
  encryptedApiSecret String
  webhookIds         String    @default("[]")
  lastSyncedAt       DateTime?
  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt
}
```

Replace the `WooCommerceConnection` model:

```prisma
model WooCommerceConnection {
  id                     String    @id @default(cuid())
  merchantId             String    @unique
  merchant               Merchant  @relation(fields: [merchantId], references: [id], onDelete: Cascade)
  storeUrl               String
  encryptedKey           String
  encryptedSecret        String
  encryptedWebhookSecret String
  webhookIds             String    @default("[]")
  lastSyncedAt           DateTime?
  createdAt              DateTime  @default(now())
  updatedAt              DateTime  @updatedAt
}
```

Add a new model anywhere in the file (e.g. after `WooCommerceConnection`):

```prisma
model ProcessedWebhook {
  id         String   @id @default(cuid())
  deliveryId String   @unique
  createdAt  DateTime @default(now())
}
```

- [ ] **Step 2: Apply the same three changes to `prisma/schema.production.prisma`** (identical model bodies — only the top-level `datasource` block differs between the two files, per existing convention).

- [ ] **Step 3: Push schema and regenerate the client**

```bash
cd /c/Users/pohde/projects/zorin
npx prisma db push
npx prisma generate
```

Expected: "Your database is now in sync with your Prisma schema" with no errors.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/schema.production.prisma
git commit -m "feat: add webhook fields to Shopify/WooCommerce connections + ProcessedWebhook model"
```

---

## Task 2: Webhook delivery dedup helper

**Goal:** A small, testable helper both webhook receivers use to avoid double-processing a redelivered webhook.

**Files:**
- Create: `src/lib/webhooks/dedupe.ts`
- Test: `src/lib/webhooks/dedupe.test.ts`

**Acceptance Criteria:**
- [ ] `wasAlreadyProcessed(prisma, deliveryId)` returns `false` and records the delivery on first call, `true` on a repeat call with the same ID
- [ ] Uses the unique constraint on `ProcessedWebhook.deliveryId` — a duplicate `create` throws Prisma's unique-violation error, which is caught and treated as "already processed" (covers a race between two near-simultaneous redeliveries)

**Verify:** `npm test -- src/lib/webhooks/dedupe.test.ts` → all pass

**Steps:**

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/webhooks/dedupe.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { wasAlreadyProcessed } from "./dedupe";

function makePrisma() {
  const store = new Set<string>();
  return {
    processedWebhook: {
      create: vi.fn(async ({ data }: { data: { deliveryId: string } }) => {
        if (store.has(data.deliveryId)) {
          const err = new Error("Unique constraint failed") as Error & { code?: string };
          err.code = "P2002";
          throw err;
        }
        store.add(data.deliveryId);
        return { id: "x", deliveryId: data.deliveryId, createdAt: new Date() };
      }),
    },
  };
}

describe("wasAlreadyProcessed", () => {
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
  });

  it("returns false and records the delivery on first call", async () => {
    const result = await wasAlreadyProcessed(prisma as never, "delivery-1");
    expect(result).toBe(false);
    expect(prisma.processedWebhook.create).toHaveBeenCalledWith({
      data: { deliveryId: "delivery-1" },
    });
  });

  it("returns true on a repeat call with the same delivery ID", async () => {
    await wasAlreadyProcessed(prisma as never, "delivery-1");
    const result = await wasAlreadyProcessed(prisma as never, "delivery-1");
    expect(result).toBe(true);
  });

  it("treats different delivery IDs independently", async () => {
    await wasAlreadyProcessed(prisma as never, "delivery-1");
    const result = await wasAlreadyProcessed(prisma as never, "delivery-2");
    expect(result).toBe(false);
  });

  it("propagates non-unique-constraint errors", async () => {
    prisma.processedWebhook.create = vi.fn(async () => {
      throw new Error("connection refused");
    });
    await expect(wasAlreadyProcessed(prisma as never, "delivery-1")).rejects.toThrow(
      "connection refused",
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/webhooks/dedupe.test.ts`
Expected: FAIL — `Cannot find module './dedupe'`

- [ ] **Step 3: Write the implementation**

```typescript
// src/lib/webhooks/dedupe.ts
import type { PrismaClient } from "@prisma/client";

type PrismaSurface = Pick<PrismaClient, "processedWebhook">;

function isUniqueConstraintError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: unknown }).code === "P2002"
  );
}

/**
 * Records a webhook delivery ID and reports whether it was already seen.
 * Relies on ProcessedWebhook.deliveryId's unique constraint so two
 * near-simultaneous redeliveries can't both slip through a read-then-write race.
 */
export async function wasAlreadyProcessed(
  prisma: PrismaSurface,
  deliveryId: string,
): Promise<boolean> {
  try {
    await prisma.processedWebhook.create({ data: { deliveryId } });
    return false;
  } catch (err) {
    if (isUniqueConstraintError(err)) return true;
    throw err;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/webhooks/dedupe.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/webhooks/dedupe.ts src/lib/webhooks/dedupe.test.ts
git commit -m "feat: add webhook delivery dedup helper"
```

---

## Task 3: HMAC verification helpers (Shopify + WooCommerce) + WC secret generator

**Goal:** Pure, testable functions to verify an inbound webhook's signature for each platform, plus the generator Zorin uses to create its own WooCommerce webhook secret.

**Files:**
- Create: `src/lib/shopify/webhookAuth.ts`
- Test: `src/lib/shopify/webhookAuth.test.ts`
- Create: `src/lib/woocommerce/webhookAuth.ts`
- Test: `src/lib/woocommerce/webhookAuth.test.ts`

**Acceptance Criteria:**
- [ ] `verifyShopifyWebhook(rawBody, signatureHeader, apiSecret)` returns `true` only when the header matches the base64 HMAC-SHA256 of the raw body computed with the given secret
- [ ] `verifyWooWebhook(rawBody, signatureHeader, webhookSecret)` same shape, matching WooCommerce's own signing scheme (base64 HMAC-SHA256)
- [ ] `generateWooWebhookSecret()` returns a 64-char hex string (32 random bytes)
- [ ] Both verify functions use a timing-safe comparison, not `===`, to avoid a timing side-channel on the signature check

**Verify:** `npm test -- src/lib/shopify/webhookAuth.test.ts src/lib/woocommerce/webhookAuth.test.ts` → all pass

**Steps:**

- [ ] **Step 1: Write the failing tests**

```typescript
// src/lib/shopify/webhookAuth.test.ts
import { createHmac } from "node:crypto";
import { describe, it, expect } from "vitest";
import { verifyShopifyWebhook } from "./webhookAuth";

describe("verifyShopifyWebhook", () => {
  const secret = "shpss_test_secret";
  const rawBody = JSON.stringify({ id: 123, title: "Test Product" });

  function sign(body: string, key: string): string {
    return createHmac("sha256", key).update(body, "utf8").digest("base64");
  }

  it("returns true for a valid signature", () => {
    const signature = sign(rawBody, secret);
    expect(verifyShopifyWebhook(rawBody, signature, secret)).toBe(true);
  });

  it("returns false for a signature signed with the wrong secret", () => {
    const signature = sign(rawBody, "wrong-secret");
    expect(verifyShopifyWebhook(rawBody, signature, secret)).toBe(false);
  });

  it("returns false when the body has been tampered with", () => {
    const signature = sign(rawBody, secret);
    const tamperedBody = JSON.stringify({ id: 123, title: "Tampered" });
    expect(verifyShopifyWebhook(tamperedBody, signature, secret)).toBe(false);
  });

  it("returns false for a missing/empty signature", () => {
    expect(verifyShopifyWebhook(rawBody, "", secret)).toBe(false);
  });

  it("returns false for a malformed (non-base64) signature without throwing", () => {
    expect(verifyShopifyWebhook(rawBody, "not-valid-base64!!!", secret)).toBe(false);
  });
});
```

```typescript
// src/lib/woocommerce/webhookAuth.test.ts
import { createHmac } from "node:crypto";
import { describe, it, expect } from "vitest";
import { verifyWooWebhook, generateWooWebhookSecret } from "./webhookAuth";

describe("verifyWooWebhook", () => {
  const secret = "wc-webhook-secret";
  const rawBody = JSON.stringify({ id: 456, name: "Test Product" });

  function sign(body: string, key: string): string {
    return createHmac("sha256", key).update(body, "utf8").digest("base64");
  }

  it("returns true for a valid signature", () => {
    const signature = sign(rawBody, secret);
    expect(verifyWooWebhook(rawBody, signature, secret)).toBe(true);
  });

  it("returns false for a signature signed with the wrong secret", () => {
    const signature = sign(rawBody, "wrong-secret");
    expect(verifyWooWebhook(rawBody, signature, secret)).toBe(false);
  });

  it("returns false when the body has been tampered with", () => {
    const signature = sign(rawBody, secret);
    const tamperedBody = JSON.stringify({ id: 456, name: "Tampered" });
    expect(verifyWooWebhook(tamperedBody, signature, secret)).toBe(false);
  });

  it("returns false for a missing/empty signature", () => {
    expect(verifyWooWebhook(rawBody, "", secret)).toBe(false);
  });
});

describe("generateWooWebhookSecret", () => {
  it("returns a 64-character hex string", () => {
    const secret = generateWooWebhookSecret();
    expect(secret).toMatch(/^[0-9a-f]{64}$/);
  });

  it("returns a different value on each call", () => {
    expect(generateWooWebhookSecret()).not.toBe(generateWooWebhookSecret());
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/lib/shopify/webhookAuth.test.ts src/lib/woocommerce/webhookAuth.test.ts`
Expected: FAIL — modules don't exist

- [ ] **Step 3: Write the implementations**

```typescript
// src/lib/shopify/webhookAuth.ts
import { createHmac, timingSafeEqual } from "node:crypto";

function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Verifies Shopify's X-Shopify-Hmac-Sha256 header: base64 HMAC-SHA256 of the
 * raw request body, signed with the merchant's custom app's API secret key.
 */
export function verifyShopifyWebhook(
  rawBody: string,
  signatureHeader: string,
  apiSecret: string,
): boolean {
  if (!signatureHeader) return false;
  const expected = createHmac("sha256", apiSecret).update(rawBody, "utf8").digest("base64");
  try {
    return safeCompare(expected, signatureHeader);
  } catch {
    return false;
  }
}
```

```typescript
// src/lib/woocommerce/webhookAuth.ts
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Verifies WooCommerce's X-WC-Webhook-Signature header: base64 HMAC-SHA256 of
 * the raw request body, signed with the secret Zorin generated and registered
 * with the webhook subscription.
 */
export function verifyWooWebhook(
  rawBody: string,
  signatureHeader: string,
  webhookSecret: string,
): boolean {
  if (!signatureHeader) return false;
  const expected = createHmac("sha256", webhookSecret).update(rawBody, "utf8").digest("base64");
  try {
    return safeCompare(expected, signatureHeader);
  } catch {
    return false;
  }
}

/** Generates the secret Zorin uses when registering a WooCommerce webhook. */
export function generateWooWebhookSecret(): string {
  return randomBytes(32).toString("hex");
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/lib/shopify/webhookAuth.test.ts src/lib/woocommerce/webhookAuth.test.ts`
Expected: PASS (10 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/shopify/webhookAuth.ts src/lib/shopify/webhookAuth.test.ts src/lib/woocommerce/webhookAuth.ts src/lib/woocommerce/webhookAuth.test.ts
git commit -m "feat: add HMAC verification for Shopify/WooCommerce webhooks"
```

---

## Task 4: ShopifyClient webhook registration methods

**Goal:** Extend `ShopifyClient` with the ability to create and delete webhook subscriptions.

**Files:**
- Modify: `src/lib/shopify/client.ts`
- Modify: `src/lib/shopify/client.test.ts`

**Acceptance Criteria:**
- [ ] `createWebhook(topic, address)` POSTs to `/admin/api/2024-01/webhooks.json` and returns the created webhook's numeric ID as a string
- [ ] `deleteWebhook(webhookId)` DELETEs `/admin/api/2024-01/webhooks/{id}.json`
- [ ] Both reuse the existing `request()` helper (retry/429 handling included for free)

**Verify:** `npm test -- src/lib/shopify/client.test.ts` → all pass, including new webhook tests

**Steps:**

- [ ] **Step 1: Write the failing tests** — append to the existing `describe('ShopifyClient', ...)` block in `src/lib/shopify/client.test.ts`, after the `verifyConnection()` describe block:

```typescript
  // ─── createWebhook / deleteWebhook ──────────────────────────────────────

  describe('createWebhook()', () => {
    it('POSTs to /webhooks.json and returns the webhook id', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        mockResponse({ webhook: { id: 987654321 } }),
      );

      const id = await client.createWebhook('products/update', 'https://tryzorin.com/api/webhooks/shopify');

      expect(id).toBe('987654321');
      expect(fetch).toHaveBeenCalledWith(
        `https://${shopDomain}/admin/api/2024-01/webhooks.json`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            webhook: {
              topic: 'products/update',
              address: 'https://tryzorin.com/api/webhooks/shopify',
              format: 'json',
            },
          }),
        }),
      );
    });
  });

  describe('deleteWebhook()', () => {
    it('DELETEs /webhooks/{id}.json', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(mockResponse({}));

      await client.deleteWebhook('987654321');

      expect(fetch).toHaveBeenCalledWith(
        `https://${shopDomain}/admin/api/2024-01/webhooks/987654321.json`,
        expect.objectContaining({ method: 'DELETE' }),
      );
    });
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/lib/shopify/client.test.ts`
Expected: FAIL — `client.createWebhook is not a function`

- [ ] **Step 3: Add the methods to `ShopifyClient`** — insert after `updateVariantPrice` (before `fetchOrders`):

```typescript
  // ─── createWebhook ───────────────────────────────────────────────────────

  async createWebhook(topic: string, address: string): Promise<string> {
    const { data } = await this.request(`${this.baseUrl}/webhooks.json`, {
      method: "POST",
      body: { webhook: { topic, address, format: "json" } },
    });
    const body = data as { webhook: { id: number } };
    return String(body.webhook.id);
  }

  // ─── deleteWebhook ───────────────────────────────────────────────────────

  async deleteWebhook(webhookId: string): Promise<void> {
    await this.request(`${this.baseUrl}/webhooks/${webhookId}.json`, {
      method: "DELETE",
    });
  }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/lib/shopify/client.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/shopify/client.ts src/lib/shopify/client.test.ts
git commit -m "feat: add webhook registration methods to ShopifyClient"
```

---

## Task 5: WooCommerceClient webhook registration methods

**Goal:** Extend `WooCommerceClient` with the ability to create and delete webhook subscriptions.

**Files:**
- Modify: `src/lib/woocommerce/client.ts`
- Modify: `src/lib/woocommerce/client.test.ts`

**Acceptance Criteria:**
- [ ] `createWebhook(topic, deliveryUrl, secret)` POSTs to `/wp-json/wc/v3/webhooks` and returns the created webhook's numeric ID as a string
- [ ] `deleteWebhook(webhookId)` DELETEs `/wp-json/wc/v3/webhooks/{id}?force=true`

**Verify:** `npm test -- src/lib/woocommerce/client.test.ts` → all pass, including new webhook tests

**Steps:**

- [ ] **Step 1: Write the failing tests** — check the existing mock-response helper name in `src/lib/woocommerce/client.test.ts` (mirrors the Shopify one) and append:

```typescript
  describe('createWebhook()', () => {
    it('POSTs to /webhooks and returns the webhook id', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        mockResponse({ id: 55 }),
      );

      const id = await client.createWebhook(
        'product.updated',
        'https://tryzorin.com/api/webhooks/woocommerce/conn123',
        'wc-secret',
      );

      expect(id).toBe('55');
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/wp-json/wc/v3/webhooks'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            name: 'Zorin product.updated',
            topic: 'product.updated',
            delivery_url: 'https://tryzorin.com/api/webhooks/woocommerce/conn123',
            secret: 'wc-secret',
          }),
        }),
      );
    });
  });

  describe('deleteWebhook()', () => {
    it('DELETEs /webhooks/{id}?force=true', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(mockResponse({}));

      await client.deleteWebhook('55');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/wp-json/wc/v3/webhooks/55?force=true'),
        expect.objectContaining({ method: 'DELETE' }),
      );
    });
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/lib/woocommerce/client.test.ts`
Expected: FAIL — `client.createWebhook is not a function`

- [ ] **Step 3: Add the methods to `WooCommerceClient`** — insert after `updateVariationPrice` (end of class, before closing brace):

```typescript
  // ─── createWebhook ───────────────────────────────────────────────────────

  async createWebhook(topic: string, deliveryUrl: string, secret: string): Promise<string> {
    const { data } = await this.request(`${this.baseUrl}/webhooks`, {
      method: "POST",
      body: { name: `Zorin ${topic}`, topic, delivery_url: deliveryUrl, secret },
    });
    const body = data as { id: number };
    return String(body.id);
  }

  // ─── deleteWebhook ───────────────────────────────────────────────────────

  async deleteWebhook(webhookId: string): Promise<void> {
    await this.request(`${this.baseUrl}/webhooks/${webhookId}?force=true`, {
      method: "DELETE",
    });
  }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/lib/woocommerce/client.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/woocommerce/client.ts src/lib/woocommerce/client.test.ts
git commit -m "feat: add webhook registration methods to WooCommerceClient"
```

---

## Task 6: Shopify connect/disconnect/status wiring + UI

**Goal:** Wire webhook registration into the Shopify connect flow, cleanup into disconnect, and surface live-sync status.

**Files:**
- Modify: `src/app/api/shopify/connect/route.ts`
- Modify: `src/app/api/shopify/connect/route.test.ts`
- Modify: `src/app/api/shopify/disconnect/route.ts`
- Create: `src/app/api/shopify/disconnect/route.test.ts`
- Modify: `src/app/api/shopify/status/route.ts`
- Modify: `src/components/ShopifyConnectionCard.tsx`

**Acceptance Criteria:**
- [ ] Connect form requires `apiSecret` in addition to `shopDomain`/`accessToken`
- [ ] On successful connect, three webhooks are registered (`products/update`, `orders/create`, `app/uninstalled`) pointed at `${NEXT_PUBLIC_APP_URL}/api/webhooks/shopify`, and `encryptedApiSecret` + `webhookIds` are persisted
- [ ] Disconnect deletes each registered webhook (best-effort — failure doesn't block local row deletion) before deleting the connection
- [ ] `/api/shopify/status` returns `webhooksActive: boolean` (true when `webhookIds` is a non-empty array)
- [ ] `ShopifyConnectionCard` shows an "API Secret Key" password field in the connect form, and a "Live sync active" badge when connected with `webhooksActive`

**Verify:** `npm test -- src/app/api/shopify` → all pass

**Steps:**

- [ ] **Step 1: Add `NEXT_PUBLIC_APP_URL` fallback constant** — webhooks need an absolute address. Add to `src/lib/appConfig.ts`:

```typescript
// src/lib/appConfig.ts
export function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "https://tryzorin.com";
}
```

- [ ] **Step 2: Update `src/app/api/shopify/connect/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { HttpError, withErrorHandling } from "@/lib/api/errors";
import { requireSessionApi } from "@/lib/auth/requireSession";
import { encryptToken } from "@/lib/shopify/crypto";
import { ShopifyClient } from "@/lib/shopify/client";
import { getAppUrl } from "@/lib/appConfig";

function normalizeDomain(raw: string): string {
  let domain = raw.trim().toLowerCase();
  if (domain.length === 0) throw new HttpError(400, "shopDomain is required");
  domain = domain.replace(/^https?:\/\//, ""); // strip scheme
  domain = domain.split("/")[0]; // strip path
  if (!domain.endsWith(".myshopify.com")) {
    domain = domain.replace(/\.myshopify\.com$/, "") + ".myshopify.com";
  }
  return domain;
}

const WEBHOOK_TOPICS = ["products/update", "orders/create", "app/uninstalled"];

export const POST = withErrorHandling(async (req: Request) => {
  const { merchantId } = await requireSessionApi();

  const body = await req.json() as { shopDomain?: unknown; accessToken?: unknown; apiSecret?: unknown };

  if (!body.shopDomain || typeof body.shopDomain !== "string") {
    throw new HttpError(400, "shopDomain is required");
  }
  if (!body.accessToken || typeof body.accessToken !== "string") {
    throw new HttpError(400, "accessToken is required");
  }
  if (!body.apiSecret || typeof body.apiSecret !== "string") {
    throw new HttpError(400, "apiSecret is required");
  }

  const shopDomain = normalizeDomain(body.shopDomain);
  const accessToken = body.accessToken;
  const apiSecret = body.apiSecret;

  const client = new ShopifyClient(shopDomain, accessToken);

  let shopName: string;
  try {
    const result = await client.verifyConnection();
    shopName = result.shopName;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/4\d\d/.test(msg)) throw new HttpError(401, "Invalid Shopify credentials or domain");
    throw err; // let withErrorHandling produce the 500
  }

  const webhookAddress = `${getAppUrl()}/api/webhooks/shopify`;
  const webhookIds: string[] = [];
  for (const topic of WEBHOOK_TOPICS) {
    const id = await client.createWebhook(topic, webhookAddress);
    webhookIds.push(id);
  }

  const encryptedToken = encryptToken(accessToken);
  const encryptedApiSecret = encryptToken(apiSecret);

  await prisma.shopifyConnection.upsert({
    where: { merchantId },
    create: {
      merchantId,
      shopDomain,
      encryptedToken,
      encryptedApiSecret,
      webhookIds: JSON.stringify(webhookIds),
    },
    update: {
      shopDomain,
      encryptedToken,
      encryptedApiSecret,
      webhookIds: JSON.stringify(webhookIds),
    },
  });

  return NextResponse.json({ success: true, shopName });
});
```

- [ ] **Step 3: Update `src/app/api/shopify/connect/route.test.ts`** — the existing mocks need `createWebhook` added to the mock client, and every request body needs `apiSecret`. Replace the mocks block and helper at the top of the file:

```typescript
import { beforeEach, describe, expect, it, vi } from "vitest";

// ── hoisted mocks ────────────────────────────────────────────────────────────

const { encryptToken, mockVerifyConnection, mockCreateWebhook } = vi.hoisted(() => ({
  encryptToken: vi.fn(),
  mockVerifyConnection: vi.fn(),
  mockCreateWebhook: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    shopifyConnection: {
      upsert: vi.fn(),
    },
  },
}));

vi.mock("@/lib/shopify/crypto", () => ({ encryptToken }));

vi.mock("@/lib/shopify/client", () => ({
  ShopifyClient: class MockShopifyClient {
    constructor(
      public shopDomain: string,
      public accessToken: string,
    ) {}
    verifyConnection = mockVerifyConnection;
    createWebhook = mockCreateWebhook;
  },
}));

vi.mock("@/lib/auth/requireSession", () => ({
  requireSessionApi: vi.fn(async () => ({
    merchantId: "m1",
    user: { id: "u1", email: "demo@zorin.example", merchantId: "m1" },
  })),
}));

import { POST } from "./route";
import { prisma } from "@/lib/db";

function req(body: unknown): Request {
  return {
    json: async () => body,
  } as unknown as Request;
}

beforeEach(() => {
  vi.clearAllMocks();
  encryptToken.mockReturnValue("enc:token");
  mockVerifyConnection.mockResolvedValue({ shopName: "My Shop" });
  mockCreateWebhook.mockResolvedValue("webhook-id-1");
  (prisma.shopifyConnection.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({});
});
```

Update every existing `req({...})` call in the file's `it(...)` blocks to include `apiSecret: "shhh"` alongside `shopDomain`/`accessToken` (the 400-missing-field tests for `shopDomain`/`accessToken` stay as-is; add one new test):

```typescript
  it("returns 400 when apiSecret is missing", async () => {
    const res = await POST(req({ shopDomain: "mystore.myshopify.com", accessToken: "tok" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/apiSecret/i);
  });

  it("registers three webhooks and stores their ids on success", async () => {
    mockCreateWebhook
      .mockResolvedValueOnce("wh-1")
      .mockResolvedValueOnce("wh-2")
      .mockResolvedValueOnce("wh-3");
    const res = await POST(req({ shopDomain: "mystore.myshopify.com", accessToken: "tok", apiSecret: "shhh" }));
    expect(res.status).toBe(200);
    expect(mockCreateWebhook).toHaveBeenCalledTimes(3);
    expect(mockCreateWebhook).toHaveBeenCalledWith("products/update", expect.stringContaining("/api/webhooks/shopify"));
    expect(mockCreateWebhook).toHaveBeenCalledWith("orders/create", expect.stringContaining("/api/webhooks/shopify"));
    expect(mockCreateWebhook).toHaveBeenCalledWith("app/uninstalled", expect.stringContaining("/api/webhooks/shopify"));
    const call = (prisma.shopifyConnection.upsert as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(JSON.parse(call.create.webhookIds)).toEqual(["wh-1", "wh-2", "wh-3"]);
  });
```

(Every other pre-existing test's `req({...})` call must now also pass `apiSecret: "shhh"`, or it will fail on the new 400 check — update them all.)

- [ ] **Step 4: Update `src/app/api/shopify/disconnect/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withErrorHandling } from "@/lib/api/errors";
import { requireSessionApi } from "@/lib/auth/requireSession";
import { decryptToken } from "@/lib/shopify/crypto";
import { ShopifyClient } from "@/lib/shopify/client";

export const POST = withErrorHandling(async (_req: Request) => {
  const { merchantId } = await requireSessionApi();

  const connection = await prisma.shopifyConnection.findUnique({ where: { merchantId } });

  if (connection) {
    const accessToken = decryptToken(connection.encryptedToken);
    const client = new ShopifyClient(connection.shopDomain, accessToken);
    const webhookIds = JSON.parse(connection.webhookIds) as string[];
    for (const id of webhookIds) {
      try {
        await client.deleteWebhook(id);
      } catch {
        // Best-effort: credentials may already be revoked. Local cleanup proceeds regardless.
      }
    }
  }

  await prisma.shopifyConnection.delete({
    where: { merchantId },
  });

  return NextResponse.json({ success: true });
});
```

- [ ] **Step 5: Write `src/app/api/shopify/disconnect/route.test.ts`**

```typescript
import { beforeEach, describe, expect, it, vi } from "vitest";

const { decryptToken, mockDeleteWebhook } = vi.hoisted(() => ({
  decryptToken: vi.fn(),
  mockDeleteWebhook: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    shopifyConnection: {
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("@/lib/shopify/crypto", () => ({ decryptToken }));

vi.mock("@/lib/shopify/client", () => ({
  ShopifyClient: class MockShopifyClient {
    constructor(
      public shopDomain: string,
      public accessToken: string,
    ) {}
    deleteWebhook = mockDeleteWebhook;
  },
}));

vi.mock("@/lib/auth/requireSession", () => ({
  requireSessionApi: vi.fn(async () => ({
    merchantId: "m1",
    user: { id: "u1", email: "demo@zorin.example", merchantId: "m1" },
  })),
}));

import { POST } from "./route";
import { prisma } from "@/lib/db";

beforeEach(() => {
  vi.clearAllMocks();
  decryptToken.mockReturnValue("plain-token");
  mockDeleteWebhook.mockResolvedValue(undefined);
  (prisma.shopifyConnection.delete as ReturnType<typeof vi.fn>).mockResolvedValue({});
});

describe("POST /api/shopify/disconnect", () => {
  it("deletes each registered webhook before deleting the connection", async () => {
    (prisma.shopifyConnection.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      shopDomain: "mystore.myshopify.com",
      encryptedToken: "enc",
      webhookIds: JSON.stringify(["wh-1", "wh-2"]),
    });

    const res = await POST({} as Request);

    expect(res.status).toBe(200);
    expect(mockDeleteWebhook).toHaveBeenCalledWith("wh-1");
    expect(mockDeleteWebhook).toHaveBeenCalledWith("wh-2");
    expect(prisma.shopifyConnection.delete).toHaveBeenCalledWith({ where: { merchantId: "m1" } });
  });

  it("still deletes the connection if a webhook deletion fails (revoked credentials)", async () => {
    (prisma.shopifyConnection.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      shopDomain: "mystore.myshopify.com",
      encryptedToken: "enc",
      webhookIds: JSON.stringify(["wh-1"]),
    });
    mockDeleteWebhook.mockRejectedValueOnce(new Error("401: revoked"));

    const res = await POST({} as Request);

    expect(res.status).toBe(200);
    expect(prisma.shopifyConnection.delete).toHaveBeenCalled();
  });

  it("skips webhook cleanup entirely when there is no connection row", async () => {
    (prisma.shopifyConnection.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const res = await POST({} as Request);

    expect(res.status).toBe(200);
    expect(mockDeleteWebhook).not.toHaveBeenCalled();
    expect(prisma.shopifyConnection.delete).toHaveBeenCalled();
  });
});
```

- [ ] **Step 6: Update `src/app/api/shopify/status/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withErrorHandling } from "@/lib/api/errors";
import { requireSessionApi } from "@/lib/auth/requireSession";

export const GET = withErrorHandling(async (_req: Request) => {
  const { merchantId } = await requireSessionApi();

  const connection = await prisma.shopifyConnection.findUnique({
    where: { merchantId },
    select: { shopDomain: true, lastSyncedAt: true, webhookIds: true },
  });

  if (!connection) {
    return NextResponse.json({ connected: false });
  }

  const webhookIds = JSON.parse(connection.webhookIds) as string[];

  return NextResponse.json({
    connected: true,
    shopDomain: connection.shopDomain,
    lastSyncedAt: connection.lastSyncedAt,
    webhooksActive: webhookIds.length > 0,
  });
});
```

- [ ] **Step 7: Update `src/components/ShopifyConnectionCard.tsx`** — add `apiSecret` state, the form field, and the badge. Three targeted edits:

Add state (next to `accessToken`):
```typescript
  const [apiSecret, setApiSecret] = useState("");
```

Add `webhooksActive` to the `ShopifyStatus` interface and state:
```typescript
interface ShopifyStatus {
  connected: boolean;
  shopDomain?: string;
  lastSyncedAt?: string | null;
  webhooksActive?: boolean;
}
```
```typescript
  const [webhooksActive, setWebhooksActive] = useState(false);
```
In `fetchStatus`, inside the `if (data.connected)` branch, add:
```typescript
        setWebhooksActive(data.webhooksActive ?? false);
```

Update `handleConnect`'s fetch body and reset:
```typescript
        body: JSON.stringify({ shopDomain, accessToken, apiSecret }),
```
```typescript
      setShopDomain("");
      setAccessToken("");
      setApiSecret("");
```

Add the form field, right after the Access Token field's closing `</div>`:
```tsx
          <div>
            <label htmlFor="apiSecret" className="block text-xs font-medium text-ink mb-1">
              API Secret Key
            </label>
            <input
              id="apiSecret"
              type="password"
              placeholder="shpss_••••••••"
              value={apiSecret}
              onChange={(e) => setApiSecret(e.target.value)}
              disabled={uiState === "connecting"}
              required
              className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
            />
          </div>
```

Add the badge, right after the `<p className="text-xs text-muted">Last synced: ...` line:
```tsx
            {webhooksActive && (
              <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent">
                Live sync active
              </p>
            )}
```

**Verify:** `npm test -- src/app/api/shopify` → all pass

- [ ] **Step 8: Commit**

```bash
git add src/lib/appConfig.ts src/app/api/shopify/connect/route.ts src/app/api/shopify/connect/route.test.ts src/app/api/shopify/disconnect/route.ts src/app/api/shopify/disconnect/route.test.ts src/app/api/shopify/status/route.ts src/components/ShopifyConnectionCard.tsx
git commit -m "feat: wire webhook registration into Shopify connect/disconnect + status/UI"
```

---

## Task 7: WooCommerce connect/disconnect/status wiring + UI

**Goal:** Mirror Task 6 for WooCommerce — self-generated webhook secret, registration on connect, cleanup on disconnect, status flag, UI badge.

**Files:**
- Modify: `src/app/api/woocommerce/connect/route.ts`
- Create: `src/app/api/woocommerce/connect/route.test.ts` (none exists yet — check first; if one exists, modify it instead)
- Modify: `src/app/api/woocommerce/disconnect/route.ts`
- Create: `src/app/api/woocommerce/disconnect/route.test.ts`
- Modify: `src/app/api/woocommerce/status/route.ts`
- Modify: `src/components/WooCommerceConnectionCard.tsx`

**Acceptance Criteria:**
- [ ] Connect flow is unchanged from the merchant's perspective (still just storeUrl/consumerKey/consumerSecret) — Zorin generates the webhook secret itself
- [ ] On successful connect, two webhooks are registered (`product.updated`, `order.created`) pointed at `${getAppUrl()}/api/webhooks/woocommerce/{connectionId}`, and `encryptedWebhookSecret` + `webhookIds` are persisted
- [ ] Disconnect deletes each registered webhook (best-effort) before deleting the connection
- [ ] `/api/woocommerce/status` returns `webhooksActive: boolean`
- [ ] `WooCommerceConnectionCard` shows a "Live sync active" badge when connected with `webhooksActive` (no new merchant-facing input field, unlike Shopify)

**Verify:** `npm test -- src/app/api/woocommerce` → all pass

**Steps:**

- [ ] **Step 1: Check for an existing connect route test**

```bash
cd /c/Users/pohde/projects/zorin
ls src/app/api/woocommerce/connect/route.test.ts 2>/dev/null || echo "none exists — will create"
```

- [ ] **Step 2: Update `src/app/api/woocommerce/connect/route.ts`** — the webhook address needs the connection's own ID, so it's created first (or upserted first, then updated with `webhookIds` once known):

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { HttpError, withErrorHandling } from "@/lib/api/errors";
import { requireSessionApi } from "@/lib/auth/requireSession";
import { encrypt } from "@/lib/woocommerce/crypto";
import { WooCommerceClient } from "@/lib/woocommerce/client";
import { generateWooWebhookSecret } from "@/lib/woocommerce/webhookAuth";
import { getAppUrl } from "@/lib/appConfig";

function normalizeStoreUrl(raw: string): string {
  let url = raw.trim();
  if (url.length === 0) throw new HttpError(400, "storeUrl is required");
  url = url.replace(/\/$/, ""); // strip trailing slash
  if (url.startsWith("http://")) {
    url = "https://" + url.slice("http://".length);
  } else if (!url.startsWith("https://")) {
    url = "https://" + url;
  }
  return url;
}

const WEBHOOK_TOPICS = ["product.updated", "order.created"];

export const POST = withErrorHandling(async (req: Request) => {
  const { merchantId } = await requireSessionApi();
  const body = await req.json() as { storeUrl?: unknown; consumerKey?: unknown; consumerSecret?: unknown };
  if (!body.storeUrl || typeof body.storeUrl !== "string") {
    throw new HttpError(400, "storeUrl is required");
  }
  if (!body.consumerKey || typeof body.consumerKey !== "string") {
    throw new HttpError(400, "consumerKey is required");
  }
  if (!body.consumerSecret || typeof body.consumerSecret !== "string") {
    throw new HttpError(400, "consumerSecret is required");
  }
  const storeUrl = normalizeStoreUrl(body.storeUrl);
  const consumerKey = body.consumerKey;
  const consumerSecret = body.consumerSecret;
  const client = new WooCommerceClient(storeUrl, consumerKey, consumerSecret);
  let storeName: string;
  try {
    const result = await client.verifyConnection();
    storeName = result.storeName;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/4\d\d/.test(msg)) throw new HttpError(400, "Invalid WooCommerce credentials or store URL");
    throw err;
  }
  const encryptedKey = encrypt(consumerKey);
  const encryptedSecret = encrypt(consumerSecret);
  const webhookSecret = generateWooWebhookSecret();
  const encryptedWebhookSecret = encrypt(webhookSecret);

  // Upsert first (without webhookIds) so we have a stable connection id to
  // build the per-merchant webhook delivery URL from.
  const connection = await prisma.wooCommerceConnection.upsert({
    where: { merchantId },
    create: { merchantId, storeUrl, encryptedKey, encryptedSecret, encryptedWebhookSecret },
    update: { storeUrl, encryptedKey, encryptedSecret, encryptedWebhookSecret },
  });

  const deliveryUrl = `${getAppUrl()}/api/webhooks/woocommerce/${connection.id}`;
  const webhookIds: string[] = [];
  for (const topic of WEBHOOK_TOPICS) {
    const id = await client.createWebhook(topic, deliveryUrl, webhookSecret);
    webhookIds.push(id);
  }

  await prisma.wooCommerceConnection.update({
    where: { merchantId },
    data: { webhookIds: JSON.stringify(webhookIds) },
  });

  return NextResponse.json({ storeName });
});
```

- [ ] **Step 3: Write `src/app/api/woocommerce/connect/route.test.ts`** (create fresh, following the Shopify connect test's mocking pattern):

```typescript
import { beforeEach, describe, expect, it, vi } from "vitest";

const { encrypt, mockVerifyConnection, mockCreateWebhook, generateWooWebhookSecret } = vi.hoisted(() => ({
  encrypt: vi.fn(),
  mockVerifyConnection: vi.fn(),
  mockCreateWebhook: vi.fn(),
  generateWooWebhookSecret: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    wooCommerceConnection: {
      upsert: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/woocommerce/crypto", () => ({ encrypt }));
vi.mock("@/lib/woocommerce/webhookAuth", () => ({ generateWooWebhookSecret }));

vi.mock("@/lib/woocommerce/client", () => ({
  WooCommerceClient: class MockWooCommerceClient {
    constructor(
      public storeUrl: string,
      public consumerKey: string,
      public consumerSecret: string,
    ) {}
    verifyConnection = mockVerifyConnection;
    createWebhook = mockCreateWebhook;
  },
}));

vi.mock("@/lib/auth/requireSession", () => ({
  requireSessionApi: vi.fn(async () => ({
    merchantId: "m1",
    user: { id: "u1", email: "demo@zorin.example", merchantId: "m1" },
  })),
}));

import { POST } from "./route";
import { prisma } from "@/lib/db";

function req(body: unknown): Request {
  return { json: async () => body } as unknown as Request;
}

beforeEach(() => {
  vi.clearAllMocks();
  encrypt.mockReturnValue("enc:value");
  generateWooWebhookSecret.mockReturnValue("plain-webhook-secret");
  mockVerifyConnection.mockResolvedValue({ storeName: "mystore.com" });
  mockCreateWebhook.mockResolvedValue("wc-webhook-id");
  (prisma.wooCommerceConnection.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "conn123" });
  (prisma.wooCommerceConnection.update as ReturnType<typeof vi.fn>).mockResolvedValue({});
});

describe("POST /api/woocommerce/connect", () => {
  it("registers two webhooks pointed at the per-connection URL and persists their ids", async () => {
    mockCreateWebhook
      .mockResolvedValueOnce("wh-1")
      .mockResolvedValueOnce("wh-2");

    const res = await POST(req({ storeUrl: "https://mystore.com", consumerKey: "ck", consumerSecret: "cs" }));

    expect(res.status).toBe(200);
    expect(mockCreateWebhook).toHaveBeenCalledWith(
      "product.updated",
      expect.stringContaining("/api/webhooks/woocommerce/conn123"),
      "plain-webhook-secret",
    );
    expect(mockCreateWebhook).toHaveBeenCalledWith(
      "order.created",
      expect.stringContaining("/api/webhooks/woocommerce/conn123"),
      "plain-webhook-secret",
    );
    const updateCall = (prisma.wooCommerceConnection.update as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(JSON.parse(updateCall.data.webhookIds)).toEqual(["wh-1", "wh-2"]);
  });

  it("returns 400 when consumerSecret is missing", async () => {
    const res = await POST(req({ storeUrl: "https://mystore.com", consumerKey: "ck" }));
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 4: Update `src/app/api/woocommerce/disconnect/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withErrorHandling } from "@/lib/api/errors";
import { requireSessionApi } from "@/lib/auth/requireSession";
import { WooCommerceClient } from "@/lib/woocommerce/client";
import { decrypt } from "@/lib/woocommerce/crypto";

export const POST = withErrorHandling(async (_req: Request) => {
  const { merchantId } = await requireSessionApi();

  const connection = await prisma.wooCommerceConnection.findUnique({ where: { merchantId } });

  if (connection) {
    const consumerKey = decrypt(connection.encryptedKey);
    const consumerSecret = decrypt(connection.encryptedSecret);
    const client = new WooCommerceClient(connection.storeUrl, consumerKey, consumerSecret);
    const webhookIds = JSON.parse(connection.webhookIds) as string[];
    for (const id of webhookIds) {
      try {
        await client.deleteWebhook(id);
      } catch {
        // Best-effort: credentials may already be revoked. Local cleanup proceeds regardless.
      }
    }
  }

  await prisma.wooCommerceConnection.delete({
    where: { merchantId },
  });
  await prisma.product.updateMany({
    where: { merchantId },
    data: { woocommerceVariantId: null, woocommerceParentId: null },
  });
  return NextResponse.json({ ok: true });
});
```

- [ ] **Step 5: Write `src/app/api/woocommerce/disconnect/route.test.ts`** (mirror Task 6 Step 5's Shopify version, adapted for WooCommerce's field names — `encryptedKey`/`encryptedSecret` decrypted via `decrypt`, and the extra `product.updateMany` call):

```typescript
import { beforeEach, describe, expect, it, vi } from "vitest";

const { decrypt, mockDeleteWebhook } = vi.hoisted(() => ({
  decrypt: vi.fn(),
  mockDeleteWebhook: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    wooCommerceConnection: {
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
    product: {
      updateMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/woocommerce/crypto", () => ({ decrypt }));

vi.mock("@/lib/woocommerce/client", () => ({
  WooCommerceClient: class MockWooCommerceClient {
    constructor(
      public storeUrl: string,
      public consumerKey: string,
      public consumerSecret: string,
    ) {}
    deleteWebhook = mockDeleteWebhook;
  },
}));

vi.mock("@/lib/auth/requireSession", () => ({
  requireSessionApi: vi.fn(async () => ({
    merchantId: "m1",
    user: { id: "u1", email: "demo@zorin.example", merchantId: "m1" },
  })),
}));

import { POST } from "./route";
import { prisma } from "@/lib/db";

beforeEach(() => {
  vi.clearAllMocks();
  decrypt.mockReturnValue("plain-value");
  mockDeleteWebhook.mockResolvedValue(undefined);
  (prisma.wooCommerceConnection.delete as ReturnType<typeof vi.fn>).mockResolvedValue({});
  (prisma.product.updateMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 0 });
});

describe("POST /api/woocommerce/disconnect", () => {
  it("deletes each registered webhook before deleting the connection", async () => {
    (prisma.wooCommerceConnection.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      storeUrl: "https://mystore.com",
      encryptedKey: "enc",
      encryptedSecret: "enc",
      webhookIds: JSON.stringify(["wh-1", "wh-2"]),
    });

    const res = await POST({} as Request);

    expect(res.status).toBe(200);
    expect(mockDeleteWebhook).toHaveBeenCalledWith("wh-1");
    expect(mockDeleteWebhook).toHaveBeenCalledWith("wh-2");
    expect(prisma.wooCommerceConnection.delete).toHaveBeenCalledWith({ where: { merchantId: "m1" } });
  });

  it("still deletes the connection if a webhook deletion fails", async () => {
    (prisma.wooCommerceConnection.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      storeUrl: "https://mystore.com",
      encryptedKey: "enc",
      encryptedSecret: "enc",
      webhookIds: JSON.stringify(["wh-1"]),
    });
    mockDeleteWebhook.mockRejectedValueOnce(new Error("401: revoked"));

    const res = await POST({} as Request);

    expect(res.status).toBe(200);
    expect(prisma.wooCommerceConnection.delete).toHaveBeenCalled();
  });
});
```

- [ ] **Step 6: Update `src/app/api/woocommerce/status/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withErrorHandling } from "@/lib/api/errors";
import { requireSessionApi } from "@/lib/auth/requireSession";

export const GET = withErrorHandling(async (_req: Request) => {
  const { merchantId } = await requireSessionApi();
  const connection = await prisma.wooCommerceConnection.findUnique({
    where: { merchantId },
    select: { storeUrl: true, lastSyncedAt: true, webhookIds: true },
  });
  if (!connection) {
    return NextResponse.json({ connected: false });
  }
  const webhookIds = JSON.parse(connection.webhookIds) as string[];
  return NextResponse.json({
    connected: true,
    storeUrl: connection.storeUrl,
    lastSyncedAt: connection.lastSyncedAt,
    webhooksActive: webhookIds.length > 0,
  });
});
```

- [ ] **Step 7: Update `src/components/WooCommerceConnectionCard.tsx`** — add `webhooksActive` to the interface/state and the badge (no new form field, since the secret is server-generated):

```typescript
interface WooCommerceStatus {
  connected: boolean;
  storeUrl?: string;
  lastSyncedAt?: string | null;
  webhooksActive?: boolean;
}
```
```typescript
  const [webhooksActive, setWebhooksActive] = useState(false);
```
In `fetchStatus`, inside `if (data.connected && data.storeUrl)`, add:
```typescript
        setWebhooksActive(data.webhooksActive ?? false);
```
Add the badge right after the `Last synced: {formatDate(lastSyncedAt)}` paragraph:
```tsx
            {webhooksActive && (
              <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent">
                Live sync active
              </p>
            )}
```

**Verify:** `npm test -- src/app/api/woocommerce` → all pass

- [ ] **Step 8: Commit**

```bash
git add src/app/api/woocommerce/connect/route.ts src/app/api/woocommerce/connect/route.test.ts src/app/api/woocommerce/disconnect/route.ts src/app/api/woocommerce/disconnect/route.test.ts src/app/api/woocommerce/status/route.ts src/components/WooCommerceConnectionCard.tsx
git commit -m "feat: wire webhook registration into WooCommerce connect/disconnect + status/UI"
```

---

## Task 8: Shopify webhook receiver route

**Goal:** The endpoint Shopify actually calls — verify, dedupe, sync.

**Files:**
- Create: `src/app/api/webhooks/shopify/route.ts`
- Test: `src/app/api/webhooks/shopify/route.test.ts`

**Acceptance Criteria:**
- [ ] Missing/invalid `X-Shopify-Hmac-Sha256` → `401`, no DB writes
- [ ] Unknown `shopDomain` (no matching connection) → `404`
- [ ] Replayed `X-Shopify-Webhook-Id` → `200` immediately, `syncProducts`/`syncOrders` not called again
- [ ] `products/update` topic → calls `syncProducts` with a single-item array built from the payload
- [ ] `orders/create` topic → calls `syncOrders` with a single-item array (the payload cast to `ShopifyOrder`)
- [ ] `app/uninstalled` topic → deletes the `ShopifyConnection` row
- [ ] Unrecognized topic → `200`, no processing
- [ ] Rate limited using the existing `checkRateLimit`, keyed by `shopDomain`

**Verify:** `npm test -- src/app/api/webhooks/shopify/route.test.ts` → all pass

**Steps:**

- [ ] **Step 1: Write the failing tests**

```typescript
// src/app/api/webhooks/shopify/route.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  verifyShopifyWebhook,
  decryptToken,
  wasAlreadyProcessed,
  syncProducts,
  syncOrders,
  checkRateLimit,
} = vi.hoisted(() => ({
  verifyShopifyWebhook: vi.fn(),
  decryptToken: vi.fn(),
  wasAlreadyProcessed: vi.fn(),
  syncProducts: vi.fn(),
  syncOrders: vi.fn(),
  checkRateLimit: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    shopifyConnection: {
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
  },
}));
vi.mock("@/lib/shopify/webhookAuth", () => ({ verifyShopifyWebhook }));
vi.mock("@/lib/shopify/crypto", () => ({ decryptToken }));
vi.mock("@/lib/webhooks/dedupe", () => ({ wasAlreadyProcessed }));
vi.mock("@/lib/shopify/syncProducts", () => ({ syncProducts }));
vi.mock("@/lib/shopify/syncOrders", () => ({ syncOrders }));
vi.mock("@/lib/auth/rateLimit", () => ({ checkRateLimit }));

import { POST } from "./route";
import { prisma } from "@/lib/db";

function req(
  body: unknown,
  headers: Record<string, string> = {},
): Request {
  const raw = JSON.stringify(body);
  return {
    text: async () => raw,
    headers: {
      get: (key: string) => headers[key] ?? null,
    },
  } as unknown as Request;
}

const CONNECTION = {
  merchantId: "m1",
  shopDomain: "mystore.myshopify.com",
  encryptedApiSecret: "enc:secret",
};

beforeEach(() => {
  vi.clearAllMocks();
  checkRateLimit.mockResolvedValue({ allowed: true, retryAfterMs: 0 });
  verifyShopifyWebhook.mockReturnValue(true);
  decryptToken.mockReturnValue("plain-secret");
  wasAlreadyProcessed.mockResolvedValue(false);
  (prisma.shopifyConnection.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(CONNECTION);
  syncProducts.mockResolvedValue({ created: 0, updated: 1, skipped: 0, skippedReasons: [] });
  syncOrders.mockResolvedValue({ upserted: 1, skippedLineItems: 0 });
});

describe("POST /api/webhooks/shopify", () => {
  it("returns 401 when the HMAC signature is invalid", async () => {
    verifyShopifyWebhook.mockReturnValue(false);
    const res = await POST(
      req({ id: 1 }, { "X-Shopify-Hmac-Sha256": "bad-sig", "X-Shopify-Shop-Domain": "mystore.myshopify.com", "X-Shopify-Topic": "products/update", "X-Shopify-Webhook-Id": "d1" }),
    );
    expect(res.status).toBe(401);
    expect(syncProducts).not.toHaveBeenCalled();
  });

  it("returns 404 when the shop domain has no matching connection", async () => {
    (prisma.shopifyConnection.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await POST(
      req({ id: 1 }, { "X-Shopify-Hmac-Sha256": "sig", "X-Shopify-Shop-Domain": "unknown.myshopify.com", "X-Shopify-Topic": "products/update", "X-Shopify-Webhook-Id": "d1" }),
    );
    expect(res.status).toBe(404);
  });

  it("returns 200 without reprocessing on a replayed delivery id", async () => {
    wasAlreadyProcessed.mockResolvedValue(true);
    const res = await POST(
      req({ id: 1 }, { "X-Shopify-Hmac-Sha256": "sig", "X-Shopify-Shop-Domain": "mystore.myshopify.com", "X-Shopify-Topic": "products/update", "X-Shopify-Webhook-Id": "d1" }),
    );
    expect(res.status).toBe(200);
    expect(syncProducts).not.toHaveBeenCalled();
  });

  it("calls syncProducts with a single-item array for products/update", async () => {
    const payload = {
      id: 555,
      title: "Widget",
      image: { src: "https://cdn.example.com/w.jpg" },
      variants: [{ id: 999, product_id: 555, title: "Default Title", sku: "SKU1", price: "19.99", inventory_quantity: 5 }],
    };
    const res = await POST(
      req(payload, { "X-Shopify-Hmac-Sha256": "sig", "X-Shopify-Shop-Domain": "mystore.myshopify.com", "X-Shopify-Topic": "products/update", "X-Shopify-Webhook-Id": "d1" }),
    );
    expect(res.status).toBe(200);
    expect(syncProducts).toHaveBeenCalledWith(
      prisma,
      "m1",
      [expect.objectContaining({ id: 999, sku: "SKU1", price: "19.99", product_title: "Widget", imageUrl: "https://cdn.example.com/w.jpg" })],
    );
  });

  it("calls syncOrders with a single-item array for orders/create", async () => {
    const payload = {
      id: 777,
      created_at: "2026-07-31T00:00:00Z",
      line_items: [{ variant_id: 999, quantity: 2, price: "19.99" }],
    };
    const res = await POST(
      req(payload, { "X-Shopify-Hmac-Sha256": "sig", "X-Shopify-Shop-Domain": "mystore.myshopify.com", "X-Shopify-Topic": "orders/create", "X-Shopify-Webhook-Id": "d1" }),
    );
    expect(res.status).toBe(200);
    expect(syncOrders).toHaveBeenCalledWith(prisma, "m1", [payload]);
  });

  it("deletes the connection on app/uninstalled", async () => {
    const res = await POST(
      req({ id: 1 }, { "X-Shopify-Hmac-Sha256": "sig", "X-Shopify-Shop-Domain": "mystore.myshopify.com", "X-Shopify-Topic": "app/uninstalled", "X-Shopify-Webhook-Id": "d1" }),
    );
    expect(res.status).toBe(200);
    expect(prisma.shopifyConnection.delete).toHaveBeenCalledWith({ where: { merchantId: "m1" } });
  });

  it("returns 200 and does nothing for an unrecognized topic", async () => {
    const res = await POST(
      req({ id: 1 }, { "X-Shopify-Hmac-Sha256": "sig", "X-Shopify-Shop-Domain": "mystore.myshopify.com", "X-Shopify-Topic": "customers/update", "X-Shopify-Webhook-Id": "d1" }),
    );
    expect(res.status).toBe(200);
    expect(syncProducts).not.toHaveBeenCalled();
    expect(syncOrders).not.toHaveBeenCalled();
  });

  it("returns 429 when rate limited", async () => {
    checkRateLimit.mockResolvedValue({ allowed: false, retryAfterMs: 5000 });
    const res = await POST(
      req({ id: 1 }, { "X-Shopify-Hmac-Sha256": "sig", "X-Shopify-Shop-Domain": "mystore.myshopify.com", "X-Shopify-Topic": "products/update", "X-Shopify-Webhook-Id": "d1" }),
    );
    expect(res.status).toBe(429);
    expect(syncProducts).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/app/api/webhooks/shopify/route.test.ts`
Expected: FAIL — route module doesn't exist

- [ ] **Step 3: Write the route**

```typescript
// src/app/api/webhooks/shopify/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyShopifyWebhook } from "@/lib/shopify/webhookAuth";
import { decryptToken } from "@/lib/shopify/crypto";
import { wasAlreadyProcessed } from "@/lib/webhooks/dedupe";
import { syncProducts } from "@/lib/shopify/syncProducts";
import { syncOrders } from "@/lib/shopify/syncOrders";
import { checkRateLimit } from "@/lib/auth/rateLimit";
import type { ShopifyVariant, ShopifyOrder } from "@/lib/shopify/client";

interface RawWebhookProduct {
  id: number;
  title: string;
  image?: { src: string };
  variants: Array<{
    id: number;
    product_id: number;
    title: string;
    sku: string;
    price: string;
    inventory_quantity: number;
  }>;
}

function mapProductPayload(raw: RawWebhookProduct): ShopifyVariant[] {
  const imageUrl = raw.image?.src ?? null;
  return raw.variants.map((v) => ({
    id: v.id,
    product_id: v.product_id,
    title: v.title,
    product_title: raw.title,
    sku: v.sku,
    price: v.price,
    inventory_quantity: v.inventory_quantity,
    imageUrl,
  }));
}

export async function POST(req: Request): Promise<NextResponse> {
  const shopDomain = req.headers.get("X-Shopify-Shop-Domain");
  const { allowed } = await checkRateLimit(`shopify-webhook:${shopDomain ?? "unknown"}`);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const rawBody = await req.text();
  const signature = req.headers.get("X-Shopify-Hmac-Sha256") ?? "";
  const topic = req.headers.get("X-Shopify-Topic") ?? "";
  const deliveryId = req.headers.get("X-Shopify-Webhook-Id") ?? "";

  if (!shopDomain) {
    return NextResponse.json({ error: "Missing X-Shopify-Shop-Domain header" }, { status: 400 });
  }

  const connection = await prisma.shopifyConnection.findUnique({ where: { shopDomain } });
  if (!connection) {
    return NextResponse.json({ error: "Unknown shop domain" }, { status: 404 });
  }

  const apiSecret = decryptToken(connection.encryptedApiSecret);
  if (!verifyShopifyWebhook(rawBody, signature, apiSecret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  if (deliveryId && (await wasAlreadyProcessed(prisma, deliveryId))) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  const payload = JSON.parse(rawBody);

  switch (topic) {
    case "products/update": {
      const variants = mapProductPayload(payload as RawWebhookProduct);
      await syncProducts(prisma, connection.merchantId, variants);
      break;
    }
    case "orders/create": {
      await syncOrders(prisma, connection.merchantId, [payload as ShopifyOrder]);
      break;
    }
    case "app/uninstalled": {
      await prisma.shopifyConnection.delete({ where: { merchantId: connection.merchantId } });
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/app/api/webhooks/shopify/route.test.ts`
Expected: PASS (8 tests)

- [ ] **Step 5: Commit**

```bash
git add src/app/api/webhooks/shopify/route.ts src/app/api/webhooks/shopify/route.test.ts
git commit -m "feat: add Shopify webhook receiver route"
```

---

## Task 9: WooCommerce webhook receiver route

**Goal:** The endpoint WooCommerce actually calls — verify, dedupe, sync.

**Files:**
- Create: `src/app/api/webhooks/woocommerce/[connectionId]/route.ts`
- Test: `src/app/api/webhooks/woocommerce/[connectionId]/route.test.ts`

**Acceptance Criteria:**
- [ ] Missing/invalid `X-WC-Webhook-Signature` → `401`, no DB writes
- [ ] Unknown `connectionId` → `404`
- [ ] Replayed delivery id (`X-WC-Webhook-Delivery-Id` header, or fall back to `X-WC-Webhook-ID` + `X-WC-Webhook-Resource` + payload id if not present — see Step 3 note) → `200`, no reprocessing
- [ ] Topic `product.updated` → calls `syncWooProducts` with a single-item array
- [ ] Topic `order.created` → calls `syncWooOrders` with a single-item array
- [ ] Unrecognized topic → `200`, no processing
- [ ] Rate limited using `checkRateLimit`, keyed by `connectionId`

**Verify:** `npm test -- src/app/api/webhooks/woocommerce/\[connectionId\]/route.test.ts` → all pass

**Steps:**

- [ ] **Step 1: Write the failing tests**

```typescript
// src/app/api/webhooks/woocommerce/[connectionId]/route.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  verifyWooWebhook,
  decrypt,
  wasAlreadyProcessed,
  syncWooProducts,
  syncWooOrders,
  checkRateLimit,
} = vi.hoisted(() => ({
  verifyWooWebhook: vi.fn(),
  decrypt: vi.fn(),
  wasAlreadyProcessed: vi.fn(),
  syncWooProducts: vi.fn(),
  syncWooOrders: vi.fn(),
  checkRateLimit: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    wooCommerceConnection: {
      findUnique: vi.fn(),
    },
  },
}));
vi.mock("@/lib/woocommerce/webhookAuth", () => ({ verifyWooWebhook }));
vi.mock("@/lib/woocommerce/crypto", () => ({ decrypt }));
vi.mock("@/lib/webhooks/dedupe", () => ({ wasAlreadyProcessed }));
vi.mock("@/lib/woocommerce/syncProducts", () => ({ syncWooProducts }));
vi.mock("@/lib/woocommerce/syncOrders", () => ({ syncWooOrders }));
vi.mock("@/lib/auth/rateLimit", () => ({ checkRateLimit }));

import { POST } from "./route";
import { prisma } from "@/lib/db";

function req(
  body: unknown,
  headers: Record<string, string> = {},
): Request {
  const raw = JSON.stringify(body);
  return {
    text: async () => raw,
    headers: {
      get: (key: string) => headers[key] ?? null,
    },
  } as unknown as Request;
}

function ctx(connectionId: string) {
  return { params: Promise.resolve({ connectionId }) };
}

const CONNECTION = {
  id: "conn123",
  merchantId: "m1",
  encryptedWebhookSecret: "enc:secret",
};

beforeEach(() => {
  vi.clearAllMocks();
  checkRateLimit.mockResolvedValue({ allowed: true, retryAfterMs: 0 });
  verifyWooWebhook.mockReturnValue(true);
  decrypt.mockReturnValue("plain-secret");
  wasAlreadyProcessed.mockResolvedValue(false);
  (prisma.wooCommerceConnection.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(CONNECTION);
  syncWooProducts.mockResolvedValue({ created: 0, updated: 1, skipped: 0, skippedReasons: [] });
  syncWooOrders.mockResolvedValue({ upserted: 1, skippedLineItems: 0 });
});

describe("POST /api/webhooks/woocommerce/[connectionId]", () => {
  it("returns 401 when the signature is invalid", async () => {
    verifyWooWebhook.mockReturnValue(false);
    const res = await POST(
      req({ id: 1 }, { "X-WC-Webhook-Signature": "bad", "X-WC-Webhook-Topic": "product.updated", "X-WC-Webhook-Delivery-Id": "d1" }),
      ctx("conn123"),
    );
    expect(res.status).toBe(401);
    expect(syncWooProducts).not.toHaveBeenCalled();
  });

  it("returns 404 for an unknown connectionId", async () => {
    (prisma.wooCommerceConnection.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await POST(
      req({ id: 1 }, { "X-WC-Webhook-Signature": "sig", "X-WC-Webhook-Topic": "product.updated", "X-WC-Webhook-Delivery-Id": "d1" }),
      ctx("unknown"),
    );
    expect(res.status).toBe(404);
  });

  it("returns 200 without reprocessing on a replayed delivery id", async () => {
    wasAlreadyProcessed.mockResolvedValue(true);
    const res = await POST(
      req({ id: 1 }, { "X-WC-Webhook-Signature": "sig", "X-WC-Webhook-Topic": "product.updated", "X-WC-Webhook-Delivery-Id": "d1" }),
      ctx("conn123"),
    );
    expect(res.status).toBe(200);
    expect(syncWooProducts).not.toHaveBeenCalled();
  });

  it("calls syncWooProducts with a single-item array for product.updated", async () => {
    const payload = { id: 42, type: "simple", name: "Widget", sku: "SKU1", regular_price: "9.99", images: [{ src: "https://cdn.example.com/w.jpg" }] };
    const res = await POST(
      req(payload, { "X-WC-Webhook-Signature": "sig", "X-WC-Webhook-Topic": "product.updated", "X-WC-Webhook-Delivery-Id": "d1" }),
      ctx("conn123"),
    );
    expect(res.status).toBe(200);
    expect(syncWooProducts).toHaveBeenCalledWith(
      prisma,
      "m1",
      [{ id: 42, parentId: null, name: "Widget", sku: "SKU1", regularPriceDollars: "9.99", imageUrl: "https://cdn.example.com/w.jpg" }],
    );
  });

  it("calls syncWooOrders with a single-item array for order.created", async () => {
    const payload = { id: 88, date_created: "2026-07-31T00:00:00", line_items: [{ product_id: 42, variation_id: 0, quantity: 3, price: "9.99" }] };
    const res = await POST(
      req(payload, { "X-WC-Webhook-Signature": "sig", "X-WC-Webhook-Topic": "order.created", "X-WC-Webhook-Delivery-Id": "d1" }),
      ctx("conn123"),
    );
    expect(res.status).toBe(200);
    expect(syncWooOrders).toHaveBeenCalledWith(prisma, "m1", [payload]);
  });

  it("returns 200 and does nothing for an unrecognized topic", async () => {
    const res = await POST(
      req({ id: 1 }, { "X-WC-Webhook-Signature": "sig", "X-WC-Webhook-Topic": "customer.updated", "X-WC-Webhook-Delivery-Id": "d1" }),
      ctx("conn123"),
    );
    expect(res.status).toBe(200);
    expect(syncWooProducts).not.toHaveBeenCalled();
    expect(syncWooOrders).not.toHaveBeenCalled();
  });

  it("returns 429 when rate limited", async () => {
    checkRateLimit.mockResolvedValue({ allowed: false, retryAfterMs: 5000 });
    const res = await POST(
      req({ id: 1 }, { "X-WC-Webhook-Signature": "sig", "X-WC-Webhook-Topic": "product.updated", "X-WC-Webhook-Delivery-Id": "d1" }),
      ctx("conn123"),
    );
    expect(res.status).toBe(429);
    expect(syncWooProducts).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/app/api/webhooks/woocommerce`
Expected: FAIL — route module doesn't exist

- [ ] **Step 3: Write the route**

Note on mapping: WooCommerce's `product.updated` webhook payload is the full REST product resource. Variable-product parents typically have no meaningful top-level SKU/price of their own — those live on each variation, and WooCommerce does not expose a separate webhook topic for variation-level changes. `syncWooProducts` already skips entries with an empty SKU, so a variable-parent-only payload becomes a no-op rather than an error; this is an accepted limitation (documented in the design doc's "Out of scope" section), not something this task solves.

```typescript
// src/app/api/webhooks/woocommerce/[connectionId]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyWooWebhook } from "@/lib/woocommerce/webhookAuth";
import { decrypt } from "@/lib/woocommerce/crypto";
import { wasAlreadyProcessed } from "@/lib/webhooks/dedupe";
import { syncWooProducts } from "@/lib/woocommerce/syncProducts";
import { syncWooOrders } from "@/lib/woocommerce/syncOrders";
import { checkRateLimit } from "@/lib/auth/rateLimit";
import type { WooNormalizedProduct, WooOrder } from "@/lib/woocommerce/client";

interface RawWebhookProduct {
  id: number;
  type: string;
  name: string;
  sku: string;
  regular_price: string;
  images?: Array<{ src: string }>;
}

function mapProductPayload(raw: RawWebhookProduct): WooNormalizedProduct {
  return {
    id: raw.id,
    parentId: null,
    name: raw.name,
    sku: raw.sku,
    regularPriceDollars: raw.regular_price,
    imageUrl: raw.images?.[0]?.src ?? null,
  };
}

interface RouteContext {
  params: Promise<{ connectionId: string }>;
}

export async function POST(req: Request, ctx: RouteContext): Promise<NextResponse> {
  const { connectionId } = await ctx.params;

  const { allowed } = await checkRateLimit(`woocommerce-webhook:${connectionId}`);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const rawBody = await req.text();
  const signature = req.headers.get("X-WC-Webhook-Signature") ?? "";
  const topic = req.headers.get("X-WC-Webhook-Topic") ?? "";
  const deliveryId = req.headers.get("X-WC-Webhook-Delivery-Id") ?? "";

  const connection = await prisma.wooCommerceConnection.findUnique({ where: { id: connectionId } });
  if (!connection) {
    return NextResponse.json({ error: "Unknown connection" }, { status: 404 });
  }

  const webhookSecret = decrypt(connection.encryptedWebhookSecret);
  if (!verifyWooWebhook(rawBody, signature, webhookSecret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  if (deliveryId && (await wasAlreadyProcessed(prisma, deliveryId))) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  const payload = JSON.parse(rawBody);

  switch (topic) {
    case "product.updated": {
      const product = mapProductPayload(payload as RawWebhookProduct);
      await syncWooProducts(prisma, connection.merchantId, [product]);
      break;
    }
    case "order.created": {
      await syncWooOrders(prisma, connection.merchantId, [payload as WooOrder]);
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/app/api/webhooks/woocommerce`
Expected: PASS (7 tests)

- [ ] **Step 5: Run the full test suite to confirm no regressions**

Run: `npm test`
Expected: all suites pass (previous 493 + new tests from this plan)

- [ ] **Step 6: Commit**

```bash
git add "src/app/api/webhooks/woocommerce/[connectionId]/route.ts" "src/app/api/webhooks/woocommerce/[connectionId]/route.test.ts"
git commit -m "feat: add WooCommerce webhook receiver route"
```

---

## Post-implementation (manual, not part of this plan's automated tasks)

Once merged, live verification requires real Shopify/WooCommerce test stores (same as the original sync integrations) — reconnect each in Settings with the new API-secret field (Shopify) and confirm the "Live sync active" badge appears, then change a price on the platform side and confirm it reflects in Zorin without clicking "Sync now".
