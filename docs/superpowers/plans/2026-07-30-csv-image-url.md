# CSV Image URL Column Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:subagent-driven-development (recommended) or superpowers-extended-cc:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let CSV-only merchants optionally supply a product photo via a new `image_url` column in the product-catalog CSV upload, reusing the `Product.imageUrl` field and `ProductThumbnail` display already built for Shopify/WooCommerce.

**Architecture:** One new optional 7th column, backward compatible with existing 6-column CSVs, parsed by the existing `parseProductCsv.ts` and persisted by the existing `importProducts.ts`. No new schema, component, or API route — `Product.imageUrl` already exists and `ProductThumbnail` already renders it regardless of source.

**Tech Stack:** No new dependencies. Extends `src/lib/products/parseProductCsv.ts`, `src/lib/products/importProducts.ts`, `src/components/ProductUpload.tsx`.

**User decisions (already made):**
- Column name: `image_url`, appended as the 7th (last) column
- Validation: any absolute URL with `http:`/`https:` scheme — no image-file-extension requirement
- Invalid `image_url` rejects the whole row (same as invalid `current_price`/`cogs`/`est_units` today)
- The downloadable sample CSV includes the `image_url` header and one filled-in example row, other two rows left blank

Full design rationale: `docs/superpowers/specs/2026-07-30-csv-image-url-design.md`

---

### Task 1: Parse and persist the image_url column

**Goal:** `parseProductCsv.ts` accepts an optional 7th `image_url` column (backward compatible with 6-column CSVs), validates it as an absolute http(s) URL, and `importProducts.ts` persists it on both create and update.

**Files:**
- Modify: `src/lib/products/parseProductCsv.ts`
- Modify: `src/lib/products/parseProductCsv.test.ts`
- Modify: `src/lib/products/importProducts.ts`
- Modify: `src/lib/products/importProducts.test.ts`

**Acceptance Criteria:**
- [ ] A 6-column row (no `image_url`) still parses successfully with `imageUrl: null` — existing merchant CSVs are unaffected
- [ ] A 7-column row with a valid `http:`/`https:` URL parses with that URL as `imageUrl`
- [ ] A 7-column row with an empty `image_url` field parses with `imageUrl: null`
- [ ] A 7-column row with a malformed or non-http(s)-scheme `image_url` is rejected as a row error (`"invalid image_url"`), consistent with how bad `current_price`/`cogs`/`est_units` are already rejected
- [ ] Both the existing 6-column header and the new 7-column header (`...,image_url`) are correctly recognized and skipped as header rows
- [ ] `importProducts.ts` persists `imageUrl` on both the `create` and `update` Prisma calls; re-importing a CSV overwrites `imageUrl` if it changed

**Verify:** `npx vitest run src/lib/products/parseProductCsv.test.ts src/lib/products/importProducts.test.ts` → all pass

**Steps:**

- [ ] **Step 1: Replace `parseProductCsv.test.ts` with the updated + expanded test suite (write failing tests first)**

Replace the entire contents of `src/lib/products/parseProductCsv.test.ts` with:

