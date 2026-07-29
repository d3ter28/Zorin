# Product Images Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:subagent-driven-development (recommended) or superpowers-extended-cc:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show each product's photo next to its title in the products table and product detail page, for merchants connected via Shopify or WooCommerce.

**Architecture:** One nullable `Product.imageUrl` column, populated as a side effect of the existing Shopify/WooCommerce sync calls (no new API calls, no image storage of our own — Zorin only stores the platform's CDN URL string). A new `ProductThumbnail` component renders it via a plain `<img>` tag with an `onError`-triggered fallback tile, since WooCommerce images can live on arbitrary self-hosted domains that can't be allowlisted via `next/image`.

**Tech Stack:** No new dependencies. Extends `src/lib/shopify/`, `src/lib/woocommerce/`, `prisma/schema.prisma` + `schema.production.prisma`, `/api/products` routes, `ProductsTable.tsx`, `/product/[id]` page.

**User decisions (already made):**
- Thumbnail style: 44px rounded square, dashed-border icon tile as the no-image fallback (visual mockup, Option C)
- Placement: products table (next to title) + product detail page header — nowhere else
- WooCommerce variable products: variations without their own photo inherit the parent product's image; if neither has one, showing the fallback tile is acceptable — this is a quality-of-life improvement, not a guarantee

Full design rationale: `docs/superpowers/specs/2026-07-30-product-images-design.md`

---

### Task 1: Product schema + Shopify/WooCommerce sync fetch imageUrl

**Goal:** Add `Product.imageUrl`, and have both Shopify and WooCommerce sync populate it from data already returned by the API calls they make today — no new requests.

**Files:**
- Modify: `prisma/schema.prisma:25-43` (Product model)
- Modify: `prisma/schema.production.prisma:25-43` (Product model)
- Modify: `src/lib/shopify/client.ts` (`ShopifyVariant`, `RawProduct`, `fetchAllProducts`)
- Modify: `src/lib/shopify/syncProducts.ts` (persist `imageUrl` on create + update)
- Modify: `src/lib/shopify/client.test.ts` (`fetchAllProducts()` describe block)
- Modify: `src/lib/shopify/syncProducts.test.ts` (`variant()` helper, create/update assertions, new imageUrl cases)
- Modify: `src/lib/woocommerce/client.ts` (`WooNormalizedProduct`, `RawProduct`, `RawVariation`, `fetchAllProducts`)
- Modify: `src/lib/woocommerce/syncProducts.ts` (persist `imageUrl` on create + update)
- Modify: `src/lib/woocommerce/client.test.ts` (`fetchAllProducts()` describe block)
- Modify: `src/lib/woocommerce/syncProducts.test.ts` (`product()` helper, create/update assertions, new imageUrl cases)

**Acceptance Criteria:**
- [ ] Product schema has nullable `imageUrl` column, dev + prod schemas in sync
- [ ] Shopify sync sets `imageUrl` from the product's featured image (`product.image.src`) on both create and update paths, `null` when the product has no image
- [ ] WooCommerce sync sets `imageUrl` from the product's first image (`product.images[0].src`) on both create and update paths; variations without their own image inherit the parent product's image; both `null` when neither has one
- [ ] CSV-only products are unaffected (`imageUrl` stays `null` — they never go through these sync functions)
- [ ] Re-syncing overwrites `imageUrl` if the merchant's photo changed

**Verify:** `npx vitest run src/lib/shopify/client.test.ts src/lib/shopify/syncProducts.test.ts src/lib/woocommerce/client.test.ts src/lib/woocommerce/syncProducts.test.ts` → all pass

**Steps:**

- [ ] **Step 1: Update both Prisma schemas**

In `prisma/schema.prisma`, add `imageUrl` to the `Product` model (line 25-43):

```prisma
model Product {
  id                   String           @id @default(cuid())
  merchantId           String
  merchant             Merchant         @relation(fields: [merchantId], references: [id])
  title                String
  sku                  String
  currentPrice         Int
  cogs                 Int?
  category             String
  estUnits             Int?
  imageUrl             String?
  shopifyVariantId     String?
  woocommerceVariantId String?
  woocommerceParentId  String?
  createdAt            DateTime         @default(now())
  recommendation       Recommendation?
  salesRecords         SalesRecord[]
  elasticityModel      ElasticityModel?
  priceChanges         PriceChange[]
}
```

Make the identical change to `prisma/schema.production.prisma` (its `Product` model, lines 25-43, is byte-for-byte the same block).

- [ ] **Step 2: Push schema to dev DB and regenerate the client**

Run:
```bash
npx prisma db push
npx prisma generate
```
Expected: `Your database is now in sync with your Prisma schema.` — this is the project's documented "stale Prisma client" gotcha (see handover notes); skipping this step causes `Unknown argument imageUrl` errors at runtime even though the code compiles.

- [ ] **Step 3: Commit the schema change**

```bash
git add prisma/schema.prisma prisma/schema.production.prisma
git commit -m "Add nullable imageUrl column to Product"
```

- [ ] **Step 4: Update the Shopify client test for imageUrl parsing (write failing test first)**

Replace the entire `describe('fetchAllProducts()', ...)` block in `src/lib/shopify/client.test.ts` (currently lines 77-192) with:

```ts
  describe('fetchAllProducts()', () => {
    it('yields flattened variants from a single page', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        mockResponse({
          products: [
            {
              id: 1,
              title: 'Widget',
              image: { src: 'https://cdn.shopify.com/widget.jpg' },
              variants: [
                {
                  id: 101,
                  product_id: 1,
                  title: 'Small',
                  sku: 'WID-S',
                  price: '9.99',
                  inventory_quantity: 50,
                },
              ],
            },
          ],
        }),
      );

      const pages: Awaited<ReturnType<typeof client.fetchAllProducts>>[] = [];
      for await (const page of client.fetchAllProducts()) {
        pages.push(page as typeof page);
      }

      expect(pages).toHaveLength(1);
      expect(pages[0]).toEqual([
        {
          id: 101,
          product_id: 1,
          title: 'Small',
          product_title: 'Widget',
          sku: 'WID-S',
          price: '9.99',
          inventory_quantity: 50,
          imageUrl: 'https://cdn.shopify.com/widget.jpg',
        },
      ]);
    });

    it('sets imageUrl to null when the product has no image', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        mockResponse({
          products: [
            {
              id: 2,
              title: 'No Photo Product',
              variants: [
                {
                  id: 201,
                  product_id: 2,
                  title: 'Default Title',
                  sku: 'NP-1',
                  price: '5.00',
                  inventory_quantity: 3,
                },
              ],
            },
          ],
        }),
      );

      const pages: unknown[] = [];
      for await (const page of client.fetchAllProducts()) {
        pages.push(page);
      }

      expect((pages[0] as Array<{ imageUrl: string | null }>)[0].imageUrl).toBeNull();
    });

    it('follows Link header pagination across multiple pages', async () => {
      const nextUrl = `https://${shopDomain}/admin/api/2024-01/products.json?limit=250&page_info=abc123`;

      vi.mocked(fetch)
        .mockResolvedValueOnce(
          mockResponse(
            {
              products: [
                {
                  id: 1,
                  title: 'Product A',
                  variants: [
                    {
                      id: 10,
                      product_id: 1,
                      title: 'Default Title',
                      sku: 'A',
                      price: '1.00',
                      inventory_quantity: 1,
                    },
                  ],
                },
              ],
            },
            200,
            { link: `<${nextUrl}>; rel="next"` },
          ),
        )
        .mockResolvedValueOnce(
          mockResponse({
            products: [
              {
                id: 2,
                title: 'Product B',
                variants: [
                  {
                    id: 20,
                    product_id: 2,
                    title: 'Default Title',
                    sku: 'B',
                    price: '2.00',
                    inventory_quantity: 2,
                  },
                ],
              },
            ],
          }),
        );

      const pages: unknown[] = [];
      for await (const page of client.fetchAllProducts()) {
        pages.push(page);
      }

      expect(pages).toHaveLength(2);
      expect(fetch).toHaveBeenCalledTimes(2);
      // Second call should use the next URL from the Link header
      expect(fetch).toHaveBeenNthCalledWith(2, nextUrl, expect.anything());
    });

    it('uses correct initial URL with limit=250', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        mockResponse({ products: [] }),
      );

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for await (const _ of client.fetchAllProducts()) { /* consume */ }

      expect(fetch).toHaveBeenCalledWith(
        `https://${shopDomain}/admin/api/2024-01/products.json?limit=250`,
        expect.anything(),
      );
    });
  });
