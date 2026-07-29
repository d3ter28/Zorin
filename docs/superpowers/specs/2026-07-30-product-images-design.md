# Product Images Design

## Goal

Show each product's photo next to its title in the products table and product detail page, for merchants connected via Shopify or WooCommerce. Purely a quality-of-life identification aid — CSV-only merchants (no platform connection) simply see a neutral fallback tile, no functional change for them.

## Architecture

One nullable column on `Product` (`imageUrl`), populated as a side effect of the existing Shopify/WooCommerce sync calls — no new API calls, no image storage/hosting of our own. The stored value is always the platform's own CDN URL string; Zorin never downloads or re-hosts image bytes. Rendering uses a plain `<img>` tag (not `next/image`) because WooCommerce images can live on arbitrary self-hosted domains that can't be allowlisted ahead of time via `next.config`'s `images.remotePatterns`.

**Tech Stack:** No new dependencies. Extends the existing Shopify (`src/lib/shopify/`) and WooCommerce (`src/lib/woocommerce/`) sync pipelines and the existing `/api/products` routes.

## User Decisions (already made)

- Thumbnail style: 44px rounded square, with a dashed-border icon tile as the no-image fallback (chosen via visual mockup, Option C)
- Placement: next to the product title in the dashboard products table, and in the product detail page (`/product/[id]`) header — no other locations
- WooCommerce variable products: variations without their own photo inherit the parent product's image; if neither has one, the fallback tile is fine — no special-casing needed, no per-variant photo guarantee expected

---

## Section 1 — Data Model

Add to `Product` (both `prisma/schema.prisma` and `prisma/schema.production.prisma`, kept in sync):

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
  imageUrl             String?          // Shopify/WooCommerce product photo CDN URL; null for CSV-only products
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

No migration concerns beyond the usual `prisma db push` in dev / production migration on deploy — this mirrors the no-card-trial change in that it's an additive, nullable column with no backfill needed (existing rows just get `null`, matching CSV-only behavior).

---

## Section 2 — Shopify Fetch + Sync

**`src/lib/shopify/client.ts`:** Shopify's `GET /admin/api/{version}/products.json` response already includes each product's featured image at `product.image.src` (a string, or the `image` key is absent/null if the product has no photo). Extend the variant shape returned by `fetchAllProducts()`:

```ts
export interface ShopifyVariant {
  id: number;
  product_id: number;
  title: string;
  product_title: string;
  sku: string;
  price: string;
  inventory_quantity: number;
  imageUrl: string | null;   // product.image.src, or null if the product has no photo
}
```

Update the internal `RawProduct` type to include an optional `image?: { src: string }` field, and in the `flatMap` inside `fetchAllProducts()`, set `imageUrl: product.image?.src ?? null` on every variant of that product (all variants of one Shopify product share the same parent photo — Shopify doesn't support per-variant images in the REST Admin API used here).

**`src/lib/shopify/syncProducts.ts`:** Pass `imageUrl` through on both the create and update paths:

```ts
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
  ...
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
  ...
}
```

This means `imageUrl` is overwritten on every sync — if a merchant changes their product photo in Shopify, the next manual sync picks it up, matching how `title`/`currentPrice` already behave.

---

## Section 3 — WooCommerce Fetch + Sync

**`src/lib/woocommerce/client.ts`:** The WooCommerce REST API v3 `/products` endpoint returns an `images` array per product (`images: [{ src: "..." }, ...]`, empty array if no photo). The `/products/{id}/variations` endpoint returns the same `images` array per variation, but it's commonly empty even when the parent product has a photo — variations inherit visually from the parent in the WooCommerce admin unless a merchant explicitly sets a per-variation image.

Extend the normalized shape:

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

Update `RawProduct` and `RawVariation` to include an optional `images?: Array<{ src: string }>` field. In `fetchAllProducts()`:

- For simple products: `imageUrl: product.images?.[0]?.src ?? null`.
- For variable products: compute the parent's image once (`const parentImageUrl = product.images?.[0]?.src ?? null`), then for each variation: `imageUrl: variation.images?.[0]?.src ?? parentImageUrl` — the variation's own image wins if WooCommerce returns one, otherwise it falls back to the parent product's photo.

**`src/lib/woocommerce/syncProducts.ts`:** Same pattern as Shopify — pass `imageUrl: p.imageUrl` through on both the `update` and `create` calls in `syncWooProducts()`.

---

## Section 4 — Display

**New component `src/components/ProductThumbnail.tsx`:**

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

The `onError` handler is what makes a dead/moved image (merchant deleted the photo after the last sync, CDN hiccup) degrade to the fallback tile instead of the browser's broken-image icon.

**`src/app/api/products/route.ts`:** Add `imageUrl: p.imageUrl` to the mapped row shape.

**`src/components/ProductsTable.tsx`:** Add `imageUrl: string | null` to the `Row` interface. Render `<ProductThumbnail imageUrl={r.imageUrl} alt={r.title} size={32} />` inside the Product column's `<td>`, to the left of the title/SKU stack (smaller than the detail-page version — 32px reads better inline in a dense table row than the full 44px).

**`src/app/api/products/[id]/route.ts`:** Add `imageUrl` to the detail response.

**`src/app/product/[id]/page.tsx`:** Add `imageUrl: string | null` to the `Detail` interface. Render `<ProductThumbnail imageUrl={d.imageUrl} alt={d.title} size={56} />` next to the `<h1>{d.title}</h1>` in the header (56px — this is the one page where a bigger, clearer photo is worth the space).

---

## Section 5 — Testing

- **`src/lib/shopify/syncProducts.test.ts`:** add cases — imageUrl set on create, imageUrl updated on re-sync when it changed, imageUrl stays null when Shopify returns no `image` key.
- **`src/lib/woocommerce/syncProducts.test.ts`:** add cases — imageUrl set for simple products, variation with its own image uses that, variation without its own image inherits the parent's, both null when neither has a photo.
- **`src/components/ProductThumbnail.test.tsx`** (new): renders the `<img>` when `imageUrl` is present, renders the fallback tile when `imageUrl` is null, and renders the fallback tile after the `<img>`'s `onError` fires (simulate via `fireEvent.error`).
- **`src/components/ProductsTable.test.tsx`** (existing): add a case asserting the thumbnail renders per row from `imageUrl` in the API response, without breaking the existing column layout/tests.

No changes needed to CSV upload logic, sales-record ingestion, elasticity modeling, or price-push — this feature is purely additive display data.