```ts
import { describe, expect, it } from "vitest";
import { parseProductCsv } from "./parseProductCsv";

describe("parseProductCsv", () => {
  it("parses valid rows with dollars converted to cents and optional fields", () => {
    const csv = "TEE-100,Linen Shirt,49.99,Apparel,18.00,40\nMUG-200,Travel Mug,24.00,Drinkware,,";
    const { rows, errors } = parseProductCsv(csv);
    expect(errors).toEqual([]);
    expect(rows).toEqual([
      {
        line: 1,
        sku: "TEE-100",
        title: "Linen Shirt",
        currentPriceCents: 4999,
        category: "Apparel",
        cogsCents: 1800,
        estUnits: 40,
        imageUrl: null,
      },
      {
        line: 2,
        sku: "MUG-200",
        title: "Travel Mug",
        currentPriceCents: 2400,
        category: "Drinkware",
        cogsCents: null,
        estUnits: null,
        imageUrl: null,
      },
    ]);
  });

  it("skips a header row and blank lines, and handles CRLF", () => {
    const csv = "sku,title,current_price,category,cogs,est_units\r\nTEE-100,Linen Shirt,49.99,Apparel,18.00,40\r\n\r\n";
    const { rows, errors } = parseProductCsv(csv);
    expect(errors).toEqual([]);
    expect(rows).toEqual([
      {
        line: 2,
        sku: "TEE-100",
        title: "Linen Shirt",
        currentPriceCents: 4999,
        category: "Apparel",
        cogsCents: 1800,
        estUnits: 40,
        imageUrl: null,
      },
    ]);
  });

  it("reports malformed lines, missing fields, and bad numbers without throwing", () => {
    const csv = [
      "TEE-100,Linen Shirt,49.99,Apparel",   // line 1: only 4 columns
      ",Shirt,49.99,Apparel,,",              // line 2: empty sku
      "MUG-200,,24.00,Drinkware,,",          // line 3: empty title
      "MUG-200,Mug,abc,Drinkware,,",         // line 4: bad price
      "MUG-200,Mug,24.00,,,",                // line 5: empty category
      "MUG-200,Mug,24.00,Drinkware,xyz,",    // line 6: bad cogs
      "MUG-200,Mug,24.00,Drinkware,,1.5",    // line 7: non-integer est_units
    ].join("\n");
    const { rows, errors } = parseProductCsv(csv);
    expect(rows).toEqual([]);
    expect(errors.map((e) => e.line)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(errors[0].reason).toMatch(/6 or 7 columns/);
    expect(errors[1].reason).toMatch(/sku/i);
    expect(errors[2].reason).toMatch(/title/i);
    expect(errors[3].reason).toMatch(/price/i);
    expect(errors[4].reason).toMatch(/category/i);
    expect(errors[5].reason).toMatch(/cogs/i);
    expect(errors[6].reason).toMatch(/units/i);
  });

  it("rejects a zero or negative current price", () => {
    const csv = "TEE-100,Linen Shirt,0,Apparel,,";
    const { rows, errors } = parseProductCsv(csv);
    expect(rows).toEqual([]);
    expect(errors[0].reason).toMatch(/price/i);
  });

  // ── image_url column (7th, optional) ──────────────────────────────────────

  it("parses a valid image_url in the 7th column", () => {
    const csv = "TEE-100,Linen Shirt,49.99,Apparel,18.00,40,https://cdn.example.com/shirt.jpg";
    const { rows, errors } = parseProductCsv(csv);
    expect(errors).toEqual([]);
    expect(rows[0].imageUrl).toBe("https://cdn.example.com/shirt.jpg");
  });

  it("treats an empty image_url column as null", () => {
    const csv = "TEE-100,Linen Shirt,49.99,Apparel,18.00,40,";
    const { rows, errors } = parseProductCsv(csv);
    expect(errors).toEqual([]);
    expect(rows[0].imageUrl).toBeNull();
  });

  it("rejects a malformed image_url", () => {
    const csv = "TEE-100,Linen Shirt,49.99,Apparel,18.00,40,not-a-url";
    const { rows, errors } = parseProductCsv(csv);
    expect(rows).toEqual([]);
    expect(errors[0].reason).toMatch(/image_url/i);
  });

  it("rejects an image_url with a non-http(s) scheme", () => {
    const csv = "TEE-100,Linen Shirt,49.99,Apparel,18.00,40,ftp://example.com/shirt.jpg";
    const { rows, errors } = parseProductCsv(csv);
    expect(rows).toEqual([]);
    expect(errors[0].reason).toMatch(/image_url/i);
  });

  it("skips the 7-column header row (with image_url)", () => {
    const csv = "sku,title,current_price,category,cogs,est_units,image_url\nTEE-100,Linen Shirt,49.99,Apparel,18.00,40,https://cdn.example.com/shirt.jpg";
    const { rows, errors } = parseProductCsv(csv);
    expect(errors).toEqual([]);
    expect(rows).toHaveLength(1);
    expect(rows[0].line).toBe(2);
    expect(rows[0].imageUrl).toBe("https://cdn.example.com/shirt.jpg");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/products/parseProductCsv.test.ts`
Expected: FAIL — `imageUrl` missing from actual parsed rows, "6 columns" vs "6 or 7 columns" mismatch, new test cases erroring since `image_url` isn't parsed yet.

- [ ] **Step 3: Implement the image_url column in parseProductCsv.ts**

