# Competitor Price Benchmarking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:subagent-driven-development (recommended) or superpowers-extended-cc:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a merchant maintain a persisted list of competitor prices per product, see it on the product detail page with min/median/max stats, and optionally carry that list into Launch Planner to prefill the competitor-prices field for that product.

**Architecture:** A new `CompetitorPrice` model (one row per competitor observation, additive-only schema change) is CRUD'd from a new card on the product detail page via a standard per-product-owned API route pair (`/competitor-prices` for list+create, `/competitor-prices/[cpId]` for edit+delete). The min/median/max stats math already living privately inside `calculateLaunchPlan.ts` is extracted into a shared `src/lib/pricing/marketStats.ts` utility, reused by both the new card and the existing Launch Planner calculation (pure refactor, no behavior change). Launch Planner — which stays a fully standalone calculator — gains an optional `?productId=` query param that prefills its existing competitor-prices text field from the saved list on mount.

**Tech Stack:** Next.js 16 App Router, TypeScript, Prisma 7, Vitest 4 — same stack and per-product route/ownership conventions used throughout this codebase (`assertProductOwned` from `@/lib/auth/ownership`, `requireSessionApi`, `withErrorHandling`/`HttpError`).

**User decisions (already made):**
- Manual entry only — no scraping, no automated price tracking. See design doc `docs/superpowers/specs/2026-08-04-competitor-price-benchmarking-design.md`.
- No historical price-change timeline per competitor — each row is a single current snapshot; editing a row bumps `capturedAt`.
- No live two-way sync between Launch Planner's in-session edits and the saved list — Launch Planner prefills once on load from `?productId=`, edits made in the calculator are not written back.
- No `@@unique` constraint on `(productId, competitorName)` — a merchant may track the same competitor twice (different SKU, or a fresh observation over time).

---

## Task 1: Schema — CompetitorPrice model

**Goal:** Add the data model this feature depends on.

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `prisma/schema.production.prisma`

**Acceptance Criteria:**
- [ ] `CompetitorPrice` model exists with `productId` (relation to `Product`, `onDelete: Cascade`), `merchantId`, `competitorName`, `priceCents`, optional `url`, and `capturedAt` (defaults to now)
- [ ] `Product` gains a `competitorPrices CompetitorPrice[]` relation
- [ ] Both schema files stay in sync (only the `datasource` block differs)

**Verify:** `npx prisma db push && npx prisma generate` → no errors

**Steps:**

- [ ] **Step 1: Edit `prisma/schema.prisma`**

Add to the `Product` model's relations block (alongside `priceSurveys`, `priceChanges`, etc.):

```prisma
  competitorPrices     CompetitorPrice[]
```

Add a new model anywhere in the file (e.g. after `PriceSurveyResponse`):

```prisma
model CompetitorPrice {
  id             String   @id @default(cuid())
  productId      String
  product        Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  merchantId     String
  competitorName String
  priceCents     Int
  url            String?
  capturedAt     DateTime @default(now())
}
```

- [ ] **Step 2: Apply the identical model additions to `prisma/schema.production.prisma`** (same `Product.competitorPrices` line, same new model — only the top-level `datasource` block differs between the two files).

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
git commit -m "feat: add CompetitorPrice model for competitor price benchmarking"
```

---

## Task 2: Extract shared market stats utility

**Goal:** Move the min/median/q1/q3 stats math out of `calculateLaunchPlan.ts` into a shared, reusable module — no behavior change, but now usable by the new competitor-prices UI too.

**Files:**
- Create: `src/lib/pricing/marketStats.ts`
- Test: `src/lib/pricing/marketStats.test.ts`
- Modify: `src/lib/launchPlanner/calculateLaunchPlan.ts`

**Acceptance Criteria:**
- [ ] `calculateMarketStats(pricesCents: number[])` computes `{ minCents, maxCents, medianCents, q1Cents, q3Cents }` from a **sorted ascending** array — identical math to the private function it replaces
- [ ] `calculateLaunchPlan.ts` imports and uses the shared function instead of its own private copy; `LaunchMarketStats` remains importable from `calculateLaunchPlan.ts` (re-exported) so `explainLaunchPrice.ts` and any other existing importer needs no changes
- [ ] `calculateLaunchPlan.test.ts` passes unmodified — confirms no behavior regression from the refactor

**Verify:** `npm test -- src/lib/pricing/marketStats.test.ts src/lib/launchPlanner/calculateLaunchPlan.test.ts` → all pass

**Steps:**

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/pricing/marketStats.test.ts
import { describe, it, expect } from "vitest";
import { calculateMarketStats } from "./marketStats";

describe("calculateMarketStats", () => {
  it("computes min/max/median for a single price", () => {
    const stats = calculateMarketStats([5000]);
    expect(stats).toEqual({
      minCents: 5000,
      maxCents: 5000,
      medianCents: 5000,
      q1Cents: 5000,
      q3Cents: 5000,
    });
  });

  it("computes stats for an odd-length sorted array", () => {
    const stats = calculateMarketStats([3000, 7000, 8000, 9000, 10000]);
    expect(stats.minCents).toBe(3000);
    expect(stats.maxCents).toBe(10000);
    expect(stats.medianCents).toBe(8000);
    expect(stats.q1Cents).toBe(7000);
  });

  it("computes stats for an even-length sorted array", () => {
    const stats = calculateMarketStats([4000, 5000, 9000, 10000]);
    expect(stats.medianCents).toBe(7000);
    expect(stats.q3Cents).toBe(9250);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/pricing/marketStats.test.ts`
