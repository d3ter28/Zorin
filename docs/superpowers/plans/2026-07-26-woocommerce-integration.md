# WooCommerce Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:subagent-driven-development (recommended) or superpowers-extended-cc:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add WooCommerce as a second platform integration, enabling merchants to connect their self-hosted WooCommerce store, sync products and orders, and push approved price changes.

**Architecture:** Direct mirror of the Shopify integration — no shared abstraction layer. Five lib files under `src/lib/woocommerce/`, four new API routes under `src/app/api/woocommerce/`, two modifications to existing apply routes, one UI component, and two schema additions. WooCommerce REST API v3 with Basic auth (consumer key/secret).

**Tech Stack:** WooCommerce REST API v3, Basic auth, Next.js API routes, Prisma/SQLite, AES-256-GCM encryption (re-exported from Shopify crypto module).

**User decisions (already made):**
- Auth: Consumer Key/Secret — merchant pastes store URL + key + secret.
- Sync model: Manual sync only — no webhooks or scheduled jobs.
- Product scope: Simple + variable products — each variation becomes its own PriceIQ product matched by SKU.
- Architecture: Direct mirror of Shopify — no shared abstraction layer.

---

## File Map

| Action | Path |
|---|---|
| Create | `src/lib/woocommerce/client.ts` |
| Create | `src/lib/woocommerce/client.test.ts` |
| Create | `src/lib/woocommerce/crypto.ts` |
| Create | `src/lib/woocommerce/syncProducts.ts` |
| Create | `src/lib/woocommerce/syncProducts.test.ts` |
| Create | `src/lib/woocommerce/syncOrders.ts` |
| Create | `src/lib/woocommerce/syncOrders.test.ts` |
| Create | `src/lib/woocommerce/pushPrice.ts` |
| Create | `src/lib/woocommerce/pushPrice.test.ts` |
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
| Modify | `src/app/settings/page.tsx` |

---

## Task 1: Prisma schema — WooCommerceConnection model + Product fields

**Goal:** Add the `WooCommerceConnection` model and two new fields on `Product` to the Prisma schema, then generate and apply the migration.

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/…_add_woocommerce/migration.sql` (auto-generated)

**Acceptance Criteria:**
- [ ] `WooCommerceConnection` model present in schema with all fields matching spec
- [ ] `Product` model has `woocommerceVariantId String?` and `woocommerceParentId String?`
- [ ] `Merchant` model has `wooCommerceConnection WooCommerceConnection?` relation
- [ ] `npx prisma migrate dev` applies cleanly with no errors
- [ ] `npx prisma generate` produces a client that includes the new model and fields

**Verify:** `npx prisma migrate dev --name add_woocommerce` → no errors; `npx prisma studio` shows `WooCommerceConnection` table.

**Steps:**

- [ ] **Step 1: Add fields to `prisma/schema.prisma`**

Open `prisma/schema.prisma`. Make these three changes:

In `Merchant`, add:
```
wooCommerceConnection WooCommerceConnection?
```

In `Product`, add after `shopifyVariantId`:
```
woocommerceVariantId String?
woocommerceParentId  String?
```

Add the new model at the bottom:
```prisma
model WooCommerceConnection {
  id              String    @id @default(cuid())
  merchantId      String    @unique
  merchant        Merchant  @relation(fields: [merchantId], references: [id], onDelete: Cascade)
  storeUrl        String
  encryptedKey    String
  encryptedSecret String
  lastSyncedAt    DateTime?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}
```

- [ ] **Step 2: Run migration**

```bash
npx prisma migrate dev --name add_woocommerce
```

Expected: migration file created under `prisma/migrations/`, `✔ Your database is now in sync with your schema.`

- [ ] **Step 3: Regenerate Prisma client**

```bash
npx prisma generate
```

Expected: `✔ Generated Prisma Client`

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add WooCommerceConnection model and Product woocommerce fields"
```

---

## Task 2: WooCommerceClient + crypto re-export

**Goal:** Implement the `WooCommerceClient` class and the crypto re-export module, with full test coverage.

**Files:**
- Create: `src/lib/woocommerce/client.ts`
- Create: `src/lib/woocommerce/client.test.ts`
- Create: `src/lib/woocommerce/crypto.ts`

**Acceptance Criteria:**
- [ ] `WooCommerceClient` constructor accepts `(storeUrl, consumerKey, consumerSecret)`
- [ ] Every request sends `Authorization: Basic base64(key:secret)` header
- [ ] `verifyConnection()` calls `GET /wp-json/wc/v3/system_status`, returns `{ storeName }`
- [ ] `fetchAllProducts()` is an async generator; fetches simple products then variation pages per variable product
- [ ] `fetchOrders(sinceDate)` uses `status=any` and paginates via Link header
- [ ] `updateProductPrice()` calls `PUT /products/{id}`
- [ ] `updateVariationPrice()` calls `PUT /products/{parentId}/variations/{variationId}`
- [ ] 429 responses trigger up to 3 retries with `Retry-After` delay
- [ ] `crypto.ts` re-exports `encrypt` and `decrypt` from `@/lib/shopify/crypto`
- [ ] All tests pass: `npx vitest run src/lib/woocommerce/client.test.ts --reporter=verbose`

**Verify:** `npx vitest run src/lib/woocommerce/client.test.ts --reporter=verbose` → all tests pass.

**Steps:**

- [ ] **Step 1: Write `src/lib/woocommerce/crypto.ts`**

```ts
export { encryptToken as encrypt, decryptToken as decrypt } from "@/lib/shopify/crypto";
```

- [ ] **Step 2: Write failing tests for `WooCommerceClient` in `src/lib/woocommerce/client.test.ts`**

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { WooCommerceClient } from "./client";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function mockResponse(body: unknown, options: { status?: number; headers?: Record<string, string> } = {}) {
  const status = options.status ?? 200;
  const headers = new Headers(options.headers ?? {});
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    headers,
  };
}

const STORE_URL = "https://mystore.com";
const KEY = "ck_test123";
const SECRET = "cs_test456";

describe("WooCommerceClient", () => {
  let client: WooCommerceClient;
  const expectedAuth = "Basic " + Buffer.from(`${KEY}:${SECRET}`).toString("base64");

  beforeEach(() => {
    vi.clearAllMocks();
    client = new WooCommerceClient(STORE_URL, KEY, SECRET);
  });

  it("sends correct Authorization header", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ environment: { home_url: STORE_URL } }));
    await client.verifyConnection();
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/system_status"),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: expectedAuth }),
      }),
    );
  });

  describe("verifyConnection()", () => {
    it("returns storeName from hostname", async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({ environment: { home_url: "https://mystore.com" } }));
      const result = await client.verifyConnection();
      expect(result.storeName).toBe("mystore.com");
    });

    it("throws on non-ok response", async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({}, { status: 401 }));
      await expect(client.verifyConnection()).rejects.toThrow("401");
    });
  });

  describe("fetchAllProducts()", () => {
    it("yields simple products and fetches variations for variable products", async () => {
      // Page 1: one simple, one variable
      mockFetch
        .mockResolvedValueOnce(mockResponse([
          { id: 1, type: "simple", name: "Widget", sku: "W1", regular_price: "10.00" },
          { id: 2, type: "variable", name: "T-Shirt", sku: "", regular_price: "" },
        ]))
        // Variations for product 2
        .mockResolvedValueOnce(mockResponse([
          { id: 21, sku: "TS-S", regular_price: "20.00", attributes: [{ name: "Size", option: "S" }] },
        ]))
        // Variations pagination done (empty)
        .mockResolvedValueOnce(mockResponse([]));

      const pages: unknown[] = [];
      for await (const page of client.fetchAllProducts()) {
        pages.push(...page);
      }

      expect(pages).toHaveLength(2); // W1 simple + TS-S variation
    });

    it("follows Link header pagination", async () => {
      const nextUrl = `${STORE_URL}/wp-json/wc/v3/products?page=2&per_page=100`;
      mockFetch
        .mockResolvedValueOnce(mockResponse(
          [{ id: 1, type: "simple", name: "A", sku: "A1", regular_price: "5.00" }],
          { headers: { Link: `<${nextUrl}>; rel="next"` } },
        ))
        .mockResolvedValueOnce(mockResponse(
          [{ id: 2, type: "simple", name: "B", sku: "B2", regular_price: "6.00" }],
        ));

      const pages: unknown[] = [];
      for await (const page of client.fetchAllProducts()) {
        pages.push(...page);
      }

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(pages).toHaveLength(2);
    });
  });

  describe("fetchOrders()", () => {
    it("uses status=any", async () => {
      mockFetch.mockResolvedValueOnce(mockResponse([]));
      const gen = client.fetchOrders(new Date("2025-01-01"));
      await gen.next();
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("status=any"),
        expect.anything(),
      );
    });

    it("yields order arrays from WC response", async () => {
      const orders = [{ id: 1, date_created: "2025-06-01T00:00:00", line_items: [] }];
      mockFetch.mockResolvedValueOnce(mockResponse(orders));
      const pages: unknown[] = [];
      for await (const page of client.fetchOrders(new Date("2025-01-01"))) {
        pages.push(...page);
      }
      expect(pages).toHaveLength(1);
    });
  });

  describe("429 retry", () => {
    it("retries up to 3 times on 429", async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: false, status: 429, headers: new Headers({ "Retry-After": "0" }), json: () => Promise.resolve({}) })
        .mockResolvedValueOnce({ ok: false, status: 429, headers: new Headers({ "Retry-After": "0" }), json: () => Promise.resolve({}) })
        .mockResolvedValueOnce(mockResponse({ environment: { home_url: STORE_URL } }));
      await expect(client.verifyConnection()).resolves.toBeDefined();
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });

  describe("updateProductPrice()", () => {
    it("calls PUT /products/{id} with regular_price", async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({}));
      await client.updateProductPrice("42", "29.99");
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/products/42"),
        expect.objectContaining({ method: "PUT" }),
      );
    });
  });

  describe("updateVariationPrice()", () => {
    it("calls PUT /products/{parentId}/variations/{variationId}", async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({}));
      await client.updateVariationPrice("10", "21", "15.00");
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/products/10/variations/21"),
        expect.objectContaining({ method: "PUT" }),
      );
    });
  });
});
```

- [ ] **Step 3: Run tests to confirm failure**

```bash
npx vitest run src/lib/woocommerce/client.test.ts --reporter=verbose
```

Expected: FAIL — `Cannot find module './client'`

- [ ] **Step 4: Write `src/lib/woocommerce/client.ts`**

```ts
export interface WooNormalizedProduct {
  id: number;
  parentId: number | null;
  name: string;
  sku: string;
  regularPriceDollars: string;
}

