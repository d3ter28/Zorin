# CSV Competitor Price Ingestion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace seeded competitor prices with real prices a merchant uploads as CSV, via a pure parser, a DB application step that upserts prices and invalidates affected recommendations, a `POST /api/ingest` endpoint, and a minimal upload UI.

**Architecture:** A pure `parseCsv` (string → rows + errors, never throws) feeds `applyIngest` (matches rows to products by SKU, upserts one `CompetitorPrice` per product+competitor, deletes stale recommendations, returns a summary). A thin `text/csv` route wraps both with the existing `withErrorHandling`. A client upload component POSTs file text and shows the summary.

**Tech Stack:** Next.js 16 (App Router), Prisma 7 + better-sqlite3 adapter, Vitest, TypeScript, Tailwind.

**Spec:** `docs/specs/2026-06-29-csv-competitor-ingestion-design.md`

**Conventions for this codebase (read before starting):**
- Money is stored as integer **cents**.
- API routes are wrapped with `withErrorHandling` from `src/lib/api/errors.ts`; throw `HttpError(status, msg)` for client errors.
- Tests live next to source as `*.test.ts`. `@/` resolves to `src/` in both app and tests (see `vitest.config.ts`).
- Prisma 7 needs the driver adapter (already configured in `src/lib/db.ts`); the datasource URL is hardcoded in `prisma.config.ts`.
- This is **not** the Next.js in your training data — if you touch routing/request APIs, check `node_modules/next/dist/docs/`.

---

### Task 1: Add the uniqueness constraint for upserts

**Files:**
- Modify: `prisma/schema.prisma` (the `CompetitorPrice` model)

- [ ] **Step 1: Add the compound unique constraint**

In `prisma/schema.prisma`, add a `@@unique` line to the `CompetitorPrice` model so it reads:

```prisma
model CompetitorPrice {
  id             String   @id @default(cuid())
  productId      String
  product        Product  @relation(fields: [productId], references: [id])
  competitorName String
  competitorUrl  String?
  price          Int
  observedAt     DateTime @default(now())

  @@unique([productId, competitorName])
}
```

- [ ] **Step 2: Create and apply the migration**

Run: `npx prisma migrate dev --name add_competitorprice_unique`
Expected: migration created under `prisma/migrations/...`, applied to `dev.db`, and "Generated Prisma Client" printed. (The current seed creates one row per product+competitor, so there are no duplicates to block the index.)

- [ ] **Step 3: Verify the client picks up the compound key**

Run: `npx prisma generate`
Expected: success. The generated client now exposes a `productId_competitorName` compound unique input used by upsert in Task 4.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat: add unique (productId, competitorName) to CompetitorPrice"
```

---

### Task 2: `dollarsToCents` money helper

**Files:**
- Modify: `src/lib/money.ts`
- Test: `src/lib/money.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `src/lib/money.test.ts`:

```ts
import { dollarsToCents } from "./money";

describe("dollarsToCents", () => {
  it("parses dollar strings to integer cents", () => {
    expect(dollarsToCents("28.50")).toBe(2850);
    expect(dollarsToCents("30")).toBe(3000);
    expect(dollarsToCents("19.99")).toBe(1999);
    expect(dollarsToCents("0")).toBe(0);
    expect(dollarsToCents(12.5)).toBe(1250);
  });

  it("returns null for invalid or negative input", () => {
    expect(dollarsToCents("abc")).toBeNull();
    expect(dollarsToCents("")).toBeNull();
    expect(dollarsToCents("  ")).toBeNull();
    expect(dollarsToCents("-5")).toBeNull();
    expect(dollarsToCents(-1)).toBeNull();
    expect(dollarsToCents(NaN)).toBeNull();
  });
});
```