Expected: FAIL — module doesn't exist

- [ ] **Step 3: Write the implementation**

Copy the two private functions (`calculateMarketStats`, `percentile`) out of `src/lib/launchPlanner/calculateLaunchPlan.ts` (lines 136–157 as of this plan's writing) verbatim into the new file, exporting the interface and the top-level function:

```typescript
// src/lib/pricing/marketStats.ts

export interface MarketStats {
  minCents: number;
  maxCents: number;
  medianCents: number;
  q1Cents: number;
  q3Cents: number;
}

/** Expects `prices` already sorted ascending. */
export function calculateMarketStats(prices: number[]): MarketStats {
  return {
    minCents: prices[0],
    maxCents: prices[prices.length - 1],
    medianCents: percentile(prices, 0.5),
    q1Cents: percentile(prices, 0.25),
    q3Cents: percentile(prices, 0.75),
  };
}

function percentile(sortedPrices: number[], pct: number): number {
  const index = (sortedPrices.length - 1) * pct;
  const lowerIndex = Math.floor(index);
  const upperIndex = Math.ceil(index);

  if (lowerIndex === upperIndex) {
    return sortedPrices[lowerIndex];
  }

  const weight = index - lowerIndex;
  return Math.round(sortedPrices[lowerIndex] * (1 - weight) + sortedPrices[upperIndex] * weight);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/pricing/marketStats.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Refactor `calculateLaunchPlan.ts` to use the shared module**

Replace the private `calculateMarketStats`/`percentile` functions and the `LaunchMarketStats` interface in `src/lib/launchPlanner/calculateLaunchPlan.ts` with:

```typescript
import { calculateMarketStats, type MarketStats } from "@/lib/pricing/marketStats";

export type { MarketStats as LaunchMarketStats } from "@/lib/pricing/marketStats";
```

Place this import/re-export near the top of the file (with the other imports/type exports), delete the old `export interface LaunchMarketStats { ... }` block and the two private functions (`calculateMarketStats`, `percentile`) that are now redundant. Every other reference to `LaunchMarketStats` and `calculateMarketStats` in the file (the `CalculateLaunchPlanResult` union, `marketTargetForPositioning`, the call site building `marketStats`) is unchanged — they resolve to the same names via the import/re-export.

- [ ] **Step 6: Run both test suites to verify no regression**

```bash
npm test -- src/lib/pricing/marketStats.test.ts src/lib/launchPlanner/calculateLaunchPlan.test.ts
```

Expected: PASS, `calculateLaunchPlan.test.ts` passes with zero edits to that test file.

- [ ] **Step 7: Commit**

```bash
git add src/lib/pricing/marketStats.ts src/lib/pricing/marketStats.test.ts src/lib/launchPlanner/calculateLaunchPlan.ts
git commit -m "refactor: extract market stats calculation into a shared module"
```

---

## Task 3: Competitor price CRUD API

**Goal:** Let a merchant list, add, edit, and delete competitor prices for a product they own.

**Files:**
- Create: `src/app/api/products/[id]/competitor-prices/route.ts`
- Test: `src/app/api/products/[id]/competitor-prices/route.test.ts`
- Create: `src/app/api/products/[id]/competitor-prices/[cpId]/route.ts`
- Test: `src/app/api/products/[id]/competitor-prices/[cpId]/route.test.ts`

**Acceptance Criteria:**
- [ ] `GET /api/products/[id]/competitor-prices` returns the product's rows sorted by `priceCents` ascending; 404 if the product isn't owned by the caller
- [ ] `POST /api/products/[id]/competitor-prices` creates a row (`competitorName`, `priceCents`, optional `url`); 400 for empty name, non-positive/non-integer price, or an invalid (non-http/https) `url`
- [ ] `PATCH /api/products/[id]/competitor-prices/[cpId]` updates the given fields and bumps `capturedAt` to now; 404 if the row doesn't belong to that product/merchant
- [ ] `DELETE /api/products/[id]/competitor-prices/[cpId]` removes the row; 404 if it doesn't belong to that product/merchant

**Verify:** `npm test -- "src/app/api/products/[id]/competitor-prices"` → all pass

**Steps:**

- [ ] **Step 1: Write the failing test for list+create**

```typescript
// src/app/api/products/[id]/competitor-prices/route.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const { findMany, create } = vi.hoisted(() => ({
  findMany: vi.fn(),
  create: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    competitorPrice: { findMany, create },
  },
}));

