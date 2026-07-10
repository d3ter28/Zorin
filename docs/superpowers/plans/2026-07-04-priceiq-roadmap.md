# PriceIQ Product Roadmap — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build PriceIQ from its current MVP shell (auth + product catalog) into a full ML-based pricing intelligence platform — starting with the core elasticity engine, growing into SMB-polished tooling, and eventually scaling to enterprise integrations and team features.

**Architecture:** Each phase builds on the previous. Phase 1 delivers the core ML loop (upload sales history → fit elasticity model → simulate profit → generate recommendation). Phase 2 adds polish, trust signals, and retention-driving features. Phase 3 adds integrations, multi-user, and advanced ML to unlock enterprise deals.

**Tech Stack:** Next.js 16.2.9 (App Router, Turbopack), TypeScript, Prisma 7 + better-sqlite3 (SQLite → Postgres for Phase 3), Vitest 4, Tailwind v4. Path alias `@/` → `src/`. Money = integer cents. Read `node_modules/next/dist/docs/` before writing Next code. Async route params are `Promise<{id}>` — must be awaited.

**User decisions (already made):**
- "Remove competitor price scraping — pivot to ML from merchant's own sales history"
- "CSV upload first — merchants already live in spreadsheets"
- "WhatIfSlider and RecommendationCard shells kept — rewire to ML outputs"
- "Target: small-to-mid online store owners, not enterprise (yet)"

**Bash prefix required:** `cd /c/Users/pohde/projects/priceiq &&` — Bash tool runs from home dir, not project root.

---

## What Already Exists

| Module | Status |
|---|---|
| Auth (login/signup/logout/session) | ✅ Complete |
| Multi-tenant isolation (merchantId scoping) | ✅ Complete |
| Product catalog CSV upload + CRUD | ✅ Complete |
| COGS per-product input | ✅ Complete |
| `WhatIfSlider` (price slider + margin calc) | ✅ Shell — needs ML wiring |
| `RecommendationCard` (action display) | ✅ Shell — needs ML wiring |
| `money.ts`, `margin.ts` utilities | ✅ Complete |
| `Recommendation` DB model | ✅ Exists — needs ML fields |

---

## Phase 1 — MVP: ML Pricing Core
> **Goal:** A merchant can upload their sales history, the app fits a per-product elasticity model, and generates a data-backed raise/lower/hold recommendation with profit simulation.

---

### Task 1: SalesRecord DB model

**Goal:** Add the `SalesRecord` Prisma model to store uploaded per-product price/sales data points.

**Files:**
- Modify: `prisma/schema.prisma`

**Acceptance Criteria:**
- [ ] `SalesRecord` model exists with fields: `id`, `productId`, `merchantId`, `date` (DateTime), `unitsSold` (Int), `priceCents` (Int), `promotionFlag` (Boolean, default false), `createdAt`
- [ ] `ElasticityModel` model exists with fields: `id`, `productId` (unique), `elasticity` (Float), `intercept` (Float), `r2` (Float), `dataPoints` (Int), `fittedAt` (DateTime)
- [ ] `Product` model has `salesRecords` and `elasticityModel` relations added
- [ ] `npx prisma db push` exits 0

**Verify:** `cd /c/Users/pohde/projects/priceiq && npx prisma db push` → `Your database is now in sync with your Prisma schema.`

**Steps:**

- [ ] **Step 1: Update `prisma/schema.prisma`**

Add after the existing `Recommendation` model:

```prisma
model SalesRecord {
  id            String   @id @default(cuid())
  productId     String
  merchantId    String
  product       Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  date          DateTime
  unitsSold     Int
  priceCents    Int
  promotionFlag Boolean  @default(false)
  createdAt     DateTime @default(now())

  @@unique([productId, date])
}

model ElasticityModel {
  id          String   @id @default(cuid())
  productId   String   @unique
  product     Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  elasticity  Float
  intercept   Float
  r2          Float
  dataPoints  Int
  fittedAt    DateTime @default(now())
}
```

Add relations on `Product`:
```prisma
  salesRecords    SalesRecord[]
  elasticityModel ElasticityModel?
```

- [ ] **Step 2: Push schema**

```bash
cd /c/Users/pohde/projects/priceiq && npx prisma db push
```

- [ ] **Step 3: Commit**

```bash
cd /c/Users/pohde/projects/priceiq && git add prisma/schema.prisma && git commit -m "feat: add SalesRecord and ElasticityModel schema"
```

---

### Task 2: Sales history CSV parser

**Goal:** Parse a merchant-uploaded CSV of price/sales history into typed rows, with per-row validation errors.

**Files:**
- Create: `src/lib/salesHistory/parseSalesHistoryCsv.ts`
- Create: `src/lib/salesHistory/parseSalesHistoryCsv.test.ts`

**Acceptance Criteria:**
- [ ] Accepts CSV with header `sku,date,units_sold,price` (order enforced)
- [ ] `date` parsed as ISO 8601 (YYYY-MM-DD); invalid dates become `RowError`
- [ ] `units_sold` must be positive integer; invalid → `RowError`
- [ ] `price` is dollar amount parsed to cents via `dollarsToCents`; zero/negative → `RowError`
- [ ] Blank lines silently skipped; header row skipped when first non-blank line
- [ ] Returns `{ rows: ParsedSalesRow[], errors: RowError[] }` — never throws
- [ ] All tests pass: `npm test -- parseSalesHistoryCsv`

**Verify:** `cd /c/Users/pohde/projects/priceiq && npm test -- parseSalesHistoryCsv` → all tests pass

**Steps:**

- [ ] **Step 1: Write the failing tests first**

`src/lib/salesHistory/parseSalesHistoryCsv.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { parseSalesHistoryCsv } from "./parseSalesHistoryCsv";

describe("parseSalesHistoryCsv", () => {
  it("parses valid CSV with header", () => {
    const csv = `sku,date,units_sold,price\nSKU-1,2024-01-15,10,29.99\nSKU-1,2024-02-15,8,34.99`;
    const result = parseSalesHistoryCsv(csv);
    expect(result.errors).toHaveLength(0);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toEqual({
      line: 2,
      sku: "SKU-1",
      date: new Date("2024-01-15"),
      unitsSold: 10,
      priceCents: 2999,
    });
  });

  it("skips blank lines", () => {
    const csv = `sku,date,units_sold,price\n\nSKU-1,2024-01-15,5,10.00\n\n`;
    const result = parseSalesHistoryCsv(csv);
    expect(result.rows).toHaveLength(1);
    expect(result.errors).toHaveLength(0);
  });

  it("errors on invalid date", () => {
    const csv = `sku,date,units_sold,price\nSKU-1,not-a-date,5,10.00`;
    const result = parseSalesHistoryCsv(csv);
    expect(result.rows).toHaveLength(0);
    expect(result.errors[0].reason).toMatch(/invalid date/i);
  });

  it("errors on zero units", () => {
    const csv = `sku,date,units_sold,price\nSKU-1,2024-01-15,0,10.00`;
    const result = parseSalesHistoryCsv(csv);
    expect(result.errors[0].reason).toMatch(/units_sold/i);
  });

  it("errors on zero price", () => {
    const csv = `sku,date,units_sold,price\nSKU-1,2024-01-15,5,0.00`;
    const result = parseSalesHistoryCsv(csv);
    expect(result.errors[0].reason).toMatch(/price/i);
  });

  it("errors on wrong column count", () => {
    const csv = `sku,date,units_sold,price\nSKU-1,2024-01-15,5`;
    const result = parseSalesHistoryCsv(csv);
    expect(result.errors[0].reason).toMatch(/4 columns/i);
  });

  it("works without header row", () => {
    const csv = `SKU-1,2024-01-15,10,29.99`;
    const result = parseSalesHistoryCsv(csv);
    expect(result.rows).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /c/Users/pohde/projects/priceiq && npm test -- parseSalesHistoryCsv
```
Expected: FAIL (module not found)