export interface WooOrder {
  id: number;
  date_created: string; // ISO 8601
  line_items: WooLineItem[];
}

export interface WooLineItem {
  product_id: number;
  variation_id: number; // 0 for simple products
  quantity: number;
  price: string;
}

interface RawProduct {
  id: number;
  type: "simple" | "variable";
  name: string;
  sku: string;
  regular_price: string;
}

interface RawVariation {
  id: number;
  sku: string;
  regular_price: string;
  attributes: Array<{ name: string; option: string }>;
}

const MAX_RETRIES = 3;
const MAX_RETRY_DELAY_MS = 10_000;

export class WooCommerceClient {
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;

  constructor(storeUrl: string, consumerKey: string, consumerSecret: string) {
    const normalized = storeUrl.replace(/\/$/, "");
    this.baseUrl = `${normalized}/wp-json/wc/v3`;
    const encoded = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");
    this.headers = {
      Authorization: `Basic ${encoded}`,
      "Content-Type": "application/json",
    };
  }

  private async request(
    url: string,
    options?: { method?: string; body?: unknown },
  ): Promise<{ data: unknown; linkHeader: string | null }> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const res = await fetch(url, {
        method: options?.method ?? "GET",
        headers: this.headers,
        ...(options?.body !== undefined && { body: JSON.stringify(options.body) }),
      });

      if (res.status === 429) {
        if (attempt === MAX_RETRIES) throw new Error("WooCommerce API error 429: Too Many Requests");
        const retryAfterStr = res.headers.get("Retry-After") ?? "1";
        const delayMs = Math.min(parseFloat(retryAfterStr) * 1000, MAX_RETRY_DELAY_MS);
        await new Promise<void>((r) => setTimeout(r, delayMs));
        lastError = new Error("429");
        continue;
      }

      if (!res.ok) {
        throw new Error(`${res.status}: WooCommerce API error`);
      }

      const data = await res.json();
      const linkHeader = res.headers.get("Link");
      return { data, linkHeader };
    }

    throw lastError ?? new Error("Unknown error after retries");
  }

  private parseNextLink(linkHeader: string | null): string | null {
    if (!linkHeader) return null;
    const match = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
    return match ? match[1] : null;
  }

  async verifyConnection(): Promise<{ storeName: string }> {
    const { data } = await this.request(`${this.baseUrl}/system_status`);
    const body = data as { environment?: { home_url?: string } };
    const homeUrl = body.environment?.home_url ?? this.baseUrl;
    let storeName: string;
    try {
      storeName = new URL(homeUrl).hostname;
    } catch {
      storeName = homeUrl;
    }
    return { storeName };
  }

  async *fetchAllProducts(): AsyncGenerator<WooNormalizedProduct[]> {
    let url: string | null = `${this.baseUrl}/products?per_page=100`;

    while (url) {
      const { data, linkHeader } = await this.request(url);
      const products = data as RawProduct[];
      const normalized: WooNormalizedProduct[] = [];

      for (const p of products) {
        if (p.type === "simple") {
          normalized.push({ id: p.id, parentId: null, name: p.name, sku: p.sku, regularPriceDollars: p.regular_price });
        } else if (p.type === "variable") {
          // Fetch all variation pages
          let varUrl: string | null = `${this.baseUrl}/products/${p.id}/variations?per_page=100`;
          while (varUrl) {
            const { data: varData, linkHeader: varLink } = await this.request(varUrl);
            const variations = varData as RawVariation[];
            for (const v of variations) {
              const variantTitle = v.attributes.map((a) => a.option).join(" / ");
              const name = variantTitle ? `${p.name} - ${variantTitle}` : p.name;
              normalized.push({ id: v.id, parentId: p.id, name, sku: v.sku, regularPriceDollars: v.regular_price });
            }
            varUrl = this.parseNextLink(varLink);
          }
        }
      }

      if (normalized.length > 0) yield normalized;
      url = this.parseNextLink(linkHeader);
    }
  }

  async *fetchOrders(sinceDate: Date): AsyncGenerator<WooOrder[]> {
    const isoDate = encodeURIComponent(sinceDate.toISOString());
    let url: string | null = `${this.baseUrl}/orders?after=${isoDate}&status=any&per_page=100`;

    while (url) {
      const { data, linkHeader } = await this.request(url);
      const orders = data as WooOrder[];
      if (orders.length > 0) yield orders;
      url = this.parseNextLink(linkHeader);
    }
  }

  async updateProductPrice(productId: string, priceDollars: string): Promise<void> {
    await this.request(`${this.baseUrl}/products/${productId}`, {
      method: "PUT",
      body: { regular_price: priceDollars },
    });
  }

  async updateVariationPrice(parentId: string, variationId: string, priceDollars: string): Promise<void> {
    await this.request(`${this.baseUrl}/products/${parentId}/variations/${variationId}`, {
      method: "PUT",
      body: { regular_price: priceDollars },
    });
  }
}
```

- [ ] **Step 5: Run tests to confirm passing**

```bash
npx vitest run src/lib/woocommerce/client.test.ts --reporter=verbose
```

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/woocommerce/
git commit -m "feat: add WooCommerceClient and crypto re-export"
```

---

## Task 3: syncWooProducts service

**Goal:** Implement `syncWooProducts` — upsert WooCommerce products into the merchant's catalog, matching by SKU.

**Files:**
- Create: `src/lib/woocommerce/syncProducts.ts`
- Create: `src/lib/woocommerce/syncProducts.test.ts`

**Acceptance Criteria:**
- [ ] Simple products set `woocommerceVariantId = String(product.id)`, `woocommerceParentId = null`
- [ ] Variation products set `woocommerceVariantId = String(variation.id)`, `woocommerceParentId = String(parent.id)`
- [ ] Products/variations with empty SKU are skipped and counted
- [ ] Existing products matched by SKU (case-insensitive) get their WC IDs updated
- [ ] New products are created with `category = "WooCommerce"`, `currentPrice` from `regular_price` in cents
- [ ] Returns `{ created, updated, skipped }`
- [ ] All tests pass: `npx vitest run src/lib/woocommerce/syncProducts.test.ts --reporter=verbose`

**Verify:** `npx vitest run src/lib/woocommerce/syncProducts.test.ts --reporter=verbose` → all tests pass.

**Steps:**