vi.mock("@/lib/auth/requireSession", () => ({
  requireSessionApi: vi.fn(async () => ({
    merchantId: "m1",
    user: { id: "u1", email: "demo@zorin.example", merchantId: "m1" },
  })),
}));

const { assertProductOwned } = vi.hoisted(() => ({ assertProductOwned: vi.fn(async () => undefined) }));

vi.mock("@/lib/auth/ownership", () => ({
  assertProductOwned,
  filterOwnedProductIds: vi.fn(async (_p: unknown, ids: string[]) => ids),
}));

import { GET, POST } from "./route";
import { prisma } from "@/lib/db";
import { HttpError } from "@/lib/api/errors";

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const reqWith = (body: unknown) => ({ json: async () => body }) as unknown as Request;
const reqNoBody = () => ({}) as unknown as Request;

beforeEach(() => {
  findMany.mockReset();
  create.mockReset();
  assertProductOwned.mockReset();
  assertProductOwned.mockResolvedValue(undefined);
});

describe("GET /api/products/[id]/competitor-prices", () => {
  it("returns 404 when the product isn't owned by the caller", async () => {
    assertProductOwned.mockRejectedValue(new HttpError(404, "Not found"));
    const res = await GET(reqNoBody(), ctx("p1"));
    expect(res.status).toBe(404);
    expect(findMany).not.toHaveBeenCalled();
  });

  it("lists rows sorted by priceCents ascending", async () => {
    (findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "cp1", competitorName: "Acme", priceCents: 2900, url: null, capturedAt: new Date("2026-08-01") },
      { id: "cp2", competitorName: "Widgetco", priceCents: 3500, url: "https://widgetco.example/p", capturedAt: new Date("2026-08-02") },
    ]);
    const res = await GET(reqNoBody(), ctx("p1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([
      { id: "cp1", competitorName: "Acme", priceCents: 2900, url: null, capturedAt: "2026-08-01T00:00:00.000Z" },
      { id: "cp2", competitorName: "Widgetco", priceCents: 3500, url: "https://widgetco.example/p", capturedAt: "2026-08-02T00:00:00.000Z" },
    ]);
    expect(prisma.competitorPrice.findMany).toHaveBeenCalledWith({
      where: { productId: "p1" },
      orderBy: { priceCents: "asc" },
    });
  });
});