```

- [ ] **Step 5: Run test to verify it fails**

Run: `npx vitest run src/lib/shopify/client.test.ts`
Expected: FAIL — `imageUrl` is `undefined` in the actual output (not yet implemented), or a TS error that `imageUrl` doesn't exist on the expected type once Step 6 changes land partially. Confirm the failure is about the missing `imageUrl` field, not something else.

- [ ] **Step 6: Implement imageUrl parsing in the Shopify client**

In `src/lib/shopify/client.ts`, update the `ShopifyVariant` interface (lines 1-9):

```ts
export interface ShopifyVariant {
  id: number;
  product_id: number;
  title: string;           // variant title ("Small", or "Default Title" for single-variant)
  product_title: string;   // parent product title
  sku: string;
  price: string;           // "29.99"
  inventory_quantity: number;
  imageUrl: string | null; // product's featured image (product.image.src), or null if the product has no photo
}
```

Update `RawProduct` (lines 33-37) to include the optional image field:

```ts
interface RawProduct {
  id: number;
  title: string;
  image?: { src: string };
  variants: RawVariant[];
}
```

Update the `flatMap` inside `fetchAllProducts()` (lines 135-145) to set `imageUrl`:

```ts
      const variants: ShopifyVariant[] = body.products.flatMap((product) =>
        product.variants.map((v) => ({
          id: v.id,
          product_id: v.product_id,
          title: v.title,
          product_title: product.title,
          sku: v.sku,
          price: v.price,
          inventory_quantity: v.inventory_quantity,
          imageUrl: product.image?.src ?? null,
        })),
      );
