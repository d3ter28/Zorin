# UI Refresh-State Tests — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Component tests for the refresh flows in `ManageCompetitors` and `ProductsTable` (button idle/busy states, success behavior, error messages), running under jsdom alongside the existing 181 node-env unit tests.

**Architecture:** `vitest.config.ts` switches to Vitest 4 `test.projects` with two projects — `unit` (node, `*.test.ts`, unchanged behavior) and `ui` (jsdom, `*.test.tsx`). Both inherit the root config via `extends: true`. `@vitejs/plugin-react` (already installed) is added at the root so `.tsx` test files transform correctly — the project tsconfig uses `"jsx": "preserve"`, which raw esbuild would not compile.

**Tech Stack:** Vitest 4, jsdom, @testing-library/react 16, @testing-library/user-event, React 19.

**Spec:** `docs/superpowers/specs/2026-07-03-ui-refresh-state-tests-design.md`

**Project gotchas for the implementer:**
- Bash commands run from the home dir — **always prefix with `cd /c/Users/pohde/projects/priceiq && `**.
- Suite baseline before this work: **181 passing** (`npm test`).
- Comments: single-line `//` only, no docblocks, and only where the WHY is non-obvious.
- Components under test are NOT modified by this plan. If a test seems to require a component change, the test is wrong — re-read the component.
- `ManageCompetitors` never resets `busy` on success (the page reloads instead) — the success test asserts `reload` was called, not button state.
- `ProductsTable` shows a loading skeleton until the first `GET /api/products` resolves — always `await screen.findBy…` before interacting.

---

## File Structure

- **Modify** `vitest.config.ts` — projects split.
- **Modify** `package.json` — new devDependencies (via `npm install -D`).
- **Create** `src/components/ManageCompetitors.test.tsx`
- **Create** `src/components/ProductsTable.test.tsx`
- **Modify** `docs/HANDOVER.md` — UI tests no longer deferred; test count updated.

---

### Task 1: Test infrastructure — deps + projects config

**Files:**
- Modify: `vitest.config.ts`
- Modify: `package.json` (via npm, not by hand)

- [ ] **Step 1: Install dev dependencies**

```bash
cd /c/Users/pohde/projects/priceiq && npm install -D jsdom @testing-library/react @testing-library/dom @testing-library/user-event
```

(`@testing-library/dom` is an explicit peer dependency of `@testing-library/react` v16 — install it explicitly.)

- [ ] **Step 2: Rewrite `vitest.config.ts`**

Replace the whole file with:

```ts
import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // tsconfig uses "jsx": "preserve", so .tsx tests need the react plugin to compile.
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  test: {
    projects: [
      {
        extends: true,
        test: { name: "unit", environment: "node", include: ["src/**/*.test.ts"] },
      },
      {
        extends: true,
        test: { name: "ui", environment: "jsdom", include: ["src/**/*.test.tsx"] },
      },
    ],
  },
});
```

- [ ] **Step 3: Verify the existing suite still passes**