- [ ] **Step 1: Write failing tests in `src/lib/woocommerce/syncProducts.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { syncWooProducts } from "./syncProducts";
import type { WooNormalizedProduct } from "./client";

type MockProduct = { id: string; sku: string; woocommerceVariantId?: string | null };

function makePrisma(existing: MockProduct[] = []) {
  const products = [...existing];
  return {
    product: {
      findMany: async ({ where }: { where: { merchantId: string; sku?: { in: string[] } } }) => {
        if (where.sku?.in) {
          return products.filter((p) => where.sku!.in.includes(p.sku));
        }
        return products;
      },
      update: async ({ where, data }: { where: { id: string }; data: Partial<MockProduct> }) => {
        const p = products.find((p) => p.id === where.id);
        if (p) Object.assign(p, data);
        return p;
      },
      create: async ({ data }: { data: MockProduct }) => {
        products.push(data);
        return data;
      },
    },
  };
}

function product(overrides: Partial<WooNormalizedProduct> = {}): WooNormalizedProduct {
  return { id: 1, parentId: null, name: "Widget", sku: "W1", regularPriceDollars: "10.00", ...overrides };
}

describe("syncWooProducts", () => {
  it("creates new simple product", async () => {
    const prisma = makePrisma();
    const result = await syncWooProducts(prisma as never, "m1", [product()]);
    expect(result.created).toBe(1);
    expect(result.updated).toBe(0);
    expect(result.skipped).toBe(0);
  });

  it("skips products with empty SKU", async () => {
    const prisma = makePrisma();
    const result = await syncWooProducts(prisma as never, "m1", [product({ sku: "" })]);
    expect(result.skipped).toBe(1);
    expect(result.created).toBe(0);
  });

  it("updates existing product by SKU (case-insensitive)", async () => {
    const prisma = makePrisma([{ id: "p1", sku: "W1" }]);
    const result = await syncWooProducts(prisma as never, "m1", [product({ id: 99, sku: "w1" })]);
    expect(result.updated).toBe(1);
    expect(result.created).toBe(0);
  });

  it("sets woocommerceParentId for variations", async () => {
    const created: unknown[] = [];
    const prisma = {
      product: {
        findMany: async () => [],
        update: async () => ({}),
        create: async ({ data }: { data: unknown }) => { created.push(data); return data; },
      },
    };
    await syncWooProducts(prisma as never, "m1", [product({ id: 21, parentId: 2, sku: "TS-S" })]);
    expect((created[0] as { woocommerceParentId: string }).woocommerceParentId).toBe("2");
    expect((created[0] as { woocommerceVariantId: string }).woocommerceVariantId).toBe("21");
  });

  it("sets woocommerceParentId to null for simple products", async () => {
    const created: unknown[] = [];
    const prisma = {
      product: {
        findMany: async () => [],
        update: async () => ({}),
        create: async ({ data }: { data: unknown }) => { created.push(data); return data; },
      },
    };
    await syncWooProducts(prisma as never, "m1", [product({ id: 5, parentId: null })]);
    expect((created[0] as { woocommerceParentId: null }).woocommerceParentId).toBeNull();
  });

  it("returns correct counts for mixed batch", async () => {
    const prisma = makePrisma([{ id: "existing", sku: "EXIST" }]);
    const products = [
      product({ id: 1, sku: "NEW1" }),
      product({ id: 2, sku: "EXIST" }),
      product({ id: 3, sku: "" }),
    ];
    const result = await syncWooProducts(prisma as never, "m1", products);
    expect(result.created).toBe(1);
    expect(result.updated).toBe(1);
    expect(result.skipped).toBe(1);
  });
});
```

- [ ] **Step 2: Run tests to confirm failure**

```bash
npx vitest run src/lib/woocommerce/syncProducts.test.ts --reporter=verbose
```

Expected: FAIL — `Cannot find module './syncProducts'`

- [ ] **Step 3: Write `src/lib/woocommerce/syncProducts.ts`**

```ts
import type { PrismaClient } from "@prisma/client";
import type { WooNormalizedProduct } from "./client";
import { dollarsToCents } from "@/lib/money";

export interface SyncWooProductsResult {
  created: number;
  updated: number;
  skipped: number;
}

type PrismaSurface = Pick<PrismaClient, "product">;

export async function syncWooProducts(
  prisma: PrismaSurface,
  merchantId: string,
  products: WooNormalizedProduct[],
): Promise<SyncWooProductsResult> {
  let created = 0;
  let updated = 0;
  let skipped = 0;

  const withSku = products.filter((p) => {
    if (!p.sku || p.sku.trim() === "") { skipped++; return false; }
    return true;
  });

  if (withSku.length === 0) return { created, updated, skipped };

  const skus = [...new Set(withSku.map((p) => p.sku))];
  const existing = await prisma.product.findMany({
    where: { merchantId, sku: { in: skus } },
  });
  const skuToId = new Map(existing.map((p) => [p.sku.toLowerCase(), p.id]));

  for (const p of withSku) {
    const currentPrice = dollarsToCents(p.regularPriceDollars) ?? 0;
    const woocommerceVariantId = String(p.id);
    const woocommerceParentId = p.parentId !== null ? String(p.parentId) : null;

    const existingId = skuToId.get(p.sku.toLowerCase());
    if (existingId) {
      await prisma.product.update({
        where: { id: existingId },
        data: { title: p.name, currentPrice, woocommerceVariantId, woocommerceParentId },
      });
      updated++;
    } else {
      await prisma.product.create({
        data: {
          merchantId,
          sku: p.sku,
          title: p.name,
          currentPrice,
          woocommerceVariantId,
          woocommerceParentId,
          category: "WooCommerce",
        },
      });
      created++;
    }
  }

  return { created, updated, skipped };
}
```

- [ ] **Step 4: Run tests to confirm passing**

```bash
npx vitest run src/lib/woocommerce/syncProducts.test.ts --reporter=verbose
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/woocommerce/syncProducts.ts src/lib/woocommerce/syncProducts.test.ts
git commit -m "feat: add syncWooProducts service"
```

---

## Task 4: syncWooOrders service

**Goal:** Implement `syncWooOrders` — convert WooCommerce orders into SalesRecords, aggregated by (woocommerceVariantId, date) with additive upsert.

**Files:**
- Create: `src/lib/woocommerce/syncOrders.ts`
- Create: `src/lib/woocommerce/syncOrders.test.ts`

**Acceptance Criteria:**
- [ ] Builds `woocommerceVariantId → productId` map from merchant's products
- [ ] `variation_id === 0` → match by `String(line_item.product_id)`
- [ ] `variation_id > 0` → match by `String(line_item.variation_id)`
- [ ] Aggregates by `(matchedId, dateISO)`, additive upsert into `SalesRecord`
- [ ] Line items with no matching product are counted as `skippedLineItems`
- [ ] Returns `{ upserted, skippedLineItems }`
- [ ] All tests pass: `npx vitest run src/lib/woocommerce/syncOrders.test.ts --reporter=verbose`

**Verify:** `npx vitest run src/lib/woocommerce/syncOrders.test.ts --reporter=verbose` → all tests pass.

**Steps:**

- [ ] **Step 1: Write failing tests in `src/lib/woocommerce/syncOrders.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { syncWooOrders } from "./syncOrders";
import type { WooOrder } from "./client";

type MockProduct = { id: string; woocommerceVariantId: string | null };
type MockSalesRecord = { productId: string; date: Date; unitsSold: number; priceCents: number };

function makePrisma(products: MockProduct[] = [], existingRecords: MockSalesRecord[] = []) {
  const records = [...existingRecords];
  return {
    product: {
      findMany: async () => products,
    },
    salesRecord: {
      findUnique: async ({ where }: { where: { productId_date: { productId: string; date: Date } } }) => {
        return records.find(
          (r) => r.productId === where.productId_date.productId &&
            r.date.getTime() === where.productId_date.date.getTime()
        ) ?? null;
      },
      update: async ({ where, data }: { where: { id?: string }; data: { unitsSold: number } }) => {
        const r = records.find((r) => r === where);
        if (r) r.unitsSold = data.unitsSold;
        return r;
      },
      create: async ({ data }: { data: MockSalesRecord }) => { records.push(data); return data; },
    },
  };
}

function order(overrides: Partial<WooOrder> = {}): WooOrder {
  return {
    id: 1,
    date_created: "2025-06-15T12:00:00",
    line_items: [],
    ...overrides,
  };
}

describe("syncWooOrders", () => {
  it("matches simple product by product_id (variation_id === 0)", async () => {
    const prisma = makePrisma([{ id: "p1", woocommerceVariantId: "10" }]);
    const result = await syncWooOrders(prisma as never, "m1", [
      order({ line_items: [{ product_id: 10, variation_id: 0, quantity: 2, price: "9.99" }] }),
    ]);
    expect(result.upserted).toBe(1);
    expect(result.skippedLineItems).toBe(0);
  });

  it("matches variation by variation_id (variation_id > 0)", async () => {
    const prisma = makePrisma([{ id: "p2", woocommerceVariantId: "21" }]);
    const result = await syncWooOrders(prisma as never, "m1", [
      order({ line_items: [{ product_id: 2, variation_id: 21, quantity: 1, price: "19.99" }] }),
    ]);
    expect(result.upserted).toBe(1);
    expect(result.skippedLineItems).toBe(0);
  });

  it("skips line items with no matching product", async () => {
    const prisma = makePrisma([]);
    const result = await syncWooOrders(prisma as never, "m1", [
      order({ line_items: [{ product_id: 999, variation_id: 0, quantity: 1, price: "5.00" }] }),
    ]);
    expect(result.skippedLineItems).toBe(1);
    expect(result.upserted).toBe(0);
  });

  it("aggregates multiple line items for the same product on the same day", async () => {
    const prisma = makePrisma([{ id: "p1", woocommerceVariantId: "10" }]);
    const result = await syncWooOrders(prisma as never, "m1", [
      order({ line_items: [{ product_id: 10, variation_id: 0, quantity: 3, price: "5.00" }] }),
      order({ line_items: [{ product_id: 10, variation_id: 0, quantity: 2, price: "5.00" }] }),
    ]);
    // Both on same date → 1 upserted record
    expect(result.upserted).toBe(1);
  });

  it("additively increments existing sales records", async () => {
    const date = new Date(Date.UTC(2025, 5, 15));
    const existingRecords: MockSalesRecord[] = [
      { productId: "p1", date, unitsSold: 5, priceCents: 999 },
    ];
    const updates: number[] = [];
    const prisma = {
      product: { findMany: async () => [{ id: "p1", woocommerceVariantId: "10" }] },
      salesRecord: {
        findUnique: async () => existingRecords[0],
        update: async ({ data }: { data: { unitsSold: number } }) => {
          updates.push(data.unitsSold);
          return existingRecords[0];
        },
        create: async () => ({}),
      },
    };
    await syncWooOrders(prisma as never, "m1", [
      order({
        date_created: "2025-06-15T12:00:00",
        line_items: [{ product_id: 10, variation_id: 0, quantity: 3, price: "9.99" }],
      }),
    ]);
    expect(updates[0]).toBe(8); // 5 existing + 3 new
  });
});
```