```

- [ ] **Step 7: Run test to verify it passes**

Run: `npx vitest run src/lib/shopify/client.test.ts`
Expected: PASS (all cases in `fetchAllProducts()`, plus the rest of the file's existing suites unaffected)

- [ ] **Step 8: Update the Shopify syncProducts test for imageUrl persistence (write failing tests first)**

In `src/lib/shopify/syncProducts.test.ts`, update the `variant()` helper (lines 16-27) to include a default `imageUrl`:

```ts
function variant(over: Partial<ShopifyVariant> = {}): ShopifyVariant {
  return {
    id: 1001,
    product_id: 500,
    title: "Default Title",
    product_title: "Linen Shirt",
    sku: "TEE-100",
    price: "29.99",
    inventory_quantity: 10,
    imageUrl: null,
    ...over,
  };
}
```

Update the "creates a new product for an unmatched variant" test (lines 87-103) to expect `imageUrl` in the exact create payload:

```ts
  it("creates a new product for an unmatched variant", async () => {
    const prisma = mockPrisma([]);
    const result = await syncProducts(prisma as never, "m1", [variant()]);

    expect(prisma.product.create).toHaveBeenCalledWith({
      data: {
        merchantId: "m1",
        sku: "TEE-100",
        title: "Linen Shirt",
        currentPrice: 2999,
        shopifyVariantId: "1001",
        imageUrl: null,
        category: "Shopify",
      },
    });
    expect(result.created).toBe(1);
    expect(result.updated).toBe(0);
  });
```

Update the "updates an existing product matched by SKU" test (lines 118-135) similarly:

```ts
  it("updates an existing product matched by SKU", async () => {
    const prisma = mockPrisma([{ id: "p1", sku: "TEE-100" }]);
    const result = await syncProducts(prisma as never, "m1", [
      variant({ id: 1001, sku: "TEE-100", price: "34.99" }),
    ]);

    expect(prisma.product.update).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: {
        title: "Linen Shirt",
        currentPrice: 3499,
        shopifyVariantId: "1001",
        imageUrl: null,
      },
    });
    expect(prisma.product.create).not.toHaveBeenCalled();
    expect(result.updated).toBe(1);
    expect(result.created).toBe(0);
  });
```

Add two new tests after the "Mixed batch" section (before "Return shape", i.e. after line 179):

```ts
  // ── Image URL persistence ─────────────────────────────────────────────────

  it("persists imageUrl from the variant on create", async () => {
    const prisma = mockPrisma([]);
    await syncProducts(prisma as never, "m1", [
      variant({ imageUrl: "https://cdn.shopify.com/photo.jpg" }),
    ]);

    expect(prisma.product.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ imageUrl: "https://cdn.shopify.com/photo.jpg" }),
      }),
    );
  });

  it("overwrites imageUrl on re-sync when the merchant's photo changed", async () => {
    const prisma = mockPrisma([{ id: "p1", sku: "TEE-100" }]);
    await syncProducts(prisma as never, "m1", [
      variant({ sku: "TEE-100", imageUrl: "https://cdn.shopify.com/new-photo.jpg" }),
    ]);

    expect(prisma.product.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ imageUrl: "https://cdn.shopify.com/new-photo.jpg" }),
      }),
    );
  });
```

- [ ] **Step 9: Run test to verify it fails**

Run: `npx vitest run src/lib/shopify/syncProducts.test.ts`
Expected: FAIL — `imageUrl` missing from the actual `create`/`update` call arguments.

- [ ] **Step 10: Implement imageUrl persistence in Shopify syncProducts**

In `src/lib/shopify/syncProducts.ts`, update both the update and create calls inside the `for (const v of withSku)` loop (lines 66-90):

```ts
    const existingId = skuToId.get(v.sku.toLowerCase());
    if (existingId) {
      await prisma.product.update({
        where: { id: existingId },
        data: {
          title,
          currentPrice: priceCents,
          shopifyVariantId,
          imageUrl: v.imageUrl,
        },
      });
      touchedIds.push(existingId);
      updated++;
    } else {
      await prisma.product.create({
        data: {
          merchantId,
          sku: v.sku,
          title,
          currentPrice: priceCents,
          shopifyVariantId,
          imageUrl: v.imageUrl,
          category: "Shopify",
        },
      });
      created++;
    }