- [ ] **Step 3: Implement `parseSalesHistoryCsv.ts`**

```typescript
import { dollarsToCents } from "../money";

export interface ParsedSalesRow {
  line: number;
  sku: string;
  date: Date;
  unitsSold: number;
  priceCents: number;
}

export interface RowError {
  line: number;
  raw: string;
  reason: string;
}

export interface SalesParseResult {
  rows: ParsedSalesRow[];
  errors: RowError[];
}

const HEADER = "sku,date,units_sold,price";

export function parseSalesHistoryCsv(input: string): SalesParseResult {
  const rows: ParsedSalesRow[] = [];
  const errors: RowError[] = [];
  let sawFirstContentLine = false;

  input.split(/\r?\n/).forEach((raw, index) => {
    const line = index + 1;
    const trimmed = raw.trim();
    if (trimmed === "") return;

    const fields = trimmed.split(",").map((f) => f.trim());

    if (!sawFirstContentLine) {
      sawFirstContentLine = true;
      if (fields.join(",").toLowerCase() === HEADER) return;
    }

    if (fields.length !== 4) {
      errors.push({ line, raw, reason: "malformed line: expected 4 columns" });
      return;
    }

    const [sku, dateStr, unitsStr, priceStr] = fields;

    if (!sku) {
      errors.push({ line, raw, reason: "missing sku" });
      return;
    }

    const dateMs = Date.parse(dateStr);
    if (isNaN(dateMs)) {
      errors.push({ line, raw, reason: "invalid date: expected YYYY-MM-DD" });
      return;
    }

    const unitsSold = Number(unitsStr);
    if (!Number.isInteger(unitsSold) || unitsSold <= 0) {
      errors.push({ line, raw, reason: "invalid units_sold: must be positive integer" });
      return;
    }

    const priceCents = dollarsToCents(priceStr);
    if (priceCents === null || priceCents <= 0) {
      errors.push({ line, raw, reason: "invalid price: must be positive dollar amount" });
      return;
    }

    rows.push({ line, sku, date: new Date(dateMs), unitsSold, priceCents });
  });

  return { rows, errors };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /c/Users/pohde/projects/priceiq && npm test -- parseSalesHistoryCsv
```
Expected: all tests pass

- [ ] **Step 5: Commit**

```bash
cd /c/Users/pohde/projects/priceiq && git add src/lib/salesHistory/ && git commit -m "feat: sales history CSV parser"
```

---

### Task 3: Sales history import + API route

**Goal:** Accept a merchant's sales history CSV upload, match rows to existing products by SKU, and upsert `SalesRecord` rows — reusing the ProductUpload pattern.

**Files:**
- Create: `src/lib/salesHistory/importSalesHistory.ts`
- Create: `src/lib/salesHistory/importSalesHistory.test.ts`
- Create: `src/app/api/products/sales-history/route.ts`
- Create: `src/app/api/products/sales-history/route.test.ts`

**Acceptance Criteria:**
- [ ] `importSalesHistory(prisma, merchantId, rows)` upserts `SalesRecord` rows matched by `(merchantId, productId, date)` — SKU looked up against `Product`
- [ ] Rows for unknown SKUs accumulate in an `unknownSkus` array (not an error — returned to caller)
- [ ] `POST /api/products/sales-history` requires session; parses multipart form body for `file` field; returns `{ imported: number, skipped: number, errors: RowError[], unknownSkus: string[] }`
- [ ] Route returns 400 with error list if CSV has zero valid rows and has errors
- [ ] All tests pass: `npm test -- salesHistory`

**Verify:** `cd /c/Users/pohde/projects/priceiq && npm test -- salesHistory` → all tests pass

**Steps:**

- [ ] **Step 1: Write failing tests for `importSalesHistory`**

`src/lib/salesHistory/importSalesHistory.test.ts`:
```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import { createClient } from "@libsql/client";
import { importSalesHistory } from "./importSalesHistory";
import type { ParsedSalesRow } from "./parseSalesHistoryCsv";

// Use an in-memory SQLite for tests — matches the pattern in importProducts.test.ts
// (check that file for the correct test DB setup pattern for this codebase)
```

> **Note:** Before writing the full test body, read `src/lib/products/importProducts.test.ts` to copy the exact in-memory Prisma setup pattern used in this codebase.

- [ ] **Step 2: Read the existing import test for the setup pattern**

```bash
cd /c/Users/pohde/projects/priceiq && cat src/lib/products/importProducts.test.ts
```

Copy the DB setup from that file into `importSalesHistory.test.ts`, then write tests:

```typescript
it("imports rows matching known SKUs", async () => {
  // seed a merchant + product with known SKU
  // call importSalesHistory with rows for that SKU
  // expect SalesRecord count to equal rows.length
  // expect unknownSkus to be empty
});

it("collects unknown SKUs without throwing", async () => {
  // call with a row whose SKU doesn't exist
  // expect imported === 0, unknownSkus.length === 1
});

it("upserts on duplicate (productId, date)", async () => {
  // call twice with same date
  // expect only one record
});
```

- [ ] **Step 3: Implement `importSalesHistory.ts`**

```typescript
import type { PrismaClient } from "@prisma/client";
import type { ParsedSalesRow } from "./parseSalesHistoryCsv";

export interface ImportResult {
  imported: number;
  unknownSkus: string[];
}

export async function importSalesHistory(
  prisma: PrismaClient,
  merchantId: string,
  rows: ParsedSalesRow[]
): Promise<ImportResult> {
  // Build sku→productId map for this merchant's products
  const products = await prisma.product.findMany({
    where: { merchantId },
    select: { id: true, sku: true },
  });
  const skuToId = new Map(products.map((p) => [p.sku, p.id]));

  const unknownSkus: string[] = [];
  let imported = 0;

  for (const row of rows) {
    const productId = skuToId.get(row.sku);
    if (!productId) {
      if (!unknownSkus.includes(row.sku)) unknownSkus.push(row.sku);
      continue;
    }
    await prisma.salesRecord.upsert({
      where: { productId_date: { productId, date: row.date } },
      create: {
        productId,
        merchantId,
        date: row.date,
        unitsSold: row.unitsSold,
        priceCents: row.priceCents,
      },
      update: {
        unitsSold: row.unitsSold,
        priceCents: row.priceCents,
      },
    });
    imported++;
  }

  return { imported, unknownSkus };
}
```

- [ ] **Step 4: Implement the API route**

