# Phase B: Scheduled Competitor Price Refresh — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Competitor prices refresh automatically every hour while the server runs (prices older than 24h are re-scraped), with one log line per tick and an `AUTO_REFRESH=0` kill-switch.

**Architecture:** All logic in a new `src/lib/scrape/autoRefresh.ts` (due-selection, tick orchestration, start guard), fully unit-tested with injected deps. A new `src/instrumentation.ts` is a thin untested shell that starts the scheduler on Next.js server boot. Reuses Phase A's `refreshProduct` wholesale.

**Tech Stack:** Next.js 16 App Router (`instrumentation.ts` file convention, `register()` runs once per server instance), Prisma 7 (SQLite), Vitest 4 (node env), TypeScript.

**Spec:** `docs/superpowers/specs/2026-07-03-scheduled-refresh-design.md`

**Project gotchas for the implementer:**
- Bash commands run from the home dir — **always prefix with `cd /c/Users/pohde/projects/priceiq && `**.
- Vitest only picks up `src/**/*.test.ts`. Single file: `npx vitest run src/lib/scrape/autoRefresh.test.ts`.
- Suite baseline before this work: **168 passing**.
- Comments: single-line `//` only, no `/** */` docblocks, and only where the WHY is non-obvious.
- Schema field names: `CompetitorPrice.competitorUrl` (nullable string), `CompetitorPrice.lastObservedAt` (Date). NOT `url`.
- This repo's Next.js has breaking changes vs training data. The instrumentation convention was verified against `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/instrumentation.md`: file at `src/instrumentation.ts`, export `register()`, called once per server instance.

---

## File Structure

- **Create** `src/lib/scrape/autoRefresh.ts` — `REFRESH_AFTER_MS`, `TICK_MS`, `findDueProductIds`, `runScheduledRefresh`, `startAutoRefresh`.
- **Create** `src/lib/scrape/autoRefresh.test.ts`
- **Create** `src/instrumentation.ts` — `register()` shell.
- **Modify** `docs/HANDOVER.md` — Phase B done; next-steps updated.

---

### Task 1: `findDueProductIds` — due-selection query

**Files:**
- Create: `src/lib/scrape/autoRefresh.ts`
- Test: `src/lib/scrape/autoRefresh.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/scrape/autoRefresh.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { findDueProductIds, REFRESH_AFTER_MS } from "./autoRefresh";

const NOW = new Date("2026-07-03T12:00:00Z");
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 60 * 60 * 1000);

// Minimal mock of the prisma surface findDueProductIds uses.
function prismaWith(rows: Array<{ productId: string; competitorUrl: string | null; lastObservedAt: Date }>) {
  return {
    competitorPrice: {
      findMany: vi.fn(async ({ where }: { where: { competitorUrl: { not: null }; lastObservedAt: { lt: Date } } }) =>
        rows
          .filter((r) => r.competitorUrl !== null && r.lastObservedAt < where.lastObservedAt.lt)
          .map((r) => ({ productId: r.productId })),
      ),
    },
  } as never;
}

describe("findDueProductIds", () => {
  it("returns products with a URL-bearing competitor older than the threshold", async () => {
    const prisma = prismaWith([
      { productId: "p1", competitorUrl: "https://a.example", lastObservedAt: hoursAgo(25) },
      { productId: "p2", competitorUrl: "https://b.example", lastObservedAt: hoursAgo(23) },
    ]);
    expect(await findDueProductIds(prisma, NOW)).toEqual(["p1"]);
  });

  it("ignores URL-less competitors no matter how old", async () => {
    const prisma = prismaWith([
      { productId: "p1", competitorUrl: null, lastObservedAt: hoursAgo(100) },
    ]);
    expect(await findDueProductIds(prisma, NOW)).toEqual([]);
  });

  it("deduplicates product ids when several competitors are due", async () => {
    const prisma = prismaWith([
      { productId: "p1", competitorUrl: "https://a.example", lastObservedAt: hoursAgo(30) },
      { productId: "p1", competitorUrl: "https://b.example", lastObservedAt: hoursAgo(40) },
      { productId: "p2", competitorUrl: "https://c.example", lastObservedAt: hoursAgo(30) },
    ]);
    expect(await findDueProductIds(prisma, NOW)).toEqual(["p1", "p2"]);
  });

  it("exports a 24h threshold", () => {
    expect(REFRESH_AFTER_MS).toBe(24 * 60 * 60 * 1000);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /c/Users/pohde/projects/priceiq && npx vitest run src/lib/scrape/autoRefresh.test.ts`