```

- [ ] **Step 11: Run test to verify it passes**

Run: `npx vitest run src/lib/shopify/syncProducts.test.ts`
Expected: PASS

- [ ] **Step 12: Commit the Shopify half**

```bash
git add src/lib/shopify/client.ts src/lib/shopify/client.test.ts src/lib/shopify/syncProducts.ts src/lib/shopify/syncProducts.test.ts
git commit -m "Sync product image URL from Shopify"
```

- [ ] **Step 13: Update the WooCommerce client test for imageUrl parsing (write failing test first)**

Replace the entire `describe("fetchAllProducts()", ...)` block in `src/lib/woocommerce/client.test.ts` (currently lines 98-218) with:

```ts
  describe("fetchAllProducts()", () => {
    it("yields simple products directly", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        mockResponse([
          {
            id: 1,
            type: "simple",
            name: "Widget",
            sku: "WID-1",
            regular_price: "9.99",
            images: [{ src: "https://example.com/wp-content/widget.jpg" }],
          },
        ]),
      );

      const pages: unknown[] = [];
      for await (const page of client.fetchAllProducts()) {
        pages.push(page);
      }

      expect(pages).toHaveLength(1);
      expect(pages[0]).toEqual([
        {
          id: 1,
          parentId: null,
          name: "Widget",
          sku: "WID-1",
          regularPriceDollars: "9.99",
          imageUrl: "https://example.com/wp-content/widget.jpg",
        },
      ]);
    });

    it("sets imageUrl to null for a simple product with no images", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        mockResponse([
          {
            id: 2,
            type: "simple",
            name: "No Photo",
            sku: "NP-1",
            regular_price: "5.00",
            images: [],
          },
        ]),
      );

      const pages: unknown[] = [];
      for await (const page of client.fetchAllProducts()) {
        pages.push(page);
      }

      expect((pages[0] as Array<{ imageUrl: string | null }>)[0].imageUrl).toBeNull();
    });

    it("fetches variations for variable products, each variation using its own image", async () => {
      vi.mocked(fetch)
        // First call: products page
        .mockResolvedValueOnce(
          mockResponse([
            {
              id: 10,
              type: "variable",
              name: "T-Shirt",
              sku: "",
              regular_price: "",
              images: [{ src: "https://example.com/tshirt-parent.jpg" }],
            },
          ]),
        )
        // Second call: variations for product 10 — each has its own image
        .mockResolvedValueOnce(
          mockResponse([
            {
              id: 101,
              sku: "TS-S",
              regular_price: "19.99",
              attributes: [{ name: "Size", option: "Small" }],
              images: [{ src: "https://example.com/tshirt-small.jpg" }],
            },
            {
              id: 102,
              sku: "TS-L",
              regular_price: "19.99",
              attributes: [{ name: "Size", option: "Large" }],
              images: [{ src: "https://example.com/tshirt-large.jpg" }],
            },
          ]),
        );

      const pages: unknown[] = [];
      for await (const page of client.fetchAllProducts()) {
        pages.push(page);
      }

      expect(pages).toHaveLength(1);
      expect(pages[0]).toEqual([
        {
          id: 101,
          parentId: 10,
          name: "T-Shirt - Small",
          sku: "TS-S",
          regularPriceDollars: "19.99",
          imageUrl: "https://example.com/tshirt-small.jpg",
        },
        {
          id: 102,
          parentId: 10,
          name: "T-Shirt - Large",
          sku: "TS-L",
          regularPriceDollars: "19.99",
          imageUrl: "https://example.com/tshirt-large.jpg",
        },
      ]);

      // Variations URL called
      expect(fetch).toHaveBeenNthCalledWith(
        2,
        `${storeUrl}/wp-json/wc/v3/products/10/variations?per_page=100`,
        expect.anything(),
      );
    });

    it("falls back to the parent product's image when a variation has none of its own", async () => {
      vi.mocked(fetch)
        .mockResolvedValueOnce(
          mockResponse([
            {
              id: 20,
              type: "variable",
              name: "Mug",
              sku: "",
              regular_price: "",
              images: [{ src: "https://example.com/mug-parent.jpg" }],
            },
          ]),
        )
        .mockResolvedValueOnce(
          mockResponse([
            {
              id: 201,
              sku: "MUG-RED",
              regular_price: "12.00",
              attributes: [{ name: "Color", option: "Red" }],
              images: [],
            },
          ]),
        );

      const pages: unknown[] = [];
      for await (const page of client.fetchAllProducts()) {
        pages.push(page);
      }

      expect((pages[0] as Array<{ imageUrl: string | null }>)[0].imageUrl).toBe(
        "https://example.com/mug-parent.jpg",
      );
    });

    it("follows Link header pagination for products", async () => {
      const nextUrl = `${storeUrl}/wp-json/wc/v3/products?per_page=100&page=2`;

      vi.mocked(fetch)
        .mockResolvedValueOnce(
          mockResponse(
            [{ id: 1, type: "simple", name: "A", sku: "A", regular_price: "1.00" }],
            200,
            { link: `<${nextUrl}>; rel="next"` },
          ),
        )
        .mockResolvedValueOnce(
          mockResponse([
            { id: 2, type: "simple", name: "B", sku: "B", regular_price: "2.00" },
          ]),
        );

      const pages: unknown[] = [];
      for await (const page of client.fetchAllProducts()) {
        pages.push(page);
      }

      expect(pages).toHaveLength(2);
      expect(fetch).toHaveBeenCalledTimes(2);
      expect(fetch).toHaveBeenNthCalledWith(2, nextUrl, expect.anything());
    });
  });