Run: `cd /c/Users/pohde/projects/priceiq && npm test`
Expected: **181 passing**, now labeled with the `unit` project name. The `ui` project reports no test files — that is OK at this point (it must not error; if Vitest exits non-zero because one project has no tests, add `passWithNoTests: true` to the `ui` project's `test` block and remove it in Task 2).

- [ ] **Step 4: Commit**

```bash
cd /c/Users/pohde/projects/priceiq && git add vitest.config.ts package.json package-lock.json && git commit -m "chore: split vitest into unit (node) and ui (jsdom) projects"
```

---

### Task 2: `ManageCompetitors` refresh-state tests

**Files:**
- Create: `src/components/ManageCompetitors.test.tsx`

The component (`src/components/ManageCompetitors.tsx`) renders a "Refresh now" button that POSTs to `/api/products/{productId}/refresh`. On success it calls `window.location.reload()`; on failure it renders `role="alert"` with "Couldn't refresh prices — try again." and re-enables the button. Clicking again clears the error immediately (`setError(null)` runs before the fetch).

- [ ] **Step 1: Write the tests**

Create `src/components/ManageCompetitors.test.tsx` with exactly this content:

```tsx
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ManageCompetitors } from "./ManageCompetitors";

const COMPETITORS = [
  {
    name: "MarketCo",
    price: 1499,
    url: "https://market.example/p/1",
    lastObservedAt: new Date().toISOString(),
    isStale: false,
  },
];

const reloadMock = vi.fn();

// jsdom's location.reload throws "Not implemented" — swap in a spy for the whole suite.
beforeEach(() => {
  Object.defineProperty(window, "location", {
    value: { ...window.location, reload: reloadMock },
    writable: true,
    configurable: true,
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  reloadMock.mockReset();
});

function renderPanel() {
  return render(<ManageCompetitors productId="p1" competitors={COMPETITORS} />);
}

describe("ManageCompetitors refresh states", () => {
  it("idle: shows an enabled 'Refresh now' button", () => {
    vi.stubGlobal("fetch", vi.fn());
    renderPanel();
    const button = screen.getByRole("button", { name: "Refresh now" }) as HTMLButtonElement;
    expect(button.disabled).toBe(false);
  });

  it("busy: disables the button and shows 'Refreshing…' while the request is pending", async () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {}))); // never resolves
    renderPanel();
    await userEvent.click(screen.getByRole("button", { name: "Refresh now" }));
    const button = screen.getByRole("button", { name: "Refreshing…" }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });

  it("success: reloads the page", async () => {
    const fetchMock = vi.fn(async () => ({ ok: true }) as Response);
    vi.stubGlobal("fetch", fetchMock);
    renderPanel();
    await userEvent.click(screen.getByRole("button", { name: "Refresh now" }));
    expect(fetchMock).toHaveBeenCalledWith("/api/products/p1/refresh", { method: "POST" });
    expect(reloadMock).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("network error: shows the alert and re-enables the button", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline"); }));
    renderPanel();
    await userEvent.click(screen.getByRole("button", { name: "Refresh now" }));
    expect(screen.getByRole("alert").textContent).toBe("Couldn't refresh prices — try again.");
    const button = screen.getByRole("button", { name: "Refresh now" }) as HTMLButtonElement;
    expect(button.disabled).toBe(false);
  });

  it("non-ok response: shows the alert and re-enables the button", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false }) as Response));
    renderPanel();
    await userEvent.click(screen.getByRole("button", { name: "Refresh now" }));
    expect(screen.getByRole("alert").textContent).toBe("Couldn't refresh prices — try again.");
    const button = screen.getByRole("button", { name: "Refresh now" }) as HTMLButtonElement;
    expect(button.disabled).toBe(false);
  });

  it("retry: clears the previous error while the new request is pending", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockImplementationOnce(() => new Promise(() => {})); // second click hangs
    vi.stubGlobal("fetch", fetchMock);
    renderPanel();
    await userEvent.click(screen.getByRole("button", { name: "Refresh now" }));
    expect(screen.getByRole("alert")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Refresh now" }));
    expect(screen.queryByRole("alert")).toBeNull();
    const busy = screen.getByRole("button", { name: "Refreshing…" }) as HTMLButtonElement;
    expect(busy.disabled).toBe(true);
  });
});
```

Note: `@testing-library/jest-dom` is deliberately NOT installed — that's why disabled-state assertions use the plain `disabled` property instead of `toBeDisabled()`. Do not add jest-dom.

- [ ] **Step 2: Run the new file — expect failures or passes?**

This is characterization of existing behavior, so tests should pass immediately if written correctly. Run:

```bash
cd /c/Users/pohde/projects/priceiq && npx vitest run --project ui src/components/ManageCompetitors.test.tsx
```

Expected: **6 passing**. If a test fails, debug the TEST (fetch stub shape, async waiting), not the component — the component is known-good in production.

- [ ] **Step 3: Run the full suite**

Run: `cd /c/Users/pohde/projects/priceiq && npm test`
Expected: 187 passing (181 unit + 6 ui).

- [ ] **Step 4: Commit**

```bash
cd /c/Users/pohde/projects/priceiq && git add src/components/ManageCompetitors.test.tsx && git commit -m "test: ManageCompetitors refresh states (idle/busy/success/error/retry)"
```

---

### Task 3: `ProductsTable` refresh-state tests + docs

**Files:**
- Create: `src/components/ProductsTable.test.tsx`
- Modify: `docs/HANDOVER.md`

The component (`src/components/ProductsTable.tsx`) loads rows from `GET /api/products` on mount (loading skeleton until then), and its "Refresh all prices" button POSTs to `/api/refresh` with all row ids, then shows a status message in an `aria-live` span and re-fetches the table.

- [ ] **Step 1: Write the tests**

Create `src/components/ProductsTable.test.tsx` with exactly this content (same `disabled` property-check convention as Task 2 — no jest-dom):

```tsx
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProductsTable } from "./ProductsTable";

// Two "hold" rows: no checkboxes, no apply bar — keeps the DOM focused on refresh UI.
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
    comparison: { compMedian: 2250, pctVsMedian: -0.02, competitorCount: 2 },
    recommendedAction: "hold" as const,
    suggestedPrice: 2200,
  },
];

const json = (data: unknown, ok = true) => ({ ok, json: async () => data }) as Response;

// Routes GET /api/products to the fixture; POST /api/refresh to the given handler.
function stubFetch(onRefresh: () => Promise<Response>) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url === "/api/products") return json(ROWS);
    if (url === "/api/refresh" && init?.method === "POST") return onRefresh();
    throw new Error(`unexpected fetch: ${url}`);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function renderLoaded() {
  render(<ProductsTable refreshToken={0} />);
  // Wait out the loading skeleton.
  return await screen.findByRole("button", { name: "Refresh all prices" });
}

describe("ProductsTable refresh states", () => {
  it("renders the table with an enabled refresh button after load", async () => {
    stubFetch(async () => json({ refreshed: 0, failed: 0 }));
    const button = await renderLoaded();
    expect((button as HTMLButtonElement).disabled).toBe(false);
    expect(screen.getByText("Ceramic Mug")).toBeTruthy();
  });

  it("busy: disables the button and shows 'Refreshing…' while the POST is pending", async () => {
    stubFetch(() => new Promise(() => {})); // never resolves
    const button = await renderLoaded();
    await userEvent.click(button);
    const busy = screen.getByRole("button", { name: "Refreshing…" });
    expect((busy as HTMLButtonElement).disabled).toBe(true);
  });

  it("success: shows the plural summary and re-fetches the table", async () => {
    const fetchMock = stubFetch(async () => json({ refreshed: 2, failed: 0 }));
    const button = await renderLoaded();
    await userEvent.click(button);
    await screen.findByText("Refreshed 2 prices.");
    const productLoads = fetchMock.mock.calls.filter(([u]) => String(u) === "/api/products");
    expect(productLoads.length).toBe(2); // initial load + post-refresh reload
  });

  it("success with failures: includes the failed count", async () => {
    stubFetch(async () => json({ refreshed: 1, failed: 1 }));
    const button = await renderLoaded();
    await userEvent.click(button);
    await screen.findByText("Refreshed 1 price, 1 failed.");
  });

  it("singular: 'Refreshed 1 price.'", async () => {
    stubFetch(async () => json({ refreshed: 1, failed: 0 }));
    const button = await renderLoaded();
    await userEvent.click(button);
    await screen.findByText("Refreshed 1 price.");
  });

  it("failure: shows the error message and re-enables the button", async () => {
    stubFetch(async () => json({}, false));
    const button = await renderLoaded();
    await userEvent.click(button);
    await screen.findByText("Couldn't refresh prices — try again.");
    await waitFor(() => {
      const b = screen.getByRole("button", { name: "Refresh all prices" });
      expect((b as HTMLButtonElement).disabled).toBe(false);
    });
  });
});
```

- [ ] **Step 2: Run the new file**

```bash
cd /c/Users/pohde/projects/priceiq && npx vitest run --project ui src/components/ProductsTable.test.tsx
```

Expected: **6 passing**. Same rule as Task 2: failures mean the TEST is wrong, not the component. Likely culprits: `CogsInput` rendering (it receives `initialCents`/`onSaved` props — it renders fine with the fixture) or `next/link` (works in jsdom without a router for plain rendering).

- [ ] **Step 3: Run the full suite**

Run: `cd /c/Users/pohde/projects/priceiq && npm test`
Expected: **193 passing** (181 unit + 12 ui).

- [ ] **Step 4: Update `docs/HANDOVER.md`**

Three edits:
1. Section 5 "Key technical facts / gotchas", the **Tests** bullet: replace the "no jsdom, no `.tsx`" claim with: Vitest projects — `unit` (node, `src/**/*.test.ts`) + `ui` (jsdom, `src/**/*.test.tsx` via @testing-library/react). UI tests cover refresh states of `ManageCompetitors`/`ProductsTable`. **193 passing.**
2. Section 6 "Next steps", item 3 (UI component tests): mark **DONE** in the style of the other completed items.
3. Section 7 "How to resume": `# expect 181 passing` → `# expect 193 passing`.

- [ ] **Step 5: Commit**

```bash
cd /c/Users/pohde/projects/priceiq && git add src/components/ProductsTable.test.tsx docs/HANDOVER.md && git commit -m "test: ProductsTable refresh states; docs: UI tests done, 193 passing"
```
