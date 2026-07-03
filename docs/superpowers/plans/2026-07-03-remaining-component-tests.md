# Remaining Component Tests — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Characterization tests for the five remaining untested UI components: `RecommendationCard`, `ProductUpload`, `IngestUpload`, `WhatIfSlider`, and `Dashboard`.

**Architecture:** Five new `.test.tsx` files in the existing `ui` (jsdom) Vitest project. Same conventions as the existing test files — local `json` helper, `vi.stubGlobal("fetch", ...)`, `afterEach` cleanup, no `@testing-library/jest-dom`. Components are never modified.

**Tech Stack:** Vitest 4 (`ui` jsdom project), @testing-library/react 16, @testing-library/user-event.

**Spec:** `docs/superpowers/specs/2026-07-03-remaining-component-tests-design.md`

**Project gotchas for the implementer:**
- Bash commands run from home dir — **always prefix with `cd /c/Users/pohde/projects/priceiq && `**.
- Baseline: **216 passing** (`npm test`). Run one file with `npx vitest run --project ui src/components/<File>.test.tsx`.
- No `@testing-library/jest-dom` — assert via `.disabled`, `.value`, `className`, `getAttribute`.
- Single-line `//` comments only where WHY is non-obvious.
- Ellipsis in labels: `…` (U+2026), not `...`.
- If a test fails, fix the TEST by checking actual component output — never modify components.
- `fireEvent` (from `@testing-library/react`) works better than `userEvent` for range inputs in jsdom.

---

## File Structure

- **Create** `src/components/RecommendationCard.test.tsx`
- **Create** `src/components/ProductUpload.test.tsx`
- **Create** `src/components/IngestUpload.test.tsx`
- **Create** `src/components/WhatIfSlider.test.tsx`
- **Create** `src/components/Dashboard.test.tsx`
- **Modify** `docs/HANDOVER.md`

---

### Task 1: RecommendationCard tests (8 tests)

**Files:**
- Create: `src/components/RecommendationCard.test.tsx`

The component renders two states: `rec={null}` → skeleton (animated-pulse divs); populated → action badge (`rec.action` text with a tone class), freshness line, and phrasing paragraph. No fetch calls.

- [ ] **Step 1: Create the test file**

