# Shopify Price Write-Back Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:subagent-driven-development (recommended) or superpowers-extended-cc:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a user applies a price change, push the new price to the Shopify Admin API before committing locally — keeping PriceIQ and Shopify in sync.

**Architecture:** Extend `ShopifyClient` with a `PUT`-capable `request()` and an `updateVariantPrice()` method. A new `pushPriceToShopify()` service function orchestrates connection lookup, decryption, and the API call. Both apply routes (`/api/products/[id]/apply` and `/api/products/bulk-apply`) call this service before their DB transaction, rolling back if Shopify fails. Products without a `shopifyVariantId` continue to apply locally only.

**Tech Stack:** Next.js App Router, TypeScript, Vitest, Prisma (SQLite), Shopify Admin REST API 2024-01

**User decisions (already made):**
- Push timing: synchronous — user waits for Shopify response
- Failure mode: rollback local change if Shopify fails
- Bulk partial failure: per-product independence — successes commit, failures reported individually
- Products without variant ID: apply locally only (unchanged behavior)

---

## File Map

| File | Change |
|---|---|
| `src/lib/money.ts` | Add `centsToDollars(cents: number): string` |
| `src/lib/shopify/client.ts` | Extend `request()` for PUT, add `updateVariantPrice()` |
| `src/lib/shopify/client.test.ts` | Tests for `updateVariantPrice()` |
| `src/lib/shopify/pushPrice.ts` | New — orchestrates connection lookup + client call |
| `src/lib/shopify/pushPrice.test.ts` | New — tests for `pushPriceToShopify()` |
| `src/app/api/products/[id]/apply/route.ts` | Call `pushPriceToShopify` before DB transaction |
| `src/app/api/products/[id]/apply/route.test.ts` | New — tests for Shopify integration in single apply |
| `src/app/api/products/bulk-apply/route.ts` | Call `pushPriceToShopify` per product, track failures |
| `src/app/api/products/bulk-apply/route.test.ts` | New — tests for partial success/failure in bulk apply |
| `src/components/ProductsTable.tsx` | Show per-product failure detail for bulk apply |

---

### Task 1: Extend ShopifyClient with updateVariantPrice

**Goal:** `ShopifyClient` can update a Shopify variant's price via `PUT /admin/api/2024-01/variants/{id}.json`, and `centsToDollars` is available in `src/lib/money.ts`.

**Files:**
- Modify: `src/lib/money.ts`
- Modify: `src/lib/shopify/client.ts`
- Modify: `src/lib/shopify/client.test.ts`

**Acceptance Criteria:**
- [ ] `centsToDollars(1999)` returns `"19.99"`, `centsToDollars(500)` returns `"5.00"`, `centsToDollars(10)` returns `"0.10"`
- [ ] `ShopifyClient.request()` accepts optional `{ method, body }` — all existing callers unchanged
- [ ] `updateVariantPrice("12345", "29.99")` calls `PUT /admin/api/2024-01/variants/12345.json` with body `{ variant: { id: 12345, price: "29.99" } }`
- [ ] 404 from Shopify throws an error containing "404"
- [ ] 429 triggers the existing retry logic
- [ ] All existing tests still pass (no regressions from the `request()` signature change)

**Verify:** `npx vitest run src/lib/shopify/client.test.ts src/lib/money.test.ts` → all passed

**Steps:**

- [ ] **Step 1: Add `centsToDollars` to money.ts and write its test**

In `src/lib/money.ts`, add after the `dollarsToCents` function:

```ts
export function centsToDollars(cents: number): string {
  return (cents / 100).toFixed(2);
}
```