Expected: FAIL — cannot resolve `./autoRefresh`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/scrape/autoRefresh.ts`:

```ts
import type { PrismaClient } from "@prisma/client";
import { refreshProduct as defaultRefreshProduct } from "./refreshProduct";

// Re-scrape a competitor price once it is older than this (well under the 14-day staleness cutoff).
export const REFRESH_AFTER_MS = 24 * 60 * 60 * 1000;
export const TICK_MS = 60 * 60 * 1000;

type PrismaSurface = Pick<
  PrismaClient,
  "competitorPrice" | "competitorPriceObservation" | "recommendation"
>;

export async function findDueProductIds(
  prisma: PrismaSurface,
  now: Date = new Date(),
): Promise<string[]> {
  const cutoff = new Date(now.getTime() - REFRESH_AFTER_MS);
  const rows = await prisma.competitorPrice.findMany({
    where: { competitorUrl: { not: null }, lastObservedAt: { lt: cutoff } },
    select: { productId: true },
  });
  return [...new Set(rows.map((r) => r.productId))];
}
```

Note: dedup happens in JS (`Set`) rather than Prisma `distinct` so the Map-backed mocks used across this codebase stay trivial.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /c/Users/pohde/projects/priceiq && npx vitest run src/lib/scrape/autoRefresh.test.ts`
Expected: 4 passing.

- [ ] **Step 5: Commit**

```bash
cd /c/Users/pohde/projects/priceiq && git add src/lib/scrape/autoRefresh.ts src/lib/scrape/autoRefresh.test.ts && git commit -m "feat: findDueProductIds — select products with 24h-old competitor prices"
```

---

### Task 2: `runScheduledRefresh` — one tick

**Files:**
- Modify: `src/lib/scrape/autoRefresh.ts`
- Test: `src/lib/scrape/autoRefresh.test.ts`

- [ ] **Step 1: Write the failing tests** (append to `autoRefresh.test.ts`; extend the top import line)

```ts
import { findDueProductIds, runScheduledRefresh, REFRESH_AFTER_MS } from "./autoRefresh";
import type { RefreshSummary } from "./refreshProduct";

function summary(productId: string, refreshed: number, failed: number): RefreshSummary {
  return { productId, refreshed, failed, results: [] };
}

describe("runScheduledRefresh", () => {
  const duePrisma = prismaWith([
    { productId: "p1", competitorUrl: "https://a.example", lastObservedAt: hoursAgo(30) },
    { productId: "p2", competitorUrl: "https://b.example", lastObservedAt: hoursAgo(30) },
  ]);

  it("refreshes every due product and aggregates counts", async () => {
    const refreshProduct = vi
      .fn()
      .mockResolvedValueOnce(summary("p1", 2, 1))
      .mockResolvedValueOnce(summary("p2", 3, 0));
    const res = await runScheduledRefresh(duePrisma, NOW, { refreshProduct });
    expect(res).toEqual({ products: 2, refreshed: 5, failed: 1 });
    expect(refreshProduct).toHaveBeenCalledWith(duePrisma, "p1");
    expect(refreshProduct).toHaveBeenCalledWith(duePrisma, "p2");
  });

  it("logs one summary line", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const refreshProduct = vi.fn(async (_p: unknown, id: string) => summary(id, 1, 0));
    await runScheduledRefresh(duePrisma, NOW, { refreshProduct });
    expect(log).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith("[auto-refresh] 2 products: refreshed 2, failed 0");
    log.mockRestore();
  });

  it("counts a throwing product as failed and continues to the next", async () => {
    const refreshProduct = vi
      .fn()
      .mockRejectedValueOnce(new Error("db hiccup"))
      .mockResolvedValueOnce(summary("p2", 4, 0));
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const res = await runScheduledRefresh(duePrisma, NOW, { refreshProduct });
    expect(res).toEqual({ products: 2, refreshed: 4, failed: 1 });
    log.mockRestore();
  });

  it("does nothing (but still logs) when no products are due", async () => {
    const empty = prismaWith([]);
    const refreshProduct = vi.fn();
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const res = await runScheduledRefresh(empty, NOW, { refreshProduct });
    expect(res).toEqual({ products: 0, refreshed: 0, failed: 0 });
    expect(refreshProduct).not.toHaveBeenCalled();
    log.mockRestore();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /c/Users/pohde/projects/priceiq && npx vitest run src/lib/scrape/autoRefresh.test.ts`
Expected: FAIL — `runScheduledRefresh` not exported.

- [ ] **Step 3: Write the implementation** (append to `autoRefresh.ts`)

