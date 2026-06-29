# Bulk Apply Recommendations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the user review live recommendations on the dashboard and apply many at once via checkboxes + a sticky action bar.

**Architecture:** Extract the single-apply route's "recompute + update + clear" logic into a shared `applyDecision(productId)` helper. A new `/api/apply/bulk` endpoint calls it per id and returns counts. `/api/products` computes a fresh decision per row (action + suggested price). `ProductsTable` adds pre-checked checkboxes for non-hold rows and a sticky "Apply N changes" bar.

**Tech Stack:** Next.js 16 (App Router, async `params`), Prisma 7 (better-sqlite3 adapter), Vitest 4, money as integer cents, `@/` → `src/` alias.

**Spec:** `docs/specs/2026-06-29-bulk-apply-design.md`

**Conventions for this codebase:**
- Tests are `*.test.ts` beside the source file. Run a single file with `npx vitest run <path>`.
- Prisma is mocked with `vi.hoisted` + `vi.mock("@/lib/db", ...)`.
- Route handlers are wrapped with `withErrorHandling`; throw `HttpError(status, msg)` for client errors.
- Money is integer **cents** throughout. `formatCents(cents)` renders `$24.00`.
- The decision engine already exists: `decideForProduct(product)` in `src/lib/recommendation.ts` returns a `Decision` with `action: "raise"|"lower"|"hold"` and `suggestedPrice` (cents).

---

### Task 1: Extract `applyDecision` shared helper and refactor single-apply route

**Files:**
- Create: `src/lib/apply.ts`
- Create: `src/lib/apply.test.ts`
- Modify: `src/app/api/products/[id]/apply/route.ts`
- Existing (must still pass, do not edit): `src/app/api/products/[id]/apply/route.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/apply.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const { findUnique, update, deleteMany } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  update: vi.fn(),
  deleteMany: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    product: { findUnique, update },
    recommendation: { deleteMany },
  },
}));

import { applyDecision } from "./apply";

beforeEach(() => {
  findUnique.mockReset();
  update.mockReset();
  deleteMany.mockReset();
});

describe("applyDecision", () => {
  it("reports not found and writes nothing for an unknown product", async () => {
    findUnique.mockResolvedValue(null);

    const result = await applyDecision("nope");

    expect(result).toMatchObject({ found: false, applied: false });
    expect(update).not.toHaveBeenCalled();
    expect(deleteMany).not.toHaveBeenCalled();
  });

  it("applies a raise: writes suggestedPrice, clears recommendation", async () => {
    findUnique.mockResolvedValue({
      id: "p1",
      currentPrice: 8000,
      cogs: 4000,
      competitors: [
        { price: 10000, observedAt: new Date("2026-06-28T00:00:00.000Z") },
        { price: 10000, observedAt: new Date("2026-06-28T00:00:00.000Z") },
      ],
    });
    update.mockResolvedValue({});
    deleteMany.mockResolvedValue({});

    const result = await applyDecision("p1");

    expect(result).toMatchObject({
      found: true,
      applied: true,
      action: "raise",
      currentPrice: 10000,
    });
    expect(update).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: { currentPrice: 10000 },
    });
    expect(deleteMany).toHaveBeenCalledWith({ where: { productId: "p1" } });
  });

  it("is a no-op on hold: no write, applied false", async () => {
    findUnique.mockResolvedValue({
      id: "p2",
      currentPrice: 5000,
      cogs: 2000,
      competitors: [],
    });

    const result = await applyDecision("p2");

    expect(result).toMatchObject({
      found: true,
      applied: false,
      action: "hold",
      currentPrice: 5000,
    });
    expect(update).not.toHaveBeenCalled();
    expect(deleteMany).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/apply.test.ts`
Expected: FAIL — cannot resolve `./apply` (module does not exist yet).

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/apply.ts`:

```ts
import { prisma } from "@/lib/db";
import { decideForProduct } from "@/lib/recommendation";

export interface ApplyResult {
  /** Whether the product exists. */
  found: boolean;
  /** Whether a price change was actually written. */
  applied: boolean;
  /** The decision action, or "" when not found. */
  action: string;
  /** The suggested/new price in cents, or 0 when not found. */
  currentPrice: number;
}

/**
 * Recompute a product's recommended price server-side. If it differs from the
 * current price, write it and clear the stale stored recommendation. Returns a
 * summary the caller maps to an HTTP response (single apply) or counts (bulk).
 */