- [ ] **Step 2: Run tests to confirm failure**

```bash
npx vitest run src/lib/woocommerce/syncOrders.test.ts --reporter=verbose
```

Expected: FAIL — `Cannot find module './syncOrders'`

- [ ] **Step 3: Write `src/lib/woocommerce/syncOrders.ts`**

```ts
import type { PrismaClient } from "@prisma/client";
import type { WooOrder } from "./client";
import { dollarsToCents } from "@/lib/money";

export interface SyncWooOrdersResult {
  upserted: number;
  skippedLineItems: number;
}

type PrismaSurface = Pick<PrismaClient, "product" | "salesRecord">;

export async function syncWooOrders(
  prisma: PrismaSurface,
  merchantId: string,
  orders: WooOrder[],
): Promise<SyncWooOrdersResult> {
  const products = await prisma.product.findMany({
    where: { merchantId, woocommerceVariantId: { not: null } },
    select: { id: true, woocommerceVariantId: true },
  });
  const variantToProduct = new Map(
    products.map((p) => [p.woocommerceVariantId as string, p.id]),
  );

  const aggregated = new Map<
    string,
    { units: number; priceCents: number; productId: string; date: Date }
  >();
  let skippedLineItems = 0;

  for (const ord of orders) {
    const d = new Date(ord.date_created);
    const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    const dateISO = date.toISOString();

    for (const item of ord.line_items) {
      // variation_id > 0 means it's a variation; 0 means simple product
      const lookupId = item.variation_id > 0
        ? String(item.variation_id)
        : String(item.product_id);

      const productId = variantToProduct.get(lookupId);
      if (!productId) { skippedLineItems++; continue; }

      const key = `${lookupId}:${dateISO}`;
      const priceCents = dollarsToCents(item.price) ?? 0;

      const existing = aggregated.get(key);
      if (existing) {
        existing.units += item.quantity;
        existing.priceCents = priceCents;
      } else {
        aggregated.set(key, { units: item.quantity, priceCents, productId, date });
      }
    }
  }

  let upserted = 0;

  for (const { units, priceCents, productId, date } of aggregated.values()) {
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
    upserted++;
  }

  return { upserted, skippedLineItems };
}
```

- [ ] **Step 4: Run tests to confirm passing**

```bash
npx vitest run src/lib/woocommerce/syncOrders.test.ts --reporter=verbose
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/woocommerce/syncOrders.ts src/lib/woocommerce/syncOrders.test.ts
git commit -m "feat: add syncWooOrders service"
```

---

## Task 5: pushPriceToWooCommerce service

**Goal:** Implement `pushPriceToWooCommerce` — look up the WC IDs on the product and call the correct update endpoint depending on whether it's a simple or variation product.

**Files:**
- Create: `src/lib/woocommerce/pushPrice.ts`
- Create: `src/lib/woocommerce/pushPrice.test.ts`

**Acceptance Criteria:**
- [ ] Returns `{ ok: false, error: "not linked to WooCommerce" }` when product has no `woocommerceVariantId`
- [ ] Calls `updateVariationPrice` when `woocommerceParentId` is set
- [ ] Calls `updateProductPrice` when `woocommerceParentId` is null (simple product)
- [ ] Returns `{ ok: true }` on success
- [ ] Catches and returns errors without throwing
- [ ] All tests pass: `npx vitest run src/lib/woocommerce/pushPrice.test.ts --reporter=verbose`

**Verify:** `npx vitest run src/lib/woocommerce/pushPrice.test.ts --reporter=verbose` → all tests pass.

**Steps:**

- [ ] **Step 1: Write failing tests in `src/lib/woocommerce/pushPrice.test.ts`**

```ts
import { describe, it, expect, vi } from "vitest";
import { pushPriceToWooCommerce } from "./pushPrice";

function makeClient(overrides: Partial<{
  updateProductPrice: () => Promise<void>;
  updateVariationPrice: () => Promise<void>;
}> = {}) {
  return {
    updateProductPrice: vi.fn().mockResolvedValue(undefined),
    updateVariationPrice: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

type MockProduct = {
  id: string;
  woocommerceVariantId: string | null;
  woocommerceParentId: string | null;
};

function makePrisma(product: MockProduct | null = null) {
  return {
    product: {
      findUnique: vi.fn().mockResolvedValue(product),
    },
  };
}

describe("pushPriceToWooCommerce", () => {
  it("returns not-linked error when no woocommerceVariantId", async () => {
    const prisma = makePrisma({ id: "p1", woocommerceVariantId: null, woocommerceParentId: null });
    const client = makeClient();
    const result = await pushPriceToWooCommerce(prisma as never, client as never, "p1", "19.99");
    expect(result.ok).toBe(false);
    expect(result.error).toContain("not linked");
  });

  it("calls updateProductPrice for simple products", async () => {
    const prisma = makePrisma({ id: "p1", woocommerceVariantId: "42", woocommerceParentId: null });
    const client = makeClient();
    const result = await pushPriceToWooCommerce(prisma as never, client as never, "p1", "19.99");
    expect(result.ok).toBe(true);
    expect(client.updateProductPrice).toHaveBeenCalledWith("42", "19.99");
    expect(client.updateVariationPrice).not.toHaveBeenCalled();
  });

  it("calls updateVariationPrice for variation products", async () => {
    const prisma = makePrisma({ id: "p2", woocommerceVariantId: "21", woocommerceParentId: "2" });
    const client = makeClient();
    const result = await pushPriceToWooCommerce(prisma as never, client as never, "p2", "29.99");
    expect(result.ok).toBe(true);
    expect(client.updateVariationPrice).toHaveBeenCalledWith("2", "21", "29.99");
    expect(client.updateProductPrice).not.toHaveBeenCalled();
  });

  it("returns error without throwing when API call fails", async () => {
    const prisma = makePrisma({ id: "p1", woocommerceVariantId: "42", woocommerceParentId: null });
    const client = makeClient({
      updateProductPrice: vi.fn().mockRejectedValue(new Error("Connection refused")),
    });
    const result = await pushPriceToWooCommerce(prisma as never, client as never, "p1", "19.99");
    expect(result.ok).toBe(false);
    expect(result.error).toContain("Connection refused");
  });
});
```

- [ ] **Step 2: Run tests to confirm failure**

```bash
npx vitest run src/lib/woocommerce/pushPrice.test.ts --reporter=verbose
```

Expected: FAIL — `Cannot find module './pushPrice'`

- [ ] **Step 3: Write `src/lib/woocommerce/pushPrice.ts`**

```ts
import type { PrismaClient } from "@prisma/client";
import type { WooCommerceClient } from "./client";

type PrismaSurface = Pick<PrismaClient, "product">;

export async function pushPriceToWooCommerce(
  prisma: PrismaSurface,
  client: WooCommerceClient,
  productId: string,
  priceDollars: string,
): Promise<{ ok: boolean; error?: string }> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { woocommerceVariantId: true, woocommerceParentId: true },
  });

  if (!product?.woocommerceVariantId) {
    return { ok: false, error: "not linked to WooCommerce" };
  }

  try {
    if (product.woocommerceParentId) {
      await client.updateVariationPrice(product.woocommerceParentId, product.woocommerceVariantId, priceDollars);
    } else {
      await client.updateProductPrice(product.woocommerceVariantId, priceDollars);
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
```