Create `src/lib/money.test.ts` (if it doesn't exist) or add to it:

```ts
import { describe, it, expect } from "vitest";
import { centsToDollars } from "./money";

describe("centsToDollars", () => {
  it("converts whole dollars", () => {
    expect(centsToDollars(500)).toBe("5.00");
  });

  it("converts dollars and cents", () => {
    expect(centsToDollars(1999)).toBe("19.99");
  });

  it("converts sub-dollar amounts", () => {
    expect(centsToDollars(10)).toBe("0.10");
  });

  it("converts zero", () => {
    expect(centsToDollars(0)).toBe("0.00");
  });
});
```

Run: `npx vitest run src/lib/money.test.ts` → 4 passed

- [ ] **Step 2: Extend `request()` to accept method and body**

In `src/lib/shopify/client.ts`, change the private `request` method signature from:

```ts
private async request(url: string): Promise<{ data: unknown; linkHeader: string | null }> {
```

to:

```ts
private async request(
  url: string,
  options?: { method?: string; body?: unknown },
): Promise<{ data: unknown; linkHeader: string | null }> {
```

Inside the retry loop, change the `fetch` call from:

```ts
const res = await fetch(url, { headers: this.headers });
```

to:

```ts
const res = await fetch(url, {
  method: options?.method ?? "GET",
  headers: this.headers,
  ...(options?.body !== undefined && { body: JSON.stringify(options.body) }),
});
```

- [ ] **Step 3: Add `updateVariantPrice` method**

In `src/lib/shopify/client.ts`, add after the `fetchOrders` method:

```ts
  // ─── updateVariantPrice ─────────────────────────────────────────────────

  async updateVariantPrice(variantId: string, priceDollars: string): Promise<void> {
    await this.request(`${this.baseUrl}/variants/${variantId}.json`, {
      method: "PUT",
      body: { variant: { id: Number(variantId), price: priceDollars } },
    });
  }
```

- [ ] **Step 4: Write tests for `updateVariantPrice`**

Add a new `describe` block in `src/lib/shopify/client.test.ts`:

```ts
  // ─── updateVariantPrice ──────────────────────────────────────────────────

  describe("updateVariantPrice()", () => {
    it("sends PUT with correct URL and body", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        mockResponse({ variant: { id: 12345, price: "29.99" } }),
      );

      await client.updateVariantPrice("12345", "29.99");

      expect(fetch).toHaveBeenCalledWith(
        `https://${shopDomain}/admin/api/2024-01/variants/12345.json`,
        expect.objectContaining({
          method: "PUT",
          headers: expect.objectContaining({
            "X-Shopify-Access-Token": accessToken,
          }),
          body: JSON.stringify({ variant: { id: 12345, price: "29.99" } }),
        }),
      );
    });

    it("throws on 404 (variant not found in Shopify)", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        mockResponse({ errors: "Not Found" }, 404),
      );

      await expect(client.updateVariantPrice("99999", "10.00")).rejects.toThrow(
        "404",
      );
    });

    it("throws on 422 (validation error)", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        mockResponse({ errors: "Price must be a number" }, 422),
      );

      await expect(client.updateVariantPrice("12345", "abc")).rejects.toThrow(
        "422",
      );
    });
  });
```

- [ ] **Step 5: Run all tests**

Run: `npx vitest run src/lib/shopify/client.test.ts src/lib/money.test.ts`

Expected: all tests pass (existing + new).

- [ ] **Step 6: Commit**

```bash
git add src/lib/money.ts src/lib/money.test.ts src/lib/shopify/client.ts src/lib/shopify/client.test.ts
git commit -m "feat: add updateVariantPrice to ShopifyClient and centsToDollars helper"
```

---

### Task 2: Create pushPriceToShopify service function

**Goal:** A `pushPriceToShopify(merchantId, shopifyVariantId, newPriceCents)` function that loads the merchant's Shopify connection, decrypts the token, and calls `updateVariantPrice`. Returns silently if no Shopify connection exists. Throws if the Shopify API call fails.

**Files:**
- Create: `src/lib/shopify/pushPrice.ts`
- Create: `src/lib/shopify/pushPrice.test.ts`

**Acceptance Criteria:**
- [ ] Happy path: decrypts token, constructs client, calls `updateVariantPrice` with `centsToDollars(newPriceCents)`
- [ ] No connection for merchant: returns without error (silent skip)
- [ ] Shopify API error: propagates the error to caller

**Verify:** `npx vitest run src/lib/shopify/pushPrice.test.ts` → 3 passed

**Steps:**

- [ ] **Step 1: Write the tests**

Create `src/lib/shopify/pushPrice.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const { findUnique } = vi.hoisted(() => ({
  findUnique: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    shopifyConnection: { findUnique },
  },
}));