describe("POST /api/products/[id]/competitor-prices", () => {
  it("returns 404 when the product isn't owned by the caller", async () => {
    assertProductOwned.mockRejectedValue(new HttpError(404, "Not found"));
    const res = await POST(reqWith({ competitorName: "Acme", priceCents: 2900 }), ctx("p1"));
    expect(res.status).toBe(404);
    expect(create).not.toHaveBeenCalled();
  });

  it("returns 400 for an empty competitor name", async () => {
    const res = await POST(reqWith({ competitorName: "  ", priceCents: 2900 }), ctx("p1"));
    expect(res.status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });

  it("returns 400 for a non-positive price", async () => {
    const res = await POST(reqWith({ competitorName: "Acme", priceCents: 0 }), ctx("p1"));
    expect(res.status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });

  it("returns 400 for an invalid url", async () => {
    const res = await POST(
      reqWith({ competitorName: "Acme", priceCents: 2900, url: "not-a-url" }),
      ctx("p1"),
    );
    expect(res.status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });

  it("creates a row with a valid url", async () => {
    (create as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "cp1",
      competitorName: "Acme",
      priceCents: 2900,
      url: "https://acme.example/p",
      capturedAt: new Date("2026-08-04"),
    });
    const res = await POST(
      reqWith({ competitorName: "Acme", priceCents: 2900, url: "https://acme.example/p" }),
      ctx("p1"),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      id: "cp1",
      competitorName: "Acme",
      priceCents: 2900,
      url: "https://acme.example/p",
      capturedAt: "2026-08-04T00:00:00.000Z",
    });
    expect(prisma.competitorPrice.create).toHaveBeenCalledWith({
      data: { productId: "p1", merchantId: "m1", competitorName: "Acme", priceCents: 2900, url: "https://acme.example/p" },
    });
  });

  it("creates a row with no url (stores null)", async () => {
    (create as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "cp1",
      competitorName: "Acme",
      priceCents: 2900,
      url: null,
      capturedAt: new Date("2026-08-04"),
    });
    await POST(reqWith({ competitorName: "Acme", priceCents: 2900 }), ctx("p1"));
    expect(prisma.competitorPrice.create).toHaveBeenCalledWith({
      data: { productId: "p1", merchantId: "m1", competitorName: "Acme", priceCents: 2900, url: null },
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- "src/app/api/products/[id]/competitor-prices/route.test.ts"`
Expected: FAIL — route module doesn't exist

- [ ] **Step 3: Write the list+create route**

```typescript
// src/app/api/products/[id]/competitor-prices/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { HttpError, withErrorHandling } from "@/lib/api/errors";
import { requireSessionApi } from "@/lib/auth/requireSession";
import { assertProductOwned } from "@/lib/auth/ownership";

interface CompetitorPriceRow {
  id: string;
  competitorName: string;
  priceCents: number;
  url: string | null;
  capturedAt: Date;
}

function serialize(row: CompetitorPriceRow) {
  return {
    id: row.id,
    competitorName: row.competitorName,
    priceCents: row.priceCents,
    url: row.url,
    capturedAt: row.capturedAt.toISOString(),
  };
}

/** Absolute http(s) URL only — competitor product pages live on arbitrary external domains. */
function validateUrl(value: unknown): string | null | undefined {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") return undefined;
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return undefined;
    return value;
  } catch {
    return undefined;
  }
}

function isPositiveInt(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n) && Number.isInteger(n) && n > 0;
}

export const GET = withErrorHandling(
  async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { merchantId } = await requireSessionApi();
    const { id: productId } = await params;
    await assertProductOwned(prisma, productId, merchantId);

    const rows = await prisma.competitorPrice.findMany({
      where: { productId },
      orderBy: { priceCents: "asc" },
    });

    return NextResponse.json(rows.map(serialize));
  },
);

export const POST = withErrorHandling(
  async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { merchantId } = await requireSessionApi();
    const { id: productId } = await params;
    await assertProductOwned(prisma, productId, merchantId);

    const body = await req.json() as {
      competitorName?: unknown;
      priceCents?: unknown;
      url?: unknown;
    };

    const competitorName = typeof body.competitorName === "string" ? body.competitorName.trim() : "";
    if (competitorName === "") {
      throw new HttpError(400, "Competitor name is required");
    }
    if (!isPositiveInt(body.priceCents)) {
      throw new HttpError(400, "Price must be a positive whole number of cents");
    }
    const url = validateUrl(body.url);
    if (url === undefined) {
      throw new HttpError(400, "url must be a valid http(s) URL");
    }

    const row = await prisma.competitorPrice.create({
      data: { productId, merchantId, competitorName, priceCents: body.priceCents, url },
    });

    return NextResponse.json(serialize(row));
  },
);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- "src/app/api/products/[id]/competitor-prices/route.test.ts"`
Expected: PASS (7 tests)

- [ ] **Step 5: Commit the list+create route**

```bash
git add "src/app/api/products/[id]/competitor-prices/route.ts" "src/app/api/products/[id]/competitor-prices/route.test.ts"
git commit -m "feat: add competitor price list/create API"
```

- [ ] **Step 6: Write the failing test for edit+delete**

```typescript
// src/app/api/products/[id]/competitor-prices/[cpId]/route.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const { findFirst, update, deleteOne } = vi.hoisted(() => ({
  findFirst: vi.fn(),
  update: vi.fn(),
  deleteOne: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    competitorPrice: { findFirst, update, delete: deleteOne },
  },
}));

vi.mock("@/lib/auth/requireSession", () => ({
  requireSessionApi: vi.fn(async () => ({
    merchantId: "m1",
    user: { id: "u1", email: "demo@zorin.example", merchantId: "m1" },
  })),
}));

const { assertProductOwned } = vi.hoisted(() => ({ assertProductOwned: vi.fn(async () => undefined) }));

vi.mock("@/lib/auth/ownership", () => ({
  assertProductOwned,
  filterOwnedProductIds: vi.fn(async (_p: unknown, ids: string[]) => ids),
}));

import { PATCH, DELETE } from "./route";
import { prisma } from "@/lib/db";
import { HttpError } from "@/lib/api/errors";

const ctx = (id: string, cpId: string) => ({ params: Promise.resolve({ id, cpId }) });
const reqWith = (body: unknown) => ({ json: async () => body }) as unknown as Request;
const reqNoBody = () => ({}) as unknown as Request;

beforeEach(() => {
  findFirst.mockReset();
  update.mockReset();
  deleteOne.mockReset();
  assertProductOwned.mockReset();
  assertProductOwned.mockResolvedValue(undefined);
});