export async function applyDecision(productId: string): Promise<ApplyResult> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { competitors: true },
  });
  if (!product) {
    return { found: false, applied: false, action: "", currentPrice: 0 };
  }

  const decision = decideForProduct(product);
  const applied = decision.suggestedPrice !== product.currentPrice;
  if (applied) {
    await prisma.product.update({
      where: { id: productId },
      data: { currentPrice: decision.suggestedPrice },
    });
    await prisma.recommendation.deleteMany({ where: { productId } });
  }

  return {
    found: true,
    applied,
    action: decision.action,
    currentPrice: decision.suggestedPrice,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/apply.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Refactor the single-apply route to use the helper**

Replace the entire contents of `src/app/api/products/[id]/apply/route.ts` with:

```ts
import { NextResponse } from "next/server";
import { HttpError, withErrorHandling } from "@/lib/api/errors";
import { applyDecision } from "@/lib/apply";

export const POST = withErrorHandling(
  async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const result = await applyDecision(id);
    if (!result.found) {
      throw new HttpError(404, "Not found");
    }
    return NextResponse.json({
      currentPrice: result.currentPrice,
      action: result.action,
      applied: result.applied,
    });
  },
);
```

- [ ] **Step 6: Verify the existing single-apply test still passes**

The existing `src/app/api/products/[id]/apply/route.test.ts` mocks `@/lib/db`; `applyDecision` imports the same mocked module, so it keeps working unchanged.

Run: `npx vitest run src/app/api/products/[id]/apply/route.test.ts`
Expected: PASS (3 tests — 404, raise, hold).

- [ ] **Step 7: Commit**

```bash
git add src/lib/apply.ts src/lib/apply.test.ts "src/app/api/products/[id]/apply/route.ts"
git commit -m "refactor: extract applyDecision helper from single-apply route"
```

---

### Task 2: Add `/api/apply/bulk` endpoint

**Files:**
- Create: `src/app/api/apply/bulk/route.ts`
- Create: `src/app/api/apply/bulk/route.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/app/api/apply/bulk/route.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const { applyDecision } = vi.hoisted(() => ({ applyDecision: vi.fn() }));

vi.mock("@/lib/apply", () => ({ applyDecision }));

import { POST } from "./route";

const req = (body: unknown) =>
  new Request("http://test/api/apply/bulk", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  applyDecision.mockReset();
});

describe("POST /api/apply/bulk", () => {
  it("applies the changed products and counts holds as skipped", async () => {
    applyDecision
      .mockResolvedValueOnce({ found: true, applied: true, action: "raise", currentPrice: 2400 })
      .mockResolvedValueOnce({ found: true, applied: true, action: "lower", currentPrice: 1800 })
      .mockResolvedValueOnce({ found: true, applied: false, action: "hold", currentPrice: 5000 });

    const res = await POST(req({ productIds: ["a", "b", "c"] }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ applied: 2, skipped: 1 });
    expect(applyDecision).toHaveBeenCalledTimes(3);
  });

  it("counts unknown ids as skipped, not fatal", async () => {
    applyDecision.mockResolvedValue({
      found: false,
      applied: false,
      action: "",
      currentPrice: 0,
    });

    const res = await POST(req({ productIds: ["ghost"] }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ applied: 0, skipped: 1 });
  });

  it("returns 400 when productIds is missing or not an array", async () => {
    const res = await POST(req({ nope: true }));
    expect(res.status).toBe(400);
    expect(applyDecision).not.toHaveBeenCalled();
  });

  it("returns 400 when productIds contains a non-string", async () => {
    const res = await POST(req({ productIds: ["ok", 7] }));
    expect(res.status).toBe(400);
    expect(applyDecision).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/api/apply/bulk/route.test.ts`
Expected: FAIL — cannot resolve `./route` (does not exist yet).

- [ ] **Step 3: Write minimal implementation**

Create `src/app/api/apply/bulk/route.ts`:

```ts
import { NextResponse } from "next/server";
import { HttpError, withErrorHandling } from "@/lib/api/errors";
import { parseJsonBody } from "@/lib/api/validation";
import { applyDecision } from "@/lib/apply";

export const POST = withErrorHandling(async (req: Request) => {
  const body = await parseJsonBody(req);
  const ids = body.productIds;
  if (!Array.isArray(ids) || ids.some((id) => typeof id !== "string")) {
    throw new HttpError(400, "productIds must be an array of strings");
  }

  let applied = 0;
  let skipped = 0;
  for (const id of ids as string[]) {
    const result = await applyDecision(id);
    if (result.found && result.applied) {
      applied++;
    } else {
      skipped++;
    }
  }

  return NextResponse.json({ applied, skipped });
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/app/api/apply/bulk/route.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/api/apply/bulk/route.ts src/app/api/apply/bulk/route.test.ts
git commit -m "feat: add POST /api/apply/bulk endpoint"
```

---

### Task 3: Compute fresh recommendation per row in `/api/products`

**Files:**
- Modify: `src/app/api/products/route.ts`
- Create: `src/app/api/products/route.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/app/api/products/route.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const { findMany } = vi.hoisted(() => ({ findMany: vi.fn() }));

vi.mock("@/lib/db", () => ({
  prisma: { product: { findMany } },
}));

import { GET } from "./route";

beforeEach(() => {
  findMany.mockReset();
});

describe("GET /api/products", () => {
  it("includes a fresh recommendedAction and suggestedPrice per row", async () => {
    findMany.mockResolvedValue([
      {
        id: "p1",
        title: "Underpriced",
        sku: "U-1",
        currentPrice: 8000,
        cogs: 4000,
        category: "x",
        estUnits: 10,
        competitors: [
          { price: 10000, observedAt: new Date("2026-06-28T00:00:00.000Z") },
          { price: 10000, observedAt: new Date("2026-06-28T00:00:00.000Z") },
        ],
        recommendation: null,
      },
    ]);

    const res = await GET();
    const rows = await res.json();

    expect(rows[0]).toMatchObject({
      id: "p1",
      recommendedAction: "raise",
      suggestedPrice: 10000,
    });
  });

  it("reports hold with the current price when there is no competitor data", async () => {
    findMany.mockResolvedValue([
      {
        id: "p2",
        title: "No comps",
        sku: "N-1",
        currentPrice: 5000,
        cogs: 2000,
        category: "x",
        estUnits: null,
        competitors: [],
        recommendation: null,
      },
    ]);

    const res = await GET();
    const rows = await res.json();

    expect(rows[0]).toMatchObject({
      recommendedAction: "hold",
      suggestedPrice: 5000,
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/api/products/route.test.ts`
Expected: FAIL — rows have `recommendationAction` but not `recommendedAction`/`suggestedPrice`.

- [ ] **Step 3: Write minimal implementation**

Replace the entire contents of `src/app/api/products/route.ts` with:

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { marginPct } from "@/lib/margin";
import { compare } from "@/lib/comparison";
import { decideForProduct } from "@/lib/recommendation";

export async function GET() {
  const products = await prisma.product.findMany({
    include: { competitors: true, recommendation: true },
    orderBy: { title: "asc" },
  });

  const rows = products.map((p) => {
    const obs = p.competitors.map((c) => ({
      price: c.price,
      observedAt: c.observedAt.toISOString(),
    }));
    const decision = decideForProduct(p);
    return {
      id: p.id,
      title: p.title,
      sku: p.sku,
      currentPrice: p.currentPrice,
      cogs: p.cogs,
      category: p.category,
      estUnits: p.estUnits,
      margin: marginPct(p.currentPrice, p.cogs),
      comparison: compare(p.currentPrice, obs),
      recommendedAction: decision.action,
      suggestedPrice: decision.suggestedPrice,
    };
  });

  return NextResponse.json(rows);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/app/api/products/route.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/api/products/route.ts src/app/api/products/route.test.ts
git commit -m "feat: return fresh recommendation per row from /api/products"
```

---

### Task 4: Dashboard checkboxes + sticky apply bar

**Files:**
- Modify: `src/components/ProductsTable.tsx`

No unit test: this codebase has no component tests and the table is verified via typecheck + manual browser check (consistent with existing `IngestUpload`/`RecommendationCard`, which also have none). Steps 3–4 are the verification gate.

- [ ] **Step 1: Replace the component**

Replace the entire contents of `src/components/ProductsTable.tsx` with:

```tsx
"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CogsInput } from "./CogsInput";
import { formatCents, pct } from "@/lib/money";

interface Row {
  id: string;
  title: string;
  sku: string;
  currentPrice: number;
  cogs: number | null;
  category: string;
  estUnits: number | null;
  margin: number | null;
  comparison: {
    compMedian: number | null;
    pctVsMedian: number | null;
    competitorCount: number;
  };
  recommendedAction: "raise" | "lower" | "hold";
  suggestedPrice: number;
}

const FLOOR = 0.15;

function positionBadge(pctVsMedian: number | null): string {
  if (pctVsMedian === null) return "—";
  if (pctVsMedian > 0.1) return "Above market";
  if (pctVsMedian < -0.1) return "Below market";
  return "At market";
}

export function ProductsTable() {
  const [rows, setRows] = useState<Row[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/products");
    const data: Row[] = await res.json();
    setRows(data);
    // Pre-select every product that has an actionable (non-hold) recommendation.
    setSelected(
      new Set(data.filter((r) => r.recommendedAction !== "hold").map((r) => r.id)),
    );
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function applySelected() {
    setApplying(true);
    setError(null);
    try {
      const res = await fetch("/api/apply/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productIds: [...selected] }),
      });
      if (!res.ok) throw new Error("bulk apply failed");
      // Reload so the table reflects new prices and cleared recommendations.
      if (typeof window !== "undefined") window.location.reload();
    } catch {
      setError("Couldn't apply changes — try again.");
      setApplying(false);
    }
  }

  return (
    <>
      <table className="w-full text-sm">
        <thead className="text-left text-gray-500">
          <tr>
            <th className="w-8 py-2"></th>
            <th>Product</th>
            <th>Price</th>
            <th>COGS</th>
            <th>Margin</th>
            <th>Comp. median</th>
            <th>Position</th>
            <th>Opportunity</th>
            <th>Recommendation</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const belowFloor = r.margin !== null && r.margin < FLOOR;
            const opp =
              r.estUnits !== null && r.comparison.compMedian !== null
                ? (r.comparison.compMedian - r.currentPrice) * r.estUnits
                : null;
            const actionable = r.recommendedAction !== "hold";
            return (
              <tr key={r.id} className="border-t">
                <td className="py-2">
                  {actionable && (
                    <input
                      type="checkbox"
                      checked={selected.has(r.id)}
                      onChange={() => toggle(r.id)}
                      aria-label={`Select ${r.title}`}
                    />
                  )}
                </td>
                <td className="py-2">
                  <Link className="font-medium underline" href={`/product/${r.id}`}>
                    {r.title}
                  </Link>
                  <div className="text-xs text-gray-400">{r.sku}</div>
                </td>
                <td>{formatCents(r.currentPrice)}</td>
                <td>
                  <CogsInput productId={r.id} initialCents={r.cogs} onSaved={load} />
                </td>
                <td className={belowFloor ? "font-semibold text-red-600" : ""}>
                  {r.margin === null ? "—" : pct(r.margin)}
                  {belowFloor ? " ⚠" : ""}
                </td>
                <td>
                  {r.comparison.compMedian === null
                    ? "—"
                    : formatCents(r.comparison.compMedian)}
                </td>
                <td>{positionBadge(r.comparison.pctVsMedian)}</td>
                <td>{opp === null ? "—" : formatCents(opp)}</td>
                <td>
                  {actionable ? (
                    <span>
                      {formatCents(r.currentPrice)} → {formatCents(r.suggestedPrice)}
                    </span>
                  ) : (
                    <span className="text-gray-400">Hold</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {selected.size > 0 && (
        <div className="fixed inset-x-0 bottom-0 border-t border-gray-200 bg-white p-4 shadow">
          <div className="mx-auto flex max-w-5xl items-center justify-between">
            <div>
              {error ? (
                <span className="text-sm text-red-600">{error}</span>
              ) : (
                <span className="text-sm text-gray-600">
                  {selected.size} change{selected.size === 1 ? "" : "s"} selected
                </span>
              )}
            </div>
            <button
              className="rounded bg-green-600 px-4 py-2 text-sm text-white disabled:opacity-50"
              disabled={applying}
              onClick={applySelected}
            >
              {applying
                ? "Applying…"
                : `Apply ${selected.size} change${selected.size === 1 ? "" : "s"}`}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 2: Add bottom padding so the sticky bar never covers the last row**

In `src/app/page.tsx`, change the `<main>` opening tag from:

```tsx
    <main className="mx-auto max-w-5xl p-8">
```

to:

```tsx
    <main className="mx-auto max-w-5xl p-8 pb-24">
```

- [ ] **Step 3: Typecheck and build**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Manual verification**

Start the dev server (`npm run dev`) and open the dashboard. Confirm:
- Non-hold rows show a pre-checked checkbox and a `$X → $Y` suggestion; hold rows show a gray "Hold" and no checkbox.
- The sticky bar shows the live selected count; unchecking rows updates it; clicking it away to zero hides the bar.
- Clicking "Apply N changes" applies the prices, the page reloads, and applied rows now read "Hold" at their new price.

- [ ] **Step 5: Commit**

```bash
git add src/components/ProductsTable.tsx src/app/page.tsx
git commit -m "feat: bulk-apply recommendations from the dashboard"
```

---

## Final verification

- [ ] Run the full suite: `npx vitest run` — all tests pass (existing 57 + new: 3 apply + 4 bulk + 2 products = 66).
- [ ] `npx tsc --noEmit` clean.
- [ ] `npm run build` succeeds.