- [ ] **Step 4: Run tests to confirm passing**

```bash
npx vitest run src/lib/woocommerce/pushPrice.test.ts --reporter=verbose
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/woocommerce/pushPrice.ts src/lib/woocommerce/pushPrice.test.ts
git commit -m "feat: add pushPriceToWooCommerce service"
```

---

## Task 6: API routes — connect, disconnect, status

**Goal:** Implement the three WooCommerce API routes: `POST /api/woocommerce/connect`, `POST /api/woocommerce/disconnect`, `GET /api/woocommerce/status`.

**Files:**
- Create: `src/app/api/woocommerce/connect/route.ts`
- Create: `src/app/api/woocommerce/connect/route.test.ts`
- Create: `src/app/api/woocommerce/disconnect/route.ts`
- Create: `src/app/api/woocommerce/disconnect/route.test.ts`
- Create: `src/app/api/woocommerce/status/route.ts`
- Create: `src/app/api/woocommerce/status/route.test.ts`

**Acceptance Criteria:**
- [ ] `connect`: validates body fields, normalizes storeUrl (strip trailing slash, ensure `https://`), verifies connection, encrypts credentials, upserts `WooCommerceConnection`, returns `{ storeName }`
- [ ] `connect`: returns 400 on missing fields, 401 on bad credentials, 500 on network error
- [ ] `disconnect`: deletes `WooCommerceConnection`, clears `woocommerceVariantId` and `woocommerceParentId` on all merchant products
- [ ] `status`: returns `{ connected: false }` or `{ connected: true, storeUrl, lastSyncedAt }`
- [ ] All route tests pass: `npx vitest run src/app/api/woocommerce/ --reporter=verbose`

**Verify:** `npx vitest run src/app/api/woocommerce/ --reporter=verbose` → all tests pass.

**Steps:**

- [ ] **Step 1: Write `src/app/api/woocommerce/connect/route.ts`**

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { HttpError, withErrorHandling } from "@/lib/api/errors";
import { requireSessionApi } from "@/lib/auth/requireSession";
import { encrypt } from "@/lib/woocommerce/crypto";
import { WooCommerceClient } from "@/lib/woocommerce/client";

function normalizeStoreUrl(raw: string): string {
  let url = raw.trim();
  if (!url) throw new HttpError(400, "storeUrl is required");
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  url = url.replace(/\/$/, "");
  return url;
}

export const POST = withErrorHandling(async (req: Request) => {
  const { merchantId } = await requireSessionApi();
  const body = await req.json() as { storeUrl?: unknown; consumerKey?: unknown; consumerSecret?: unknown };

  if (!body.storeUrl || typeof body.storeUrl !== "string") throw new HttpError(400, "storeUrl is required");
  if (!body.consumerKey || typeof body.consumerKey !== "string") throw new HttpError(400, "consumerKey is required");
  if (!body.consumerSecret || typeof body.consumerSecret !== "string") throw new HttpError(400, "consumerSecret is required");

  const storeUrl = normalizeStoreUrl(body.storeUrl);
  const client = new WooCommerceClient(storeUrl, body.consumerKey, body.consumerSecret);

  let storeName: string;
  try {
    const result = await client.verifyConnection();
    storeName = result.storeName;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/4\d\d/.test(msg)) throw new HttpError(401, "Invalid WooCommerce credentials or store URL");
    throw err;
  }

  const encryptedKey = encrypt(body.consumerKey);
  const encryptedSecret = encrypt(body.consumerSecret);

  await prisma.wooCommerceConnection.upsert({
    where: { merchantId },
    create: { merchantId, storeUrl, encryptedKey, encryptedSecret },
    update: { storeUrl, encryptedKey, encryptedSecret },
  });

  return NextResponse.json({ storeName });
});
```

- [ ] **Step 2: Write `src/app/api/woocommerce/disconnect/route.ts`**

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withErrorHandling } from "@/lib/api/errors";
import { requireSessionApi } from "@/lib/auth/requireSession";

export const POST = withErrorHandling(async () => {
  const { merchantId } = await requireSessionApi();

  await prisma.wooCommerceConnection.deleteMany({ where: { merchantId } });

  await prisma.product.updateMany({
    where: { merchantId },
    data: { woocommerceVariantId: null, woocommerceParentId: null },
  });

  return NextResponse.json({ ok: true });
});
```

- [ ] **Step 3: Write `src/app/api/woocommerce/status/route.ts`**

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withErrorHandling } from "@/lib/api/errors";
import { requireSessionApi } from "@/lib/auth/requireSession";

export const GET = withErrorHandling(async () => {
  const { merchantId } = await requireSessionApi();

  const connection = await prisma.wooCommerceConnection.findUnique({
    where: { merchantId },
  });

  if (!connection) return NextResponse.json({ connected: false });

  return NextResponse.json({
    connected: true,
    storeUrl: connection.storeUrl,
    lastSyncedAt: connection.lastSyncedAt?.toISOString() ?? null,
  });
});
```

- [ ] **Step 4: Write `src/app/api/woocommerce/connect/route.test.ts`**

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

const mockRequireSession = vi.hoisted(() => vi.fn());
const mockPrismaUpsert = vi.hoisted(() => vi.fn());
const mockVerifyConnection = vi.hoisted(() => vi.fn());
const mockEncrypt = vi.hoisted(() => vi.fn((s: string) => `enc:${s}`));

vi.mock("@/lib/auth/requireSession", () => ({
  requireSessionApi: mockRequireSession,
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    wooCommerceConnection: { upsert: mockPrismaUpsert },
  },
}));

vi.mock("@/lib/woocommerce/crypto", () => ({
  encrypt: mockEncrypt,
}));

vi.mock("@/lib/woocommerce/client", () => ({
  WooCommerceClient: vi.fn().mockImplementation(() => ({
    verifyConnection: mockVerifyConnection,
  })),
}));

function req(body: unknown) {
  return new Request("http://localhost/api/woocommerce/connect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/woocommerce/connect", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireSession.mockResolvedValue({ merchantId: "m1" });
    mockVerifyConnection.mockResolvedValue({ storeName: "mystore.com" });
    mockPrismaUpsert.mockResolvedValue({});
  });

  it("returns 400 when storeUrl is missing", async () => {
    const { POST } = await import("./route");
    const res = await POST(req({ consumerKey: "ck_x", consumerSecret: "cs_x" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when consumerKey is missing", async () => {
    const { POST } = await import("./route");
    const res = await POST(req({ storeUrl: "mystore.com", consumerSecret: "cs_x" }));
    expect(res.status).toBe(400);
  });

  it("normalizes storeUrl — adds https:// prefix and strips trailing slash", async () => {
    const { WooCommerceClient } = await import("@/lib/woocommerce/client");
    const { POST } = await import("./route");
    await POST(req({ storeUrl: "mystore.com/", consumerKey: "ck_x", consumerSecret: "cs_x" }));
    expect(WooCommerceClient).toHaveBeenCalledWith(
      "https://mystore.com",
      expect.anything(),
      expect.anything(),
    );
  });

  it("returns 401 on bad credentials", async () => {
    mockVerifyConnection.mockRejectedValue(new Error("401: unauthorized"));
    const { POST } = await import("./route");
    const res = await POST(req({ storeUrl: "https://mystore.com", consumerKey: "ck_x", consumerSecret: "cs_x" }));
    expect(res.status).toBe(401);
  });

  it("returns storeName on success", async () => {
    const { POST } = await import("./route");
    const res = await POST(req({ storeUrl: "https://mystore.com", consumerKey: "ck_x", consumerSecret: "cs_x" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.storeName).toBe("mystore.com");
  });
});
```

- [ ] **Step 5: Write `src/app/api/woocommerce/disconnect/route.test.ts`**

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRequireSession = vi.hoisted(() => vi.fn());
const mockDeleteMany = vi.hoisted(() => vi.fn().mockResolvedValue({}));
const mockUpdateMany = vi.hoisted(() => vi.fn().mockResolvedValue({}));

vi.mock("@/lib/auth/requireSession", () => ({ requireSessionApi: mockRequireSession }));
vi.mock("@/lib/db", () => ({
  prisma: {
    wooCommerceConnection: { deleteMany: mockDeleteMany },
    product: { updateMany: mockUpdateMany },
  },
}));