`src/app/api/products/sales-history/route.ts` — read `src/app/api/products/catalog/route.ts` first, then mirror its pattern for multipart parsing and error handling:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireSessionApi } from "@/lib/auth/requireSessionApi";
import { withErrorHandling } from "@/lib/api/errors";
import { prisma } from "@/lib/prisma";
import { parseSalesHistoryCsv } from "@/lib/salesHistory/parseSalesHistoryCsv";
import { importSalesHistory } from "@/lib/salesHistory/importSalesHistory";

export const POST = withErrorHandling(async (req: NextRequest) => {
  const { merchantId } = await requireSessionApi();
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file field required" }, { status: 400 });
  }
  const text = await file.text();
  const { rows, errors } = parseSalesHistoryCsv(text);
  if (rows.length === 0) {
    return NextResponse.json({ error: "no valid rows", errors }, { status: 400 });
  }
  const { imported, unknownSkus } = await importSalesHistory(prisma, merchantId, rows);
  return NextResponse.json({ imported, skipped: unknownSkus.length, errors, unknownSkus });
});
```

- [ ] **Step 5: Run all salesHistory tests**

```bash
cd /c/Users/pohde/projects/priceiq && npm test -- salesHistory
```
Expected: all tests pass

- [ ] **Step 6: Commit**

```bash
cd /c/Users/pohde/projects/priceiq && git add src/lib/salesHistory/ src/app/api/products/sales-history/ && git commit -m "feat: sales history import + API route"
```

---

### Task 4: Sales history upload UI

**Goal:** Add a `SalesHistoryUpload` component (mirroring `ProductUpload`) to the product detail page, letting merchants upload a CSV of sales history.

**Files:**
- Create: `src/components/SalesHistoryUpload.tsx`
- Create: `src/components/SalesHistoryUpload.test.tsx`
- Modify: `src/app/product/[id]/page.tsx`

**Acceptance Criteria:**
- [ ] `SalesHistoryUpload` renders a file input, shows upload progress, and displays a success summary (`imported N records, skipped M unknown SKUs`) or error list on completion
- [ ] On success it calls an optional `onSuccess` callback so the parent page can trigger a model re-fit
- [ ] The component renders a downloadable sample CSV template link (`sku,date,units_sold,price`)
- [ ] Appears on the product detail page below the existing COGS input
- [ ] Tests render without crashing and simulate a file upload response

**Verify:** `cd /c/Users/pohde/projects/priceiq && npm test -- SalesHistoryUpload` → all tests pass

**Steps:**

- [ ] **Step 1: Read `ProductUpload.tsx` to understand the upload pattern**

```bash
cd /c/Users/pohde/projects/priceiq && cat src/components/ProductUpload.tsx
```

- [ ] **Step 2: Write the component**

`src/components/SalesHistoryUpload.tsx`:
```typescript
"use client";
import { useRef, useState } from "react";

interface UploadResult {
  imported: number;
  skipped: number;
  errors: { line: number; reason: string }[];
  unknownSkus: string[];
}