const mockDecryptToken = vi.hoisted(() => vi.fn());
vi.mock("@/lib/shopify/crypto", () => ({
  decryptToken: mockDecryptToken,
}));

const mockUpdateVariantPrice = vi.hoisted(() => vi.fn());
vi.mock("@/lib/shopify/client", () => ({
  ShopifyClient: vi.fn().mockImplementation(() => ({
    updateVariantPrice: mockUpdateVariantPrice,
  })),
}));

import { pushPriceToShopify } from "./pushPrice";
import { ShopifyClient } from "./client";

beforeEach(() => {
  findUnique.mockReset();
  mockDecryptToken.mockReset();
  mockUpdateVariantPrice.mockReset();
});

describe("pushPriceToShopify", () => {
  it("decrypts token, creates client, and calls updateVariantPrice", async () => {
    findUnique.mockResolvedValue({
      shopDomain: "test.myshopify.com",
      encryptedToken: "encrypted:data:here",
    });
    mockDecryptToken.mockReturnValue("shpat_real_token");
    mockUpdateVariantPrice.mockResolvedValue(undefined);

    await pushPriceToShopify("m1", "12345", 2999);

    expect(findUnique).toHaveBeenCalledWith({ where: { merchantId: "m1" } });
    expect(mockDecryptToken).toHaveBeenCalledWith("encrypted:data:here");
    expect(ShopifyClient).toHaveBeenCalledWith("test.myshopify.com", "shpat_real_token");
    expect(mockUpdateVariantPrice).toHaveBeenCalledWith("12345", "29.99");
  });

  it("returns silently when merchant has no Shopify connection", async () => {
    findUnique.mockResolvedValue(null);

    await expect(pushPriceToShopify("m1", "12345", 2999)).resolves.toBeUndefined();

    expect(mockDecryptToken).not.toHaveBeenCalled();
    expect(mockUpdateVariantPrice).not.toHaveBeenCalled();
  });

  it("propagates Shopify API errors", async () => {
    findUnique.mockResolvedValue({
      shopDomain: "test.myshopify.com",
      encryptedToken: "encrypted:data:here",
    });
    mockDecryptToken.mockReturnValue("shpat_real_token");
    mockUpdateVariantPrice.mockRejectedValue(new Error("404: Not Found"));

    await expect(pushPriceToShopify("m1", "99999", 2999)).rejects.toThrow("404: Not Found");
  });
});
```

Run: `npx vitest run src/lib/shopify/pushPrice.test.ts` → expected: 3 failing (module not found)

- [ ] **Step 2: Implement pushPriceToShopify**

Create `src/lib/shopify/pushPrice.ts`:

```ts
import { prisma } from "@/lib/db";
import { decryptToken } from "@/lib/shopify/crypto";
import { ShopifyClient } from "@/lib/shopify/client";
import { centsToDollars } from "@/lib/money";