describe("POST /api/woocommerce/disconnect", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireSession.mockResolvedValue({ merchantId: "m1" });
  });

  it("deletes the connection and clears product WC IDs", async () => {
    const { POST } = await import("./route");
    const req = new Request("http://localhost/api/woocommerce/disconnect", { method: "POST" });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockDeleteMany).toHaveBeenCalledWith({ where: { merchantId: "m1" } });
    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: { merchantId: "m1" },
      data: { woocommerceVariantId: null, woocommerceParentId: null },
    });
  });
});
```

- [ ] **Step 6: Write `src/app/api/woocommerce/status/route.test.ts`**

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRequireSession = vi.hoisted(() => vi.fn());
const mockFindUnique = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/requireSession", () => ({ requireSessionApi: mockRequireSession }));
vi.mock("@/lib/db", () => ({
  prisma: { wooCommerceConnection: { findUnique: mockFindUnique } },
}));

describe("GET /api/woocommerce/status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireSession.mockResolvedValue({ merchantId: "m1" });
  });

  it("returns connected:false when no connection", async () => {
    mockFindUnique.mockResolvedValue(null);
    const { GET } = await import("./route");
    const res = await GET(new Request("http://localhost/api/woocommerce/status"));
    const body = await res.json();
    expect(body.connected).toBe(false);
  });

  it("returns connected:true with storeUrl and lastSyncedAt", async () => {
    const lastSyncedAt = new Date("2025-06-01T00:00:00Z");
    mockFindUnique.mockResolvedValue({ storeUrl: "https://mystore.com", lastSyncedAt });
    const { GET } = await import("./route");
    const res = await GET(new Request("http://localhost/api/woocommerce/status"));
    const body = await res.json();
    expect(body.connected).toBe(true);
    expect(body.storeUrl).toBe("https://mystore.com");
    expect(body.lastSyncedAt).toBe(lastSyncedAt.toISOString());
  });
});
```

- [ ] **Step 7: Run all route tests**

```bash
npx vitest run src/app/api/woocommerce/ --reporter=verbose
```

Expected: all tests PASS.

- [ ] **Step 8: Commit**

```bash
git add src/app/api/woocommerce/
git commit -m "feat: add WooCommerce connect/disconnect/status API routes"
```

---

## Task 7: API route — sync

**Goal:** Implement `POST /api/woocommerce/sync` — load connection, decrypt credentials, run `syncWooProducts` + `syncWooOrders`, update `lastSyncedAt`.

**Files:**
- Create: `src/app/api/woocommerce/sync/route.ts`
- Create: `src/app/api/woocommerce/sync/route.test.ts`

**Acceptance Criteria:**
- [ ] Returns 400 when no WooCommerce connection exists
- [ ] `sinceDate` = `lastSyncedAt` if set, otherwise 24 months ago
- [ ] Collects all pages from `fetchAllProducts()` generator, passes to `syncWooProducts`
- [ ] Collects all pages from `fetchOrders()` generator, passes to `syncWooOrders`
- [ ] Updates `lastSyncedAt = now()` after sync
- [ ] Returns `{ productsCreated, productsUpdated, productsSkipped, ordersImported }`
- [ ] All tests pass: `npx vitest run src/app/api/woocommerce/sync/ --reporter=verbose`

**Verify:** `npx vitest run src/app/api/woocommerce/sync/ --reporter=verbose` → all tests pass.

**Steps:**

- [ ] **Step 1: Write `src/app/api/woocommerce/sync/route.ts`**

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { HttpError, withErrorHandling } from "@/lib/api/errors";
import { requireSessionApi } from "@/lib/auth/requireSession";
import { decrypt } from "@/lib/woocommerce/crypto";
import { WooCommerceClient } from "@/lib/woocommerce/client";
import { syncWooProducts } from "@/lib/woocommerce/syncProducts";
import { syncWooOrders } from "@/lib/woocommerce/syncOrders";
import type { WooNormalizedProduct, WooOrder } from "@/lib/woocommerce/client";

export const POST = withErrorHandling(async () => {
  const { merchantId } = await requireSessionApi();

  const connection = await prisma.wooCommerceConnection.findUnique({ where: { merchantId } });
  if (!connection) throw new HttpError(400, "WooCommerce not connected");

  const consumerKey = decrypt(connection.encryptedKey);
  const consumerSecret = decrypt(connection.encryptedSecret);
  const client = new WooCommerceClient(connection.storeUrl, consumerKey, consumerSecret);

  const sinceDate = connection.lastSyncedAt
    ? new Date(connection.lastSyncedAt)
    : new Date(Date.now() - 1000 * 60 * 60 * 24 * 30 * 24); // 24 months ago

  // Collect all product pages
  const allProducts: WooNormalizedProduct[] = [];
  for await (const page of client.fetchAllProducts()) {
    allProducts.push(...page);
  }

  // Collect all order pages
  const allOrders: WooOrder[] = [];
  for await (const page of client.fetchOrders(sinceDate)) {
    allOrders.push(...page);
  }

  const [productResult, orderResult] = await Promise.all([
    syncWooProducts(prisma, merchantId, allProducts),
    syncWooOrders(prisma, merchantId, allOrders),
  ]);

  await prisma.wooCommerceConnection.update({
    where: { merchantId },
    data: { lastSyncedAt: new Date() },
  });

  return NextResponse.json({
    productsCreated: productResult.created,
    productsUpdated: productResult.updated,
    productsSkipped: productResult.skipped,
    ordersImported: orderResult.upserted,
  });
});
```

- [ ] **Step 2: Write `src/app/api/woocommerce/sync/route.test.ts`**

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRequireSession = vi.hoisted(() => vi.fn());
const mockFindUnique = vi.hoisted(() => vi.fn());
const mockUpdate = vi.hoisted(() => vi.fn().mockResolvedValue({}));
const mockDecrypt = vi.hoisted(() => vi.fn((s: string) => s.replace("enc:", "")));
const mockSyncProducts = vi.hoisted(() => vi.fn());
const mockSyncOrders = vi.hoisted(() => vi.fn());

const mockFetchAllProducts = vi.hoisted(() => vi.fn());
const mockFetchOrders = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/requireSession", () => ({ requireSessionApi: mockRequireSession }));
vi.mock("@/lib/db", () => ({
  prisma: {
    wooCommerceConnection: { findUnique: mockFindUnique, update: mockUpdate },
    product: { findMany: vi.fn().mockResolvedValue([]) },
    salesRecord: { findUnique: vi.fn().mockResolvedValue(null), create: vi.fn(), update: vi.fn() },
  },
}));
vi.mock("@/lib/woocommerce/crypto", () => ({ decrypt: mockDecrypt }));
vi.mock("@/lib/woocommerce/syncProducts", () => ({ syncWooProducts: mockSyncProducts }));
vi.mock("@/lib/woocommerce/syncOrders", () => ({ syncWooOrders: mockSyncOrders }));
vi.mock("@/lib/woocommerce/client", () => ({
  WooCommerceClient: vi.fn().mockImplementation(() => ({
    fetchAllProducts: mockFetchAllProducts,
    fetchOrders: mockFetchOrders,
  })),
}));

async function* emptyGen() {}
async function* productGen() {
  yield [{ id: 1, parentId: null, name: "Widget", sku: "W1", regularPriceDollars: "10.00" }];
}
async function* orderGen() {
  yield [{ id: 1, date_created: "2025-06-15T00:00:00", line_items: [] }];
}

describe("POST /api/woocommerce/sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireSession.mockResolvedValue({ merchantId: "m1" });
    mockSyncProducts.mockResolvedValue({ created: 1, updated: 0, skipped: 0 });
    mockSyncOrders.mockResolvedValue({ upserted: 1, skippedLineItems: 0 });
    mockFetchAllProducts.mockImplementation(() => productGen());
    mockFetchOrders.mockImplementation(() => orderGen());
  });

  it("returns 400 when not connected", async () => {
    mockFindUnique.mockResolvedValue(null);
    const { POST } = await import("./route");
    const res = await POST(new Request("http://localhost/api/woocommerce/sync", { method: "POST" }));
    expect(res.status).toBe(400);
  });

  it("returns sync counts on success", async () => {
    mockFindUnique.mockResolvedValue({
      storeUrl: "https://mystore.com",
      encryptedKey: "enc:ck_x",
      encryptedSecret: "enc:cs_x",
      lastSyncedAt: null,
    });
    const { POST } = await import("./route");
    const res = await POST(new Request("http://localhost/api/woocommerce/sync", { method: "POST" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.productsCreated).toBe(1);
    expect(body.ordersImported).toBe(1);
  });

  it("updates lastSyncedAt after sync", async () => {
    mockFindUnique.mockResolvedValue({
      storeUrl: "https://mystore.com",
      encryptedKey: "enc:ck_x",
      encryptedSecret: "enc:cs_x",
      lastSyncedAt: null,
    });
    const { POST } = await import("./route");
    await POST(new Request("http://localhost/api/woocommerce/sync", { method: "POST" }));
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { merchantId: "m1" },
      data: { lastSyncedAt: expect.any(Date) },
    });
  });
});
```