Replace the entire contents of `src/lib/products/parseProductCsv.ts` with:

```ts
import { dollarsToCents } from "../money";

export interface ParsedProductRow {
  line: number;
  sku: string;
  title: string;
  currentPriceCents: number;
  category: string;
  cogsCents: number | null;
  estUnits: number | null;
  imageUrl: string | null;
}

export interface RowError {
  line: number;
  raw: string;
  reason: string;
}

export interface ProductParseResult {
  rows: ParsedProductRow[];
  errors: RowError[];
}

const HEADER = "sku,title,current_price,category,cogs,est_units";
const HEADER_WITH_IMAGE = "sku,title,current_price,category,cogs,est_units,image_url";

/** Parse an optional integer-count field. Returns undefined when invalid. */
function parseCount(value: string): number | null | undefined {
  if (value === "") return null;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0) return undefined;
  return n;
}

/**
 * Parse the optional 7th image_url field. Returns null when absent/empty
 * (legacy 6-column rows destructure this as undefined), undefined when
 * present but not a valid http(s) URL.
 */
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

/** Parse a product-catalog CSV. Never throws; problems become RowErrors. */
export function parseProductCsv(input: string): ProductParseResult {
  const rows: ParsedProductRow[] = [];
  const errors: RowError[] = [];
  let sawFirstContentLine = false;

  input.split(/\r?\n/).forEach((raw, index) => {
    const line = index + 1;
    const trimmed = raw.trim();
    if (trimmed === "") return; // skip blank lines

    const fields = trimmed.split(",").map((f) => f.trim());

    // Skip a header row if it is the first non-blank line.
    if (!sawFirstContentLine) {
      sawFirstContentLine = true;
      const joined = fields.join(",").toLowerCase();
      if (joined === HEADER || joined === HEADER_WITH_IMAGE) return;
    }

    if (fields.length !== 6 && fields.length !== 7) {
      errors.push({ line, raw, reason: "malformed line: expected 6 or 7 columns" });
      return;
    }
    const [sku, title, priceStr, category, cogsStr, unitsStr, imageUrlStr] = fields;
    if (sku === "") {
      errors.push({ line, raw, reason: "missing sku" });
      return;
    }
    if (title === "") {
      errors.push({ line, raw, reason: "missing title" });
      return;
    }
    if (category === "") {
      errors.push({ line, raw, reason: "missing category" });
      return;
    }
    const currentPriceCents = dollarsToCents(priceStr);
    if (currentPriceCents === null || currentPriceCents <= 0) {
      errors.push({ line, raw, reason: "invalid current_price" });
      return;
    }
    const cogsCents = cogsStr === "" ? null : dollarsToCents(cogsStr);
    if (cogsStr !== "" && cogsCents === null) {
      errors.push({ line, raw, reason: "invalid cogs" });
      return;
    }
    const estUnits = parseCount(unitsStr);
    if (estUnits === undefined) {
      errors.push({ line, raw, reason: "invalid est_units" });
      return;
    }
    const imageUrl = parseImageUrl(imageUrlStr);
    if (imageUrl === undefined) {
      errors.push({ line, raw, reason: "invalid image_url" });
      return;
    }

    rows.push({
      line,
      sku,
      title,
      currentPriceCents,
      category,
      cogsCents: cogsCents ?? null,
      estUnits,
      imageUrl,
    });
  });

  return { rows, errors };
}
```