describe("PATCH /api/products/[id]/competitor-prices/[cpId]", () => {
  it("returns 404 when the product isn't owned by the caller", async () => {
    assertProductOwned.mockRejectedValue(new HttpError(404, "Not found"));
    const res = await PATCH(reqWith({ priceCents: 3000 }), ctx("p1", "cp1"));
    expect(res.status).toBe(404);
    expect(update).not.toHaveBeenCalled();
  });

  it("returns 404 when the row doesn't belong to this product", async () => {
    (findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await PATCH(reqWith({ priceCents: 3000 }), ctx("p1", "cp1"));
    expect(res.status).toBe(404);
    expect(update).not.toHaveBeenCalled();
  });

  it("returns 400 for a non-positive price", async () => {
    (findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "cp1", productId: "p1" });
    const res = await PATCH(reqWith({ priceCents: -1 }), ctx("p1", "cp1"));
    expect(res.status).toBe(400);
    expect(update).not.toHaveBeenCalled();
  });

  it("updates the given fields and bumps capturedAt", async () => {
    (findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "cp1", productId: "p1" });
    (update as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "cp1",
      competitorName: "Acme",
      priceCents: 3200,
      url: null,
      capturedAt: new Date("2026-08-04"),
    });

    const res = await PATCH(reqWith({ priceCents: 3200 }), ctx("p1", "cp1"));

    expect(res.status).toBe(200);
    expect(prisma.competitorPrice.update).toHaveBeenCalledWith({
      where: { id: "cp1" },
      data: { priceCents: 3200, capturedAt: expect.any(Date) },
    });
  });
});

describe("DELETE /api/products/[id]/competitor-prices/[cpId]", () => {
  it("returns 404 when the row doesn't belong to this product", async () => {
    (findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await DELETE(reqNoBody(), ctx("p1", "cp1"));
    expect(res.status).toBe(404);
    expect(deleteOne).not.toHaveBeenCalled();
  });

  it("deletes the row", async () => {
    (findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "cp1", productId: "p1" });
    (deleteOne as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const res = await DELETE(reqNoBody(), ctx("p1", "cp1"));
    expect(res.status).toBe(200);
    expect(prisma.competitorPrice.delete).toHaveBeenCalledWith({ where: { id: "cp1" } });
  });
});
```

- [ ] **Step 7: Run to confirm it fails, then write the edit+delete route**

```typescript
// src/app/api/products/[id]/competitor-prices/[cpId]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { HttpError, withErrorHandling } from "@/lib/api/errors";
import { requireSessionApi } from "@/lib/auth/requireSession";
import { assertProductOwned } from "@/lib/auth/ownership";

function serialize(row: {
  id: string;
  competitorName: string;
  priceCents: number;
  url: string | null;
  capturedAt: Date;
}) {
  return {
    id: row.id,
    competitorName: row.competitorName,
    priceCents: row.priceCents,
    url: row.url,
    capturedAt: row.capturedAt.toISOString(),
  };
}

function validateUrl(value: unknown): string | null | undefined {
  if (value === undefined) return null;
  if (value === null || value === "") return null;
  if (typeof value !== "string") return undefined;
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return undefined;
    return value;
  } catch {
    return undefined;
  }
}

function isPositiveInt(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n) && Number.isInteger(n) && n > 0;
}

async function loadOwnedRow(productId: string, cpId: string) {
  const row = await prisma.competitorPrice.findFirst({ where: { id: cpId, productId } });
  if (!row) throw new HttpError(404, "Not found");
  return row;
}

export const PATCH = withErrorHandling(
  async (req: Request, { params }: { params: Promise<{ id: string; cpId: string }> }) => {
    const { merchantId } = await requireSessionApi();
    const { id: productId, cpId } = await params;
    await assertProductOwned(prisma, productId, merchantId);
    await loadOwnedRow(productId, cpId);

    const body = await req.json() as {
      competitorName?: unknown;
      priceCents?: unknown;
      url?: unknown;
    };

    const data: { competitorName?: string; priceCents?: number; url?: string | null; capturedAt: Date } = {
      capturedAt: new Date(),
    };

    if (body.competitorName !== undefined) {
      const name = typeof body.competitorName === "string" ? body.competitorName.trim() : "";
      if (name === "") throw new HttpError(400, "Competitor name cannot be empty");
      data.competitorName = name;
    }
    if (body.priceCents !== undefined) {
      if (!isPositiveInt(body.priceCents)) {
        throw new HttpError(400, "Price must be a positive whole number of cents");
      }
      data.priceCents = body.priceCents;
    }
    if (body.url !== undefined) {
      const url = validateUrl(body.url);
      if (url === undefined) throw new HttpError(400, "url must be a valid http(s) URL");
      data.url = url;
    }

    const row = await prisma.competitorPrice.update({ where: { id: cpId }, data });
    return NextResponse.json(serialize(row));
  },
);

