# Apply Recommended Price Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a merchant apply a pricing recommendation with one click, writing the suggested price to the product and invalidating the stale recommendation.

**Architecture:** Extract a shared `decideForProduct` helper so the recommendation and apply endpoints compute the identical decision. Add `POST /api/products/[id]/apply` that recomputes server-side, writes `currentPrice`, and clears the cached recommendation. Add an "Apply $X.XX" button to the existing `RecommendationCard`, shown only for raise/lower.

**Tech Stack:** Next.js 16 (App Router), Prisma 7 + better-sqlite3 adapter, Vitest, TypeScript, Tailwind.

**Spec:** `docs/specs/2026-06-29-apply-recommended-price-design.md`

**Conventions for this codebase (read before starting):**
- Money is stored as integer **cents**. `formatCents(cents)` (from `src/lib/money.ts`) renders e.g. `$32.00`.
- API routes are wrapped with `withErrorHandling` from `src/lib/api/errors.ts`; throw `HttpError(status, msg)` for client errors. Route handlers receive `(req, { params }: { params: Promise<{ id: string }> })` — `params` is a Promise (Next.js 16).
- Tests live next to source as `*.test.ts`. `@/` resolves to `src/` in both app and tests.
- Prisma client is exported as `prisma` from `src/lib/db.ts`.
- The `Decision` type (`src/lib/types.ts`) already has `suggestedPrice: number` (cents) and `action: "raise" | "lower" | "hold"`.
- This is **not** the Next.js in your training data — if you touch routing/request APIs, check `node_modules/next/dist/docs/`.

---

### Task 1: `decideForProduct` shared helper + refactor recommendation route

**Files:**
- Modify: `src/lib/recommendation.ts`
- Test: `src/lib/recommendation.test.ts`
- Modify: `src/app/api/products/[id]/recommendation/route.ts`

- [ ] **Step 1: Write the failing test**

Append to `src/lib/recommendation.test.ts` (it already imports `{ describe, expect, it } from "vitest"`; add `decideForProduct` to the existing import from `./recommendation`):

```ts
import { decideForProduct } from "./recommendation";

describe("decideForProduct", () => {
  it("maps competitor rows (Date observedAt) to observations and matches decide()", () => {
    const product = {
      currentPrice: 8000,
      cogs: 4000,
      competitors: [
        { price: 10000, observedAt: new Date("2026-06-28T00:00:00.000Z") },
        { price: 10000, observedAt: new Date("2026-06-28T00:00:00.000Z") },
      ],
    };
    const d = decideForProduct(product);
    // priced 20% below a $100 median with healthy margin -> raise toward median
    expect(d.action).toBe("raise");
    expect(d.suggestedPrice).toBe(10000);
  });

  it("holds with no competitors", () => {
    const d = decideForProduct({ currentPrice: 10000, cogs: 5000, competitors: [] });
    expect(d.action).toBe("hold");
    expect(d.suggestedPrice).toBe(10000);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/recommendation.test.ts`
Expected: FAIL — `decideForProduct is not a function` / no export.

- [ ] **Step 3: Implement the helper**

Append to `src/lib/recommendation.ts` (the file already imports `decide` inputs and the `Decision` type is available via the existing `./types` import — confirm `Decision` is in that import list and add it if missing):

```ts
/** Build observations from a product's competitor rows and produce a Decision. */
export function decideForProduct(product: {
  currentPrice: number;
  cogs: number | null;
  competitors: { price: number; observedAt: Date }[];
}): Decision {
  const obs = product.competitors.map((c) => ({
    price: c.price,
    observedAt: c.observedAt.toISOString(),
  }));
  return decide({ currentPrice: product.currentPrice, cogs: product.cogs }, obs);
}
```

Note: `decide` is already defined in this same file, so call it directly. `Decision` must be imported from `./types` (the file already imports several types from there — add `Decision` to that import if it is not already present).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/recommendation.test.ts`
Expected: PASS (existing `decide` tests still pass too).

- [ ] **Step 5: Refactor the recommendation route to use the helper**

In `src/app/api/products/[id]/recommendation/route.ts`, replace the inline observation mapping + `decide(...)` call with `decideForProduct(product)`. The relevant lines currently read:

```ts
    const obs = product.competitors.map((c) => ({
      price: c.price,
      observedAt: c.observedAt.toISOString(),
    }));
    const decision = decide(
      { currentPrice: product.currentPrice, cogs: product.cogs },
      obs,
    );