(If `money.test.ts` has no `describe`/`import` for vitest yet, ensure the file imports `{ describe, expect, it } from "vitest"` at the top — check the existing first lines before adding.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/money.test.ts`
Expected: FAIL — `dollarsToCents is not a function` / no export.

- [ ] **Step 3: Implement**

Append to `src/lib/money.ts`:

```ts
/** Parse a dollar amount (string or number) to integer cents. Null if invalid or negative. */
export function dollarsToCents(value: string | number): number | null {
  if (typeof value === "string" && value.trim() === "") return null;
  const n = typeof value === "number" ? value : Number(value.trim());
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/money.test.ts`
Expected: PASS (existing money tests still pass too).

- [ ] **Step 5: Commit**

```bash
git add src/lib/money.ts src/lib/money.test.ts
git commit -m "feat: add dollarsToCents money helper"
```

---

### Task 3: `parseCsv` pure parser

**Files:**
- Create: `src/lib/ingest/parseCsv.ts`
- Test: `src/lib/ingest/parseCsv.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/ingest/parseCsv.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { parseCsv } from "./parseCsv";

describe("parseCsv", () => {
  it("parses valid rows with dollars converted to cents", () => {
    const csv = "TEE-001,RivalShop,28.50\nBOT-003,MarketCo,22.00";
    const { rows, errors } = parseCsv(csv);
    expect(errors).toEqual([]);
    expect(rows).toEqual([
      { line: 1, sku: "TEE-001", competitorName: "RivalShop", priceCents: 2850 },
      { line: 2, sku: "BOT-003", competitorName: "MarketCo", priceCents: 2200 },
    ]);
  });

  it("skips a header row and blank lines, and handles CRLF", () => {
    const csv = "sku,competitor_name,price\r\nTEE-001,RivalShop,30\r\n\r\n";
    const { rows, errors } = parseCsv(csv);
    expect(errors).toEqual([]);
    expect(rows).toEqual([
      { line: 2, sku: "TEE-001", competitorName: "RivalShop", priceCents: 3000 },
    ]);
  });

  it("reports malformed lines, missing fields, and bad prices without throwing", () => {
    const csv = [
      "TEE-001,RivalShop",            // line 1: only 2 columns
      ",MarketCo,10.00",              // line 2: empty sku
      "BOT-003,,10.00",               // line 3: empty competitor
      "BOT-003,PriceLeader,abc",      // line 4: bad price
      "BOT-003,PriceLeader,-5",       // line 5: negative price
    ].join("\n");
    const { rows, errors } = parseCsv(csv);
    expect(rows).toEqual([]);
    expect(errors.map((e) => e.line)).toEqual([1, 2, 3, 4, 5]);
    expect(errors[0].reason).toMatch(/3 columns/);
    expect(errors[1].reason).toMatch(/sku/i);
    expect(errors[3].reason).toMatch(/price/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/ingest/parseCsv.test.ts`
Expected: FAIL — cannot find module `./parseCsv`.

- [ ] **Step 3: Implement**

Create `src/lib/ingest/parseCsv.ts`:

```ts
import { dollarsToCents } from "../money";

export interface ParsedRow {
  line: number;
  sku: string;
  competitorName: string;
  priceCents: number;
}

export interface RowError {
  line: number;
  raw: string;
  reason: string;
}

export interface ParseResult {
  rows: ParsedRow[];
  errors: RowError[];
}

const HEADER = "sku,competitor_name,price";

/** Parse competitor-price CSV text. Never throws; problems become RowErrors. */
export function parseCsv(input: string): ParseResult {
  const rows: ParsedRow[] = [];
  const errors: RowError[] = [];

  input.split(/\r?\n/).forEach((raw, index) => {
    const line = index + 1;
    const trimmed = raw.trim();
    if (trimmed === "") return; // skip blank lines

    const fields = trimmed.split(",").map((f) => f.trim());
    if (index === 0 && fields.join(",").toLowerCase() === HEADER) return; // skip header

    if (fields.length !== 3) {
      errors.push({ line, raw, reason: "malformed line: expected 3 columns" });
      return;
    }
    const [sku, competitorName, priceStr] = fields;
    if (sku === "" || competitorName === "") {
      errors.push({ line, raw, reason: "missing sku or competitor_name" });
      return;
    }
    const priceCents = dollarsToCents(priceStr);
    if (priceCents === null) {
      errors.push({ line, raw, reason: "invalid price" });
      return;
    }
    rows.push({ line, sku, competitorName, priceCents });
  });

  return { rows, errors };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/ingest/parseCsv.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/ingest/parseCsv.ts src/lib/ingest/parseCsv.test.ts
git commit -m "feat: add pure CSV competitor-price parser"
```

---

### Task 4: `applyIngest` DB application

**Files:**
- Create: `src/lib/ingest/applyIngest.ts`
- Test: `src/lib/ingest/applyIngest.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/ingest/applyIngest.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { applyIngest } from "./applyIngest";
import type { ParseResult } from "./parseCsv";

function mockPrisma(opts: {
  products: { id: string; sku: string }[];
  existing?: { productId: string; competitorName: string }[];
}) {
  return {
    product: { findMany: vi.fn().mockResolvedValue(opts.products) },
    competitorPrice: {
      findMany: vi.fn().mockResolvedValue(opts.existing ?? []),
      upsert: vi.fn().mockResolvedValue({}),
    },
    recommendation: { deleteMany: vi.fn().mockResolvedValue({}) },
  };
}

const parsed = (rows: ParseResult["rows"], errors: ParseResult["errors"] = []): ParseResult => ({
  rows,
  errors,
});

describe("applyIngest", () => {
  beforeEach(() => vi.clearAllMocks());

  it("upserts each matched row and counts inserts vs updates", async () => {
    const prisma = mockPrisma({
      products: [{ id: "p1", sku: "TEE-001" }],
      existing: [{ productId: "p1", competitorName: "RivalShop" }],
    });
    const result = await applyIngest(prisma as never, parsed([
      { line: 1, sku: "TEE-001", competitorName: "RivalShop", priceCents: 2850 }, // exists -> update
      { line: 2, sku: "TEE-001", competitorName: "MarketCo", priceCents: 3000 },  // new -> insert
    ]));

    expect(prisma.competitorPrice.upsert).toHaveBeenCalledTimes(2);
    expect(prisma.competitorPrice.upsert).toHaveBeenCalledWith({
      where: { productId_competitorName: { productId: "p1", competitorName: "RivalShop" } },
      create: { productId: "p1", competitorName: "RivalShop", price: 2850 },
      update: expect.objectContaining({ price: 2850 }),
    });
    expect(result.inserted).toBe(1);
    expect(result.updated).toBe(1);
    expect(result.errors).toEqual([]);
  });

  it("invalidates recommendations only for touched products", async () => {
    const prisma = mockPrisma({ products: [{ id: "p1", sku: "TEE-001" }] });
    await applyIngest(prisma as never, parsed([
      { line: 1, sku: "TEE-001", competitorName: "RivalShop", priceCents: 2850 },
    ]));
    expect(prisma.recommendation.deleteMany).toHaveBeenCalledWith({
      where: { productId: { in: ["p1"] } },
    });
  });

  it("reports unknown SKUs as skipped errors and does not upsert them", async () => {
    const prisma = mockPrisma({ products: [] });
    const result = await applyIngest(prisma as never, parsed([
      { line: 1, sku: "NOPE-999", competitorName: "RivalShop", priceCents: 2850 },
    ]));
    expect(prisma.competitorPrice.upsert).not.toHaveBeenCalled();
    expect(prisma.recommendation.deleteMany).not.toHaveBeenCalled();
    expect(result.inserted).toBe(0);
    expect(result.skipped).toBe(1);
    expect(result.errors[0]).toMatchObject({ line: 1, reason: expect.stringMatching(/unknown sku/i) });
  });

  it("carries parser errors through into the summary", async () => {
    const prisma = mockPrisma({ products: [] });
    const result = await applyIngest(prisma as never, parsed([], [
      { line: 4, raw: "bad,row,abc", reason: "invalid price" },
    ]));
    expect(result.skipped).toBe(1);
    expect(result.errors).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/ingest/applyIngest.test.ts`
Expected: FAIL — cannot find module `./applyIngest`.

- [ ] **Step 3: Implement**

Create `src/lib/ingest/applyIngest.ts`:

```ts
import type { PrismaClient } from "@prisma/client";
import type { ParseResult, RowError } from "./parseCsv";

export interface IngestSummary {
  inserted: number;
  updated: number;
  skipped: number; // unknown-sku rows + parser errors
  errors: RowError[];
}

/** Minimal Prisma surface this function needs (real client is assignable). */
type PrismaSurface = Pick<
  PrismaClient,
  "product" | "competitorPrice" | "recommendation"
>;

/** Apply parsed rows: upsert competitor prices, invalidate touched recommendations. */
export async function applyIngest(
  prisma: PrismaSurface,
  parsed: ParseResult,
): Promise<IngestSummary> {
  const errors: RowError[] = [...parsed.errors];
  let inserted = 0;
  let updated = 0;

  if (parsed.rows.length === 0) {
    return { inserted, updated, skipped: errors.length, errors };
  }

  const skus = [...new Set(parsed.rows.map((r) => r.sku))];
  const products = await prisma.product.findMany({ where: { sku: { in: skus } } });
  const skuToId = new Map(products.map((p) => [p.sku, p.id]));
  const productIds = [...new Set(products.map((p) => p.id))];

  const existing = productIds.length
    ? await prisma.competitorPrice.findMany({ where: { productId: { in: productIds } } })
    : [];
  const existingKeys = new Set(
    existing.map((c) => `${c.productId}::${c.competitorName}`),
  );

  const touched = new Set<string>();
  for (const row of parsed.rows) {
    const productId = skuToId.get(row.sku);
    if (!productId) {
      errors.push({ line: row.line, raw: row.sku, reason: `unknown sku: ${row.sku}` });
      continue;
    }
    const key = `${productId}::${row.competitorName}`;
    if (existingKeys.has(key)) updated++;
    else inserted++;

    await prisma.competitorPrice.upsert({
      where: {
        productId_competitorName: { productId, competitorName: row.competitorName },
      },
      create: { productId, competitorName: row.competitorName, price: row.priceCents },
      update: { price: row.priceCents, observedAt: new Date() },
    });
    touched.add(productId);
  }

  if (touched.size > 0) {
    await prisma.recommendation.deleteMany({
      where: { productId: { in: [...touched] } },
    });
  }

  return { inserted, updated, skipped: errors.length, errors };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/ingest/applyIngest.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/ingest/applyIngest.ts src/lib/ingest/applyIngest.test.ts
git commit -m "feat: add applyIngest to upsert competitor prices and invalidate recommendations"
```

---

### Task 5: `POST /api/ingest` route

**Files:**
- Create: `src/app/api/ingest/route.ts`
- Test: `src/app/api/ingest/route.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/app/api/ingest/route.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const { applyIngest } = vi.hoisted(() => ({ applyIngest: vi.fn() }));

vi.mock("@/lib/db", () => ({ prisma: {} }));
vi.mock("@/lib/ingest/applyIngest", () => ({ applyIngest }));

import { POST } from "./route";

const req = (body: string) => ({ text: async () => body }) as unknown as Request;

beforeEach(() => applyIngest.mockReset());

describe("POST /api/ingest", () => {
  it("parses the body, applies ingest, and returns the summary", async () => {
    applyIngest.mockResolvedValue({ inserted: 1, updated: 1, skipped: 0, errors: [] });
    const res = await POST(req("TEE-001,RivalShop,28.50"));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ inserted: 1, updated: 1 });
    expect(applyIngest).toHaveBeenCalledOnce();
  });

  it("returns 400 for an empty body", async () => {
    const res = await POST(req("   "));
    expect(res.status).toBe(400);
    expect(applyIngest).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/api/ingest/route.test.ts`
Expected: FAIL — cannot find module `./route`.

- [ ] **Step 3: Implement**

Create `src/app/api/ingest/route.ts`:

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { HttpError, withErrorHandling } from "@/lib/api/errors";
import { parseCsv } from "@/lib/ingest/parseCsv";
import { applyIngest } from "@/lib/ingest/applyIngest";

export const POST = withErrorHandling(async (req: Request) => {
  const text = await req.text();
  if (text.trim() === "") {
    throw new HttpError(400, "Empty CSV body");
  }
  const parsed = parseCsv(text);
  const summary = await applyIngest(prisma, parsed);
  return NextResponse.json(summary);
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/app/api/ingest/route.test.ts`
Expected: PASS.

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: PASS — all existing 40 tests plus the new ones (money, parseCsv, applyIngest, route).

- [ ] **Step 6: Commit**

```bash
git add src/app/api/ingest/route.ts src/app/api/ingest/route.test.ts
git commit -m "feat: add POST /api/ingest CSV ingestion endpoint"
```

---

### Task 6: Minimal upload UI

**Files:**
- Create: `src/components/IngestUpload.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Implement the upload component**

Create `src/components/IngestUpload.tsx`:

```tsx
"use client";
import { useState } from "react";

interface Summary {
  inserted: number;
  updated: number;
  skipped: number;
  errors: { line: number; reason: string }[];
}

export function IngestUpload() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [busy, setBusy] = useState(false);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setSummary(null);
    try {
      const text = await file.text();
      const res = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "text/csv" },
        body: text,
      });
      setSummary(await res.json());
    } finally {
      setBusy(false);
      e.target.value = ""; // allow re-uploading the same file
      // Reload so the products table reflects new prices and cleared recommendations.
      if (typeof window !== "undefined") window.location.reload();
    }
  }

  return (
    <div className="mb-6 rounded border border-gray-200 p-4">
      <label className="block text-sm font-medium">
        Upload competitor prices (CSV: sku,competitor_name,price)
      </label>
      <input
        type="file"
        accept=".csv,text/csv"
        onChange={onFile}
        disabled={busy}
        className="mt-2 text-sm"
      />
      {summary && (
        <div className="mt-3 text-sm">
          <div>
            {summary.inserted} inserted, {summary.updated} updated, {summary.skipped} skipped
          </div>
          {summary.errors.length > 0 && (
            <ul className="mt-1 list-disc pl-5 text-xs text-red-600">
              {summary.errors.map((er, i) => (
                <li key={i}>line {er.line}: {er.reason}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
```

> Note: `window.location.reload()` runs in the `finally` immediately, so the `summary` panel is replaced by the reload. That is acceptable for this thin slice — the refreshed table shows the result. If you want the summary to persist, remove the reload line and instead lift `ProductsTable`'s `load` callback; not required for done.

- [ ] **Step 2: Wire it into the page**

Modify `src/app/page.tsx` to render the upload above the table:

```tsx
import { ProductsTable } from "@/components/ProductsTable";
import { IngestUpload } from "@/components/IngestUpload";

export default function Home() {
  return (
    <main className="mx-auto max-w-5xl p-8">
      <h1 className="mb-6 text-2xl font-bold">PriceIQ — Demo Store</h1>
      <IngestUpload />
      <ProductsTable />
    </main>
  );
}
```

- [ ] **Step 3: Verify the build type-checks**

Run: `npm run build`
Expected: PASS — no type errors; route list includes `/api/ingest`.

- [ ] **Step 4: Commit**

```bash
git add src/components/IngestUpload.tsx src/app/page.tsx
git commit -m "feat: add minimal competitor-price CSV upload UI"
```

---

### Task 7: End-to-end verification

**Files:** none (manual verification + reseed)

- [ ] **Step 1: Reseed to a clean state**

Run: `npm run seed`
Expected: "Seeded merchant ... with 8 products." (Confirms the new unique constraint is compatible with the seed.)

- [ ] **Step 2: Start the dev server**

Run (background): `npm run dev`
Expected: ready on http://localhost:3000.

- [ ] **Step 3: Exercise the endpoint directly**

Create a temp file `_sample.csv` with:

```
sku,competitor_name,price
TEE-001,RivalShop,40.00
TEE-001,NewRival,41.00
NOPE-999,Ghost,9.99
```

Run: `curl -s -X POST --data-binary @_sample.csv -H "Content-Type: text/csv" http://localhost:3000/api/ingest`
Expected JSON: `{"inserted":1,"updated":1,"skipped":1,"errors":[{"line":4,...,"reason":"unknown sku: NOPE-999"}]}`
(`TEE-001/RivalShop` already exists from the seed → updated to 4000; `TEE-001/NewRival` is new → inserted; the `NOPE-999` row is skipped.)

- [ ] **Step 4: Confirm recommendation invalidation + recompute**

Run: `curl -s http://localhost:3000/api/products`
Expected: the `TEE-001` row's `comparison.compMedian` reflects the new prices, and its `recommendationAction` is `null` (invalidated). Visiting `/product/<TEE-001 id>` and regenerating yields a fresh recommendation.

- [ ] **Step 5: Clean up temp file and reseed**

Run: `rm -f _sample.csv && npm run seed`
Expected: temp file removed; demo data restored to a clean state.

- [ ] **Step 6: Final full check**

Run: `npm test && npm run build`
Expected: all tests PASS; build succeeds.

- [ ] **Step 7: Finish the branch**

Use superpowers:finishing-a-development-branch to verify tests, then merge `slice2-csv-ingestion` into `master` (or open a PR), and clean up.

---

## Notes for the implementer

- **`skipped` always equals `errors.length`** — it is the count of every rejected row (parser errors + unknown SKUs). Keep them in sync; don't introduce a second skip counter.
- **Inserted vs updated** is determined by a pre-read of existing `(productId, competitorName)` pairs, because Prisma's `upsert` does not report which branch it took.
- The compound upsert key is named `productId_competitorName` — this is generated from the `@@unique([productId, competitorName])` in Task 1. The route/applyIngest code will not type-check until that migration + `prisma generate` have run.
- Do not add multipart/file-field parsing or scraping — both are explicitly out of scope for this slice.