- [ ] **Step 3: Run tests**

```bash
npx vitest run src/app/api/woocommerce/sync/ --reporter=verbose
```

Expected: all tests PASS.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/woocommerce/sync/
git commit -m "feat: add WooCommerce sync API route"
```

---

## Task 8: Wire WooCommerce push into apply routes

**Goal:** Modify `POST /api/products/[id]/apply` and `POST /api/products/bulk-apply` to push price changes to WooCommerce when the product is linked, mirroring the existing Shopify push pattern.

**Files:**
- Modify: `src/app/api/products/[id]/apply/route.ts`
- Modify: `src/app/api/products/bulk-apply/route.ts`

**Acceptance Criteria:**
- [ ] Single apply: if product has `woocommerceVariantId`, loads WC connection, instantiates client, calls `pushPriceToWooCommerce`; failure returns `woocommercePushed: false` in response (non-blocking — does not prevent price change)
- [ ] Single apply: response includes `woocommercePushed: boolean`
- [ ] Bulk apply: attempts WC push for each product; failure does NOT add to `failed[]` or block other products; failure is reflected in `woocommerceResults` in response
- [ ] Bulk apply: response includes `woocommerceResults: { productId, pushed, error? }[]`
- [ ] Existing Shopify push behaviour unchanged
- [ ] Type-checks cleanly: `npx tsc --noEmit`

**Verify:** `npx tsc --noEmit` → no errors.

**Steps:**

- [ ] **Step 1: Create `src/lib/woocommerce/getClient.ts` helper**

This tiny helper is used by both apply routes to avoid repeating the decrypt + instantiate pattern:

```ts
import { prisma } from "@/lib/db";
import { decrypt } from "@/lib/woocommerce/crypto";
import { WooCommerceClient } from "@/lib/woocommerce/client";

export async function getWooClient(merchantId: string): Promise<WooCommerceClient | null> {
  const connection = await prisma.wooCommerceConnection.findUnique({ where: { merchantId } });
  if (!connection) return null;
  const consumerKey = decrypt(connection.encryptedKey);
  const consumerSecret = decrypt(connection.encryptedSecret);
  return new WooCommerceClient(connection.storeUrl, consumerKey, consumerSecret);
}
```

- [ ] **Step 2: Modify `src/app/api/products/[id]/apply/route.ts`**

Replace the entire file:

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { HttpError, withErrorHandling } from "@/lib/api/errors";
import { parseJsonBody } from "@/lib/api/validation";
import { requireSessionApi } from "@/lib/auth/requireSession";
import { assertProductOwned } from "@/lib/auth/ownership";
import { pushPriceToShopify } from "@/lib/shopify/pushPrice";
import { pushPriceToWooCommerce } from "@/lib/woocommerce/pushPrice";
import { getWooClient } from "@/lib/woocommerce/getClient";
import { centsToDollars } from "@/lib/money";

export const POST = withErrorHandling(
  async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { merchantId } = await requireSessionApi();
    const { id } = await params;
    await assertProductOwned(prisma, id, merchantId);

    const body = await parseJsonBody(req);
    const newPrice = body.price;

    if (typeof newPrice !== "number" || !Number.isFinite(newPrice) || newPrice <= 0) {
      throw new HttpError(400, "Price must be a positive number (in cents)");
    }

    const product = await prisma.product.findUniqueOrThrow({ where: { id } });
    const fromCents = product.currentPrice;

    if (newPrice === fromCents) {
      throw new HttpError(400, "New price is the same as the current price");
    }

    // Shopify push (blocking — failure throws 502)
    if (product.shopifyVariantId) {
      try {
        await pushPriceToShopify(merchantId, product.shopifyVariantId, newPrice);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new HttpError(502, `Shopify sync failed: ${msg}`);
      }
    }

    // WooCommerce push (non-blocking — failure logged in response)
    let woocommercePushed = false;
    if (product.woocommerceVariantId) {
      const wooClient = await getWooClient(merchantId);
      if (wooClient) {
        const result = await pushPriceToWooCommerce(prisma, wooClient, id, centsToDollars(newPrice));
        woocommercePushed = result.ok;
      }
    }

    await prisma.$transaction([
      prisma.product.update({ where: { id }, data: { currentPrice: newPrice } }),
      prisma.priceChange.create({
        data: { productId: id, fromCents, toCents: newPrice },
      }),
      prisma.recommendation.deleteMany({ where: { productId: id } }),
    ]);

    return NextResponse.json({ ok: true, woocommercePushed });
  },
);
```

- [ ] **Step 3: Modify `src/app/api/products/bulk-apply/route.ts`**

Replace the entire file:

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { HttpError, withErrorHandling } from "@/lib/api/errors";
import { parseJsonBody } from "@/lib/api/validation";
import { requireSessionApi } from "@/lib/auth/requireSession";
import { pushPriceToShopify } from "@/lib/shopify/pushPrice";
import { pushPriceToWooCommerce } from "@/lib/woocommerce/pushPrice";
import { getWooClient } from "@/lib/woocommerce/getClient";
import { centsToDollars } from "@/lib/money";

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

  // Get WooCommerce client once (shared across all products)
  const wooClient = await getWooClient(merchantId);

  let applied = 0;
  let skipped = 0;
  const failed: { id: string; title: string; reason: string }[] = [];
  const woocommerceResults: { productId: string; pushed: boolean; error?: string }[] = [];

  for (const p of products) {
    if (!p.recommendation) { skipped++; continue; }

    let suggestedPriceCents: number | null = null;
    try {
      const rules = JSON.parse(p.recommendation.rulesJson) as { suggestedPriceCents: number };
      suggestedPriceCents = rules.suggestedPriceCents ?? null;
    } catch { skipped++; continue; }

    if (!suggestedPriceCents || suggestedPriceCents === p.currentPrice) { skipped++; continue; }

    // Shopify push (blocking per product — failure skips this product)
    if (p.shopifyVariantId) {
      try {
        await pushPriceToShopify(merchantId, p.shopifyVariantId, suggestedPriceCents);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        failed.push({ id: p.id, title: p.title, reason: `Shopify sync failed: ${msg}` });
        continue;
      }
    }

    // WooCommerce push (non-blocking — failure recorded but does not skip)
    if (p.woocommerceVariantId && wooClient) {
      const result = await pushPriceToWooCommerce(prisma, wooClient, p.id, centsToDollars(suggestedPriceCents));
      woocommerceResults.push({ productId: p.id, pushed: result.ok, error: result.error });
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

  return NextResponse.json({ applied, skipped, failed, woocommerceResults });
});
```

- [ ] **Step 4: Check `centsToDollars` export**

The `pushPriceToShopify` internally uses `centsToDollars`. Confirm it's exported from `@/lib/money`:

```bash
grep -n "centsToDollars" src/lib/money.ts
```

If not exported, add: `export function centsToDollars(cents: number): string { return (cents / 100).toFixed(2); }`

- [ ] **Step 5: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/products/[id]/apply/route.ts src/app/api/products/bulk-apply/route.ts src/lib/woocommerce/getClient.ts
git commit -m "feat: wire WooCommerce price push into apply routes"
```

---

## Task 9: WooCommerceConnectionCard component + settings page

**Goal:** Build the `WooCommerceConnectionCard` React component (mirroring `ShopifyConnectionCard`) and wire it into the Settings page alongside the Shopify card.

**Files:**
- Create: `src/components/WooCommerceConnectionCard.tsx`
- Modify: `src/app/settings/page.tsx`

**Acceptance Criteria:**
- [ ] Disconnected state: shows Store URL, Consumer Key, Consumer Secret inputs and Connect button
- [ ] "Where do I find these?" link toggles an inline help tooltip
- [ ] Connected state: shows store domain, last-synced timestamp, Sync Now and Disconnect buttons
- [ ] Sync shows spinner and result counts after completion
- [ ] Disconnect requires `window.confirm` and calls `POST /api/woocommerce/disconnect`
- [ ] `src/app/settings/page.tsx` renders both `<ShopifyConnectionCard />` and `<WooCommerceConnectionCard />` stacked vertically
- [ ] Component renders without console errors: start dev server and open `/settings`

**Verify:** Start dev server (`npm run dev`), open `http://localhost:3000/settings`, confirm both connection cards render without errors.

**Steps:**

- [ ] **Step 1: Write `src/components/WooCommerceConnectionCard.tsx`**