Note: for a 6-field row, destructuring `[sku, title, priceStr, category, cogsStr, unitsStr, imageUrlStr]` leaves `imageUrlStr` as `undefined` (JavaScript array destructuring past the array's length yields `undefined`) — `parseImageUrl` treats that identically to an empty string, returning `null`. This is what makes 6-column rows work unchanged.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/products/parseProductCsv.test.ts`
Expected: PASS (all cases, including the 5 new image_url ones)

- [ ] **Step 5: Replace importProducts.test.ts with the updated test suite (write failing tests first)**

Replace the entire contents of `src/lib/products/importProducts.test.ts` with:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { importProducts } from "./importProducts";
import type { ProductParseResult } from "./parseProductCsv";

function mockPrisma(existing: { id: string; sku: string }[]) {
  return {
    product: {
      findMany: vi.fn().mockResolvedValue(existing),
      create: vi.fn().mockResolvedValue({}),
      update: vi.fn().mockResolvedValue({}),
    },
    recommendation: { deleteMany: vi.fn().mockResolvedValue({}) },
  };
}

const parsed = (
  rows: ProductParseResult["rows"],
  errors: ProductParseResult["errors"] = [],
): ProductParseResult => ({ rows, errors });

const row = (over: Partial<ProductParseResult["rows"][number]> = {}) => ({
  line: 1,
  sku: "TEE-100",
  title: "Linen Shirt",
  currentPriceCents: 4999,
  category: "Apparel",
  cogsCents: 1800,
  estUnits: 40,
  imageUrl: null,
  ...over,
});

describe("importProducts", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates products whose sku is not yet in the merchant catalog", async () => {
    const prisma = mockPrisma([]);
    const result = await importProducts(prisma as never, "m1", parsed([row()]));

    expect(prisma.product.create).toHaveBeenCalledWith({
      data: {
        merchantId: "m1",
        sku: "TEE-100",
        title: "Linen Shirt",
        currentPrice: 4999,
        category: "Apparel",
        cogs: 1800,
        estUnits: 40,
        imageUrl: null,
      },
    });
    expect(prisma.product.update).not.toHaveBeenCalled();
    expect(result.inserted).toBe(1);
    expect(result.updated).toBe(0);
  });

  it("updates an existing product matched by sku and invalidates its recommendation", async () => {
    const prisma = mockPrisma([{ id: "p1", sku: "TEE-100" }]);
    const result = await importProducts(
      prisma as never,
      "m1",
      parsed([row({ currentPriceCents: 5200, cogsCents: null, estUnits: null })]),
    );

    expect(prisma.product.update).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: {
        title: "Linen Shirt",
        currentPrice: 5200,
        category: "Apparel",
        cogs: null,
        estUnits: null,
        imageUrl: null,
      },
    });
    expect(prisma.product.create).not.toHaveBeenCalled();
    expect(prisma.recommendation.deleteMany).toHaveBeenCalledWith({
      where: { productId: { in: ["p1"] } },
    });
    expect(result.inserted).toBe(0);
    expect(result.updated).toBe(1);
  });

  it("does not invalidate recommendations when nothing was updated", async () => {
    const prisma = mockPrisma([]);
    await importProducts(prisma as never, "m1", parsed([row()]));
    expect(prisma.recommendation.deleteMany).not.toHaveBeenCalled();
  });

  it("carries parser errors through into the summary", async () => {
    const prisma = mockPrisma([]);
    const result = await importProducts(
      prisma as never,
      "m1",
      parsed([], [{ line: 3, raw: "bad,row", reason: "malformed line: expected 6 or 7 columns" }]),
    );
    expect(result.skipped).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(prisma.product.create).not.toHaveBeenCalled();
  });

  // ── image_url persistence ─────────────────────────────────────────────────

  it("persists imageUrl from the row on create", async () => {
    const prisma = mockPrisma([]);
    await importProducts(
      prisma as never,
      "m1",
      parsed([row({ imageUrl: "https://cdn.example.com/shirt.jpg" })]),
    );

    expect(prisma.product.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ imageUrl: "https://cdn.example.com/shirt.jpg" }),
      }),
    );
  });

  it("overwrites imageUrl on re-import when it changed", async () => {
    const prisma = mockPrisma([{ id: "p1", sku: "TEE-100" }]);
    await importProducts(
      prisma as never,
      "m1",
      parsed([row({ imageUrl: "https://cdn.example.com/new-shirt.jpg" })]),
    );

    expect(prisma.product.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ imageUrl: "https://cdn.example.com/new-shirt.jpg" }),
      }),
    );
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npx vitest run src/lib/products/importProducts.test.ts`
Expected: FAIL — `imageUrl` missing from actual `create`/`update` call arguments.

- [ ] **Step 7: Implement imageUrl persistence in importProducts.ts**

In `src/lib/products/importProducts.ts`, update both the `update` and `create` calls inside the `for (const r of parsed.rows)` loop:

```ts
  const touched: string[] = [];
  for (const r of parsed.rows) {
    const id = skuToId.get(r.sku);
    if (id) {
      await prisma.product.update({
        where: { id },
        data: {
          title: r.title,
          currentPrice: r.currentPriceCents,
          category: r.category,
          cogs: r.cogsCents,
          estUnits: r.estUnits,
          imageUrl: r.imageUrl,
        },
      });
      touched.push(id);
      updated++;
    } else {
      await prisma.product.create({
        data: {
          merchantId,
          sku: r.sku,
          title: r.title,
          currentPrice: r.currentPriceCents,
          category: r.category,
          cogs: r.cogsCents,
          estUnits: r.estUnits,
          imageUrl: r.imageUrl,
        },
      });
      inserted++;
    }
  }
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npx vitest run src/lib/products/importProducts.test.ts`
Expected: PASS

- [ ] **Step 9: Full suite + typecheck, then commit**

Run: `npx vitest run` → all tests pass
Run: `npx tsc --noEmit` → no new errors introduced (repo has a small number of pre-existing unrelated errors in `src/app/api/auth/logout/route.test.ts`, `src/components/CogsInput.test.tsx`, and an async-generator typing issue in `src/lib/shopify/client.test.ts` — none of those are files this task touches)

```bash
git add src/lib/products/parseProductCsv.ts src/lib/products/parseProductCsv.test.ts src/lib/products/importProducts.ts src/lib/products/importProducts.test.ts
git commit -m "Support optional image_url column in CSV product import"
```

---

### Task 2: Update the CSV upload UI hint and sample template

**Goal:** Merchants using the "Choose CSV" upload see `image_url` documented in the column hint, and the downloadable sample CSV demonstrates the format with one filled-in example row.

**Files:**
- Modify: `src/components/ProductUpload.tsx`

**Acceptance Criteria:**
- [ ] The column-hint text lists `image_url` as the 7th column
- [ ] The downloadable sample CSV's header row includes `image_url`
- [ ] Exactly one of the three sample data rows has a real, working example URL in its `image_url` field; the other two are blank
- [ ] All existing `ProductUpload.test.tsx` tests still pass unchanged (none of them assert on the hint text or sample CSV content, so no test file changes are needed for this task)

**Verify:** `npx vitest run src/components/ProductUpload.test.tsx` → all pass (no new tests needed — this task changes static text/data, not behavior)

**Steps:**

- [ ] **Step 1: Update the column hint and sample CSV**

In `src/components/ProductUpload.tsx`, update the `SAMPLE_CSV` constant (lines 11-15):

```ts
const SAMPLE_CSV =
  "sku,title,current_price,category,cogs,est_units,image_url\n" +
  "SKU-001,Wireless Headphones,79.99,Electronics,28.00,120,https://picsum.photos/seed/headphones/400\n" +
  "SKU-002,Leather Wallet,34.99,Accessories,9.00,200,\n" +
  "SKU-003,Yoga Mat,42.99,Fitness,13.50,95,\n";