export const DELETE = withErrorHandling(
  async (_req: Request, { params }: { params: Promise<{ id: string; cpId: string }> }) => {
    const { merchantId } = await requireSessionApi();
    const { id: productId, cpId } = await params;
    await assertProductOwned(prisma, productId, merchantId);
    await loadOwnedRow(productId, cpId);

    await prisma.competitorPrice.delete({ where: { id: cpId } });
    return NextResponse.json({ ok: true });
  },
);
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npm test -- "src/app/api/products/[id]/competitor-prices/[cpId]/route.test.ts"`
Expected: PASS (6 tests)

- [ ] **Step 9: Commit**

```bash
git add "src/app/api/products/[id]/competitor-prices/[cpId]/route.ts" "src/app/api/products/[id]/competitor-prices/[cpId]/route.test.ts"
git commit -m "feat: add competitor price edit/delete API"
```

---

## Task 4: Competitor prices card + product page wiring

**Goal:** Let a merchant view, add, edit, and remove competitor prices from the product detail page, with summary stats.

**Files:**
- Create: `src/components/CompetitorPricesCard.tsx`
- Modify: `src/app/product/[id]/page.tsx`

**Acceptance Criteria:**
- [ ] Product page shows a "Competitor prices" card alongside the existing cards (`RecommendationCard`, `PriceSurveyCard`)
- [ ] Empty state: "No competitor prices yet — add one to benchmark this product against the market."
- [ ] With ≥1 row: shows min/median/max (via `calculateMarketStats`) above a table (competitor name, price, optional link-out, captured date, edit/remove)
- [ ] Inline add-row form creates a new row without a page reload
- [ ] A "Plan launch price →" link points to `/launch-planner?productId=<id>`

**Verify:** Manual check in the browser — add a few competitor prices, confirm stats/table update, confirm the launch-planner link carries the product id.

**Steps:**

- [ ] **Step 1: Write the card component**

```tsx
// src/components/CompetitorPricesCard.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { calculateMarketStats } from "@/lib/pricing/marketStats";
import { centsToDollars, dollarsToCents, formatCents } from "@/lib/money";

interface CompetitorPriceRow {
  id: string;
  competitorName: string;
  priceCents: number;
  url: string | null;
  capturedAt: string;
}

