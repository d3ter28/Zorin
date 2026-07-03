# Remaining Component Tests — Design Spec

**Date:** 2026-07-03
**Status:** Approved
**Scope:** Characterization tests for the five remaining untested components: `RecommendationCard`, `ProductUpload`, `IngestUpload`, `WhatIfSlider`, `Dashboard`. No component files are modified.

## Goal

Complete UI test coverage for all components. These are regression-guard characterization tests — they pin current behavior so accidental breakage during future refactors is caught immediately.

## Approach

Five new `.test.tsx` files in the existing `ui` (jsdom) Vitest project. Same conventions as `CogsInput.test.tsx` and `ManageCompetitors.test.tsx`: local `json` helper, `vi.stubGlobal("fetch", ...)`, `afterEach` cleanup, no `@testing-library/jest-dom`. Components are never modified.

---

## File 1: `src/components/RecommendationCard.test.tsx` — 8 tests

No fetch stubs needed — pure render, no network calls, no state.

**Props interface:** `rec: RecView | null` where `RecView = { action, suggestedPrice, phrasing, competitorCount }`.

**Tests:**
1. **loading skeleton:** `rec={null}` → animated-pulse divs present (query by `document.querySelector('.animate-pulse')`), no action badge text.
2. **raise action:** `action:"raise"` → badge text "raise", badge has class `text-positive`.
3. **lower action:** `action:"lower"` → badge has class `text-warning`.
4. **hold action:** `action:"hold"` → badge has class `text-muted`.
5. **freshness — plural:** `competitorCount:3` → "Based on 3 competitors".
6. **freshness — singular:** `competitorCount:1` → "Based on 1 competitor".
7. **freshness — no data:** `competitorCount:0` → "No competitor data".
8. **phrasing text rendered:** `phrasing:"Lower your price to match the market."` → that text appears in the DOM.

Revised count: **8 tests** (the freshness variants deserve their own tests).

---

## File 2: `src/components/ProductUpload.test.tsx` — 7 tests

**Endpoint:** `POST /api/products/catalog` with `Content-Type: text/csv`.

**Helpers:**
- `json(data, ok = true)` — fake Response.
- `stubFetch(impl)` — stubs global fetch with `vi.fn(impl)`.
- `renderUpload()` — renders `<ProductUpload onImported={vi.fn()} />`, returns `{ onImported, fileInput }` where `fileInput = document.querySelector('input[type="file"]') as HTMLInputElement`. The input is visually hidden (`sr-only`) inside a `<label>` — there is no button role to query.
- Upload helper: `await userEvent.upload(fileInput, new File(["sku,title"], "catalog.csv", { type: "text/csv" }))`.

