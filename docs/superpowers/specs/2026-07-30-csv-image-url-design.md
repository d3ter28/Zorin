# CSV Image URL Column Design

## Goal

Let CSV-only merchants (no Shopify/WooCommerce connection) optionally supply a product photo by pasting a URL into a new `image_url` column in the product-catalog CSV upload, reusing the `Product.imageUrl` field and `ProductThumbnail` display already built for Shopify/WooCommerce-synced products.

## Architecture

A single new optional column appended to the existing 6-column CSV format, parsed by the same `parseProductCsv.ts` and persisted by the same `importProducts.ts` that already handle the other five optional/required fields. No new component, no new API route, no new schema — `Product.imageUrl` already exists and `ProductThumbnail` already renders whatever is in it, regardless of source.

**Tech Stack:** No new dependencies. Extends `src/lib/products/parseProductCsv.ts`, `src/lib/products/importProducts.ts`, `src/components/ProductUpload.tsx`.

## User Decisions (already made)

- Column name: `image_url`, appended as the 7th (last) column — preserves backward compatibility with existing 6-column CSVs merchants may already have saved
- Validation: any absolute URL with an `http:`/`https:` scheme — no requirement that the path look like an image file, since real CDN URLs (e.g. Cloudinary-style transforms) often lack a file extension
- Invalid `image_url` rejects the whole row (consistent with how invalid `current_price`/`cogs`/`est_units` already behave) — no separate soft-warning path
- The downloadable sample CSV includes the `image_url` header and one filled-in example row (a working placeholder image URL), with the other two sample rows left blank to signal the column is optional per-row, not all-or-nothing

---

## Section 1 — Parsing (`src/lib/products/parseProductCsv.ts`)

**Column count:** currently `fields.length !== 6` rejects the row outright. Change to accept 6 OR 7 fields:

```ts
if (fields.length !== 6 && fields.length !== 7) {
  errors.push({ line, raw, reason: "malformed line: expected 6 or 7 columns" });
  return;
}
const [sku, title, priceStr, category, cogsStr, unitsStr, imageUrlStr] = fields;
```

(Destructuring a 6-field array still leaves `imageUrlStr` as `undefined`, which the parsing step below treats the same as an empty string.)

**Header detection:** currently compares the first content line against a single `HEADER` constant. Add a second constant and check against either:

```ts
const HEADER = "sku,title,current_price,category,cogs,est_units";
const HEADER_WITH_IMAGE = "sku,title,current_price,category,cogs,est_units,image_url";

// in the header-skip check:
const joined = fields.join(",").toLowerCase();
if (joined === HEADER || joined === HEADER_WITH_IMAGE) return;
```

**Field validation:** empty `imageUrlStr` (or `undefined`, for legacy 6-field rows) → `imageUrl: null`. Non-empty → must construct successfully via `new URL(...)` with protocol `http:` or `https:`, otherwise the row is rejected:

```ts
function parseImageUrl(value: string | undefined): string | null | undefined {
  if (value === undefined || value === "") return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return undefined;
    return value;
  } catch {
    return undefined;
  }
}
```

(`undefined` return signals "invalid" — same sentinel convention `parseCount` already uses for `est_units`.)

Wire into the row-building logic:

```ts
const imageUrl = parseImageUrl(imageUrlStr);
if (imageUrl === undefined) {
  errors.push({ line, raw, reason: "invalid image_url" });
  return;
}
```

Add `imageUrl: string | null` to `ParsedProductRow`, and include it in the pushed row object.

## Section 2 — Persistence (`src/lib/products/importProducts.ts`)

Add `imageUrl: r.imageUrl` to both the `update` and `create` Prisma calls, alongside the existing fields — identical pattern to how Shopify/WooCommerce sync already persist `imageUrl`. Re-importing a CSV overwrites `imageUrl` the same way it already overwrites `title`/`currentPrice`/etc.

## Section 3 — UI (`src/components/ProductUpload.tsx`)

Update the column-hint text:

```tsx
<span className="font-mono">sku, title, current_price, category, cogs, est_units, image_url</span>
```

Update the sample CSV constant — one row gets a real, working placeholder image URL; the other two stay blank:

```ts
const SAMPLE_CSV =
  "sku,title,current_price,category,cogs,est_units,image_url\n" +
  "SKU-001,Wireless Headphones,79.99,Electronics,28.00,120,https://picsum.photos/seed/headphones/400\n" +
  "SKU-002,Leather Wallet,34.99,Accessories,9.00,200,\n" +
  "SKU-003,Yoga Mat,42.99,Fitness,13.50,95,\n";
```

## Section 4 — Testing

- **`parseProductCsv.test.ts`**: add cases — valid `image_url` parses through; empty column ⇒ `null`; invalid URL (malformed, non-http(s) scheme) ⇒ row rejected with `"invalid image_url"`; a legacy 6-column row (no `image_url` at all) still parses successfully with `imageUrl: null`; the 7-column header variant is correctly skipped as a header row.
- **`importProducts.test.ts`**: add cases — `imageUrl` persisted on create, `imageUrl` persisted/overwritten on update via re-import.

No changes needed to `ProductThumbnail`, `/api/products`, `ProductsTable.tsx`, or the product detail page — they already render whatever `Product.imageUrl` holds, regardless of whether it came from Shopify, WooCommerce, or CSV.