export async function pushPriceToShopify(
  merchantId: string,
  shopifyVariantId: string,
  newPriceCents: number,
): Promise<void> {
  const connection = await prisma.shopifyConnection.findUnique({
    where: { merchantId },
  });
  if (!connection) return;

  const accessToken = decryptToken(connection.encryptedToken);
  const client = new ShopifyClient(connection.shopDomain, accessToken);
  await client.updateVariantPrice(shopifyVariantId, centsToDollars(newPriceCents));
}
```

Run: `npx vitest run src/lib/shopify/pushPrice.test.ts` → 3 passed

- [ ] **Step 3: Commit**

```bash
git add src/lib/shopify/pushPrice.ts src/lib/shopify/pushPrice.test.ts
git commit -m "feat: add pushPriceToShopify service function"
```

---

### Task 3: Wire Shopify push into single apply route

**Goal:** `POST /api/products/[id]/apply` calls `pushPriceToShopify` before the DB transaction when the product has a `shopifyVariantId`. If Shopify fails, the route returns an error and the local DB is unchanged.

**Files:**
- Modify: `src/app/api/products/[id]/apply/route.ts`
- Create: `src/app/api/products/[id]/apply/route.test.ts`

**Acceptance Criteria:**
- [ ] Product with `shopifyVariantId`: calls `pushPriceToShopify` before DB transaction
- [ ] Shopify push succeeds: DB transaction commits, returns `{ ok: true }`
- [ ] Shopify push fails: returns HTTP 502 with error message, DB unchanged
- [ ] Product without `shopifyVariantId`: applies locally only (no Shopify call), returns `{ ok: true }`
- [ ] Existing validation (same price, non-positive price) still works

**Verify:** `npx vitest run src/app/api/products/[id]/apply/route.test.ts` → all passed

**Steps:**

- [ ] **Step 1: Write the tests**

Create `src/app/api/products/[id]/apply/route.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const { findUniqueOrThrow, update } = vi.hoisted(() => ({
  findUniqueOrThrow: vi.fn(),
  update: vi.fn(),
}));

const { create: createPriceChange } = vi.hoisted(() => ({
  create: vi.fn(),
}));

const { deleteMany: deleteRecs } = vi.hoisted(() => ({
  deleteMany: vi.fn(),
}));

const mockTransaction = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db", () => ({
  prisma: {
    product: { findUniqueOrThrow, update },
    priceChange: { create: createPriceChange },
    recommendation: { deleteMany: deleteRecs },
    $transaction: mockTransaction,
  },
}));

vi.mock("@/lib/auth/requireSession", () => ({
  requireSessionApi: vi.fn(async () => ({
    merchantId: "m1",
    user: { id: "u1", email: "test@example.com", merchantId: "m1" },
  })),
}));

vi.mock("@/lib/auth/ownership", () => ({
  assertProductOwned: vi.fn(async () => {}),
}));

const mockPushPrice = vi.hoisted(() => vi.fn());
vi.mock("@/lib/shopify/pushPrice", () => ({
  pushPriceToShopify: mockPushPrice,
}));

import { POST } from "./route";

