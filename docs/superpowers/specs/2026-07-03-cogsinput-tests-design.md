# CogsInput Test Coverage — Design Spec

**Date:** 2026-07-03
**Status:** Approved
**Scope:** Characterization tests for `src/components/CogsInput.tsx`. The component is never modified.

## Goal

Pin the behavior of `CogsInput` — the inline cost-of-goods editor embedded in every ProductsTable row (and on the product page) — with a dedicated UI test file. Covers initial formatting, the no-change skip, the save round-trip (busy/success/failure), and the two input edge cases (empty, non-numeric).

## Component behavior being characterized

`CogsInput` renders a single `<input>`:

- **Initial value:** `initialCents === null` → `""` (placeholder `—`); otherwise `(initialCents / 100).toFixed(2)` (e.g. `1250` → `"12.50"`).
- **Save trigger:** `onBlur`. If `value === initial`, save is skipped entirely — no fetch, no `onSaved`.
- **Request:** `POST /api/products/{productId}/cogs` with JSON body `{cogs: cents}` where `cents = value === "" ? null : Math.round(Number(value) * 100)`.
- **Busy:** `disabled` while the POST is pending.
- **Success (`res.ok`):** value is normalized to two decimals (`"14"` → `"14.00"`), `onSaved()` fires.
- **Failure (non-ok or thrown):** value reverts to `initial`, `aria-invalid=true`, red border via inline style, explanatory `title`, `onSaved` NOT called, input re-enabled.
- **Quirk (pinned, not endorsed):** non-numeric input produces `Math.round(NaN * 100) = NaN`, which `JSON.stringify` serializes as `null` — so `"abc"` sends `{"cogs":null}`, identical on the wire to clearing the field.
- **Quirk (documented, not separately tested):** after a failure the value equals `initial`, so blurring again is a no-op — retry requires re-typing the value.

## Approach

Dedicated `src/components/CogsInput.test.tsx` in the existing `ui` (jsdom) Vitest project — same conventions as `ManageCompetitors.test.tsx` / `ProductsTable.test.tsx`. The alternative (testing through ProductsTable) was rejected: it couples two components' tests and CogsInput is also used outside the table.

## Test file design

- **Helpers:**
  - `json(data, ok = true)` — fake `Response` (same shape as ProductsTable's helper; duplicated locally, files stay self-contained).
  - `renderInput(overrides?)` — renders `<CogsInput productId="p1" initialCents={1250} onSaved={vi.fn()} label="Cost of goods for Ceramic Mug" />` with prop overrides; returns the `onSaved` spy.
  - Fetch stubbed per-test with `vi.stubGlobal("fetch", vi.fn(...))` — only one endpoint, no URL router needed.
- **Queries:** `getByRole("textbox", { name: "Cost of goods for Ceramic Mug" })`.
- **Blur:** `userEvent.tab()`. Replacing text: `userEvent.clear()` then `userEvent.type()`.
- **No `@testing-library/jest-dom`** — assert via `.disabled`, `getAttribute("aria-invalid")`, `.value`.

## Tests (9)

1. **initial formatting:** `initialCents={1250}` → input value `"12.50"`.
2. **null initial:** `initialCents={null}` → value `""` and placeholder `"—"`.
3. **no-change blur:** focus + blur without edits → fetch never called, `onSaved` not called.
4. **save POST:** clear, type `"14"`, blur → exactly one POST to `/api/products/p1/cogs` with body `{"cogs":1400}`.
5. **busy:** never-resolving fetch → `.disabled === true` while pending.
6. **success:** ok response → value normalized to `"14.00"`, `onSaved` called once, input re-enabled.
7. **failure:** non-ok response → value reverts to `"12.50"`, `aria-invalid` is `"true"`, `onSaved` not called, input re-enabled. Comment documents the retry-requires-retyping quirk.
8. **clear to empty:** clear + blur → body `{"cogs":null}`, value stays `""`.
9. **non-numeric (characterization):** clear, type `"abc"`, blur → body serializes as `{"cogs":null}`. Comment marks this as pinning current behavior, not endorsing it.

## Expected outcome

- 207 → **216 tests passing** (181 unit + 35 ui; the ui project goes 26 → 35).
- `docs/HANDOVER.md` updated: test count and untested-components list (CogsInput removed).

## Out of scope

- Any change to `CogsInput.tsx` (including fixing the NaN quirk — flag it, don't fix it).
- Tests for `Dashboard`, `IngestUpload`, `ProductUpload`, `RecommendationCard`, `WhatIfSlider`.
