# UI Refresh-State Tests — Design

**Date:** 2026-07-03
**Status:** Approved

## Goal

Add component tests for the refresh flows in `ManageCompetitors` and `ProductsTable` — the only untested surface from Phase A/B. Scope is deliberately narrow: button idle/busy states, success behavior, and error messages. Empty states, loading skeletons, selection/apply flow, and status-line rendering are out of scope (the infrastructure added here makes them cheap to add later).

## Infrastructure

- New dev dependencies: `jsdom`, `@testing-library/react`, `@testing-library/user-event`.
- `vitest.config.ts` switches to Vitest 4 `test.projects` (the replacement for the removed `environmentMatchGlobs`):
  - **`unit`** — `environment: "node"`, `include: ["src/**/*.test.ts"]`. Today's 181 tests, byte-for-byte unchanged behavior.
  - **`ui`** — `environment: "jsdom"`, `include: ["src/**/*.test.tsx"]`.
- The `@` → `src/` alias stays in the shared top-level `resolve` config.
- `npm test` (`vitest run`) runs both projects in one command.

## Test plan

### `src/components/ManageCompetitors.test.tsx` (~6 tests)

Render with a small `competitors` fixture. Mock `fetch` with `vi.stubGlobal`; stub `window.location.reload` (jsdom's is non-configurable via direct assignment, so replace the `location` property or use `vi.spyOn` on a redefined property).

1. Idle: button text "Refresh now", not disabled.
2. Busy: click while the mocked `POST /api/products/{id}/refresh` is pending → button text "Refreshing…", disabled.
3. Success: resolved `ok` response → `window.location.reload()` called; no error rendered.
4. Error (network reject): `role="alert"` shows "Couldn't refresh prices — try again."; button re-enabled.
5. Error (`!res.ok`): same alert path.
6. Error clears on retry: after an error, clicking again removes the alert while the new request is pending.

### `src/components/ProductsTable.test.tsx` (~6 tests)

Mock `fetch` to route by URL: `GET /api/products` returns a 2-row fixture; `POST /api/refresh` is controlled per test. `refreshToken={0}` prop.

1. Initial load renders the table with "Refresh all prices" enabled.
2. Busy: click while `POST /api/refresh` pending → "Refreshing…", disabled.
3. Success (no failures): `{refreshed: 2, failed: 0}` → status span shows "Refreshed 2 prices." and `GET /api/products` was re-fetched.
4. Success (with failures): `{refreshed: 1, failed: 1}` → "Refreshed 1 price, 1 failed."
5. Failure: rejected/`!ok` POST → "Couldn't refresh prices — try again.", button re-enabled.
6. Singular message: `{refreshed: 1, failed: 0}` → "Refreshed 1 price."

## Error handling / gotchas

- `ProductsTable` renders a loading skeleton until the first `GET /api/products` resolves — tests must `await` the table appearing (`findBy*`) before interacting.
- `ManageCompetitors` never resets `busy` on success (page reloads); the success test asserts reload was called rather than button state.
- Components use `Date.now()` via `relativeTime` — no fake timers needed since assertions don't target the relative-time text.

## Verification

`npm test` → 181 existing + ~12 new ≈ 193 passing, one command, both projects.