function makeReq(body: unknown): Request {
  return {
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Request;
}

const ctx = { params: Promise.resolve({ id: "p1" }) };

beforeEach(() => {
  findUniqueOrThrow.mockReset();
  mockTransaction.mockReset();
  mockPushPrice.mockReset();
  mockTransaction.mockResolvedValue(undefined);
});

describe("POST /api/products/[id]/apply — Shopify integration", () => {
  it("calls pushPriceToShopify when product has shopifyVariantId", async () => {
    findUniqueOrThrow.mockResolvedValue({
      id: "p1",
      currentPrice: 1000,
      shopifyVariantId: "12345",
    });
    mockPushPrice.mockResolvedValue(undefined);

    const res = await POST(makeReq({ price: 1500 }), ctx);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(mockPushPrice).toHaveBeenCalledWith("m1", "12345", 1500);
    expect(mockTransaction).toHaveBeenCalled();
  });

  it("returns 502 and skips DB when Shopify push fails", async () => {
    findUniqueOrThrow.mockResolvedValue({
      id: "p1",
      currentPrice: 1000,
      shopifyVariantId: "12345",
    });
    mockPushPrice.mockRejectedValue(new Error("404: Not Found"));

    const res = await POST(makeReq({ price: 1500 }), ctx);
    const body = await res.json();

    expect(res.status).toBe(502);
    expect(body.error).toContain("Shopify");
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("skips Shopify push when product has no shopifyVariantId", async () => {
    findUniqueOrThrow.mockResolvedValue({
      id: "p1",
      currentPrice: 1000,
      shopifyVariantId: null,
    });

    const res = await POST(makeReq({ price: 1500 }), ctx);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(mockPushPrice).not.toHaveBeenCalled();
    expect(mockTransaction).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Modify the apply route**

In `src/app/api/products/[id]/apply/route.ts`, add the import at the top:

```ts
import { pushPriceToShopify } from "@/lib/shopify/pushPrice";
```

After the `if (newPrice === fromCents)` check and before the `await prisma.$transaction(...)`, add:

```ts
    if (product.shopifyVariantId) {
      try {
        await pushPriceToShopify(merchantId, product.shopifyVariantId, newPrice);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new HttpError(502, `Shopify sync failed: ${msg}`);
      }
    }
```

- [ ] **Step 3: Run tests**

Run: `npx vitest run src/app/api/products/[id]/apply/route.test.ts`

Expected: all passed.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/products/[id]/apply/route.ts src/app/api/products/[id]/apply/route.test.ts
git commit -m "feat: push price to Shopify on single apply"
```

---

### Task 4: Wire Shopify push into bulk apply route

**Goal:** `POST /api/products/bulk-apply` calls `pushPriceToShopify` per product before each local DB transaction. Products that fail the Shopify push are collected in a `failed` array. Response includes `{ applied, skipped, failed }`.

**Files:**
- Modify: `src/app/api/products/bulk-apply/route.ts`
- Create: `src/app/api/products/bulk-apply/route.test.ts`

**Acceptance Criteria:**
- [ ] Products with `shopifyVariantId`: Shopify push attempted before local transaction
- [ ] Shopify push succeeds: local transaction commits, counted as `applied`
- [ ] Shopify push fails: local transaction skipped, added to `failed` array with `{ id, title, reason }`
- [ ] Products without `shopifyVariantId`: local-only apply (counted as `applied`)
- [ ] Products without recommendation: counted as `skipped` (unchanged)
- [ ] Response shape: `{ applied: number, skipped: number, failed: { id: string, title: string, reason: string }[] }`

**Verify:** `npx vitest run src/app/api/products/bulk-apply/route.test.ts` → all passed

**Steps:**

- [ ] **Step 1: Write the tests**

Create `src/app/api/products/bulk-apply/route.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const { findMany } = vi.hoisted(() => ({
  findMany: vi.fn(),
}));

const mockTransaction = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db", () => ({
  prisma: {
    product: { findMany, update: vi.fn() },
    priceChange: { create: vi.fn() },
    recommendation: { deleteMany: vi.fn() },
    $transaction: mockTransaction,
  },
}));

vi.mock("@/lib/auth/requireSession", () => ({
  requireSessionApi: vi.fn(async () => ({
    merchantId: "m1",
    user: { id: "u1", email: "test@example.com", merchantId: "m1" },
  })),
}));

const mockPushPrice = vi.hoisted(() => vi.fn());
vi.mock("@/lib/shopify/pushPrice", () => ({
  pushPriceToShopify: mockPushPrice,
}));

import { POST } from "./route";

function makeReq(body: unknown): Request {
  return {
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Request;
}

beforeEach(() => {
  findMany.mockReset();
  mockTransaction.mockReset();
  mockPushPrice.mockReset();
  mockTransaction.mockResolvedValue(undefined);
});

const productWithShopify = {
  id: "p1",
  title: "Widget",
  merchantId: "m1",
  currentPrice: 1000,
  shopifyVariantId: "12345",
  recommendation: {
    action: "raise",
    rulesJson: JSON.stringify({ suggestedPriceCents: 1500 }),
  },
};

const productWithoutShopify = {
  id: "p2",
  title: "Gadget",
  merchantId: "m1",
  currentPrice: 2000,
  shopifyVariantId: null,
  recommendation: {
    action: "lower",
    rulesJson: JSON.stringify({ suggestedPriceCents: 1800 }),
  },
};

const productNoRec = {
  id: "p3",
  title: "Doohickey",
  merchantId: "m1",
  currentPrice: 500,
  shopifyVariantId: "67890",
  recommendation: null,
};

describe("POST /api/products/bulk-apply — Shopify integration", () => {
  it("pushes to Shopify for products with variantId and applies locally", async () => {
    findMany.mockResolvedValue([productWithShopify]);
    mockPushPrice.mockResolvedValue(undefined);

    const res = await POST(makeReq({ productIds: ["p1"] }));
    const body = await res.json();

    expect(mockPushPrice).toHaveBeenCalledWith("m1", "12345", 1500);
    expect(mockTransaction).toHaveBeenCalled();
    expect(body.applied).toBe(1);
    expect(body.failed).toHaveLength(0);
  });

  it("applies locally without Shopify call when no variantId", async () => {
    findMany.mockResolvedValue([productWithoutShopify]);

    const res = await POST(makeReq({ productIds: ["p2"] }));
    const body = await res.json();

    expect(mockPushPrice).not.toHaveBeenCalled();
    expect(mockTransaction).toHaveBeenCalled();
    expect(body.applied).toBe(1);
    expect(body.failed).toHaveLength(0);
  });

  it("records failure when Shopify push fails, skips local transaction", async () => {
    findMany.mockResolvedValue([productWithShopify]);
    mockPushPrice.mockRejectedValue(new Error("404: Not Found"));

    const res = await POST(makeReq({ productIds: ["p1"] }));
    const body = await res.json();

    expect(body.applied).toBe(0);
    expect(body.failed).toHaveLength(1);
    expect(body.failed[0]).toEqual({
      id: "p1",
      title: "Widget",
      reason: "Shopify sync failed: 404: Not Found",
    });
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("handles partial success — one Shopify success, one failure", async () => {
    findMany.mockResolvedValue([productWithShopify, {
      ...productWithShopify,
      id: "p4",
      title: "Sprocket",
      shopifyVariantId: "99999",
    }]);
    mockPushPrice
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("429: Too Many Requests"));

    const res = await POST(makeReq({ productIds: ["p1", "p4"] }));
    const body = await res.json();

    expect(body.applied).toBe(1);
    expect(body.failed).toHaveLength(1);
    expect(body.failed[0].id).toBe("p4");
  });

  it("skips products without recommendations", async () => {
    findMany.mockResolvedValue([productNoRec]);

    const res = await POST(makeReq({ productIds: ["p3"] }));
    const body = await res.json();

    expect(body.skipped).toBe(1);
    expect(body.applied).toBe(0);
    expect(body.failed).toHaveLength(0);
    expect(mockPushPrice).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Rewrite the bulk apply route**

Replace the entire contents of `src/app/api/products/bulk-apply/route.ts` with:

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { HttpError, withErrorHandling } from "@/lib/api/errors";
import { parseJsonBody } from "@/lib/api/validation";
import { requireSessionApi } from "@/lib/auth/requireSession";
import { pushPriceToShopify } from "@/lib/shopify/pushPrice";

export const POST = withErrorHandling(async (req: Request) => {
  const { merchantId } = await requireSessionApi();
  const body = await parseJsonBody(req);

  if (!Array.isArray(body.productIds) || body.productIds.length === 0) {
    throw new HttpError(400, "productIds must be a non-empty array");
  }

  const productIds: string[] = body.productIds;

  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, merchantId },
    include: { recommendation: true },
  });

  let applied = 0;
  let skipped = 0;
  const failed: { id: string; title: string; reason: string }[] = [];

  for (const p of products) {
    if (!p.recommendation) { skipped++; continue; }

    let suggestedPriceCents: number | null = null;
    try {
      const rules = JSON.parse(p.recommendation.rulesJson) as { suggestedPriceCents: number };
      suggestedPriceCents = rules.suggestedPriceCents ?? null;
    } catch { skipped++; continue; }

    if (!suggestedPriceCents || suggestedPriceCents === p.currentPrice) { skipped++; continue; }

    if (p.shopifyVariantId) {
      try {
        await pushPriceToShopify(merchantId, p.shopifyVariantId, suggestedPriceCents);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        failed.push({ id: p.id, title: p.title, reason: `Shopify sync failed: ${msg}` });
        continue;
      }
    }

    await prisma.$transaction([
      prisma.product.update({ where: { id: p.id }, data: { currentPrice: suggestedPriceCents } }),
      prisma.priceChange.create({
        data: { productId: p.id, fromCents: p.currentPrice, toCents: suggestedPriceCents },
      }),
      prisma.recommendation.deleteMany({ where: { productId: p.id } }),
    ]);
    applied++;
  }

  return NextResponse.json({ applied, skipped, failed });
});
```

Note: changed from `Promise.all` to sequential `for...of` to respect Shopify rate limits.

- [ ] **Step 3: Run tests**

Run: `npx vitest run src/app/api/products/bulk-apply/route.test.ts`

Expected: all passed.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/products/bulk-apply/route.ts src/app/api/products/bulk-apply/route.test.ts
git commit -m "feat: push prices to Shopify on bulk apply with per-product failure tracking"
```

---

### Task 5: Update ProductsTable UI for partial Shopify failures

**Goal:** The bulk apply UI in `ProductsTable` shows per-product failure detail when some Shopify pushes fail, instead of a generic error toast.

**Files:**
- Modify: `src/components/ProductsTable.tsx`

**Acceptance Criteria:**
- [ ] All succeed: existing success behavior (clears selection, reloads table)
- [ ] Some fail: shows "Applied X. Y failed to sync to Shopify." with each failed product's title and reason
- [ ] All fail (Shopify errors for every product): shows error with all failed product details
- [ ] No TypeScript errors: `npx tsc --noEmit`

**Verify:** `npx tsc --noEmit` → no errors. Visual check on dev server.

**Steps:**

- [ ] **Step 1: Update the `applySelected` function**

In `src/components/ProductsTable.tsx`, replace the `applySelected` function with:

```tsx
  async function applySelected() {
    setApplying(true);
    setError(null);
    try {
      const res = await fetch("/api/products/bulk-apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productIds: [...selected] }),
      });
      if (!res.ok) throw new Error("bulk apply failed");
      const data = (await res.json()) as {
        applied: number;
        skipped: number;
        failed: { id: string; title: string; reason: string }[];
      };
      if (data.failed.length > 0) {
        const failList = data.failed.map((f) => `${f.title}: ${f.reason}`).join("\n");
        setError(
          data.applied > 0
            ? `Applied ${data.applied} price${data.applied === 1 ? "" : "s"}. ${data.failed.length} failed to sync to Shopify:\n${failList}`
            : `Failed to sync to Shopify:\n${failList}`,
        );
      }
      setSelected(new Set());
      await load();
    } catch {
      setError("Couldn't apply changes — try again.");
    } finally {
      setApplying(false);
    }
  }
```

- [ ] **Step 2: Ensure the error display handles multi-line text**

Find the error rendering element in `ProductsTable.tsx` (the element that displays `{error}`). Ensure it uses `whitespace-pre-line` so newline characters in the failure list render properly. If it currently looks like:

```tsx
{error && <p className="text-sm text-danger">{error}</p>}
```

Change it to:

```tsx
{error && <p className="whitespace-pre-line text-sm text-danger">{error}</p>}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/ProductsTable.tsx
git commit -m "feat: show per-product Shopify failure detail in bulk apply UI"
```