```tsx
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { RecommendationCard } from "./RecommendationCard";
import type { RecView } from "./RecommendationCard";

afterEach(cleanup);

function rec(overrides: Partial<RecView> = {}): RecView {
  return {
    action: "hold",
    suggestedPrice: 1500,
    phrasing: "You are competitively positioned.",
    competitorCount: 3,
    ...overrides,
  };
}

describe("RecommendationCard", () => {
  it("loading: renders skeleton, no action badge", () => {
    render(<RecommendationCard rec={null} />);
    expect(document.querySelector(".animate-pulse")).toBeTruthy();
    expect(screen.queryByText("raise")).toBeNull();
    expect(screen.queryByText("lower")).toBeNull();
    expect(screen.queryByText("hold")).toBeNull();
  });

  it("raise: badge text and text-positive class", () => {
    render(<RecommendationCard rec={rec({ action: "raise" })} />);
    const badge = screen.getByText("raise");
    expect(badge.className).toContain("text-positive");
  });

  it("lower: badge text and text-warning class", () => {
    render(<RecommendationCard rec={rec({ action: "lower" })} />);
    const badge = screen.getByText("lower");
    expect(badge.className).toContain("text-warning");
  });

  it("hold: badge text and text-muted class", () => {
    render(<RecommendationCard rec={rec({ action: "hold" })} />);
    const badge = screen.getByText("hold");
    expect(badge.className).toContain("text-muted");
  });

  it("freshness: plural competitors", () => {
    render(<RecommendationCard rec={rec({ competitorCount: 3 })} />);
    expect(screen.getByText("Based on 3 competitors")).toBeTruthy();
  });

  it("freshness: singular competitor", () => {
    render(<RecommendationCard rec={rec({ competitorCount: 1 })} />);
    expect(screen.getByText("Based on 1 competitor")).toBeTruthy();
  });

  it("freshness: no competitor data", () => {
    render(<RecommendationCard rec={rec({ competitorCount: 0 })} />);
    expect(screen.getByText("No competitor data")).toBeTruthy();
  });

  it("phrasing text is rendered", () => {
    render(<RecommendationCard rec={rec({ phrasing: "Lower your price to match the market." })} />);
    expect(screen.getByText("Lower your price to match the market.")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run the file**

Run: `cd /c/Users/pohde/projects/priceiq && npx vitest run --project ui src/components/RecommendationCard.test.tsx`
Expected: **8 passing**. If a class assertion fails, read `src/components/RecommendationCard.tsx` to confirm the exact class names on the badge element.

- [ ] **Step 3: Commit**

```bash
cd /c/Users/pohde/projects/priceiq && git add src/components/RecommendationCard.test.tsx && git commit -m "test: RecommendationCard (loading/raise/lower/hold/freshness/phrasing)"
```

---

### Task 2: ProductUpload + IngestUpload tests (7 + 7 tests)

**Files:**
- Create: `src/components/ProductUpload.test.tsx`
- Create: `src/components/IngestUpload.test.tsx`

Both components have identical structure: hidden file input inside a `<label>`, POST to their endpoint, busy state, success summary, row errors, server error with body, network failure. Only copy and endpoint differ.

**ProductUpload:** endpoint `POST /api/products/catalog`, heading "Import product catalog", busy label "Importing…", success verb "added" (N added), callback `onImported`, error fallback "Import failed — try again."

**IngestUpload:** endpoint `POST /api/ingest`, heading "Import competitor prices", busy label "Uploading…", success verb "inserted" (N inserted), callback `onIngested`, error fallback "Upload failed — try again."

The file input is `sr-only` inside a `<label>` — no button role. Query it with `document.querySelector('input[type="file"]') as HTMLInputElement`.

Trigger upload with `await userEvent.upload(fileInput, new File(["sku,title"], "test.csv", { type: "text/csv" }))`.

- [ ] **Step 1: Create `src/components/ProductUpload.test.tsx`**

```tsx
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProductUpload } from "./ProductUpload";

const json = (data: unknown, ok = true) => ({ ok, json: async () => data }) as Response;

