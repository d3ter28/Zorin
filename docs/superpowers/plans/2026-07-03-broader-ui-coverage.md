# Broader UI Coverage — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete test coverage of `ManageCompetitors` and `ProductsTable` — status lines, empty states, loading skeleton, load-error/retry, and the selection/apply flow — as new `describe` blocks in the two existing `.test.tsx` files.

**Architecture:** Characterization tests only; **components are never modified**. `ManageCompetitors.test.tsx` gains a status-lines block (its `renderPanel` helper gains a `competitors` parameter). `ProductsTable.test.tsx` gets its `stubFetch` helper generalized into `stubApi` (routes `GET /api/products`, `POST /api/refresh`, `POST /api/apply/bulk`, each overridable) with `stubFetch` kept as a thin wrapper so the 6 existing tests don't change.

**Tech Stack:** Vitest 4 (`ui` jsdom project, already configured), @testing-library/react 16, @testing-library/user-event.

**Spec:** `docs/superpowers/specs/2026-07-03-broader-ui-coverage-design.md`

**Project gotchas for the implementer:**
- Bash commands run from the home dir — **always prefix with `cd /c/Users/pohde/projects/priceiq && `**.
- Baseline: **193 passing** (`npm test`). Run a single ui file with `npx vitest run --project ui src/components/<file>.test.tsx`.
- Comments: single-line `//` only, no docblocks, only where the WHY is non-obvious.
- No `@testing-library/jest-dom` — assert disabled state via the `.disabled` property.
- If a test fails, debug the TEST, not the component — both components are known-good in production.
- Ellipsis characters in button labels are `…` (U+2026), not `...`.

---

## File Structure

- **Modify** `src/components/ManageCompetitors.test.tsx` — parameterize `renderPanel`; append status-lines describe block.
- **Modify** `src/components/ProductsTable.test.tsx` — generalize `stubFetch` → `stubApi`; append load-states and selection/apply describe blocks.
- **Modify** `docs/HANDOVER.md` — test count 193 → 207.

---

### Task 1: ManageCompetitors status lines (+5 tests)

**Files:**
- Modify: `src/components/ManageCompetitors.test.tsx`

The component renders, per competitor: the name; then either `⚠ stale` (when `isStale`) or `confirmed {relativeTime}` (e.g. "confirmed 2h ago"); plus, when `url === ""`, the hint `· no URL — add one via CSV to enable auto-refresh`. With `competitors={[]}` it renders "No competitor prices yet. Import a CSV from the dashboard." and no `<ul>`.

- [ ] **Step 1: Parameterize the render helper**

In `src/components/ManageCompetitors.test.tsx`, replace:

```tsx
function renderPanel() {
  return render(<ManageCompetitors productId="p1" competitors={COMPETITORS} />);
}
```

with:

```tsx
type Competitor = (typeof COMPETITORS)[number];

function renderPanel(competitors: Competitor[] = COMPETITORS) {
  return render(<ManageCompetitors productId="p1" competitors={competitors} />);
}
```

- [ ] **Step 2: Append the status-lines describe block**

Append after the existing `describe("ManageCompetitors refresh states", ...)` block:

```tsx
const HOUR_MS = 60 * 60 * 1000;

// 2h ago lands mid-bucket in relativeTime, so the label can't flip during the test run.
function competitor(overrides: Partial<Competitor> = {}): Competitor {
  return {
    name: "MarketCo",
    price: 1499,
    url: "https://market.example/p/1",
    lastObservedAt: new Date(Date.now() - 2 * HOUR_MS).toISOString(),
    isStale: false,
    ...overrides,
  };
}

describe("ManageCompetitors status lines", () => {
  it("empty: shows the import hint and no list", () => {
    renderPanel([]);
    expect(
      screen.getByText("No competitor prices yet. Import a CSV from the dashboard."),
    ).toBeTruthy();
    expect(screen.queryByRole("list")).toBeNull();
  });

  it("fresh competitor: shows a 'confirmed 2h ago' line", () => {
    renderPanel([competitor()]);
    expect(screen.getByText("confirmed 2h ago")).toBeTruthy();
  });

  it("stale competitor: shows the stale warning instead of a confirmed line", () => {
    renderPanel([competitor({ isStale: true })]);
    expect(screen.getByText("⚠ stale")).toBeTruthy();
    expect(screen.queryByText(/confirmed/)).toBeNull();
  });

  it("URL-less competitor: shows the auto-refresh hint", () => {
    renderPanel([competitor({ url: "" })]);
    expect(
      screen.getByText(/no URL — add one via CSV to enable auto-refresh/),
    ).toBeTruthy();
  });

  it("URL-bearing competitor: no auto-refresh hint", () => {
    renderPanel([competitor()]);
    expect(screen.queryByText(/no URL/)).toBeNull();
  });
});
```

- [ ] **Step 3: Run the file**