```

- [ ] **Step 14: Run test to verify it fails**

Run: `npx vitest run src/lib/woocommerce/client.test.ts`
Expected: FAIL — `imageUrl` missing from actual output.

- [ ] **Step 15: Implement imageUrl parsing in the WooCommerce client**

In `src/lib/woocommerce/client.ts`, update `WooNormalizedProduct` (lines 1-7):

```ts
export interface WooNormalizedProduct {
  id: number;
  parentId: number | null;
  name: string;
  sku: string;
  regularPriceDollars: string;
  imageUrl: string | null;
}
```

Update `RawProduct` and `RawVariation` (lines 23-36) to include the optional images field:

```ts
interface RawProduct {
  id: number;
  type: "simple" | "variable";
  name: string;
  sku: string;
  regular_price: string;
  images?: Array<{ src: string }>;
}

interface RawVariation {
  id: number;
  sku: string;
  regular_price: string;
  attributes: Array<{ name: string; option: string }>;
  images?: Array<{ src: string }>;
}
```

Update `fetchAllProducts()` (lines 133-183) to compute and pass through `imageUrl`, with variations falling back to the parent's image:

```ts
  async *fetchAllProducts(): AsyncGenerator<WooNormalizedProduct[]> {
    let url: string | null = `${this.baseUrl}/products?per_page=100`;

    while (url) {
      const { data, linkHeader } = await this.request(url);
      const products = data as RawProduct[];
      const page: WooNormalizedProduct[] = [];

      for (const product of products) {
        if (product.type === "simple") {
          page.push({
            id: product.id,
            parentId: null,
            name: product.name,
            sku: product.sku,
            regularPriceDollars: product.regular_price,
            imageUrl: product.images?.[0]?.src ?? null,
          });
        } else if (product.type === "variable") {
          const parentImageUrl = product.images?.[0]?.src ?? null;

          // Fetch all variation pages for this variable product
          let varUrl: string | null =
            `${this.baseUrl}/products/${product.id}/variations?per_page=100`;

          while (varUrl) {
            const { data: varData, linkHeader: varLink } =
              await this.request(varUrl);
            const variations = varData as RawVariation[];

            for (const variation of variations) {
              const attrLabel = variation.attributes
                .map((a) => a.option)
                .join(" / ");
              page.push({
                id: variation.id,
                parentId: product.id,
                name: attrLabel
                  ? `${product.name} - ${attrLabel}`
                  : product.name,
                sku: variation.sku,
                regularPriceDollars: variation.regular_price,
                imageUrl: variation.images?.[0]?.src ?? parentImageUrl,
              });
            }

            varUrl = this.parseNextLink(varLink);
          }
        }
      }

      yield page;
      url = this.parseNextLink(linkHeader);
    }
  }
```

- [ ] **Step 16: Run test to verify it passes**

Run: `npx vitest run src/lib/woocommerce/client.test.ts`
Expected: PASS

- [ ] **Step 17: Update the WooCommerce syncProducts test for imageUrl persistence (write failing tests first)**

In `src/lib/woocommerce/syncProducts.test.ts`, update the `product()` helper (lines 16-25) to include a default `imageUrl`:

```ts
function product(over: Partial<WooNormalizedProduct> = {}): WooNormalizedProduct {
  return {
    id: 101,
    parentId: null,
    name: "Test Shirt",
    sku: "SHIRT-001",
    regularPriceDollars: "19.99",
    imageUrl: null,
    ...over,
  };
}
```

Update "creates a new simple product with correct fields" (lines 32-48):

```ts
  it("creates a new simple product with correct fields", async () => {
    const prisma = mockPrisma([]);
    const result = await syncWooProducts(prisma as never, "m1", [product()]);

    expect(prisma.product.create).toHaveBeenCalledWith({
      data: {
        merchantId: "m1",
        sku: "SHIRT-001",
        title: "Test Shirt",
        currentPrice: 1999,
        woocommerceVariantId: "101",
        woocommerceParentId: null,
        imageUrl: null,
        category: "WooCommerce",
      },
    });
    expect(result).toEqual({ created: 1, updated: 0, skipped: 0, skippedReasons: [] });
  });
```

Update "updates an existing product matched by SKU" (lines 80-97):

```ts
  it("updates an existing product matched by SKU", async () => {
    const prisma = mockPrisma([{ id: "p1", sku: "SHIRT-001" }]);
    const result = await syncWooProducts(prisma as never, "m1", [
      product({ id: 202, sku: "SHIRT-001", regularPriceDollars: "34.99" }),
    ]);

    expect(prisma.product.update).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: {
        title: "Test Shirt",
        currentPrice: 3499,
        woocommerceVariantId: "202",
        woocommerceParentId: null,
        imageUrl: null,
      },
    });
    expect(prisma.product.create).not.toHaveBeenCalled();
    expect(result).toEqual({ created: 0, updated: 1, skipped: 0, skippedReasons: [] });
  });