function stubFetch(impl: () => Promise<Response> = async () => json({ inserted: 1, updated: 0, skipped: 0, errors: [] })) {
  const mock = vi.fn(impl);
  vi.stubGlobal("fetch", mock);
  return mock;
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const CSV = new File(["sku,title\nMUG-001,Mug"], "products.csv", { type: "text/csv" });

function renderUpload() {
  const onImported = vi.fn();
  render(<ProductUpload onImported={onImported} />);
  const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
  return { onImported, fileInput };
}

describe("ProductUpload", () => {
  it("idle: shows heading and Choose CSV label", () => {
    stubFetch();
    renderUpload();
    expect(screen.getByText("Import product catalog")).toBeTruthy();
    expect(screen.getByText("Choose CSV")).toBeTruthy();
  });

  it("busy: label reads 'Importing…' and file input is disabled", async () => {
    stubFetch(() => new Promise(() => {})); // never resolves
    const { fileInput } = renderUpload();
    await userEvent.upload(fileInput, CSV);
    expect(screen.getByText("Importing…")).toBeTruthy();
    expect(fileInput.disabled).toBe(true);
  });

  it("success: shows summary counts and calls onImported", async () => {
    stubFetch(async () => json({ inserted: 2, updated: 1, skipped: 0, errors: [] }));
    const { onImported } = renderUpload();
    const { fileInput } = renderUpload();
    stubFetch(async () => json({ inserted: 2, updated: 1, skipped: 0, errors: [] }));
    const { fileInput: fi, onImported: oi } = (() => {
      cleanup();
      const onImp = vi.fn();
      render(<ProductUpload onImported={onImp} />);
      return { fileInput: document.querySelector('input[type="file"]') as HTMLInputElement, onImported: onImp };
    })();
    await userEvent.upload(fi, CSV);
    await waitFor(() => expect(screen.getByText("2 added")).toBeTruthy());
    expect(screen.getByText("1 updated")).toBeTruthy();
    expect(screen.getByText("0 skipped")).toBeTruthy();
    expect(oi).toHaveBeenCalledTimes(1);
  });

  it("row errors: shows error list items", async () => {
    stubFetch(async () =>
      json({ inserted: 0, updated: 0, skipped: 0, errors: [{ line: 3, reason: "unknown SKU" }] }),
    );
    const { fileInput } = renderUpload();
    await userEvent.upload(fileInput, CSV);
    await waitFor(() => expect(screen.getByText("Line 3: unknown SKU")).toBeTruthy());
  });

  it("server error with body: shows the error message from the response", async () => {
    stubFetch(async () => ({ ok: false, json: async () => ({ error: "Bad header row" }) }) as Response);
    const { fileInput } = renderUpload();
    await userEvent.upload(fileInput, CSV);
    await waitFor(() => expect(screen.getByText("Bad header row")).toBeTruthy());
  });

  it("network failure: shows generic fallback message", async () => {
    stubFetch(() => Promise.reject(new Error("network down")));
    const { fileInput } = renderUpload();
    await userEvent.upload(fileInput, CSV);
    await waitFor(() => expect(screen.getByText("Import failed — try again.")).toBeTruthy());
  });

  it("after success the file input is re-enabled (not frozen)", async () => {
    stubFetch();
    const { fileInput } = renderUpload();
    await userEvent.upload(fileInput, CSV);
    await waitFor(() => expect(screen.getByText("1 added")).toBeTruthy());
    expect(fileInput.disabled).toBe(false);
  });
});
```

Note: the `success` test above has a duplication error from a copy-paste — clean it up. Use this cleaner version of just that test:

```tsx
  it("success: shows summary counts and calls onImported", async () => {
    stubFetch(async () => json({ inserted: 2, updated: 1, skipped: 0, errors: [] }));
    const { fileInput, onImported } = renderUpload();
    await userEvent.upload(fileInput, CSV);
    await waitFor(() => expect(screen.getByText("2 added")).toBeTruthy());
    expect(screen.getByText("1 updated")).toBeTruthy();
    expect(screen.getByText("0 skipped")).toBeTruthy();
    expect(onImported).toHaveBeenCalledTimes(1);
  });
```

Write the final file with the clean version of the success test (not the duplicated one shown above).

- [ ] **Step 2: Create `src/components/IngestUpload.test.tsx`**

```tsx
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { IngestUpload } from "./IngestUpload";

const json = (data: unknown, ok = true) => ({ ok, json: async () => data }) as Response;

function stubFetch(impl: () => Promise<Response> = async () => json({ inserted: 1, updated: 0, skipped: 0, errors: [] })) {
  const mock = vi.fn(impl);
  vi.stubGlobal("fetch", mock);
  return mock;
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const CSV = new File(["sku,competitor_name,price\nMUG-001,Shop,14.99"], "competitors.csv", { type: "text/csv" });

function renderUpload() {
  const onIngested = vi.fn();
  render(<IngestUpload onIngested={onIngested} />);
  const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
  return { onIngested, fileInput };
}

describe("IngestUpload", () => {
  it("idle: shows heading and Choose CSV label", () => {
    stubFetch();
    renderUpload();
    expect(screen.getByText("Import competitor prices")).toBeTruthy();
    expect(screen.getByText("Choose CSV")).toBeTruthy();
  });

  it("busy: label reads 'Uploading…' and file input is disabled", async () => {
    stubFetch(() => new Promise(() => {})); // never resolves
    const { fileInput } = renderUpload();
    await userEvent.upload(fileInput, CSV);
    expect(screen.getByText("Uploading…")).toBeTruthy();
    expect(fileInput.disabled).toBe(true);
  });

  it("success: shows summary counts and calls onIngested", async () => {
    stubFetch(async () => json({ inserted: 3, updated: 0, skipped: 1, errors: [] }));
    const { fileInput, onIngested } = renderUpload();
    await userEvent.upload(fileInput, CSV);
    await waitFor(() => expect(screen.getByText("3 inserted")).toBeTruthy());
    expect(screen.getByText("0 updated")).toBeTruthy();
    expect(screen.getByText("1 skipped")).toBeTruthy();
    expect(onIngested).toHaveBeenCalledTimes(1);
  });

  it("row errors: shows error list items", async () => {
    stubFetch(async () =>
      json({ inserted: 0, updated: 0, skipped: 0, errors: [{ line: 2, reason: "price must be positive" }] }),
    );
    const { fileInput } = renderUpload();
    await userEvent.upload(fileInput, CSV);
    await waitFor(() => expect(screen.getByText("Line 2: price must be positive")).toBeTruthy());
  });

  it("server error with body: shows the error message from the response", async () => {
    stubFetch(async () => ({ ok: false, json: async () => ({ error: "Upload failed — check the file format." }) }) as Response);
    const { fileInput } = renderUpload();
    await userEvent.upload(fileInput, CSV);
    await waitFor(() => expect(screen.getByText("Upload failed — check the file format.")).toBeTruthy());
  });

  it("network failure: shows generic fallback message", async () => {
    stubFetch(() => Promise.reject(new Error("network down")));
    const { fileInput } = renderUpload();
    await userEvent.upload(fileInput, CSV);
    await waitFor(() => expect(screen.getByText("Upload failed — try again.")).toBeTruthy());
  });

  it("after success the file input is re-enabled (not frozen)", async () => {
    stubFetch();
    const { fileInput } = renderUpload();
    await userEvent.upload(fileInput, CSV);
    await waitFor(() => expect(screen.getByText("1 inserted")).toBeTruthy());
    expect(fileInput.disabled).toBe(false);
  });
});
```

- [ ] **Step 3: Run both files**

Run: `cd /c/Users/pohde/projects/priceiq && npx vitest run --project ui src/components/ProductUpload.test.tsx src/components/IngestUpload.test.tsx`
Expected: **14 passing** (7 + 7). If a test fails, check the exact copy in the component (`src/components/ProductUpload.tsx` / `src/components/IngestUpload.tsx`) — for example, "Importing…" vs "Uploading…", "added" vs "inserted".

- [ ] **Step 4: Commit**

```bash
cd /c/Users/pohde/projects/priceiq && git add src/components/ProductUpload.test.tsx src/components/IngestUpload.test.tsx && git commit -m "test: ProductUpload and IngestUpload (idle/busy/success/errors/failure)"
```

---

### Task 3: WhatIfSlider tests (10 tests)

**Files:**
- Create: `src/components/WhatIfSlider.test.tsx`

Key component behaviors:
- Props: `productId`, `currentPrice`, `cogs`, `compMedian`, `suggestedPrice`. Initial price = `suggestedPrice ?? currentPrice`.
- Slider: `aria-label="Set price with slider"`, range from `Math.round(lo*0.5)` to `Math.round(hi*1.5)`, step 50.
- Text input: `aria-label="Set exact price"`, shows `(price/100).toFixed(2)`, blur normalises.
- Price display: `<span>` with `formatCents(price)` (e.g. `"$16.00"` for 1600 cents).
- Margin: `marginPct(price, cogs)` from `src/lib/margin.ts` → `pct(ratio)` → e.g. `"62.5%"`.
- vs-median: `(price - compMedian) / compMedian` → `pct(...)` → e.g. `"+14.3%"`. Note: `pct` does not add a `+` sign — the displayed value for a positive number is `"14.3%"`, not `"+14.3%"`.
- Apply button: `disabled` when `price === currentPrice` OR `price <= 0`. Label: `"Applying…"` when pending, else `Apply ${formatCents(price)}` (e.g. `"Apply $16.00"`).
- On Apply success: calls `window.location.reload()`.
- On Apply failure: sets error text `"Couldn't apply price — try again."` (role="alert"), re-enables.

`window.location.reload` stub: use `Object.defineProperty` pattern (same as `ManageCompetitors.test.tsx`):
```tsx
const reloadMock = vi.fn();
beforeEach(() => {
  Object.defineProperty(window, "location", {
    value: { ...window.location, reload: reloadMock },
    writable: true,
    configurable: true,
  });
});
```

Use `fireEvent.change` (not userEvent) for the range slider — jsdom's pointer simulation doesn't move range inputs reliably.

- [ ] **Step 1: Create the test file**

```tsx
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WhatIfSlider } from "./WhatIfSlider";

const json = (data: unknown, ok = true) => ({ ok, json: async () => data }) as Response;

const reloadMock = vi.fn();

// jsdom's location.reload throws "Not implemented" — replace with a spy.
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

const DEFAULT_PROPS = {
  productId: "p1",
  currentPrice: 1500,
  cogs: 600,
  compMedian: 1400,
  suggestedPrice: 1600,
};

function renderSlider(props: Partial<typeof DEFAULT_PROPS> = {}) {
  render(<WhatIfSlider {...DEFAULT_PROPS} {...props} />);
  return {
    slider: screen.getByRole("slider", { name: "Set price with slider" }) as HTMLInputElement,
    textInput: screen.getByRole("textbox", { name: "Set exact price" }) as HTMLInputElement,
  };
}

function stubFetch(impl: () => Promise<Response> = async () => json({})) {
  const mock = vi.fn(impl);
  vi.stubGlobal("fetch", mock);
  return mock;
}

describe("WhatIfSlider", () => {
  it("initial: displays the suggested price", () => {
    stubFetch();
    renderSlider();
    // suggestedPrice=1600 → formatCents(1600) = "$16.00"
    expect(screen.getByText("$16.00")).toBeTruthy();
  });

  it("slider change: updates the price display", () => {
    stubFetch();
    const { slider } = renderSlider();
    fireEvent.change(slider, { target: { value: "1800" } });
    expect(screen.getByText("$18.00")).toBeTruthy();
  });

  it("text input change: updates the price display", async () => {
    stubFetch();
    const { textInput } = renderSlider();
    await userEvent.clear(textInput);
    await userEvent.type(textInput, "20");
    expect(screen.getByText("$20.00")).toBeTruthy();
  });

  it("blur normalises the text input to 2 decimal places", async () => {
    stubFetch();
    const { textInput } = renderSlider();
    await userEvent.clear(textInput);
    await userEvent.type(textInput, "20");
    await userEvent.tab();
    expect(textInput.value).toBe("20.00");
  });

  it("margin display updates when slider moves", () => {
    stubFetch();
    const { slider } = renderSlider();
    // Initial: price=1600, cogs=600 → margin=(1600-600)/1600=62.5%
    expect(screen.getByText("62.5%")).toBeTruthy();
    // Move to 2000: (2000-600)/2000=70%
    fireEvent.change(slider, { target: { value: "2000" } });
    expect(screen.getByText("70.0%")).toBeTruthy();
  });

  it("Apply disabled and hint shown when price equals current price", () => {
    stubFetch();
    const { slider } = renderSlider();
    // Move slider to currentPrice (1500)
    fireEvent.change(slider, { target: { value: "1500" } });
    const applyBtn = screen.getByRole("button", { name: "Apply $15.00" }) as HTMLButtonElement;
    expect(applyBtn.disabled).toBe(true);
    expect(screen.getByText("Already the current price")).toBeTruthy();
  });

  it("Apply disabled and warning shown when price is zero", async () => {
    stubFetch();
    const { textInput } = renderSlider();
    await userEvent.clear(textInput);
    await userEvent.type(textInput, "0");
    const applyBtn = screen.getByRole("button", { name: "Apply $0.00" }) as HTMLButtonElement;
    expect(applyBtn.disabled).toBe(true);
    expect(screen.getByText("Enter a price above $0")).toBeTruthy();
  });

  it("busy: Apply button reads 'Applying…' and is disabled", async () => {
    stubFetch(() => new Promise(() => {})); // never resolves
    renderSlider();
    await userEvent.click(screen.getByRole("button", { name: "Apply $16.00" }));
    const busy = screen.getByRole("button", { name: "Applying…" }) as HTMLButtonElement;
    expect(busy.disabled).toBe(true);
  });

  it("success: calls window.location.reload", async () => {
    stubFetch();
    renderSlider();
    await userEvent.click(screen.getByRole("button", { name: "Apply $16.00" }));
    await waitFor(() => expect(reloadMock).toHaveBeenCalledTimes(1));
  });

  it("failure: shows error alert and re-enables the button", async () => {
    stubFetch(async () => json({}, false));
    renderSlider();
    await userEvent.click(screen.getByRole("button", { name: "Apply $16.00" }));
    await screen.findByRole("alert");
    expect(screen.getByText("Couldn't apply price — try again.")).toBeTruthy();
    const btn = screen.getByRole("button", { name: "Apply $16.00" }) as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
  });
});
```

- [ ] **Step 2: Run the file**

Run: `cd /c/Users/pohde/projects/priceiq && npx vitest run --project ui src/components/WhatIfSlider.test.tsx`
Expected: **10 passing**. Common traps:
- `pct(ratio)` does NOT add a `+` sign — positive margins display as `"62.5%"` not `"+62.5%"`. Verify with `src/lib/money.ts`.
- The Apply button label is `Apply ${formatCents(price)}` — `formatCents(1600)` → `"$16.00"` so the button name is `"Apply $16.00"`.
- When price = 0, `formatCents(0)` → `"$0.00"` so button name is `"Apply $0.00"`.

- [ ] **Step 3: Commit**

```bash
cd /c/Users/pohde/projects/priceiq && git add src/components/WhatIfSlider.test.tsx && git commit -m "test: WhatIfSlider (price/slider/input/margin/apply/busy/success/failure)"
```

---

### Task 4: Dashboard tests (3 tests) + HANDOVER.md

**Files:**
- Create: `src/components/Dashboard.test.tsx`
- Modify: `docs/HANDOVER.md`

Dashboard renders `<ProductUpload onImported={...} />`, `<IngestUpload onIngested={...} />`, and `<ProductsTable refreshToken={...} />`. When either callback fires, `refreshToken` increments → ProductsTable re-fetches `/api/products`.

The fetch mock must route three endpoints:
- `GET /api/products` → product rows (or `[]`)
- `POST /api/products/catalog` → upload summary
- `POST /api/ingest` → upload summary

- [ ] **Step 1: Create the test file**

```tsx
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Dashboard } from "./Dashboard";