export function CompetitorPricesCard({ productId }: { productId: string }) {
  const [rows, setRows] = useState<CompetitorPriceRow[] | null>(null);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchRows() {
    const res = await fetch(`/api/products/${productId}/competitor-prices`);
    if (res.ok) setRows(await res.json());
  }

  useEffect(() => {
    fetchRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  async function addRow(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const priceCents = dollarsToCents(price);
    if (name.trim() === "" || priceCents === null || priceCents <= 0) {
      setError("Enter a competitor name and a valid price.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/products/${productId}/competitor-prices`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          competitorName: name.trim(),
          priceCents,
          url: url.trim() === "" ? null : url.trim(),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Failed to add competitor price");
      }
      setName("");
      setPrice("");
      setUrl("");
      await fetchRows();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add competitor price");
    } finally {
      setSaving(false);
    }
  }

  async function removeRow(id: string) {
    await fetch(`/api/products/${productId}/competitor-prices/${id}`, { method: "DELETE" });
    await fetchRows();
  }

  if (rows === null) {
    return <div className="h-32 animate-pulse rounded-xl border border-line bg-panel" />;
  }

  const stats = rows.length > 0 ? calculateMarketStats(rows.map((r) => r.priceCents).sort((a, b) => a - b)) : null;

  return (
    <div className="rounded-xl border border-line bg-surface p-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-ink">Competitor prices</h3>
          <p className="mt-0.5 text-xs text-muted">
            Track what similar products cost elsewhere to benchmark this one against the market.
          </p>
        </div>
        <Link href={`/launch-planner?productId=${productId}`} className="btn btn-ghost text-xs whitespace-nowrap">
          Plan launch price →
        </Link>
      </div>

      {rows.length === 0 ? (
        <p className="mt-4 text-xs text-faint">No competitor prices yet — add one to benchmark this product against the market.</p>
      ) : (
        <>
          {stats && (
            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-line bg-panel p-3">
                <p className="text-xs text-muted">Min</p>
                <p className="mt-1 text-sm font-semibold tabular text-ink">{formatCents(stats.minCents)}</p>
              </div>
              <div className="rounded-lg border border-line bg-panel p-3">
                <p className="text-xs text-muted">Median</p>
                <p className="mt-1 text-sm font-semibold tabular text-ink">{formatCents(stats.medianCents)}</p>
              </div>
              <div className="rounded-lg border border-line bg-panel p-3">
                <p className="text-xs text-muted">Max</p>
                <p className="mt-1 text-sm font-semibold tabular text-ink">{formatCents(stats.maxCents)}</p>
              </div>
            </div>
          )}
          <div className="mt-4 divide-y divide-line">
            {rows.map((row) => (
              <div key={row.id} className="flex items-center gap-3 py-2 text-sm">
                <div className="flex-1 min-w-0">
                  {row.url ? (
                    <a href={row.url} target="_blank" rel="noreferrer" className="text-ink hover:underline">
                      {row.competitorName}
                    </a>
                  ) : (
                    <span className="text-ink">{row.competitorName}</span>
                  )}
                  <p className="text-xs text-faint">{new Date(row.capturedAt).toLocaleDateString()}</p>
                </div>
                <span className="tabular text-ink">{formatCents(row.priceCents)}</span>
                <button onClick={() => removeRow(row.id)} className="text-xs text-faint hover:text-danger">
                  Remove
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      <form onSubmit={addRow} className="mt-4 flex flex-wrap items-end gap-2">
        <label className="grid gap-1 text-xs font-medium text-muted">
          Competitor
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-lg border border-line-strong bg-surface px-2 py-2 text-sm text-ink outline-none"
            placeholder="Acme Co"
          />
        </label>
        <label className="grid gap-1 text-xs font-medium text-muted">
          Price
          <input
            type="number"
            min="0"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-24 rounded-lg border border-line-strong bg-surface px-2 py-2 text-sm text-ink outline-none"
            placeholder="0.00"
          />
        </label>
        <label className="grid gap-1 text-xs font-medium text-muted flex-1 min-w-[10rem]">
          Link (optional)
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="rounded-lg border border-line-strong bg-surface px-2 py-2 text-sm text-ink outline-none"
            placeholder="https://…"
          />
        </label>
        <button type="submit" disabled={saving} className="btn btn-ghost text-xs">
          {saving ? "Adding…" : "Add"}
        </button>
      </form>

      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}
```

Note: `centsToDollars` is imported but unused as written — remove that import if the final implementation doesn't need it (it's not used because the price input takes raw dollar strings and `dollarsToCents` parses them; keep imports clean).

- [ ] **Step 2: Wire into the product detail page**

In `src/app/product/[id]/page.tsx`, add the import:

```typescript
import { CompetitorPricesCard } from "@/components/CompetitorPricesCard";
```

Add `<CompetitorPricesCard productId={d.id} />` right after the existing `<PriceSurveyCard productId={d.id} />` line (around line 219).

- [ ] **Step 3: Manually verify in the browser**

Start the dev server, open a product detail page, add 2-3 competitor prices with varied values, confirm the min/median/max stats update and the table renders each row with its captured date. Click "Remove" on one and confirm it disappears. Click "Plan launch price →" and confirm the URL includes `?productId=<id>`.

- [ ] **Step 4: Commit**

```bash
git add src/components/CompetitorPricesCard.tsx "src/app/product/[id]/page.tsx"
git commit -m "feat: add competitor prices card to the product page"
```

---

## Task 5: Launch Planner prefill from a product's saved competitor prices

**Goal:** When Launch Planner is opened with `?productId=`, prefill the existing competitor-prices field from that product's saved list.

**Files:**
- Modify: `src/components/LaunchPlanner.tsx`
- Test: `src/components/LaunchPlanner.test.tsx`

**Acceptance Criteria:**
- [ ] With no `productId` in the URL, behavior is unchanged from today (field starts empty)
- [ ] With a `productId` that has saved competitor prices, the field is prefilled with a comma-separated dollar list on mount
- [ ] If the fetch fails or the product has zero saved rows, the field stays empty — no error state blocks the rest of the calculator

**Verify:** `npm test -- src/components/LaunchPlanner.test.tsx` → all pass

**Steps:**

- [ ] **Step 1: Read the existing test file first**

Read `src/components/LaunchPlanner.test.tsx` in full to see its current mocking conventions (how it renders the component, whether `next/navigation`'s `useSearchParams` is already mocked anywhere in this codebase's test setup) before adding new cases — match whatever pattern is already there rather than introducing a second one.

- [ ] **Step 2: Add the failing test cases**

Add to `src/components/LaunchPlanner.test.tsx` (adjust the exact render/mock helpers to match what Step 1 found — the shape below assumes `next/navigation` needs mocking, which is the standard approach for a component reading `useSearchParams` outside of Next's router context in Vitest):

```typescript
import { vi } from "vitest";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(globalThis.__testSearchParams ?? ""),
}));

// ...within the describe block, alongside existing tests:

it("prefills competitor prices from a product's saved list when ?productId= is present", async () => {
  globalThis.__testSearchParams = "productId=p1";
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => [
      { id: "cp1", competitorName: "Acme", priceCents: 2900, url: null, capturedAt: "2026-08-01T00:00:00.000Z" },
      { id: "cp2", competitorName: "Widgetco", priceCents: 3500, url: null, capturedAt: "2026-08-02T00:00:00.000Z" },
    ],
  }) as unknown as typeof fetch;

  render(<LaunchPlanner />);

  const field = await screen.findByLabelText(/competitor prices/i);
  await waitFor(() => expect((field as HTMLTextAreaElement).value).toContain("29.00"));
  expect((field as HTMLTextAreaElement).value).toContain("35.00");

  globalThis.__testSearchParams = undefined;
});

it("leaves competitor prices empty when no productId is present", () => {
  globalThis.__testSearchParams = "";
  global.fetch = vi.fn();

  render(<LaunchPlanner />);

  const field = screen.getByLabelText(/competitor prices/i) as HTMLTextAreaElement;
  expect(field.value).toBe("");
  expect(global.fetch).not.toHaveBeenCalled();
});
```

Use whatever the field's actual accessible label/selector is in the real component (check the `Competitor prices` field's JSX around `LaunchPlanner.tsx:291` — it may need an explicit label association if `getByLabelText` doesn't already resolve it; if so, prefer `screen.getByPlaceholderText` or a `data-testid` matching this codebase's existing test-query conventions instead of changing the component's markup just for testability).

- [ ] **Step 3: Run to confirm the new tests fail**

Run: `npm test -- src/components/LaunchPlanner.test.tsx`
Expected: FAIL — no prefill behavior yet

- [ ] **Step 4: Add the prefill logic to `LaunchPlanner.tsx`**

Add the import:

```typescript
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
```

(Merge with the existing `import { useMemo, useState } from "react";` line — add `useEffect` to it rather than a second React import.)

Inside `export function LaunchPlanner()`, after the existing `useState` declarations, add:

```typescript
  const searchParams = useSearchParams();
  const productId = searchParams.get("productId");

  useEffect(() => {
    if (!productId) return;
    let active = true;
    fetch(`/api/products/${productId}/competitor-prices`)
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: { priceCents: number }[]) => {
        if (!active || rows.length === 0) return;
        setCompetitors(rows.map((r) => (r.priceCents / 100).toFixed(2)).join(", "));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [productId]);
```

This runs once on mount (or whenever `productId` changes) and only overwrites the field if the fetch actually returns rows — an empty list or a failed request leaves whatever the merchant already typed untouched.

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- src/components/LaunchPlanner.test.tsx`
Expected: PASS (all tests, including the two new ones)

- [ ] **Step 6: Manually verify in the browser**

Add a competitor price to a product via Task 4's card, click "Plan launch price →" from that product's page, confirm the "Competitor prices" field on `/launch-planner` is prefilled. Navigate to `/launch-planner` directly (no query param) and confirm the field is empty as before.

- [ ] **Step 7: Commit**

```bash
git add src/components/LaunchPlanner.tsx src/components/LaunchPlanner.test.tsx
git commit -m "feat: prefill Launch Planner competitor prices from a product's saved list"
```

---

## Task 6: Full-suite verification

**Goal:** Confirm the whole feature integrates cleanly with no regressions before merge.

**Files:** None (verification only)

**Acceptance Criteria:**
- [ ] Full test suite passes
- [ ] `npm run build` succeeds with no new route errors
- [ ] Manual end-to-end walkthrough: add competitor prices on a product → see stats/table update → follow "Plan launch price →" → confirm prefill → edit/remove a row back on the product page → confirm it's gone

**Verify:** `npm test && npm run build` → both succeed

**Steps:**

- [ ] **Step 1: Run the full test suite**

```bash
cd /c/Users/pohde/projects/zorin
npm test
```

Expected: all suites pass, count higher than the pre-feature baseline (562 as of this plan's writing).

- [ ] **Step 2: Run the production build**

```bash
npm run build
```

Expected: succeeds, `/product/[id]` and `/launch-planner` both still listed in the route output, no new type errors.

- [ ] **Step 3: Manual end-to-end walkthrough**

Start the dev server (`npm run dev`), open a product, add 2 competitor prices, confirm min/median/max render, click "Plan launch price →", confirm the competitor field is prefilled with both dollar values, go back to the product and remove one competitor price, confirm the table updates to one row.

- [ ] **Step 4: Final commit (if any cleanup was needed)**

```bash
git add -A
git commit -m "chore: final verification pass for competitor price benchmarking"
```

(Skip this commit if Steps 1–3 required no code changes.)

---

## Post-implementation notes

- Additive-only schema change (`CompetitorPrice` is a brand-new table) — same no-migration-risk shape as `PriceSurvey`/`ProcessedWebhook` before it. Still run the manual `prisma db push --schema=prisma/schema.production.prisma` confirmation pass against production after merge, per this project's standing pattern.
- Explicitly deferred (per the design doc): automated/scraped competitor price tracking, historical price-change timeline per competitor, live sync between Launch Planner's in-session edits and the saved list, cross-merchant aggregated category benchmarks.