```

Replace that block with:

```ts
    const decision = decideForProduct(product);
```

Then fix the import line — change `import { decide } from "@/lib/recommendation";` to `import { decideForProduct } from "@/lib/recommendation";`. (`decide` is no longer referenced in this file.)

- [ ] **Step 6: Run the recommendation route test to verify the refactor is safe**

Run: `npx vitest run "src/app/api/products/[id]/recommendation/route.test.ts"`
Expected: PASS — the existing two tests (404 + computes/persists decision) still pass unchanged.

- [ ] **Step 7: Commit**

```bash
git add src/lib/recommendation.ts src/lib/recommendation.test.ts "src/app/api/products/[id]/recommendation/route.ts"
git commit -m "feat: add decideForProduct helper and use it in recommendation route"
```

---

### Task 2: `POST /api/products/[id]/apply` route

**Files:**
- Create: `src/app/api/products/[id]/apply/route.ts`
- Test: `src/app/api/products/[id]/apply/route.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/app/api/products/[id]/apply/route.test.ts`:

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

import { POST } from "./route";

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  findUnique.mockReset();
  update.mockReset();
  deleteMany.mockReset();
});

describe("POST /api/products/[id]/apply", () => {
  it("returns 404 for an unknown product and writes nothing", async () => {
    findUnique.mockResolvedValue(null);
    const res = await POST({} as Request, ctx("nope"));
    expect(res.status).toBe(404);
    expect(update).not.toHaveBeenCalled();
    expect(deleteMany).not.toHaveBeenCalled();
  });

  it("applies a raise: writes suggestedPrice, clears recommendation, applied:true", async () => {
    // priced 20% below a $100 median, healthy margin -> raise to 10000
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

    const res = await POST({} as Request, ctx("p1"));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ currentPrice: 10000, action: "raise", applied: true });
    expect(update).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: { currentPrice: 10000 },
    });
    expect(deleteMany).toHaveBeenCalledWith({ where: { productId: "p1" } });
  });

  it("is a no-op on hold: no write, applied:false", async () => {
    // no competitors -> hold, suggestedPrice == currentPrice
    findUnique.mockResolvedValue({
      id: "p2",
      currentPrice: 5000,
      cogs: 2000,
      competitors: [],
    });

    const res = await POST({} as Request, ctx("p2"));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ currentPrice: 5000, action: "hold", applied: false });
    expect(update).not.toHaveBeenCalled();
    expect(deleteMany).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run "src/app/api/products/[id]/apply/route.test.ts"`
Expected: FAIL — cannot find module `./route`.

- [ ] **Step 3: Implement the route**

Create `src/app/api/products/[id]/apply/route.ts`:

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { HttpError, withErrorHandling } from "@/lib/api/errors";
import { decideForProduct } from "@/lib/recommendation";

export const POST = withErrorHandling(
  async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const product = await prisma.product.findUnique({
      where: { id },
      include: { competitors: true },
    });
    if (!product) {
      throw new HttpError(404, "Not found");
    }

    const decision = decideForProduct(product);
    const changed = decision.suggestedPrice !== product.currentPrice;
    if (changed) {
      await prisma.product.update({
        where: { id },
        data: { currentPrice: decision.suggestedPrice },
      });
      await prisma.recommendation.deleteMany({ where: { productId: id } });
    }

    return NextResponse.json({
      currentPrice: decision.suggestedPrice,
      action: decision.action,
      applied: changed,
    });
  },
);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run "src/app/api/products/[id]/apply/route.test.ts"`
Expected: PASS — all three tests.

- [ ] **Step 5: Commit**

```bash
git add "src/app/api/products/[id]/apply/route.ts" "src/app/api/products/[id]/apply/route.test.ts"
git commit -m "feat: add POST /api/products/[id]/apply endpoint"
```

---

### Task 3: "Apply $X.XX" button in `RecommendationCard`

**Files:**
- Modify: `src/components/RecommendationCard.tsx`

- [ ] **Step 1: Add apply state and handler, render the button**

`src/components/RecommendationCard.tsx` currently renders a single "Regenerate" button. Make these changes:

1. Add `formatCents` to the imports at the top:

```tsx
import { formatCents } from "@/lib/money";
```

2. Add an `applying` state next to the existing `loading` state, inside the component:

```tsx
  const [applying, setApplying] = useState(false);