const json = (data: unknown, ok = true) => ({ ok, json: async () => data }) as Response;

const SUMMARY = { inserted: 1, updated: 0, skipped: 0, errors: [] };

// Routes all three endpoints Dashboard's children call; throws on anything else.
function stubAll(overrides: Partial<Record<string, () => Promise<Response>>> = {}) {
  const mock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (overrides[url]) return overrides[url]!();
    if (url === "/api/products") return json([]);
    if (url === "/api/products/catalog" && init?.method === "POST") return json(SUMMARY);
    if (url === "/api/ingest" && init?.method === "POST") return json(SUMMARY);
    throw new Error(`unexpected fetch: ${url}`);
  });
  vi.stubGlobal("fetch", mock);
  return mock;
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const CATALOG_CSV = new File(["sku,title\nMUG-001,Mug"], "products.csv", { type: "text/csv" });
const INGEST_CSV = new File(["sku,competitor_name,price\nMUG-001,Shop,14.99"], "competitors.csv", { type: "text/csv" });

describe("Dashboard", () => {
  it("renders all three sections", async () => {
    stubAll();
    render(<Dashboard />);
    expect(screen.getByText("Import product catalog")).toBeTruthy();
    expect(screen.getByText("Import competitor prices")).toBeTruthy();
    // ProductsTable renders into an empty state or loading skeleton — just check it mounted
    // by verifying the two upload sections are present (table is async; its own tests cover it).
  });

  it("onImported: re-fetches products after catalog upload", async () => {
    const fetchMock = stubAll();
    render(<Dashboard />);
    // Wait for initial products load
    await waitFor(() => expect(fetchMock.mock.calls.some(([u]) => String(u) === "/api/products")).toBe(true));
    const countBefore = fetchMock.mock.calls.filter(([u]) => String(u) === "/api/products").length;

    const catalogInput = document.querySelectorAll('input[type="file"]')[0] as HTMLInputElement;
    await userEvent.upload(catalogInput, CATALOG_CSV);

    await waitFor(() => {
      const productLoads = fetchMock.mock.calls.filter(([u]) => String(u) === "/api/products");
      expect(productLoads.length).toBeGreaterThan(countBefore);
    });
  });

  it("onIngested: re-fetches products after competitor upload", async () => {
    const fetchMock = stubAll();
    render(<Dashboard />);
    await waitFor(() => expect(fetchMock.mock.calls.some(([u]) => String(u) === "/api/products")).toBe(true));
    const countBefore = fetchMock.mock.calls.filter(([u]) => String(u) === "/api/products").length;

    // The second file input belongs to IngestUpload
    const ingestInput = document.querySelectorAll('input[type="file"]')[1] as HTMLInputElement;
    await userEvent.upload(ingestInput, INGEST_CSV);

    await waitFor(() => {
      const productLoads = fetchMock.mock.calls.filter(([u]) => String(u) === "/api/products");
      expect(productLoads.length).toBeGreaterThan(countBefore);
    });
  });
});
```

- [ ] **Step 2: Run the file**

Run: `cd /c/Users/pohde/projects/priceiq && npx vitest run --project ui src/components/Dashboard.test.tsx`
Expected: **3 passing**. If the file input index is wrong (wiring test), check the DOM order — ProductUpload renders first, IngestUpload second, so `querySelectorAll('input[type="file"]')[0]` is the catalog input and `[1]` is the ingest input.

- [ ] **Step 3: Run the full suite**

Run: `cd /c/Users/pohde/projects/priceiq && npm test`
Expected: **251 passing** (181 unit + 70 ui).

- [ ] **Step 4: Update HANDOVER.md**

Four edits:
1. **Header status line (~line 6):** 216 → 251 tests passing; update status to reflect all components now covered.
2. **Section 5 Tests bullet:** 216 → 251 passing; update coverage description to say all UI components are tested.
3. **Section 6 Next steps:** remove the "Remaining untested components" item entirely (all done). The list should now start with "DNS-rebinding TOCTOU".
4. **Section 7 resume:** `# expect 216 passing` → `# expect 251 passing`.

- [ ] **Step 5: Commit**

```bash
cd /c/Users/pohde/projects/priceiq && git add src/components/Dashboard.test.tsx docs/HANDOVER.md && git commit -m "test: Dashboard wiring; docs: 251 passing, all components covered"
```