```ts
export interface ScheduledRefreshResult {
  products: number;
  refreshed: number;
  failed: number;
}

interface TickDeps {
  refreshProduct?: typeof defaultRefreshProduct;
}

export async function runScheduledRefresh(
  prisma: PrismaSurface,
  now: Date = new Date(),
  deps: TickDeps = {},
): Promise<ScheduledRefreshResult> {
  const refreshProduct = deps.refreshProduct ?? defaultRefreshProduct;
  const ids = await findDueProductIds(prisma, now);

  let refreshed = 0;
  let failed = 0;
  for (const id of ids) {
    try {
      const summary = await refreshProduct(prisma, id);
      refreshed += summary.refreshed;
      failed += summary.failed;
    } catch {
      failed++; // one bad product must not stop the rest of the tick
    }
  }

  console.log(`[auto-refresh] ${ids.length} products: refreshed ${refreshed}, failed ${failed}`);
  return { products: ids.length, refreshed, failed };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /c/Users/pohde/projects/priceiq && npx vitest run src/lib/scrape/autoRefresh.test.ts`
Expected: 8 passing.

- [ ] **Step 5: Commit**

```bash
cd /c/Users/pohde/projects/priceiq && git add src/lib/scrape/autoRefresh.ts src/lib/scrape/autoRefresh.test.ts && git commit -m "feat: runScheduledRefresh — one auto-refresh tick with error isolation"
```

---

### Task 3: `startAutoRefresh` — timer, guards, kill-switch

**Files:**
- Modify: `src/lib/scrape/autoRefresh.ts`
- Test: `src/lib/scrape/autoRefresh.test.ts`

- [ ] **Step 1: Write the failing tests** (append; extend imports)

```ts
import {
  findDueProductIds,
  runScheduledRefresh,
  startAutoRefresh,
  _resetAutoRefreshForTests,
  REFRESH_AFTER_MS,
  TICK_MS,
} from "./autoRefresh";
import { afterEach, beforeEach } from "vitest";

describe("startAutoRefresh", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    _resetAutoRefreshForTests();
    delete process.env.AUTO_REFRESH;
  });
  afterEach(() => {
    _resetAutoRefreshForTests();
    vi.useRealTimers();
    delete process.env.AUTO_REFRESH;
  });

  it("runs a first tick ~30s after start, then every TICK_MS", async () => {
    const runTick = vi.fn(async () => {});
    startAutoRefresh({ runTick });
    expect(runTick).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(30_000);
    expect(runTick).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(TICK_MS);
    expect(runTick).toHaveBeenCalledTimes(2);
  });

  it("is a no-op when called twice", async () => {
    const runTick = vi.fn(async () => {});
    startAutoRefresh({ runTick });
    startAutoRefresh({ runTick });
    await vi.advanceTimersByTimeAsync(30_000 + TICK_MS);
    expect(runTick).toHaveBeenCalledTimes(2); // not 4
  });

  it("does nothing when AUTO_REFRESH=0", async () => {
    process.env.AUTO_REFRESH = "0";
    const runTick = vi.fn(async () => {});
    startAutoRefresh({ runTick });
    await vi.advanceTimersByTimeAsync(30_000 + TICK_MS * 2);
    expect(runTick).not.toHaveBeenCalled();
  });

  it("skips a tick while the previous one is still running", async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const runTick = vi.fn(() => gate); // first call never resolves until released
    startAutoRefresh({ runTick });
    await vi.advanceTimersByTimeAsync(30_000); // first tick starts, hangs
    await vi.advanceTimersByTimeAsync(TICK_MS); // would be second tick — must be skipped
    expect(runTick).toHaveBeenCalledTimes(1);
    release();
    await vi.advanceTimersByTimeAsync(TICK_MS); // after release, ticks resume
    expect(runTick).toHaveBeenCalledTimes(2);
  });

  it("keeps ticking after a tick throws", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const runTick = vi
      .fn()
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValue(undefined);
    startAutoRefresh({ runTick });
    await vi.advanceTimersByTimeAsync(30_000);
    await vi.advanceTimersByTimeAsync(TICK_MS);
    expect(runTick).toHaveBeenCalledTimes(2);
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /c/Users/pohde/projects/priceiq && npx vitest run src/lib/scrape/autoRefresh.test.ts`
Expected: FAIL — `startAutoRefresh` / `_resetAutoRefreshForTests` not exported.

- [ ] **Step 3: Write the implementation** (append to `autoRefresh.ts`)