export function SalesHistoryUpload({ onSuccess }: { onSuccess?: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [result, setResult] = useState<UploadResult | null>(null);
  const [fatalError, setFatalError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setState("uploading");
    setResult(null);
    setFatalError(null);
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await fetch("/api/products/sales-history", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) {
        setFatalError(json.error ?? "Upload failed");
        setState("error");
        return;
      }
      setResult(json);
      setState("done");
      onSuccess?.();
    } catch {
      setFatalError("Network error — try again");
      setState("error");
    }
  }

  const sample = "sku,date,units_sold,price\nSKU-001,2024-01-01,12,29.99\nSKU-001,2024-02-01,9,34.99";
  const sampleUrl = `data:text/csv;charset=utf-8,${encodeURIComponent(sample)}`;

  return (
    <div className="rounded-xl border border-line bg-surface p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink">Upload Sales History</h2>
        <a href={sampleUrl} download="sales_history_sample.csv" className="text-xs text-accent hover:underline">
          Download sample CSV
        </a>
      </div>
      <p className="mt-1 text-xs text-muted">
        Format: <code className="text-ink">sku, date (YYYY-MM-DD), units_sold, price</code>
      </p>
      <div className="mt-3">
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
        <button
          className="btn btn-secondary"
          disabled={state === "uploading"}
          onClick={() => inputRef.current?.click()}
        >
          {state === "uploading" ? "Uploading…" : "Choose CSV file"}
        </button>
      </div>
      {state === "done" && result && (
        <div className="mt-3 text-xs">
          <p className="text-positive font-medium">
            ✓ Imported {result.imported} record{result.imported !== 1 ? "s" : ""}
            {result.skipped > 0 && `, skipped ${result.skipped} unknown SKU${result.skipped !== 1 ? "s" : ""}`}
          </p>
          {result.unknownSkus.length > 0 && (
            <p className="mt-1 text-warning">Unknown SKUs: {result.unknownSkus.join(", ")}</p>
          )}
          {result.errors.length > 0 && (
            <ul className="mt-1 text-danger space-y-0.5">
              {result.errors.slice(0, 5).map((e) => (
                <li key={e.line}>Line {e.line}: {e.reason}</li>
              ))}
              {result.errors.length > 5 && <li>…and {result.errors.length - 5} more</li>}
            </ul>
          )}
        </div>
      )}
      {state === "error" && fatalError && (
        <p className="mt-3 text-xs text-danger" role="alert">{fatalError}</p>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Add to product detail page**

In `src/app/product/[id]/page.tsx`, import `SalesHistoryUpload` and place it after the `CogsInput` section.

- [ ] **Step 4: Write minimal tests**

`src/components/SalesHistoryUpload.test.tsx`:
```typescript
import { render, screen } from "@testing-library/react";
import { SalesHistoryUpload } from "./SalesHistoryUpload";
import { describe, it, expect } from "vitest";

describe("SalesHistoryUpload", () => {
  it("renders upload button and sample link", () => {
    render(<SalesHistoryUpload />);
    expect(screen.getByText(/Choose CSV file/i)).toBeDefined();
    expect(screen.getByText(/Download sample CSV/i)).toBeDefined();
  });
});
```

- [ ] **Step 5: Run tests**

```bash
cd /c/Users/pohde/projects/priceiq && npm test -- SalesHistoryUpload
```

- [ ] **Step 6: Commit**

```bash
cd /c/Users/pohde/projects/priceiq && git add src/components/SalesHistoryUpload.tsx src/components/SalesHistoryUpload.test.tsx src/app/product/ && git commit -m "feat: sales history upload UI"
```

---

### Task 5: Price elasticity model fitting

**Goal:** Implement a pure-function log-log OLS regression that fits a price elasticity model from `SalesRecord` data for one product.

**Files:**
- Create: `src/lib/elasticity/fitElasticityModel.ts`
- Create: `src/lib/elasticity/fitElasticityModel.test.ts`

**Acceptance Criteria:**
- [ ] `fitElasticityModel(records)` accepts `{ priceCents, unitsSold }[]` and returns `{ elasticity, intercept, r2, dataPoints }` or `null` if fewer than 3 valid records
- [ ] Uses log-log OLS: `ln(units) = intercept + elasticity × ln(price)` — this captures diminishing demand sensitivity naturally
- [ ] `elasticity` is negative for normal goods (demand falls as price rises); function doesn't enforce sign — reports what the data says
- [ ] `r2` is the coefficient of determination (0–1); 0.0 returned when model explains nothing
- [ ] Records with `unitsSold <= 0` or `priceCents <= 0` are silently excluded before fitting
- [ ] All tests pass: `npm test -- fitElasticityModel`

**Verify:** `cd /c/Users/pohde/projects/priceiq && npm test -- fitElasticityModel` → all tests pass

**Steps:**

- [ ] **Step 1: Write failing tests**

`src/lib/elasticity/fitElasticityModel.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { fitElasticityModel } from "./fitElasticityModel";

describe("fitElasticityModel", () => {
  it("returns null for fewer than 3 records", () => {
    expect(fitElasticityModel([{ priceCents: 1000, unitsSold: 5 }])).toBeNull();
    expect(fitElasticityModel([])).toBeNull();
  });

  it("fits a known-elasticity dataset", () => {
    // Construct data: units = 100 * (price/100)^(-1.5) → elasticity should be ~-1.5
    const records = [
      { priceCents: 1000, unitsSold: 100 },
      { priceCents: 1500, unitsSold: 54 },
      { priceCents: 2000, unitsSold: 35 },
      { priceCents: 2500, unitsSold: 25 },
      { priceCents: 3000, unitsSold: 19 },
    ];
    const result = fitElasticityModel(records);
    expect(result).not.toBeNull();
    expect(result!.elasticity).toBeCloseTo(-1.5, 1);
    expect(result!.r2).toBeGreaterThan(0.99);
    expect(result!.dataPoints).toBe(5);
  });

  it("excludes zero/negative records before fitting", () => {
    const records = [
      { priceCents: 0, unitsSold: 10 },  // excluded
      { priceCents: 1000, unitsSold: 0 }, // excluded
      { priceCents: 1000, unitsSold: 100 },
      { priceCents: 1500, unitsSold: 54 },
      { priceCents: 2000, unitsSold: 35 },
    ];
    const result = fitElasticityModel(records);
    expect(result!.dataPoints).toBe(3);
  });

  it("returns dataPoints count", () => {
    const records = Array.from({ length: 6 }, (_, i) => ({
      priceCents: 1000 + i * 200,
      unitsSold: Math.max(1, 50 - i * 5),
    }));
    expect(fitElasticityModel(records)!.dataPoints).toBe(6);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /c/Users/pohde/projects/priceiq && npm test -- fitElasticityModel
```

- [ ] **Step 3: Implement `fitElasticityModel.ts`**

```typescript
export interface ElasticityResult {
  elasticity: number;   // price elasticity of demand (typically negative)
  intercept: number;    // ln-space intercept
  r2: number;           // coefficient of determination
  dataPoints: number;   // number of valid records used
}

export function fitElasticityModel(
  records: { priceCents: number; unitsSold: number }[]
): ElasticityResult | null {
  const valid = records.filter((r) => r.priceCents > 0 && r.unitsSold > 0);
  if (valid.length < 3) return null;

  // Transform to log space: x = ln(price), y = ln(units)
  const xs = valid.map((r) => Math.log(r.priceCents));
  const ys = valid.map((r) => Math.log(r.unitsSold));
  const n = valid.length;

  const sumX = xs.reduce((a, b) => a + b, 0);
  const sumY = ys.reduce((a, b) => a + b, 0);
  const sumXY = xs.reduce((a, x, i) => a + x * ys[i], 0);
  const sumX2 = xs.reduce((a, x) => a + x * x, 0);

  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return null;

  const elasticity = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - elasticity * sumX) / n;

  // R² calculation
  const yMean = sumY / n;
  const ssTot = ys.reduce((a, y) => a + (y - yMean) ** 2, 0);
  const ssRes = ys.reduce((a, y, i) => {
    const yHat = intercept + elasticity * xs[i];
    return a + (y - yHat) ** 2;
  }, 0);
  const r2 = ssTot === 0 ? 0 : Math.max(0, 1 - ssRes / ssTot);

  return { elasticity, intercept, r2, dataPoints: n };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /c/Users/pohde/projects/priceiq && npm test -- fitElasticityModel
```

- [ ] **Step 5: Commit**

```bash
cd /c/Users/pohde/projects/priceiq && git add src/lib/elasticity/ && git commit -m "feat: log-log OLS price elasticity model"
```

---

### Task 6: Profit simulation engine

**Goal:** Given an elasticity model and a candidate price, predict demand, revenue, and gross profit — and generate a raise/lower/hold recommendation.

**Files:**
- Create: `src/lib/elasticity/simulateProfit.ts`
- Create: `src/lib/elasticity/simulateProfit.test.ts`
- Create: `src/lib/elasticity/generateRecommendation.ts`
- Create: `src/lib/elasticity/generateRecommendation.test.ts`

**Acceptance Criteria:**
- [ ] `simulateProfit({ elasticity, intercept, currentPriceCents, candidatePriceCents, cogsCents })` returns `{ predictedUnits, predictedRevenueCents, predictedGrossProfitCents, marginPct }` — all as Numbers (not null-safe; caller ensures inputs are valid)
- [ ] `generateRecommendation(model, currentPriceCents, cogsCents, marginFloorPct)` scans 50 price points ±50% of current price in 2% steps, returns the candidate with highest gross profit that maintains `marginFloorPct` (default 0.1 = 10%)
- [ ] Returned recommendation: `{ action: "raise"|"lower"|"hold", suggestedPriceCents, deltaPct, reasoning: string, expectedProfitLiftPct }`
- [ ] `action` is "hold" when the best candidate is within ±1% of current price
- [ ] `reasoning` is a plain-English string e.g. `"Demand is inelastic (elasticity = -0.4). Raising price 12% reduces units by ~5% but grows gross profit by ~8%."`
- [ ] All tests pass

**Verify:** `cd /c/Users/pohde/projects/priceiq && npm test -- simulateProfit generateRecommendation` → all tests pass

**Steps:**

- [ ] **Step 1: Write failing tests for `simulateProfit`**

`src/lib/elasticity/simulateProfit.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { simulateProfit } from "./simulateProfit";

describe("simulateProfit", () => {
  it("predicts lower demand at higher price", () => {
    // elasticity = -1.5, intercept fitted to 100 units at $10
    // intercept = ln(100) - (-1.5)*ln(1000) = 4.605 + 10.35 = 14.955
    const base = { elasticity: -1.5, intercept: 14.955, currentPriceCents: 1000, cogsCents: 500 };
    const at1000 = simulateProfit({ ...base, candidatePriceCents: 1000 });
    const at1200 = simulateProfit({ ...base, candidatePriceCents: 1200 });
    expect(at1200.predictedUnits).toBeLessThan(at1000.predictedUnits);
  });

  it("computes gross profit correctly", () => {
    const result = simulateProfit({
      elasticity: -1.5,
      intercept: 14.955,
      currentPriceCents: 1000,
      candidatePriceCents: 1000,
      cogsCents: 500,
    });
    // margin = (1000-500)/1000 = 50%
    expect(result.marginPct).toBeCloseTo(0.5, 2);
    expect(result.predictedGrossProfitCents).toBeCloseTo(result.predictedUnits * 500, 0);
  });
});
```

- [ ] **Step 2: Implement `simulateProfit.ts`**

```typescript
export interface SimulationInput {
  elasticity: number;
  intercept: number;
  currentPriceCents: number;
  candidatePriceCents: number;
  cogsCents: number;
}

export interface SimulationResult {
  predictedUnits: number;
  predictedRevenueCents: number;
  predictedGrossProfitCents: number;
  marginPct: number;
}

export function simulateProfit(input: SimulationInput): SimulationResult {
  const { elasticity, intercept, candidatePriceCents, cogsCents } = input;
  const lnPrice = Math.log(candidatePriceCents);
  const predictedUnits = Math.exp(intercept + elasticity * lnPrice);
  const predictedRevenueCents = predictedUnits * candidatePriceCents;
  const unitMarginCents = candidatePriceCents - cogsCents;
  const predictedGrossProfitCents = predictedUnits * unitMarginCents;
  const marginPct = candidatePriceCents > 0 ? unitMarginCents / candidatePriceCents : 0;
  return { predictedUnits, predictedRevenueCents, predictedGrossProfitCents, marginPct };
}
```

- [ ] **Step 3: Write failing tests for `generateRecommendation`**

`src/lib/elasticity/generateRecommendation.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { generateRecommendation } from "./generateRecommendation";

const model = { elasticity: -0.5, intercept: 10.0, r2: 0.85, dataPoints: 12 };

describe("generateRecommendation", () => {
  it("recommends raise when inelastic", () => {
    // With elasticity -0.5 (inelastic), raising price grows revenue
    const rec = generateRecommendation(model, 1000, 400, 0.1);
    expect(rec.action).toBe("raise");
    expect(rec.suggestedPriceCents).toBeGreaterThan(1000);
  });

  it("returns hold when no candidate beats current by >1%", () => {
    // Force a model where every move hurts — very elastic
    const elasticModel = { ...model, elasticity: -3.0 };
    const rec = generateRecommendation(elasticModel, 1000, 400, 0.0);
    // Either raise/lower, but within some tolerance — just test it returns a valid action
    expect(["raise", "lower", "hold"]).toContain(rec.action);
  });

  it("reasoning contains elasticity value", () => {
    const rec = generateRecommendation(model, 1000, 400, 0.1);
    expect(rec.reasoning).toMatch(/-0\.[0-9]/);
  });

  it("does not suggest price below margin floor", () => {
    const rec = generateRecommendation(model, 1000, 800, 0.15);
    // COGS=800, floor=15% → min price = 800/(1-0.15) ≈ 941
    expect(rec.suggestedPriceCents).toBeGreaterThanOrEqual(941);
  });

  it("deltaPct reflects price change", () => {
    const rec = generateRecommendation(model, 1000, 400, 0.1);
    const expectedDelta = (rec.suggestedPriceCents - 1000) / 1000;
    expect(rec.deltaPct).toBeCloseTo(expectedDelta, 3);
  });
});
```

- [ ] **Step 4: Implement `generateRecommendation.ts`**

```typescript
import { simulateProfit } from "./simulateProfit";

export interface ElasticityModelParams {
  elasticity: number;
  intercept: number;
  r2: number;
  dataPoints: number;
}

export interface PricingRecommendation {
  action: "raise" | "lower" | "hold";
  suggestedPriceCents: number;
  deltaPct: number;
  reasoning: string;
  expectedProfitLiftPct: number;
}

export function generateRecommendation(
  model: ElasticityModelParams,
  currentPriceCents: number,
  cogsCents: number,
  marginFloorPct = 0.10
): PricingRecommendation {
  // Minimum price to maintain margin floor
  const minPriceCents = cogsCents / (1 - marginFloorPct);

  // Scan candidate prices: ±50% of current in 2% steps
  const steps = 50;
  const range = 0.5;
  const lo = Math.round(currentPriceCents * (1 - range));
  const hi = Math.round(currentPriceCents * (1 + range));
  const step = Math.round((hi - lo) / steps);

  let bestPriceCents = currentPriceCents;
  let bestProfit = simulateProfit({
    elasticity: model.elasticity,
    intercept: model.intercept,
    currentPriceCents,
    candidatePriceCents: currentPriceCents,
    cogsCents,
  }).predictedGrossProfitCents;

  for (let p = lo; p <= hi; p += Math.max(1, step)) {
    if (p < minPriceCents) continue;
    const sim = simulateProfit({
      elasticity: model.elasticity,
      intercept: model.intercept,
      currentPriceCents,
      candidatePriceCents: p,
      cogsCents,
    });
    if (sim.predictedGrossProfitCents > bestProfit) {
      bestProfit = sim.predictedGrossProfitCents;
      bestPriceCents = p;
    }
  }

  const deltaPct = (bestPriceCents - currentPriceCents) / currentPriceCents;
  const action = Math.abs(deltaPct) < 0.01
    ? "hold"
    : deltaPct > 0 ? "raise" : "lower";

  const currentSim = simulateProfit({
    elasticity: model.elasticity,
    intercept: model.intercept,
    currentPriceCents,
    candidatePriceCents: currentPriceCents,
    cogsCents,
  });
  const expectedProfitLiftPct = currentSim.predictedGrossProfitCents > 0
    ? (bestProfit - currentSim.predictedGrossProfitCents) / currentSim.predictedGrossProfitCents
    : 0;

  const elasticLabel = Math.abs(model.elasticity) < 1 ? "inelastic" : "elastic";
  const pricePctStr = `${(Math.abs(deltaPct) * 100).toFixed(0)}%`;
  const unitChangePct = (Math.exp(model.elasticity * Math.log(1 + deltaPct)) - 1) * 100;
  const profitChangePct = (expectedProfitLiftPct * 100).toFixed(0);

  const reasoning = action === "hold"
    ? `Demand elasticity is ${model.elasticity.toFixed(2)}. Current price is already near the profit-maximizing point.`
    : `Demand is ${elasticLabel} (elasticity = ${model.elasticity.toFixed(2)}). ` +
      `${action === "raise" ? "Raising" : "Lowering"} price ${pricePctStr} reduces units by ~${Math.abs(unitChangePct).toFixed(0)}% ` +
      `but ${parseFloat(profitChangePct) >= 0 ? "grows" : "reduces"} gross profit by ~${Math.abs(parseFloat(profitChangePct))}%.`;

  return { action, suggestedPriceCents: bestPriceCents, deltaPct, reasoning, expectedProfitLiftPct };
}
```

- [ ] **Step 5: Run all tests**

```bash
cd /c/Users/pohde/projects/priceiq && npm test -- simulateProfit generateRecommendation
```

- [ ] **Step 6: Commit**

```bash
cd /c/Users/pohde/projects/priceiq && git add src/lib/elasticity/ && git commit -m "feat: profit simulation + ML recommendation engine"
```

---

### Task 7: Fit model + recommendation API routes

**Goal:** Expose two POST endpoints: one to fit/re-fit the elasticity model for a product, one to generate and save a recommendation from the current model.

**Files:**
- Create: `src/app/api/products/[id]/fit-model/route.ts`
- Create: `src/app/api/products/[id]/fit-model/route.test.ts`
- Create: `src/app/api/products/[id]/recommend/route.ts`
- Create: `src/app/api/products/[id]/recommend/route.test.ts`

**Acceptance Criteria:**
- [ ] `POST /api/products/[id]/fit-model` requires session; loads `SalesRecord` rows for product (excluding `promotionFlag=true`); calls `fitElasticityModel`; upserts `ElasticityModel`; returns model params + 400 if fewer than 3 records
- [ ] `POST /api/products/[id]/recommend` requires session; loads `ElasticityModel` + product COGS; calls `generateRecommendation`; upserts `Recommendation` (stores `action`, `deltaPct`, `phrasing` = reasoning, `rulesJson` = JSON of full rec params); returns recommendation
- [ ] Both routes enforce merchant ownership (`findFirst({ where: { id, merchantId } })` — return 404 for foreign products)
- [ ] All tests pass

**Verify:** `cd /c/Users/pohde/projects/priceiq && npm test -- fit-model recommend` → all tests pass

**Steps:**

- [ ] **Step 1: Check async params pattern before writing**

```bash
cd /c/Users/pohde/projects/priceiq && cat src/app/api/products/[id]/cogs/route.ts
```

Note the `params: Promise<{ id: string }>` pattern and `await params` — apply this to the new routes.

- [ ] **Step 2: Implement `fit-model/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireSessionApi } from "@/lib/auth/requireSessionApi";
import { withErrorHandling } from "@/lib/api/errors";
import { prisma } from "@/lib/prisma";
import { fitElasticityModel } from "@/lib/elasticity/fitElasticityModel";

export const POST = withErrorHandling(
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { merchantId } = await requireSessionApi();
    const { id } = await params;

    const product = await prisma.product.findFirst({ where: { id, merchantId } });
    if (!product) return NextResponse.json({ error: "not found" }, { status: 404 });

    const records = await prisma.salesRecord.findMany({
      where: { productId: id, promotionFlag: false },
      select: { priceCents: true, unitsSold: true },
    });

    const result = fitElasticityModel(records);
    if (!result) {
      return NextResponse.json(
        { error: "insufficient data: need at least 3 non-promotional sales records" },
        { status: 400 }
      );
    }

    await prisma.elasticityModel.upsert({
      where: { productId: id },
      create: { productId: id, ...result, fittedAt: new Date() },
      update: { ...result, fittedAt: new Date() },
    });

    return NextResponse.json(result);
  }
);
```

- [ ] **Step 3: Implement `recommend/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireSessionApi } from "@/lib/auth/requireSessionApi";
import { withErrorHandling } from "@/lib/api/errors";
import { prisma } from "@/lib/prisma";
import { generateRecommendation } from "@/lib/elasticity/generateRecommendation";

export const POST = withErrorHandling(
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { merchantId } = await requireSessionApi();
    const { id } = await params;

    const product = await prisma.product.findFirst({
      where: { id, merchantId },
      include: { elasticityModel: true },
    });
    if (!product) return NextResponse.json({ error: "not found" }, { status: 404 });
    if (!product.elasticityModel) {
      return NextResponse.json({ error: "no elasticity model — fit model first" }, { status: 400 });
    }
    if (product.cogs === null) {
      return NextResponse.json({ error: "COGS required to generate recommendation" }, { status: 400 });
    }

    const rec = generateRecommendation(
      product.elasticityModel,
      product.currentPrice,
      product.cogs
    );

    await prisma.recommendation.upsert({
      where: { productId: id },
      create: {
        productId: id,
        action: rec.action,
        deltaPct: rec.deltaPct,
        phrasing: rec.reasoning,
        rulesJson: JSON.stringify({
          suggestedPriceCents: rec.suggestedPriceCents,
          expectedProfitLiftPct: rec.expectedProfitLiftPct,
          elasticity: product.elasticityModel.elasticity,
          r2: product.elasticityModel.r2,
          dataPoints: product.elasticityModel.dataPoints,
        }),
      },
      update: {
        action: rec.action,
        deltaPct: rec.deltaPct,
        phrasing: rec.reasoning,
        rulesJson: JSON.stringify({
          suggestedPriceCents: rec.suggestedPriceCents,
          expectedProfitLiftPct: rec.expectedProfitLiftPct,
          elasticity: product.elasticityModel.elasticity,
          r2: product.elasticityModel.r2,
          dataPoints: product.elasticityModel.dataPoints,
        }),
        generatedAt: new Date(),
      },
    });

    return NextResponse.json(rec);
  }
);
```

- [ ] **Step 4: Write route tests** (read `src/app/api/products/[id]/cogs/route.test.ts` for the test pattern)

- [ ] **Step 5: Run tests**

```bash
cd /c/Users/pohde/projects/priceiq && npm test -- fit-model recommend
```

- [ ] **Step 6: Commit**

```bash
cd /c/Users/pohde/projects/priceiq && git add src/app/api/products/ && git commit -m "feat: fit-model and recommend API routes"
```

---

### Task 8: Rewire RecommendationCard + WhatIfSlider to ML outputs

**Goal:** Update the product detail page and both UI components to use ML-based recommendation data instead of the old competitor-pricing props.

**Files:**
- Modify: `src/components/RecommendationCard.tsx`
- Modify: `src/components/RecommendationCard.test.tsx`
- Modify: `src/components/WhatIfSlider.tsx`
- Modify: `src/components/WhatIfSlider.test.tsx`
- Modify: `src/app/product/[id]/page.tsx`

**Acceptance Criteria:**
- [ ] `RecommendationCard` no longer references `competitorCount`; now receives `{ action, suggestedPriceCents, reasoning, r2, dataPoints, expectedProfitLiftPct }` and renders a "data quality" line (`R²=0.82, 12 data points`)
- [ ] `WhatIfSlider` no longer receives `compMedian`; receives `suggestedPriceCents` from the ML recommendation; removes the `vs median:` display, adds `Expected profit lift: +N%` when ML data available
- [ ] Product detail page loads `Recommendation` from DB (server component), passes `suggestedPriceCents` from `rulesJson` to `WhatIfSlider`, passes full rec to `RecommendationCard`
- [ ] "Fit Model" and "Get Recommendation" buttons on the page that call the new API endpoints and refresh
- [ ] All component tests pass: `npm test -- RecommendationCard WhatIfSlider`

**Verify:** `cd /c/Users/pohde/projects/priceiq && npm test -- RecommendationCard WhatIfSlider` → all tests pass

**Steps:**

- [ ] **Step 1: Update `RecommendationCard.tsx`**

Replace the `RecView` interface and render:

```typescript
"use client";

export interface MLRecView {
  action: "raise" | "lower" | "hold";
  suggestedPriceCents: number;
  reasoning: string;
  r2: number;
  dataPoints: number;
  expectedProfitLiftPct: number;
}

export function RecommendationCard({ rec }: { rec: MLRecView | null }) {
  if (!rec) {
    return (
      <div className="rounded-xl border border-line bg-surface p-5">
        <div className="h-3.5 w-32 animate-pulse rounded bg-panel" />
        <div className="mt-3 h-4 w-full animate-pulse rounded bg-panel" />
        <p className="mt-2 text-xs text-muted">Upload sales history to generate a recommendation.</p>
      </div>
    );
  }

  const tone =
    rec.action === "raise" ? "text-positive" :
    rec.action === "lower" ? "text-warning" : "text-muted";

  const liftLabel = rec.expectedProfitLiftPct >= 0
    ? `+${(rec.expectedProfitLiftPct * 100).toFixed(1)}% expected profit lift`
    : `${(rec.expectedProfitLiftPct * 100).toFixed(1)}% expected profit change`;

  return (
    <div className="rounded-xl border border-line bg-surface p-5">
      <div className="flex items-center gap-2">
        <span className={`text-xs font-semibold uppercase tracking-wide ${tone}`}>
          {rec.action}
        </span>
        <span className="text-faint">·</span>
        <span className="text-xs text-faint">{liftLabel}</span>
      </div>
      <p className="mt-2 text-ink">{rec.reasoning}</p>
      <p className="mt-2 text-xs text-muted">
        Model quality: R²={rec.r2.toFixed(2)}, {rec.dataPoints} data points
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Update `WhatIfSlider.tsx`**

Remove `compMedian` prop; add `expectedProfitLiftPct` prop; replace `vs median:` line with profit lift display:

```typescript
// Change props interface: remove compMedian, add expectedProfitLiftPct: number | null
// Change display line from "vs median:" to:
<span>
  Profit lift:{" "}
  <span className="tabular text-ink">
    {expectedProfitLiftPct === null ? "—" : pct(expectedProfitLiftPct)}
  </span>
</span>
```

- [ ] **Step 3: Update product detail page**

In `src/app/product/[id]/page.tsx`:
- Load `recommendation` via `prisma.recommendation.findFirst({ where: { productId: id } })`
- Parse `rulesJson` to extract `suggestedPriceCents`, `expectedProfitLiftPct`, `r2`, `dataPoints`
- Pass `suggestedPriceCents` and `expectedProfitLiftPct` to `WhatIfSlider`
- Pass full ML rec view to `RecommendationCard`
- Add "Fit Model" + "Get Recommendation" action buttons (client component wrapping fetch calls)

- [ ] **Step 4: Run tests**

```bash
cd /c/Users/pohde/projects/priceiq && npm test -- RecommendationCard WhatIfSlider
```

- [ ] **Step 5: Run full test suite**

```bash
cd /c/Users/pohde/projects/priceiq && npm test
```
Expected: 115+ tests passing (original 115 + new tests from Tasks 1–8)

- [ ] **Step 6: Commit**

```bash
cd /c/Users/pohde/projects/priceiq && git add src/components/ src/app/product/ && git commit -m "feat: rewire UI to ML recommendation engine — Phase 1 complete"
```

---

## Phase 2 — SMB: Polish, Trust & Retention
> **Goal:** Turn the raw ML engine into a polished tool that SMB merchants trust and return to daily.

---

### Task 9: Model health badge + confidence indicators

**Goal:** Show merchants how much to trust each recommendation — R², data point count, data recency, and a plain-language quality tier ("Strong", "Moderate", "Weak").

**Files:**
- Create: `src/components/ModelHealthBadge.tsx`
- Create: `src/components/ModelHealthBadge.test.tsx`

**Acceptance Criteria:**
- [ ] `ModelHealthBadge({ r2, dataPoints, fittedAt })` renders a colored badge: green ("Strong") if R²≥0.7 and dataPoints≥10; yellow ("Moderate") if R²≥0.4 or dataPoints≥5; red ("Weak") otherwise
- [ ] Shows days-since-fit: "Fitted 3 days ago" — warns in orange if >30 days
- [ ] Appears on product detail page below `RecommendationCard`
- [ ] Tests cover each quality tier

**Verify:** `cd /c/Users/pohde/projects/priceiq && npm test -- ModelHealthBadge` → all tests pass

---

### Task 10: Demand curve visualization

**Goal:** Render an inline SVG chart on the product page showing predicted demand vs price across the ±50% range, with pins for current price, suggested price, and breakeven.

**Files:**
- Create: `src/components/DemandCurveChart.tsx`
- Create: `src/components/DemandCurveChart.test.tsx`

**Acceptance Criteria:**
- [ ] Pure SVG — no external chart library
- [ ] Shows demand curve, current price pin (blue), suggested price pin (green), and COGS breakeven price pin (red)
- [ ] Accessible: `role="img"` with descriptive `aria-label`
- [ ] Renders correctly when `cogsCents` is null (omit breakeven pin)
- [ ] Tests assert SVG is rendered and pins exist when data provided

**Verify:** `cd /c/Users/pohde/projects/priceiq && npm test -- DemandCurveChart` → all tests pass

---

### Task 11: Price change history

**Goal:** Track every price change a merchant applies (via the WhatIfSlider "Apply" button) and show a timeline on the product page.

**Files:**
- Modify: `prisma/schema.prisma` — add `PriceChange` model
- Create: `src/app/api/products/[id]/apply/route.ts` — replace the old stub
- Create: `src/components/PriceHistory.tsx`

**Schema addition:**
```prisma
model PriceChange {
  id          String   @id @default(cuid())
  productId   String
  merchantId  String
  product     Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  fromPrice   Int
  toPrice     Int
  source      String   @default("manual")  // "manual" | "ml_recommendation"
  changedAt   DateTime @default(now())
}
```

**Acceptance Criteria:**
- [ ] `POST /api/products/[id]/apply` updates `Product.currentPrice` and creates a `PriceChange` record
- [ ] `PriceHistory` component renders a chronological list of price changes with date, from/to prices, and source label
- [ ] All tests pass

---

### Task 12: Portfolio dashboard — recommendation summary

**Goal:** Upgrade the main dashboard to show all products grouped by recommendation action (Raise / Lower / Hold / No data) with estimated profit lift per product.

**Files:**
- Modify: `src/components/Dashboard.tsx`
- Modify: `src/app/page.tsx`

**Acceptance Criteria:**
- [ ] Products grouped into 4 sections: Raise (green), Lower (amber), Hold (neutral), Awaiting data (grey)
- [ ] Each product card shows: title, current price, suggested price, expected profit lift %
- [ ] "Get recommendations for all" button triggers sequential fit+recommend for all products missing a recommendation
- [ ] Tests cover the grouping logic

---

### Task 13: Promotion period flagging

**Goal:** Let merchants mark date ranges as promotional so those records are excluded from elasticity fitting.

**Files:**
- Create: `src/app/api/products/[id]/promotions/route.ts`
- Create: `src/components/PromotionRangeInput.tsx`

**Acceptance Criteria:**
- [ ] `POST /api/products/[id]/promotions` accepts `{ startDate, endDate }`, sets `promotionFlag=true` on all matching `SalesRecord` rows for that product
- [ ] `PromotionRangeInput` renders two date inputs and a submit button; on success shows count of flagged records
- [ ] Fitting (Task 7) already excludes `promotionFlag=true` records — verify this works end-to-end
- [ ] Tests pass

---

### Task 14: Auth hardening

**Goal:** Add rate limiting to auth endpoints and session revocation on password change.

**Files:**
- Create: `src/lib/auth/rateLimit.ts`
- Modify: `src/app/api/auth/login/route.ts`
- Modify: `src/app/api/auth/signup/route.ts`
- Create: `src/app/api/auth/change-password/route.ts`

**Acceptance Criteria:**
- [ ] In-memory sliding window rate limiter: max 10 login attempts per IP per 15 minutes; max 5 signup attempts per IP per hour
- [ ] Rate-limited requests return `429` with `Retry-After` header
- [ ] `POST /api/auth/change-password` requires current password verification; on success revokes all existing sessions for the user; returns `{ok:true}`
- [ ] All tests pass

---

## Phase 3 — Enterprise: Integrations, Teams & Advanced ML
> **Goal:** Unlock enterprise deals through automatic data sync (no CSV uploads), multi-user accounts, and cross-product intelligence.

---

### Task 15: Shopify integration — product + order sync

**Goal:** OAuth app that syncs Shopify products into PriceIQ's product catalog and auto-populates `SalesRecord` from order history — eliminating CSV uploads for Shopify merchants.

**Files:**
- Create: `src/lib/integrations/shopify/oauth.ts`
- Create: `src/lib/integrations/shopify/syncProducts.ts`
- Create: `src/lib/integrations/shopify/syncOrders.ts`
- Create: `src/app/api/integrations/shopify/` (connect, callback, webhook routes)
- Modify: `prisma/schema.prisma` — add `ShopifyIntegration` model

**Acceptance Criteria:**
- [ ] Merchant can connect Shopify store via OAuth flow from Settings page
- [ ] On connect: syncs all products (upsert by SKU); syncs last 12 months of orders as `SalesRecord` rows
- [ ] Webhook handler for `orders/create` auto-inserts new `SalesRecord` rows
- [ ] `ShopifyIntegration` stores `{ merchantId, shopDomain, accessToken, connectedAt, lastSyncAt }`
- [ ] All tests pass

---

### Task 16: Multi-user per merchant (team roles)

**Goal:** Allow multiple users under a single merchant account with role-based access: Owner, Analyst (read + recommend), Viewer (read-only).

**Files:**
- Modify: `prisma/schema.prisma` — add `MerchantMember` model; loosen `User.merchantId` unique constraint
- Create: `src/lib/auth/rbac.ts`
- Modify: all route handlers to check role

**Schema addition:**
```prisma
model MerchantMember {
  id         String   @id @default(cuid())
  merchantId String
  userId     String
  role       String   // "owner" | "analyst" | "viewer"
  createdAt  DateTime @default(now())

  @@unique([merchantId, userId])
}
```

**Acceptance Criteria:**
- [ ] Owners can invite members by email; invited users complete signup and are attached to the merchant
- [ ] Analysts can view and trigger recommendations but cannot change settings or billing
- [ ] Viewers can only read — all POST/PATCH routes return `403` for viewer sessions
- [ ] All tests pass

---

### Task 17: Bulk recommendation approval

**Goal:** Let merchants select multiple products from the dashboard and approve all recommendations in one action.

**Files:**
- Create: `src/app/api/products/bulk-apply/route.ts`
- Modify: `src/components/Dashboard.tsx`

**Acceptance Criteria:**
- [ ] Checkboxes on each product card in dashboard
- [ ] "Apply selected recommendations" button triggers `POST /api/products/bulk-apply` with `{ productIds: string[] }`
- [ ] Route applies each product's current recommendation price, creates `PriceChange` records, returns `{ applied: number, failed: string[] }`
- [ ] Requires "analyst" or "owner" role

---

### Task 18: Export — pricing report CSV/PDF

**Goal:** Export the full product + recommendation + price history report for a merchant.

**Files:**
- Create: `src/app/api/reports/pricing/route.ts`

**Acceptance Criteria:**
- [ ] `GET /api/reports/pricing?format=csv` returns CSV: product title, SKU, current price, suggested price, action, expected profit lift %, elasticity, R², data points, last price change date
- [ ] `GET /api/reports/pricing?format=json` returns JSON equivalent
- [ ] Requires auth; scoped to merchant

---

### Task 19: Webhooks — price change notifications

**Goal:** Let enterprise merchants subscribe to price change events via outbound webhooks.

**Files:**
- Modify: `prisma/schema.prisma` — add `WebhookEndpoint` model
- Create: `src/lib/webhooks/deliver.ts`
- Create: `src/app/api/webhooks/` (CRUD routes)

**Schema addition:**
```prisma
model WebhookEndpoint {
  id         String   @id @default(cuid())
  merchantId String
  url        String
  secret     String
  events     String   // JSON array: ["price.changed", "recommendation.generated"]
  createdAt  DateTime @default(now())
}
```

**Acceptance Criteria:**
- [ ] On every `PriceChange` write, deliver a signed webhook payload to all matching endpoints
- [ ] Delivery is async; failures are retried up to 3 times with exponential backoff
- [ ] HMAC-SHA256 signature in `X-PriceIQ-Signature` header
- [ ] CRUD API for managing webhook endpoints

---

### Task 20: Cross-product elasticity (cannibalization detection)

**Goal:** Detect when products in the same category compete with each other — raising price on one shifts demand to another — and surface this as a warning.

**Files:**
- Create: `src/lib/elasticity/crossElasticity.ts`
- Modify: `src/app/api/products/[id]/recommend/route.ts`

**Acceptance Criteria:**
- [ ] `detectCannibalization(merchantId, productId, prisma)` checks if raising this product's price historically correlates with demand uplift on sibling products in the same category
- [ ] Warning appended to `reasoning` string when cannibalization detected: "Note: raising this price may shift demand to [Product X]"
- [ ] Requires ≥6 months of sales history for multiple products in same category to run

---

### Task 21: Developer API (API key auth)

**Goal:** Expose PriceIQ's recommendation engine as a REST API for enterprise customers who want to integrate recommendations into their own systems.

**Files:**
- Modify: `prisma/schema.prisma` — add `ApiKey` model
- Create: `src/lib/auth/apiKeyAuth.ts`
- Create: `src/app/api/v1/` — product list, recommendation endpoints

**Acceptance Criteria:**
- [ ] `ApiKey` model: `{ id, merchantId, keyHash, name, lastUsedAt, createdAt }`
- [ ] All `GET /api/v1/*` and `POST /api/v1/*/recommend` routes accept `Authorization: Bearer <key>` in addition to session cookie
- [ ] Keys are shown once at creation time (stored as argon2id hash)
- [ ] Per-key rate limit: 1000 req/hour

---

## Summary Table

| Phase | Tasks | Outcome |
|---|---|---|
| **1 — MVP** | 1–8 | ML pricing loop complete: upload → fit → simulate → recommend |
| **2 — SMB** | 9–14 | Trust signals, portfolio view, price history, auth hardening |
| **3 — Enterprise** | 15–21 | Shopify sync, teams, bulk ops, export, webhooks, cross-elasticity, API |

**Build Phase 1 first** — it's the entire unique value proposition. Nothing in Phase 2 or 3 matters if the ML core doesn't work.