```tsx
"use client";
import { useState, useEffect } from "react";

interface WooStatus {
  connected: boolean;
  storeUrl?: string;
  lastSyncedAt?: string | null;
}

interface SyncResult {
  productsCreated: number;
  productsUpdated: number;
  productsSkipped: number;
  ordersImported: number;
}

type UIState = "loading" | "disconnected" | "connecting" | "connected" | "syncing";

export function WooCommerceConnectionCard() {
  const [uiState, setUiState] = useState<UIState>("loading");
  const [storeUrl, setStoreUrl] = useState("");
  const [consumerKey, setConsumerKey] = useState("");
  const [consumerSecret, setConsumerSecret] = useState("");
  const [connectedUrl, setConnectedUrl] = useState<string | undefined>();
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  async function fetchStatus(signal?: AbortSignal) {
    setError(null);
    try {
      const res = await fetch("/api/woocommerce/status", { signal });
      if (!res.ok) throw new Error("Failed to fetch WooCommerce status.");
      const data: WooStatus = await res.json();
      if (data.connected) {
        setConnectedUrl(data.storeUrl);
        setLastSyncedAt(data.lastSyncedAt);
        setUiState("connected");
      } else {
        setUiState("disconnected");
      }
    } catch (err) {
      if ((err as { name?: string }).name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Failed to load WooCommerce status.");
      setUiState("disconnected");
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    fetchStatus(controller.signal);
    return () => controller.abort();
  }, []);

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    setUiState("connecting");
    setError(null);
    try {
      const res = await fetch("/api/woocommerce/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeUrl, consumerKey, consumerSecret }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Connection failed — check your credentials.");
      }
      await fetchStatus();
      setStoreUrl("");
      setConsumerKey("");
      setConsumerSecret("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed — try again.");
      setUiState("disconnected");
    }
  }

  async function handleDisconnect() {
    const confirmed = window.confirm(
      `Disconnect from ${connectedUrl}? This will not delete your synced products or sales data.`
    );
    if (!confirmed) return;
    setError(null);
    try {
      const res = await fetch("/api/woocommerce/disconnect", { method: "POST" });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Disconnect failed — try again.");
      }
      setSyncResult(null);
      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Disconnect failed — try again.");
    }
  }

  async function handleSync() {
    setUiState("syncing");
    setError(null);
    setSyncResult(null);
    try {
      const res = await fetch("/api/woocommerce/sync", { method: "POST" });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Sync failed — try again.");
      }
      const data: SyncResult = await res.json();
      setSyncResult(data);
      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed — try again.");
      setUiState("connected");
    }
  }

  function formatDate(iso?: string | null): string {
    if (!iso) return "Never";
    const d = new Date(iso);
    return isNaN(d.getTime()) ? "Never" : d.toLocaleString();
  }

  function getStoreDomain(url?: string): string {
    if (!url) return "";
    try { return new URL(url).hostname; } catch { return url; }
  }

  return (
    <section className="rounded-xl border border-line bg-surface p-5">
      <h2 className="text-sm font-semibold text-ink">WooCommerce Connection</h2>

      {uiState === "loading" && (
        <p className="mt-3 text-sm text-muted">Loading…</p>
      )}

      {(uiState === "disconnected" || uiState === "connecting") && (
        <form onSubmit={handleConnect} className="mt-4 space-y-3">
          <p className="text-xs text-muted">
            Connect your WooCommerce store to sync products and orders.
          </p>
          <div>
            <label htmlFor="wc-storeUrl" className="block text-xs font-medium text-ink mb-1">
              Store URL
            </label>
            <input
              id="wc-storeUrl"
              type="text"
              placeholder="https://mystore.com"
              value={storeUrl}
              onChange={(e) => setStoreUrl(e.target.value)}
              disabled={uiState === "connecting"}
              required
              className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
            />
          </div>
          <div>
            <label htmlFor="wc-consumerKey" className="block text-xs font-medium text-ink mb-1">
              Consumer Key
            </label>
            <input
              id="wc-consumerKey"
              type="password"
              placeholder="ck_••••••••"
              value={consumerKey}
              onChange={(e) => setConsumerKey(e.target.value)}
              disabled={uiState === "connecting"}
              required
              className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
            />
          </div>
          <div>
            <label htmlFor="wc-consumerSecret" className="block text-xs font-medium text-ink mb-1">
              Consumer Secret
            </label>
            <input
              id="wc-consumerSecret"
              type="password"
              placeholder="cs_••••••••"
              value={consumerSecret}
              onChange={(e) => setConsumerSecret(e.target.value)}
              disabled={uiState === "connecting"}
              required
              className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={uiState === "connecting"}
              className="btn"
            >
              {uiState === "connecting" ? "Connecting…" : "Connect"}
            </button>
            <button
              type="button"
              onClick={() => setShowHelp((v) => !v)}
              className="text-xs text-muted underline hover:text-ink"
            >
              Where do I find these?
            </button>
          </div>

          {showHelp && (
            <div className="rounded-lg border border-line bg-panel p-3 text-xs text-muted">
              In your WordPress admin go to{" "}
              <strong className="text-ink">WooCommerce → Settings → Advanced → REST API → Add key</strong>.
              Set permissions to <strong className="text-ink">Read/Write</strong>, then copy the Consumer Key and Consumer Secret shown.
            </div>
          )}
        </form>
      )}

      {(uiState === "connected" || uiState === "syncing") && (
        <div className="mt-4 space-y-4">
          <div className="space-y-1">
            <p className="text-sm font-medium text-ink">{getStoreDomain(connectedUrl)}</p>
            <p className="text-xs text-muted">
              Last synced: {formatDate(lastSyncedAt)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleSync}
              disabled={uiState === "syncing"}
              className="btn"
            >
              {uiState === "syncing" ? "Syncing…" : "Sync now"}
            </button>
            <button
              onClick={handleDisconnect}
              disabled={uiState === "syncing"}
              className="btn btn-ghost"
            >
              Disconnect
            </button>
          </div>
          {syncResult && (
            <div className="mt-2">
              <p className="text-xs font-medium text-ink mb-1.5">Last sync results</p>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-accent-soft px-2.5 py-1 font-medium text-accent">
                  {syncResult.productsCreated} created
                </span>
                <span className="rounded-full bg-panel px-2.5 py-1 text-muted">
                  {syncResult.productsUpdated} updated
                </span>
                <span className="rounded-full bg-panel px-2.5 py-1 text-muted">
                  {syncResult.productsSkipped} skipped
                </span>
                <span className="rounded-full bg-panel px-2.5 py-1 text-muted">
                  {syncResult.ordersImported} orders imported
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="mt-4 text-sm text-danger">
          {error}
        </p>
      )}
    </section>
  );
}
```

- [ ] **Step 2: Modify `src/app/settings/page.tsx`**

```tsx
import { requireSessionPage } from "@/lib/auth/requireSession";
import { prisma } from "@/lib/db";
import { AppShell } from "@/components/AppShell";
import { ShopifyConnectionCard } from "@/components/ShopifyConnectionCard";
import { WooCommerceConnectionCard } from "@/components/WooCommerceConnectionCard";

export default async function SettingsPage() {
  const user = await requireSessionPage();
  const merchant = await prisma.merchant.findFirst({
    where: { id: user.merchantId },
    select: { name: true },
  });

  return (
    <AppShell merchantName={merchant?.name ?? undefined}>
      <main className="max-w-2xl mx-auto p-8">
        <h1 className="text-2xl font-bold mb-6">Settings</h1>
        <div className="space-y-4">
          <ShopifyConnectionCard />
          <WooCommerceConnectionCard />
        </div>
      </main>
    </AppShell>
  );
}
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Verify in browser**

Start the dev server:
```bash
npm run dev
```

Open `http://localhost:3000/settings`. Both connection cards should render side by side with no console errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/WooCommerceConnectionCard.tsx src/app/settings/page.tsx
git commit -m "feat: add WooCommerceConnectionCard and wire into settings page"
```

---

## Self-Review

**Spec coverage check:**
- [x] WooCommerceConnection model — Task 1
- [x] Product woocommerceVariantId + woocommerceParentId — Task 1
- [x] WooCommerceClient with Basic auth — Task 2
- [x] fetchAllProducts async generator (simple + variable) — Task 2
- [x] fetchOrders with sinceDate, status=any — Task 2 (corrected from spec which said status=completed,processing, which WC API doesn't support as comma-sep)
- [x] updateProductPrice + updateVariationPrice — Task 2
- [x] crypto re-export — Task 2
- [x] syncWooProducts — Task 3
- [x] syncWooOrders — Task 4
- [x] pushPriceToWooCommerce — Task 5
- [x] connect/disconnect/status routes — Task 6
- [x] sync route — Task 7
- [x] apply route modifications — Task 8
- [x] WooCommerceConnectionCard — Task 9
- [x] Settings page wired — Task 9

**Notes:**
- `status=any` used in `fetchOrders` instead of `status=completed,processing` — WC REST API v3 does not accept comma-separated status values.
- `centsToDollars` must be exported from `src/lib/money.ts`; Task 8 Step 4 checks for this.
- The `getClient.ts` helper avoids repeating decrypt + instantiate across both apply routes.