Run: `cd /c/Users/pohde/projects/priceiq && npx vitest run --project ui src/components/ManageCompetitors.test.tsx`
Expected: **11 passing** (6 existing + 5 new). These characterize existing behavior, so they should pass immediately; if one fails, fix the TEST (check the exact rendered text against `src/components/ManageCompetitors.tsx`).

- [ ] **Step 4: Commit**

```bash
cd /c/Users/pohde/projects/priceiq && git add src/components/ManageCompetitors.test.tsx && git commit -m "test: ManageCompetitors status lines (empty/fresh/stale/no-URL)"
```

---

### Task 2: ProductsTable stubApi refactor + load states (+3 tests)

**Files:**
- Modify: `src/components/ProductsTable.test.tsx`

The component shows: an animated skeleton while `GET /api/products` is pending; "Couldn't load products." + a "Retry" button when the load fails (`!res.ok` throws inside `load()`); "No products yet" when the load returns `[]`. Retry sets `loading=true` and calls `load()` again.

- [ ] **Step 1: Generalize the fetch stub**

In `src/components/ProductsTable.test.tsx`, replace the existing `stubFetch` function with:

```tsx
interface ApiHandlers {
  onProducts?: () => Promise<Response>;
  onRefresh?: () => Promise<Response>;
  onApply?: () => Promise<Response>;
}

// Routes the three endpoints ProductsTable calls; unhandled URLs fail loudly.
function stubApi(handlers: ApiHandlers = {}) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url === "/api/products") {
      return (handlers.onProducts ?? (async () => json(ROWS)))();
    }
    if (url === "/api/refresh" && init?.method === "POST") {
      return (handlers.onRefresh ?? (async () => json({ refreshed: 0, failed: 0 })))();
    }
    if (url === "/api/apply/bulk" && init?.method === "POST") {
      return (handlers.onApply ?? (async () => json({})))();
    }
    throw new Error(`unexpected fetch: ${url}`);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

// Kept so the refresh-states tests read unchanged.
function stubFetch(onRefresh: () => Promise<Response>) {
  return stubApi({ onRefresh });
}
```

Do NOT change any existing test in the file.

- [ ] **Step 2: Run the file to prove the refactor is behavior-preserving**

Run: `cd /c/Users/pohde/projects/priceiq && npx vitest run --project ui src/components/ProductsTable.test.tsx`
Expected: **6 passing** (unchanged).

- [ ] **Step 3: Append the load-states describe block**

```tsx
describe("ProductsTable load states", () => {
  it("loading: shows no table or refresh button while the fetch is pending", () => {
    stubApi({ onProducts: () => new Promise(() => {}) }); // never resolves
    render(<ProductsTable refreshToken={0} />);
    expect(screen.queryByRole("button", { name: "Refresh all prices" })).toBeNull();
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("load error: shows the message, and Retry re-fetches and renders the table", async () => {
    const onProducts = vi
      .fn()
      .mockResolvedValueOnce(json([], false)) // first load fails
      .mockResolvedValue(json(ROWS)); // retry succeeds
    stubApi({ onProducts });
    render(<ProductsTable refreshToken={0} />);
    await screen.findByText("Couldn't load products.");
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    await screen.findByRole("button", { name: "Refresh all prices" });
    expect(screen.getByText("Ceramic Mug")).toBeTruthy();
    expect(onProducts).toHaveBeenCalledTimes(2);
  });

  it("empty: shows the 'No products yet' state and no refresh button", async () => {
    stubApi({ onProducts: async () => json([]) });
    render(<ProductsTable refreshToken={0} />);
    await screen.findByText("No products yet");
    expect(screen.queryByRole("button", { name: "Refresh all prices" })).toBeNull();
  });
});
```

- [ ] **Step 4: Run the file**

Run: `cd /c/Users/pohde/projects/priceiq && npx vitest run --project ui src/components/ProductsTable.test.tsx`
Expected: **9 passing**.

- [ ] **Step 5: Commit**

```bash
cd /c/Users/pohde/projects/priceiq && git add src/components/ProductsTable.test.tsx && git commit -m "test: ProductsTable load states (skeleton/error-retry/empty); generalize fetch stub"
```

---

### Task 3: ProductsTable selection/apply flow (+6 tests) + docs

**Files:**
- Modify: `src/components/ProductsTable.test.tsx`
- Modify: `docs/HANDOVER.md`

Component behavior being characterized: rows with `recommendedAction !== "hold"` render a checkbox labeled `Select {title}` and are pre-selected on load. When `selected.size > 0` a fixed bottom bar shows "N change(s) selected" and an "Apply N change(s)" button. The button POSTs `{productIds: [...]}` to `/api/apply/bulk`; while pending it reads "Applying…" (disabled); on success it re-fetches the table; on failure the bar shows "Couldn't apply changes — try again.".

- [ ] **Step 1: Append the actionable fixture and describe block**

Append to `src/components/ProductsTable.test.tsx`:

```tsx
// p1/p2 actionable (pre-selected on load), p3 hold (no checkbox).
const ACTIONABLE_ROWS = [
  { ...ROWS[0], recommendedAction: "raise" as const, suggestedPrice: 1600 },
  { ...ROWS[1], recommendedAction: "lower" as const, suggestedPrice: 2100 },
  {
    id: "p3",
    title: "Desk Lamp",
    sku: "LMP-001",
    currentPrice: 3500,
    cogs: 1400,
    category: "office",
    estUnits: 20,
    margin: 0.6,
    comparison: { compMedian: 3450, pctVsMedian: 0.01, competitorCount: 2 },
    recommendedAction: "hold" as const,
    suggestedPrice: 3500,
  },
];

async function renderActionable(handlers: ApiHandlers = {}) {
  const fetchMock = stubApi({ onProducts: async () => json(ACTIONABLE_ROWS), ...handlers });
  render(<ProductsTable refreshToken={0} />);
  await screen.findByRole("button", { name: "Refresh all prices" });
  return fetchMock;
}

describe("ProductsTable selection and apply", () => {
  it("renders checkboxes for actionable rows only", async () => {
    await renderActionable();
    expect(screen.getByRole("checkbox", { name: "Select Ceramic Mug" })).toBeTruthy();
    expect(screen.getByRole("checkbox", { name: "Select Steel Bottle" })).toBeTruthy();
    expect(screen.queryByRole("checkbox", { name: "Select Desk Lamp" })).toBeNull();
  });

  it("pre-selects actionable rows and shows the apply bar", async () => {
    await renderActionable();
    expect(screen.getByText("2 changes selected")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Apply 2 changes" })).toBeTruthy();
  });

  it("toggling checkboxes updates the count; deselecting all hides the bar", async () => {
    await renderActionable();
    await userEvent.click(screen.getByRole("checkbox", { name: "Select Ceramic Mug" }));
    expect(screen.getByText("1 change selected")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Apply 1 change" })).toBeTruthy();
    await userEvent.click(screen.getByRole("checkbox", { name: "Select Steel Bottle" }));
    expect(screen.queryByText(/selected/)).toBeNull();
    expect(screen.queryByRole("button", { name: /^Apply / })).toBeNull();
  });

  it("busy: shows 'Applying…' disabled while the POST is pending", async () => {
    await renderActionable({ onApply: () => new Promise(() => {}) });
    await userEvent.click(screen.getByRole("button", { name: "Apply 2 changes" }));
    const busy = screen.getByRole("button", { name: "Applying…" }) as HTMLButtonElement;
    expect(busy.disabled).toBe(true);
  });

  it("success: POSTs the selected ids and re-fetches the table", async () => {
    const fetchMock = await renderActionable({ onApply: async () => json({}) });
    await userEvent.click(screen.getByRole("button", { name: "Apply 2 changes" }));
    await waitFor(() => {
      const productLoads = fetchMock.mock.calls.filter(([u]) => String(u) === "/api/products");
      expect(productLoads.length).toBe(2); // initial load + post-apply reload
    });
    const applyCall = fetchMock.mock.calls.find(([u]) => String(u) === "/api/apply/bulk");
    expect(applyCall).toBeTruthy();
    expect(JSON.parse(String(applyCall![1]?.body))).toEqual({ productIds: ["p1", "p2"] });
  });

  it("failure: shows the apply error in the bar and re-enables the button", async () => {
    await renderActionable({ onApply: async () => json({}, false) });
    await userEvent.click(screen.getByRole("button", { name: "Apply 2 changes" }));
    await screen.findByText("Couldn't apply changes — try again.");
    const button = screen.getByRole("button", { name: "Apply 2 changes" }) as HTMLButtonElement;
    expect(button.disabled).toBe(false);
  });
});
```

Placement note: `ApiHandlers`, `stubApi`, `json`, and `ROWS` are already defined earlier in the file (Task 2). Append this block at the end of the file.

- [ ] **Step 2: Run the file**

Run: `cd /c/Users/pohde/projects/priceiq && npx vitest run --project ui src/components/ProductsTable.test.tsx`
Expected: **15 passing**. If the "success" test's id-order assertion fails, check the actual order in the received body and match the component's insertion order (ids come from filtering the fetched rows, so `["p1", "p2"]` is expected) — only reorder the expectation if the component demonstrably emits a different order.

- [ ] **Step 3: Run the full suite**

Run: `cd /c/Users/pohde/projects/priceiq && npm test`
Expected: **207 passing** (181 unit + 26 ui).

- [ ] **Step 4: Update `docs/HANDOVER.md`**

Two edits:
1. Section 5 **Tests** bullet: update the UI-tests sentence to say the ui project covers refresh states, status lines, load states, and the selection/apply flow of `ManageCompetitors`/`ProductsTable`, and change **193 passing** → **207 passing**.
2. Section 7 "How to resume": `# expect 193 passing` → `# expect 207 passing`.

- [ ] **Step 5: Commit**

```bash
cd /c/Users/pohde/projects/priceiq && git add src/components/ProductsTable.test.tsx docs/HANDOVER.md && git commit -m "test: ProductsTable selection/apply flow; docs: 207 passing"
```