```

3. Add an `apply` handler below the existing `generate` callback:

```tsx
  async function apply() {
    setApplying(true);
    try {
      await fetch(`/api/products/${productId}/apply`, { method: "POST" });
    } finally {
      // Reload so the current price, what-if slider, and card all reflect the new price.
      if (typeof window !== "undefined") window.location.reload();
    }
  }
```

4. In the returned JSX, the buttons currently look like:

```tsx
      <button
        className="mt-3 rounded bg-black px-3 py-1 text-sm text-white"
        disabled={loading}
        onClick={generate}
      >
        {loading ? "Regenerating…" : "Regenerate"}
      </button>
```

Wrap both buttons in a flex row and add the Apply button, shown only for non-hold actions:

```tsx
      <div className="mt-3 flex gap-2">
        {data.decision.action !== "hold" && (
          <button
            className="rounded bg-green-600 px-3 py-1 text-sm text-white disabled:opacity-50"
            disabled={applying}
            onClick={apply}
          >
            {applying ? "Applying…" : `Apply ${formatCents(data.decision.suggestedPrice)}`}
          </button>
        )}
        <button
          className="rounded bg-black px-3 py-1 text-sm text-white"
          disabled={loading}
          onClick={generate}
        >
          {loading ? "Regenerating…" : "Regenerate"}
        </button>
      </div>
```

Note: `data.decision.suggestedPrice` is already part of the `RecResponse` interface in this file (the `decision` object includes `action` and `suggestedPrice`). If `suggestedPrice` is not yet listed in that interface's `decision` shape, add `suggestedPrice: number;` to it.

- [ ] **Step 2: Verify the build type-checks**

Run: `npm run build`
Expected: PASS — no type errors; the route list includes `/api/products/[id]/apply`.

- [ ] **Step 3: Commit**

```bash
git add src/components/RecommendationCard.tsx
git commit -m "feat: add Apply button to recommendation card"
```

---

### Task 4: End-to-end verification

**Files:** none (manual verification + reseed)

- [ ] **Step 1: Reseed to a clean state**

Run: `npm run seed`
Expected: "Seeded merchant ... with 8 products."

- [ ] **Step 2: Start the dev server (background)**

Run (background): `npm run dev`
Expected: ready on http://localhost:3000.

- [ ] **Step 3: Pick a product that has a non-hold recommendation**

Run: `curl -s http://localhost:3000/api/products`
Find a product whose `comparison.pctVsMedian` is clearly outside ±10% (so its recommendation will be `raise` or `lower`). Note its `id` and `currentPrice`.

- [ ] **Step 4: Apply via the endpoint and confirm the price changed**

Run (substitute the id): `curl -s -X POST http://localhost:3000/api/products/<ID>/apply`
Expected JSON: `{"currentPrice":<new>,"action":"raise"|"lower","applied":true}` where `<new>` differs from the original `currentPrice`.

Run: `curl -s -X POST http://localhost:3000/api/products/<ID>/apply` (a second time)
Expected JSON: `{"currentPrice":<new>,"action":"hold","applied":false}` — now at the recommended price, so it is a no-op.

- [ ] **Step 5: Confirm the recommendation was invalidated and recomputes to hold**

Run: `curl -s -X POST http://localhost:3000/api/products/<ID>/recommendation`
Expected: `decision.action` is `"hold"` and `decision.suggestedPrice` equals the new `currentPrice`.

- [ ] **Step 6: Reseed to restore clean demo data**

Run: `npm run seed`
Expected: demo data restored.

- [ ] **Step 7: Final full check**

Run: `npm test && npm run build`
Expected: all tests PASS (the existing 52 plus the new `decideForProduct` and apply-route tests); build succeeds.

- [ ] **Step 8: Finish the branch**

Use superpowers:finishing-a-development-branch to verify tests, then merge `slice3-apply-price` into `master` (or open a PR), and clean up.

---

## Notes for the implementer

- **The apply endpoint never trusts a client-sent price.** It recomputes `decideForProduct` on current data and applies that. Do not add a request body.
- **`applied` mirrors whether a write happened** — `true` only when `suggestedPrice !== currentPrice`. Keep the no-op guard so calling apply on a hold product is harmless.
- **Do not add a price-change history table** — out of scope for this slice (overwrite only).
- **Do not touch the Slice-2 upload UI** — its known debts are out of scope here.
- The UI reload after apply is intentional and matches the existing `IngestUpload` pattern; do not build optimistic UI.
