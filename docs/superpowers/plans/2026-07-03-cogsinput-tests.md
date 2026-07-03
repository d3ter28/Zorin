# CogsInput Test Coverage — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Characterization tests for `src/components/CogsInput.tsx` — the inline cost-of-goods editor — covering initial formatting, no-change skip, the save round-trip (POST/busy/success/failure), and the empty/non-numeric edge cases.

**Architecture:** One new test file `src/components/CogsInput.test.tsx` in the existing `ui` (jsdom) Vitest project, following the same conventions as `ProductsTable.test.tsx` (local `json` helper, `vi.stubGlobal("fetch", ...)`, `afterEach` cleanup). **The component is never modified.**

**Tech Stack:** Vitest 4 (`ui` jsdom project, already configured), @testing-library/react 16, @testing-library/user-event.

**Spec:** `docs/superpowers/specs/2026-07-03-cogsinput-tests-design.md`

**Project gotchas for the implementer:**
- Bash commands run from the home dir — **always prefix with `cd /c/Users/pohde/projects/priceiq && `**.
- Baseline: **207 passing** (`npm test`). Run the new file alone with `npx vitest run --project ui src/components/CogsInput.test.tsx`.
- Comments: single-line `//` only, no docblocks, only where the WHY is non-obvious.
- No `@testing-library/jest-dom` — assert via `.disabled`, `.value`, `getAttribute("aria-invalid")`.
- If a test fails, debug the TEST, not the component — `CogsInput` is known-good in production. Check exact behavior in `src/components/CogsInput.tsx`.
- The component's save fires on **blur** — trigger it with `await userEvent.tab()`.
- These are characterization tests: two quirks are pinned deliberately (non-numeric input serializes as `{"cogs":null}`; retry after failure requires re-typing because the value reverts to `initial` and the no-change guard then skips the save). Do NOT "fix" the component.

---

## File Structure

- **Create** `src/components/CogsInput.test.tsx` — all 9 tests.
- **Modify** `docs/HANDOVER.md` — test count 207 → 216; remove CogsInput from the untested-components list.

---

### Task 1: CogsInput test file (+9 tests)

**Files:**
- Create: `src/components/CogsInput.test.tsx`

Component behavior (from `src/components/CogsInput.tsx`): renders one `<input>` (role `textbox`, accessible name from the `label` prop). Initial value: `initialCents === null` → `""` with placeholder `—`; else `(initialCents / 100).toFixed(2)`. On blur: if value unchanged, no fetch. Otherwise POST `/api/products/{productId}/cogs` with body `{cogs: value === "" ? null : Math.round(Number(value) * 100)}`; input `disabled` while pending; on ok the value is re-formatted to two decimals and `onSaved()` fires; on failure the value reverts to the initial value, `aria-invalid` becomes `"true"`, and `onSaved` is not called.

- [ ] **Step 1: Write the test file**

Create `src/components/CogsInput.test.tsx` with exactly this content:

```tsx
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CogsInput } from "./CogsInput";

const LABEL = "Cost of goods for Ceramic Mug";

const json = (data: unknown, ok = true) => ({ ok, json: async () => data }) as Response;

// Single endpoint, so a plain mock (no URL routing) is enough.
function stubFetch(impl: () => Promise<Response> = async () => json({})) {
  const fetchMock = vi.fn(impl);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function renderInput(
  overrides: Partial<Parameters<typeof CogsInput>[0]> = {},
) {
  const onSaved = vi.fn();
  render(
    <CogsInput
      productId="p1"
      initialCents={1250}
      onSaved={onSaved}
      label={LABEL}
      {...overrides}
    />,
  );
  const input = screen.getByRole("textbox", { name: LABEL }) as HTMLInputElement;
  return { onSaved, input };
}

// Replace the field's content and blur, which triggers save().
async function typeAndBlur(input: HTMLInputElement, text: string) {
  await userEvent.clear(input);
  if (text !== "") await userEvent.type(input, text);
  await userEvent.tab();
}

describe("CogsInput", () => {
  it("formats the initial cents as dollars", () => {
    stubFetch();
    const { input } = renderInput();
    expect(input.value).toBe("12.50");
  });

  it("renders empty with the dash placeholder when cogs is unknown", () => {
    stubFetch();
    const { input } = renderInput({ initialCents: null });
    expect(input.value).toBe("");
    expect(input.placeholder).toBe("—");
  });

  it("no-change blur: skips the save entirely", async () => {
    const fetchMock = stubFetch();
    const { onSaved, input } = renderInput();
    await userEvent.click(input);
    await userEvent.tab();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it("save: POSTs the new value in cents to the cogs endpoint", async () => {
    const fetchMock = stubFetch();
    const { input } = renderInput();
    await typeAndBlur(input, "14");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe("/api/products/p1/cogs");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual({ cogs: 1400 });
  });

  it("busy: disables the input while the save is pending", async () => {
    stubFetch(() => new Promise(() => {})); // never resolves
    const { input } = renderInput();
    await typeAndBlur(input, "14");
    expect(input.disabled).toBe(true);
  });

  it("success: normalizes the value, fires onSaved, re-enables", async () => {
    stubFetch();
    const { onSaved, input } = renderInput();
    await typeAndBlur(input, "14");
    await waitFor(() => expect(input.value).toBe("14.00"));
    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(input.disabled).toBe(false);
  });

  it("failure: reverts the value, flags aria-invalid, does not fire onSaved", async () => {
    // After the revert the value equals the initial value again, so blurring
    // once more is a no-op — retrying requires re-typing the new value.
    stubFetch(async () => json({}, false));
    const { onSaved, input } = renderInput();
    await typeAndBlur(input, "14");
    await waitFor(() => expect(input.value).toBe("12.50"));
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(onSaved).not.toHaveBeenCalled();
    expect(input.disabled).toBe(false);
  });

  it("clearing the field saves cogs as null", async () => {
    const fetchMock = stubFetch();
    const { input } = renderInput();
    await typeAndBlur(input, "");
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({ cogs: null });
    await waitFor(() => expect(input.value).toBe(""));
  });

  it("non-numeric input serializes as null (pins current behavior)", async () => {
    // Math.round(NaN * 100) is NaN, and JSON.stringify turns NaN into null —
    // so "abc" is indistinguishable from clearing the field on the wire.
    // Characterization only; not an endorsement.
    const fetchMock = stubFetch();
    const { input } = renderInput();
    await typeAndBlur(input, "abc");
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({ cogs: null });
  });
});
```

- [ ] **Step 2: Run the file**

Run: `cd /c/Users/pohde/projects/priceiq && npx vitest run --project ui src/components/CogsInput.test.tsx`
Expected: **9 passing**. These characterize existing behavior, so they should pass immediately. If one fails, fix the TEST against the actual component behavior in `src/components/CogsInput.tsx`. Known trap: the "success" test's normalized value — the component recomputes from cents (`(1400 / 100).toFixed(2)` → `"14.00"`).

- [ ] **Step 3: Run the full suite**

Run: `cd /c/Users/pohde/projects/priceiq && npm test`
Expected: **216 passing** (181 unit + 35 ui).

- [ ] **Step 4: Commit**

```bash
cd /c/Users/pohde/projects/priceiq && git add src/components/CogsInput.test.tsx && git commit -m "test: CogsInput states (format/skip/save/busy/success/failure/empty/NaN)"
```

---

### Task 2: Update HANDOVER.md

**Files:**
- Modify: `docs/HANDOVER.md`

- [ ] **Step 1: Make four edits**

1. Header status line (section top): **207 tests passing** → **216 tests passing**.
2. Section 5 **Tests** bullet: change **207 passing** → **216 passing** and mention that `CogsInput` is now covered (add it to the sentence listing what the ui project covers).
3. Section 6 **Next steps**, "Remaining untested components" item: remove `CogsInput` from the list and drop the sentence recommending it as the next candidate (the remaining list is `Dashboard`, `IngestUpload`, `ProductUpload`, `RecommendationCard`, `WhatIfSlider`).
4. Section 7 "How to resume": `# expect 207 passing` → `# expect 216 passing`.

- [ ] **Step 2: Commit**

```bash
cd /c/Users/pohde/projects/priceiq && git add docs/HANDOVER.md && git commit -m "docs: CogsInput tests done; 216 passing"
```