```ts
const FIRST_TICK_DELAY_MS = 30_000;

interface StartDeps {
  // Injectable so timer tests never touch prisma or the network.
  runTick?: () => Promise<unknown>;
}

let started = false;
let inFlight = false;
let timers: Array<ReturnType<typeof setTimeout>> = [];

async function defaultRunTick(): Promise<unknown> {
  // Lazy import so merely loading this module never opens the SQLite file.
  const { prisma } = await import("../db");
  return runScheduledRefresh(prisma, new Date());
}

export function startAutoRefresh(deps: StartDeps = {}): void {
  if (started) return; // Next dev can invoke register() more than once
  if (process.env.AUTO_REFRESH === "0") return;
  started = true;

  const runTick = deps.runTick ?? defaultRunTick;
  const tick = async () => {
    if (inFlight) return; // previous tick still running — skip this one
    inFlight = true;
    try {
      await runTick();
    } catch (err) {
      console.error("[auto-refresh] tick failed:", err);
    } finally {
      inFlight = false;
    }
  };

  timers.push(setTimeout(tick, FIRST_TICK_DELAY_MS));
  timers.push(setInterval(tick, TICK_MS));
}

export function _resetAutoRefreshForTests(): void {
  for (const t of timers) clearTimeout(t as NodeJS.Timeout);
  timers = [];
  started = false;
  inFlight = false;
}
```

Notes for the implementer:
- `clearTimeout` clears intervals too in Node (both return the same Timeout type) — clearing with one function keeps the reset helper simple.
- The `import("../db")` path assumes `autoRefresh.ts` lives in `src/lib/scrape/` and the prisma client is exported from `src/lib/db.ts` as `prisma` (same import the API routes use, just dynamic).

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /c/Users/pohde/projects/priceiq && npx vitest run src/lib/scrape/autoRefresh.test.ts`
Expected: 13 passing.

- [ ] **Step 5: Run the full suite**

Run: `cd /c/Users/pohde/projects/priceiq && npm test`
Expected: 181 passing (168 baseline + 13 new), 0 failures.

- [ ] **Step 6: Commit**

```bash
cd /c/Users/pohde/projects/priceiq && git add src/lib/scrape/autoRefresh.ts src/lib/scrape/autoRefresh.test.ts && git commit -m "feat: startAutoRefresh — hourly timer with start/in-flight guards and kill-switch"
```

---

### Task 4: `instrumentation.ts` shell + live verification + docs

**Files:**
- Create: `src/instrumentation.ts`
- Modify: `docs/HANDOVER.md`

- [ ] **Step 1: Create the instrumentation shell**

Create `src/instrumentation.ts`:

```ts
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startAutoRefresh } = await import("./lib/scrape/autoRefresh");
    startAutoRefresh();
  }
}
```

(The dynamic import is required: `instrumentation.ts` is also evaluated in the edge runtime, where Node APIs used transitively by prisma would crash a static import. This matches the pattern in `node_modules/next/dist/docs/01-app/02-guides/instrumentation.md`.)

- [ ] **Step 2: Production build (proves the file convention is picked up and typechecks)**

Run: `cd /c/Users/pohde/projects/priceiq && npm run build`
Expected: build succeeds, no type errors.

- [ ] **Step 3: Live verification in the dev server**

Start the dev server in the background (`npm run dev` with `run_in_background: true`). Within ~40 seconds of boot, the server log must show a line like:

```
[auto-refresh] N products: refreshed X, failed Y
```

(N may be 0 if nothing is due — the line must still appear.) If the log line does not appear, check that `AUTO_REFRESH` is not set to `0` in the environment and that the server booted the nodejs runtime. Kill the dev server when done.

Also verify the kill-switch: restart with `AUTO_REFRESH=0 npm run dev` (background), wait ~40s, confirm NO `[auto-refresh]` line appears. Kill the server.

- [ ] **Step 4: Update `docs/HANDOVER.md`**

- In section 2's pipeline list (or a new "Auto-refresh (Phase B)" bullet under it), add: `autoRefresh.ts` — hourly in-process scheduler started from `src/instrumentation.ts`; refreshes competitor prices older than 24h via `refreshProduct`; first tick ~30s after boot; one log line per tick; disable with `AUTO_REFRESH=0`.
- In section 5 "Next steps", replace item 2 (Phase B) with a **DONE** note mirroring the style of the completed SSRF item.

- [ ] **Step 5: Full suite one last time**

Run: `cd /c/Users/pohde/projects/priceiq && npm test`
Expected: 181 passing.

- [ ] **Step 6: Commit**

```bash
cd /c/Users/pohde/projects/priceiq && git add src/instrumentation.ts docs/HANDOVER.md && git commit -m "feat: start auto-refresh scheduler on server boot; Phase B docs"
```