```

Add two new tests after the "Mixed batch" section (before "Empty input", i.e. after line 178):

```ts
  // ── Image URL persistence ─────────────────────────────────────────────────

  it("persists imageUrl from the product on create", async () => {
    const prisma = mockPrisma([]);
    await syncWooProducts(prisma as never, "m1", [
      product({ imageUrl: "https://example.com/photo.jpg" }),
    ]);

    expect(prisma.product.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ imageUrl: "https://example.com/photo.jpg" }),
      }),
    );
  });

  it("overwrites imageUrl on re-sync when the merchant's photo changed", async () => {
    const prisma = mockPrisma([{ id: "p1", sku: "SHIRT-001" }]);
    await syncWooProducts(prisma as never, "m1", [
      product({ sku: "SHIRT-001", imageUrl: "https://example.com/new-photo.jpg" }),
    ]);

    expect(prisma.product.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ imageUrl: "https://example.com/new-photo.jpg" }),
      }),
    );
  });
```

- [ ] **Step 18: Run test to verify it fails**

Run: `npx vitest run src/lib/woocommerce/syncProducts.test.ts`
Expected: FAIL — `imageUrl` missing from actual `create`/`update` call arguments.

- [ ] **Step 19: Implement imageUrl persistence in WooCommerce syncProducts**

In `src/lib/woocommerce/syncProducts.ts`, update both the update and create calls inside the `for (const p of withSku)` loop (lines 43-70):

```ts
    const existingId = skuToId.get(p.sku.toLowerCase());
    if (existingId) {
      await prisma.product.update({
        where: { id: existingId },
        data: {
          title: p.name,
          currentPrice,
          woocommerceVariantId,
          woocommerceParentId,
          imageUrl: p.imageUrl,
        },
      });
      touchedIds.push(existingId);
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
          imageUrl: p.imageUrl,
          category: "WooCommerce",
        },
      });
      created++;
    }
```

- [ ] **Step 20: Run test to verify it passes**

Run: `npx vitest run src/lib/woocommerce/syncProducts.test.ts`
Expected: PASS

- [ ] **Step 21: Full suite + typecheck, then commit the WooCommerce half**

Run: `npx vitest run` → all tests pass (not just the four files touched — confirms nothing else broke)
Run: `npx tsc --noEmit` → no new errors introduced by this task (the repo has a few pre-existing unrelated errors in `logout/route.test.ts`, `CogsInput.test.tsx`, and `shopify/client.test.ts`'s async-generator typing — none of those are touched by this plan)

```bash
git add src/lib/woocommerce/client.ts src/lib/woocommerce/client.test.ts src/lib/woocommerce/syncProducts.ts src/lib/woocommerce/syncProducts.test.ts
git commit -m "Sync product image URL from WooCommerce, with parent-image fallback for variations"
```

---

### Task 2: ProductThumbnail component + display in table and detail page

**Goal:** Show the product image (or fallback tile) next to each product's title in the dashboard table and the product detail page header.

**Files:**
- Create: `src/components/ProductThumbnail.tsx`
- Create: `src/components/ProductThumbnail.test.tsx`
- Modify: `src/app/api/products/route.ts` (include `imageUrl` in each row)
- Modify: `src/components/ProductsTable.tsx` (`Row` interface + render `ProductThumbnail`)
- Modify: `src/components/ProductsTable.test.tsx` (new thumbnail test case)
- Modify: `src/app/api/products/[id]/route.ts` (include `imageUrl` in the detail response)
- Modify: `src/app/product/[id]/page.tsx` (`Detail` interface + render `ProductThumbnail` in the header)

**Acceptance Criteria:**
- [ ] `ProductThumbnail` renders the image when `imageUrl` is present
- [ ] `ProductThumbnail` renders the fallback tile when `imageUrl` is `null`, and also falls back if the image fails to load (broken/moved URL)
- [ ] `ProductsTable` shows the thumbnail next to each product title, fed by `imageUrl` from `/api/products`
- [ ] Product detail page header shows the (larger) thumbnail next to the title, fed by `imageUrl` from `/api/products/[id]`
- [ ] CSV-only products consistently show the fallback tile, no layout shift or browser broken-image icon

**Verify:** `npx vitest run src/components/ProductThumbnail.test.tsx src/components/ProductsTable.test.tsx` → all pass

**Steps:**

- [ ] **Step 1: Write the ProductThumbnail test (write failing test first)**

Create `src/components/ProductThumbnail.test.tsx`:

```tsx
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ProductThumbnail } from "./ProductThumbnail";

afterEach(() => {
  cleanup();
});