```

Update the column-hint text (line 58):

```tsx
            <span className="font-mono">sku, title, current_price, category, cogs, est_units, image_url</span>
```

- [ ] **Step 2: Run the existing test suite to confirm nothing broke**

Run: `npx vitest run src/components/ProductUpload.test.tsx`
Expected: PASS (all 7 existing tests — none of them assert on hint text or sample CSV content, so this is a regression check, not new coverage)

- [ ] **Step 3: Full suite + typecheck**

Run: `npx vitest run` → all tests pass
Run: `npx tsc --noEmit` → no new errors

- [ ] **Step 4: Manual verification in the browser**

Start the dev server, open the dashboard's Products tab, click "Download template", and confirm the downloaded `product_catalog_template.csv` opens with the `image_url` column present and the Wireless Headphones row's URL loading as a real image if pasted into a browser tab. Then upload that same template file via "Choose CSV" and confirm all 3 rows import successfully (3 added, 0 skipped) — importing the sample data validates the new column end-to-end, not just in isolation.

- [ ] **Step 5: Commit**

```bash
git add src/components/ProductUpload.tsx
git commit -m "Document image_url column in CSV upload hint and sample template"
```

---

## Post-implementation

No schema or migration changes — this task only touches parsing and UI text, reusing the `Product.imageUrl` column and `ProductThumbnail` display already shipped. No production deployment risk beyond the usual code push.