**Tests:**
1. **idle:** renders "Import product catalog" heading and "Choose CSV" label text.
2. **busy:** never-resolving fetch → label reads "Importing…", file input is `disabled`.
3. **success summary:** `{inserted:2, updated:1, skipped:0, errors:[]}` → "2 added", "1 updated", "0 skipped" badges; `onImported` called once.
4. **row errors:** `{inserted:0, updated:0, skipped:0, errors:[{line:3, reason:"unknown SKU"}]}` → "Line 3: unknown SKU" in the DOM.
5. **server error with body:** non-ok response with `{error:"Bad header row"}` → "Bad header row" shown in alert.
6. **network failure:** fetch throws → generic "Import failed — try again." shown in alert.
7. **re-upload allowed:** after a successful upload, file input value is reset (not `disabled`); verify `onImported` was called (i.e. the component didn't freeze).

---

## File 3: `src/components/IngestUpload.test.tsx` — 7 tests

**Endpoint:** `POST /api/ingest` with `Content-Type: text/csv`.

Mirror of `ProductUpload.test.tsx` with these differences:
- Component: `<IngestUpload onIngested={vi.fn()} />`
- Heading: "Import competitor prices"
- Busy label: "Uploading…" (not "Importing…")
- Success verb: "inserted" (not "added") — badge reads "N inserted"
- Callback: `onIngested` (not `onImported`)
- Generic error fallback: "Upload failed — try again." (not "Import failed…")

Same 7 test shapes as ProductUpload.

---

## File 4: `src/components/WhatIfSlider.test.tsx` — 10 tests

**Props:** `productId="p1"`, `currentPrice={1500}`, `cogs={600}`, `compMedian={1400}`, `suggestedPrice={1600}`.

**Key behaviors from the component:**
- Initial `price` = `suggestedPrice` (1600). Initial `priceText` = `"16.00"`.
- Slider range: `min = Math.round(1500 * 0.5) = 750`, `max = Math.round(1600 * 1.5) = 2400`, step 50.
- Apply button: disabled when `price === currentPrice` (1500) or `price <= 0`.
- On Apply success: calls `window.location.reload()`.
- On Apply failure: shows error, re-enables.
- Margin display: `marginPct(price, cogs)` → `(1600-600)/1600 = 62.5%` → `pct(0.625)` → `"62.5%"`.
- vs-median: `(1600-1400)/1400 ≈ 14.3%` → `"+14.3%"`.

**Stubs needed:**
- `window.location.reload` — `vi.spyOn(window.location, "reload").mockImplementation(() => {})` (jsdom's reload throws "Not implemented").
- `global.fetch` — for Apply tests only.

**Queries:**
- Slider: `getByRole("slider", { name: "Set price with slider" })`.
- Text input: `getByRole("textbox", { name: "Set exact price" })`.
- Apply button: `getByRole("button", { name: /^Apply/ })`.

**Tests:**
1. **initial price display:** rendered price text shows `"$16.00"` (from `formatCents(1600)`).
2. **slider change:** `fireEvent.change(slider, { target: { value: "1800" } })` → price display updates to `"$18.00"`.
3. **text input change:** type `"20"` into text input → price display updates to `"$20.00"`.
4. **blur normalises text:** type `"20"` then tab → text input value becomes `"20.00"`.
5. **margin updates live:** after slider change to 2000 → margin display shows updated pct (not "—").
6. **Apply disabled at current price:** when slider set to `currentPrice` (1500) → Apply button disabled, "Already the current price" hint visible.
7. **Apply disabled at zero:** set text input to `"0"` → Apply button disabled, "Enter a price above $0" visible.
8. **Apply busy:** never-resolving fetch → button reads "Applying…" and is disabled.
9. **Apply success:** ok response → `window.location.reload` called once.
10. **Apply failure:** non-ok → error "Couldn't apply price — try again." visible (role="alert"), button re-enabled.

Note: use `fireEvent.change` for slider (not `userEvent` — range inputs don't work well with userEvent's pointer simulation in jsdom).

---

## File 5: `src/components/Dashboard.test.tsx` — 3 tests

**What Dashboard does:** renders `<ProductUpload onImported={...} />` + `<IngestUpload onIngested={...} />` + `<ProductsTable refreshToken={...} />`. When either callback fires, `refreshToken` increments, triggering a ProductsTable re-fetch.

**Fetch stub needed:** `/api/products` (ProductsTable fetches on mount). Use `vi.stubGlobal("fetch", vi.fn(async () => json([])))`.

**Tests:**
1. **renders all three sections:** "Import product catalog" heading, "Import competitor prices" heading, and ProductsTable's loading/empty state all present after mount.
2. **onImported re-fetches table:** upload a file to the catalog input (stub `/api/products/catalog` → ok + summary; stub `/api/products` → returns rows after the second call). After upload, wait for ProductsTable to re-fetch — verify `/api/products` was called twice (initial load + post-import refresh).
3. **onIngested re-fetches table:** same pattern for the competitor-price input (stub `/api/ingest`). Verify second `/api/products` call.

For tests 2 and 3: the fetch mock must route all three endpoints. Use a `stubAll(overrides)` helper inside the test file:
```tsx
function stubAll(overrides: Record<string, () => Promise<Response>> = {}) {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (overrides[url]) return overrides[url]();
    if (url === "/api/products") return json([]);
    if (url === "/api/products/catalog" && init?.method === "POST") return json({ inserted: 1, updated: 0, skipped: 0, errors: [] });
    if (url === "/api/ingest" && init?.method === "POST") return json({ inserted: 1, updated: 0, skipped: 0, errors: [] });
    throw new Error(`unexpected fetch: ${url}`);
  });
}
```

---

## HANDOVER.md update

- Header status line: 216 → 251 tests passing; note all components now covered.
- Section 5 Tests bullet: 216 → 251; mention all remaining components covered.
- Section 6 Next steps: remove "Remaining untested components" item entirely (all done).
- Section 7 resume: `# expect 216 passing` → `# expect 251 passing`.

---

## Expected outcome

**216 → 251 tests passing** (181 unit + 70 ui). New tests: 8 + 7 + 7 + 10 + 3 = 35.

## Out of scope

- Any change to component source files.
- Testing `window.location.href` navigation (not used by these components).
- File-parsing logic (tested via the API route unit tests).