describe("ProductThumbnail", () => {
  it("renders the image when imageUrl is present", () => {
    render(<ProductThumbnail imageUrl="https://example.com/photo.jpg" alt="Ceramic Mug" />);
    const img = screen.getByRole("img", { name: "Ceramic Mug" }) as HTMLImageElement;
    expect(img.src).toBe("https://example.com/photo.jpg");
  });

  it("renders the fallback tile when imageUrl is null", () => {
    render(<ProductThumbnail imageUrl={null} alt="Ceramic Mug" />);
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("renders the fallback tile after the image fails to load", () => {
    render(<ProductThumbnail imageUrl="https://example.com/broken.jpg" alt="Ceramic Mug" />);
    const img = screen.getByRole("img", { name: "Ceramic Mug" });
    fireEvent.error(img);
    expect(screen.queryByRole("img")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/ProductThumbnail.test.tsx`
Expected: FAIL with "Failed to resolve import './ProductThumbnail'" (component doesn't exist yet)

- [ ] **Step 3: Create the ProductThumbnail component**

Create `src/components/ProductThumbnail.tsx`:

```tsx
"use client";
import { useState } from "react";

export function ProductThumbnail({
  imageUrl,
  alt,
  size = 44,
}: {
  imageUrl: string | null;
  alt: string;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);

  if (!imageUrl || failed) {
    return (
      <div
        className="flex shrink-0 items-center justify-center rounded-lg border border-dashed border-line-strong bg-panel text-faint"
        style={{ width: size, height: size }}
        aria-hidden="true"
      >
        <svg width={size * 0.4} height={size * 0.4} viewBox="0 0 20 20" fill="none">
          <rect x="2" y="4" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="7" cy="9" r="1.5" fill="currentColor" />
          <path d="M4 14l4-4 3 3 3-4 4 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={alt}
      width={size}
      height={size}
      className="shrink-0 rounded-lg border border-line object-cover"
      style={{ width: size, height: size }}
      onError={() => setFailed(true)}
    />
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/ProductThumbnail.test.tsx`
Expected: PASS (all 3 cases)

- [ ] **Step 5: Commit**

```bash
git add src/components/ProductThumbnail.tsx src/components/ProductThumbnail.test.tsx
git commit -m "Add ProductThumbnail component with broken-image fallback"
```

- [ ] **Step 6: Add a failing ProductsTable test for the thumbnail (write failing test first)**

In `src/components/ProductsTable.test.tsx`, add `imageUrl` to the shared `ROWS` fixture (lines 7-34) so the existing rows carry a deterministic value, and add a new test. First, update `ROWS`:

```ts
const ROWS = [
  {
    id: "p1",
    title: "Ceramic Mug",
    sku: "MUG-008",
    currentPrice: 1500,
    cogs: 600,
    category: "kitchen",
    estUnits: 100,
    margin: 0.6,
    imageUrl: "https://example.com/mug.jpg",
    comparison: { compMedian: 1400, pctVsMedian: 0.07, competitorCount: 3 },
    recommendedAction: "hold" as const,
    suggestedPrice: 1500,
  },
  {
    id: "p2",
    title: "Steel Bottle",
    sku: "BTL-002",
    currentPrice: 2200,
    cogs: 900,
    category: "kitchen",
    estUnits: 50,
    margin: 0.59,
    imageUrl: null,
    comparison: { compMedian: 2250, pctVsMedian: -0.02, competitorCount: 2 },
    recommendedAction: "hold" as const,
    suggestedPrice: 2200,
  },
];
```

Then add a new test in the `describe("ProductsTable refresh states", ...)` block, right after the `"renders the table with an enabled refresh button after load"` test:

```ts
  it("shows a product thumbnail when imageUrl is present, and the fallback tile when it's null", async () => {
    stubFetch(async () => json({ refreshed: 0, failed: 0 }));
    await renderLoaded();
    expect(screen.getByRole("img", { name: "Ceramic Mug" })).toBeTruthy();
    expect(screen.queryByRole("img", { name: "Steel Bottle" })).toBeNull();
  });
```

- [ ] **Step 7: Run test to verify it fails**

Run: `npx vitest run src/components/ProductsTable.test.tsx`
Expected: FAIL — no `<img>` rendered yet (ProductsTable doesn't reference `imageUrl`)

- [ ] **Step 8: Add imageUrl to the /api/products response**

In `src/app/api/products/route.ts`, add `imageUrl: p.imageUrl` to the mapped row object (lines 28-47):

```ts
  const rows = products.map((p) => {
    let recommendedAction: "raise" | "lower" | "hold" | null = null;
    let suggestedPrice: number | null = null;
    if (p.recommendation) {
      recommendedAction = p.recommendation.action as "raise" | "lower" | "hold";
      try {
        const rules = JSON.parse(p.recommendation.rulesJson) as { suggestedPriceCents: number };
        suggestedPrice = rules.suggestedPriceCents ?? null;
      } catch {
        console.error(`[products] Failed to parse rulesJson for product ${p.id}`);
        recommendedAction = null;
      }
    }
    return {
      id: p.id,
      title: p.title,
      sku: p.sku,
      currentPrice: p.currentPrice,
      cogs: p.cogs,
      category: p.category,
      estUnits: p.estUnits,
      imageUrl: p.imageUrl,
      margin: marginPct(p.currentPrice, p.cogs),
      modelHealth: p.elasticityModel
        ? {
            r2: p.elasticityModel.r2,
            dataPoints: p.elasticityModel.dataPoints,
            confidenceScore: p.elasticityModel.confidenceScore,
          }
        : null,
      recommendedAction,
      suggestedPrice,
    };
  });
```

- [ ] **Step 9: Render ProductThumbnail in ProductsTable**

In `src/components/ProductsTable.tsx`, add `imageUrl: string | null;` to the `Row` interface (lines 8-20):

```ts
interface Row {
  id: string;
  title: string;
  sku: string;
  currentPrice: number;
  cogs: number | null;
  category: string;
  estUnits: number | null;
  imageUrl: string | null;
  margin: number | null;
  recommendedAction: "raise" | "lower" | "hold" | null;
  suggestedPrice: number | null;
  modelHealth: { r2: number; dataPoints: number; confidenceScore: number } | null;
}
```

Add the import at the top of the file (after the existing `CogsInput` import, line 5):

```ts
import { ProductThumbnail } from "./ProductThumbnail";
```

Update the Product column `<td>` (lines 217-225) to render the thumbnail next to the title/SKU stack:

```tsx
                  <td className="py-3 pr-3">
                    <div className="flex items-center gap-3">
                      <ProductThumbnail imageUrl={r.imageUrl} alt={r.title} size={32} />
                      <div>
                        <Link
                          className="font-medium text-ink underline-offset-2 hover:text-accent hover:underline"
                          href={`/product/${r.id}`}
                        >
                          {r.title}
                        </Link>
                        <div className="text-xs text-faint">{r.sku}</div>
                      </div>
                    </div>
                  </td>
```

- [ ] **Step 10: Run test to verify it passes**

Run: `npx vitest run src/components/ProductsTable.test.tsx`
Expected: PASS (all existing tests plus the new thumbnail test)

- [ ] **Step 11: Add imageUrl to the product detail API and page**

In `src/app/api/products/[id]/route.ts`, add `imageUrl: p.imageUrl` to the response (lines 14-19):

```ts
    return NextResponse.json({
      id: p.id,
      title: p.title,
      currentPrice: p.currentPrice,
      cogs: p.cogs,
      imageUrl: p.imageUrl,
    });
```

In `src/app/product/[id]/page.tsx`, add `imageUrl: string | null;` to the `Detail` interface (lines 14-19):

```ts
interface Detail {
  id: string;
  title: string;
  currentPrice: number;
  cogs: number | null;
  imageUrl: string | null;
}
```

Add the import (after the existing `AppShell` import, line 12):

```ts
import { ProductThumbnail } from "@/components/ProductThumbnail";
```

Update the `<header>` block (lines 178-195) to show the thumbnail next to the title:

```tsx
            <header>
              <Link
                href="/dashboard"
                className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted hover:text-ink"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <path d="M9 11L5 7l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Back to dashboard
              </Link>
              <div className="flex items-center gap-4">
                <ProductThumbnail imageUrl={d.imageUrl} alt={d.title} size={56} />
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight text-ink">{d.title}</h1>
                  <p className="mt-1 text-sm text-muted">
                    Current price{" "}
                    <span className="font-medium tabular text-ink">
                      {formatCents(d.currentPrice)}
                    </span>
                  </p>
                </div>
              </div>
            </header>
```

- [ ] **Step 12: Full suite + typecheck**

Run: `npx vitest run` → all tests pass
Run: `npx tsc --noEmit` → no new errors (same pre-existing unrelated errors as before, if any)

- [ ] **Step 13: Manual verification in the browser**

Start the dev server (`npm run dev` or the project's preview tooling), sign in as a merchant with at least one Shopify- or WooCommerce-synced product and one CSV-only product, and confirm:
- The synced product's photo appears at 32px next to its title in the products table
- The CSV-only product shows the dashed-border fallback tile in the table, same size, no broken-image icon
- Opening the synced product's detail page (`/product/[id]`) shows the same photo at 56px next to the `<h1>`

- [ ] **Step 14: Commit**

```bash
git add src/app/api/products/route.ts src/components/ProductsTable.tsx src/components/ProductsTable.test.tsx src/app/api/products/[id]/route.ts src/app/product/[id]/page.tsx
git commit -m "Show product thumbnail in products table and detail page"
```

---

## Post-implementation

After both tasks are done and merged, no production DB migration script is needed beyond the standard `prisma migrate deploy` (or equivalent) picking up the additive nullable column — same low-risk shape as the earlier no-card-trial and password-reset schema changes.
