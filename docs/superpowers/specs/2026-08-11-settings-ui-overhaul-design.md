# Settings UI Overhaul — Design

**Date:** 2026-08-11
**Status:** Approved for planning

## Summary

Following the 2026-08-08 settings restructure (single-page → 4 route-based sub-pages under an expandable sidebar group), the user shared reference screenshots of a different SaaS product's Settings UI and asked for five further changes, refined through a brainstorming session with visual mockups:

1. Sidebar "Settings" becomes an independently-toggleable dropdown, not tied to the current route.
2. Billing page gains a full plan-comparison section below the existing summary.
3. Integrations page becomes a compact card grid with a right-side drawer for connecting.
4. Account page gains a Name field.
5. Team page becomes a full filterable/sortable data table with bulk actions.

This doc covers all five as one coherent design (they share visual language and several touch the same files), but the implementation plan splits them into two waves — see "Implementation Waves" at the end — so review stays manageable.

## Non-Goals

- No changes to Notifications or "Daily articles" style sections — Zorin has no such content, consistent with the 2026-08-08 settings-restructure spec's non-goals.
- No mobile-responsive redesign beyond what already exists.
- No new permission tier (Admin) — Team continues to use the existing Owner/Member two-tier model.
- No self-serve account deletion — out of scope, flagged as a much bigger feature (real data-purge flow) than this pass covers.
- No OAuth/connected-accounts section on Account — Zorin has no OAuth login today.
- Integrations section grouping (the reference's "Measure"/"Publish" headers) does not carry over — Zorin only has two integrations and nothing to group them by.

## 1. Sidebar: Independent Settings Dropdown

**Current behavior** (`src/components/Sidebar.tsx`, `SettingsNavGroup`): the sub-item list only renders when `pathname` matches `/settings` or `/settings/*`. Clicking "Settings" always navigates to `/settings` (which redirects to `/settings/account`).

**New behavior:**
- `SettingsNavGroup` gains its own `expanded` state (`useState`), independent of route.
- Clicking the "Settings" row toggles `expanded` and does **not** navigate — it stops being a `<Link>` and becomes a `<button>`.
- The 4 sub-items (Account/Billing/Team/Integrations) remain `<Link>`s that navigate on click, same as today.
- A chevron icon (rotates 90° when expanded) is added next to the Gear icon to signal it's a toggle, not a plain link.
- `expanded` initializes to `true` whenever the current pathname is under `/settings/*` (so landing directly on a settings page via a bookmark/refresh still shows the list open), and to `false` otherwise. This initial value is computed once via `useState(() => pathname === "/settings" || pathname.startsWith("/settings/"))` — the same path-boundary check already used elsewhere in this file (guards against a hypothetical future route like `/settings-export` false-matching, the same bug fixed during the 2026-08-08 settings restructure) — after that, only the click toggle changes it. Navigating to a settings sub-item does not force it back open if the user had manually collapsed it, and navigating away from settings does not auto-collapse it if the user had it open — this matches "a dropdown you can open without needing to be on the page," per the approved brainstorm answer.
- Active-item highlighting on the sub-items (`aria-current`, `bg-accent`) is unchanged.

## 2. Billing Page: Plan Comparison

**Current state:** `src/components/BillingCard.tsx` shows `Plan: X · Status: Y` plus a single "Manage billing" button that opens the Stripe Customer Portal. `src/lib/billing/planCatalog.ts` already defines the 3-tier `PLAN_CATALOG` (Starter/Growth/Scale, each with price, description, feature list, `highlight` flag) and is already rendered as cards by `src/components/ReactivatePlanPicker.tsx` on `/billing/reactivate`.

**New behavior:**
- `BillingCard`'s existing summary + "Manage billing" button stays exactly as-is at the top — it continues to own card-on-file, invoices, and cancellation via the Stripe portal.
- A new "Change plan" section renders below it, listing all 3 `PLAN_CATALOG` entries as cards, reusing the same card visuals as `ReactivatePlanPicker` (price, description, full feature checklist — the same list already used elsewhere in the app, so there is nothing new to keep in sync with marketing copy).
- Unlike `ReactivatePlanPicker`, this view knows the merchant's **current** tier (passed in as a prop, same `planTier` already fetched by `src/app/settings/billing/page.tsx`). The card matching the current tier shows a "Current plan" badge instead of a button. The other two cards show "Upgrade" or "Downgrade" (based on tier order — Starter < Growth < Scale) as the button label instead of the generic "Choose plan", and both call the existing `POST /api/billing/checkout` with `{ plan: tier }`, unchanged.
- If `planTier` is `null` (no active subscription — shouldn't happen once past onboarding, but the type allows it), no card is marked current and all three show "Choose plan"; this matches `ReactivatePlanPicker`'s existing default behavior for that edge case.
- Extract the shared card-rendering markup into a small internal helper or keep `ReactivatePlanPicker` and the new component structurally parallel — implementation detail decided at plan-writing time, not a new shared component mandated here (the two call sites have different button-copy logic, so full extraction isn't obviously worth it; the person implementing should extract only if the duplication actually looks bad once written).

## 3. Integrations Page: Cards + Drawer

**Current state:** `src/app/settings/integrations/page.tsx` renders `ShopifyConnectionCard` and `WooCommerceConnectionCard` stacked, each a full card with the connection form inline in its body at all times (loading/disconnected/connected/syncing states all live in the same card).

**New behavior:**
- New `IntegrationTile` component: a compact card showing the brand logo (`/shopify-logo.svg`, `/woocommerce-logo.jpg` — both already exist in `public/`), name, one-line description, and either "Connect →" (disconnected) or a "Connected" badge + the connected domain/host + "Manage →" (connected). Clicking anywhere on the tile opens the drawer.
- New `SettingsDrawer` component: a generic right-side slide-over shell (backdrop + panel, closes on X click, backdrop click, or Escape key — no unsaved-input confirmation, per the approved brainstorm answer). This is a new reusable pattern; only Integrations uses it today, but it's built generically (`title`, `onClose`, `children`) so it isn't Shopify/WooCommerce-specific.
- The existing `ShopifyConnectionCard` and `WooCommerceConnectionCard` are **not deleted** — their internal state machine and form logic (fetch status, connect, disconnect, sync, error handling) is exactly what the brainstorm decided should move into the drawer body. Each becomes the content rendered inside a `SettingsDrawer`, invoked from `IntegrationsSettingsPage`'s client-side drawer-open state. Concretely: rename their outer `<section className="rounded-xl border...">` wrapper away (the drawer provides its own chrome) and keep the rest of the component (state, effects, form, connected view) as the drawer body.
- `src/app/settings/integrations/page.tsx` becomes a client component (or delegates to a new client wrapper) holding `openDrawer: "shopify" | "woocommerce" | null` state, rendering the `IntegrationTile` grid plus the conditionally-rendered `SettingsDrawer`.
- Both tiles need their connected-status (domain/host, connected boolean) to render the collapsed-state text, which today only `ShopifyConnectionCard`/`WooCommerceConnectionCard` know internally after their own `fetchStatus()` effect runs. Simplest approach: each tile does its own lightweight `GET /api/shopify/status` / `GET /api/woocommerce/status` fetch on mount (same endpoints already used by the existing components) to render its collapsed summary, independent of whether its drawer is open. This duplicates one fetch call per integration but avoids introducing shared state/context across tiles for two integrations — consistent with the settings-restructure spec's prior non-goal of "no shared client-side data context."

## 4. Account Page: Name Field

**Current state:** `src/app/settings/account/page.tsx` renders only `ChangePasswordCard`. The `User` Prisma model has no name field at all.

**New behavior:**
- Schema: add `name String?` to `User` in both `schema.prisma` and `schema.production.prisma` (nullable — existing users backfill to `null` automatically, no migration script needed, consistent with this project's `prisma db push`-only convention).
- New `src/components/UpdateNameCard.tsx`: a "Name" text input pre-filled with the current value (or empty if `null`) plus an "Update account" button, visually matching `ChangePasswordCard`'s existing card style. Rendered above `ChangePasswordCard` on `/settings/account`.
- The account page (`src/app/settings/account/page.tsx`) becomes a server component that fetches the current user's `name` via Prisma (it already does a session check; add a `select: { name: true }` lookup) and passes it into `UpdateNameCard` as an initial prop — same pattern as `BillingSettingsPage` passing `planTier` into `BillingCard`.
- New route: `PATCH /api/account` (or extend an existing account route if one is more natural at plan-writing time) — `requireSessionApi()` (any authenticated user, not Owner-only; a Member should be able to set their own display name), validates `name` is a non-empty trimmed string under a reasonable length cap (e.g. 100 chars, matching the general pattern of other free-text fields in this codebase), updates `User.name` for `session.user.id`.
- `email` is **not** added to this page — the approved brainstorm answer scoped this to "just Name field," and Zorin has no email-change flow to back a display field with an edit affordance anyway.
- Where else `User.name` should surface (e.g. Team table's Email column vs. a Name column, sidebar merchant label) is addressed below in the Team section and is otherwise out of scope — this pass only adds the field and its own edit UI.

## 5. Team Page: Data Table

**Current state:** `src/components/TeamCard.tsx` renders two separate lists — active `Member`s, then (Owner-only) `PendingInvite`s below — each a simple flex-row list with inline action buttons (Remove / Resend / Revoke / Leave).

**New behavior — full rebuild per the approved brainstorm answer ("include it all just in case"):**

- **Unified rows.** The API response from `GET /api/team` already returns `members` and `pendingInvites` separately (`src/app/api/team/route.ts` — unchanged). The component normalizes both into one `Row[]` client-side: each row has `id`, `email`, `role` (`"OWNER" | "MEMBER"`, pending invites don't have a role yet — display as `"Member"` since that's the only role an invite can result in today), `status` (`"Active" | "Invited" | "Expired"`), and `date` (member's `createdAt` or invite's `createdAt`).
- **Columns:** checkbox, Email (sortable), Role, Status, Date (sortable, labeled "Joined" for active members / "Invited" for pending — reference used a single "Joined" header, Zorin keeps that single header for consistency and lets the value itself communicate which it is via the Status column), row action menu (`...`).
- **Row actions**, shown in a small dropdown menu (`...`) instead of always-visible inline buttons, contents depend on row type and current user's role: Owner viewing a Member row → Remove; Owner viewing a pending invite → Resend, Revoke; Member viewing their own row → Leave team; Member viewing any other row → no menu (view-only, matching current behavior where non-Owners can't act on others). This is a straight port of `TeamCard`'s existing permission logic, just relocated from inline buttons to a menu.
- **Filters:** an email search input (client-side substring filter against `row.email`) plus two multi-select dropdown filters — Status (Active/Invited/Expired) and Role (Owner/Member) — all three composed with AND logic, filtering the same in-memory row list. No server round-trip needed; team lists are small.
- **Column visibility ("View" menu):** a dropdown letting the Owner toggle Role/Status/Date columns on or off (Email and the action menu are always shown, since they're required to identify and act on a row). Selection persists only in component state for the session — no need to persist to the backend for a first pass.
- **Bulk actions:** row checkboxes populate a `Set<string>` of selected row IDs, following the exact pattern already established in `src/components/ProductsTable.tsx` (`selected` state, an action bar that appears when `selected.size > 0`). The only bulk action needed is "Remove selected," which only applies to selected rows the current user is allowed to act on (Owner-only, excluding any selected Owner row — mirroring the existing single-row guard in `DELETE /api/team/[userId]`). Rather than adding a new bulk API endpoint, the bulk action issues sequential calls to the existing `DELETE /api/team/[userId]` (for members) and `DELETE /api/team/invitations/[id]` (for pending invites) per selected row, then refreshes — consistent with team lists being small (typically 1-5 rows) where a dedicated bulk endpoint isn't worth the added API surface. Per-row failures are collected and shown as a single error summary rather than aborting the whole batch, matching the "one product's failure doesn't block the rest" precedent from the existing bulk-apply flow.
- **Pagination:** a "Rows per page" selector (10/25/50) and "Page X of Y" controls, client-side only (slicing the already-fetched, already-filtered row array) — no new paginated API needed, since `GET /api/team` already returns the full list and team sizes are small.
- This is a full replacement of `TeamCard.tsx`'s rendering (the data-fetching functions — `refresh`, `sendInvite`, `removeMember`, `leaveTeam`, `resendInvite`, `revokeInvite` — are reused as-is; only the JSX changes).

## Error Handling

- All new/changed network calls (name update, plan checkout redirect, drawer connect/disconnect/sync, bulk team removal) follow the codebase's existing pattern: a local `error` state, `role="alert"` rendering, and a generic fallback message on non-JSON or network failures — no new error-handling convention introduced.
- The Integrations drawer's connect/disconnect/sync error states are unchanged from what `ShopifyConnectionCard`/`WooCommerceConnectionCard` already do today; only their visual container moves.

## Testing

- Sidebar toggle: no existing `Sidebar.test.tsx` (confirmed absent in the prior settings-restructure work) — this pass continues without one; verified manually in-browser, matching precedent.
- Billing plan cards: new test coverage for the current-tier badge logic (which card shows "Current plan" vs. "Upgrade"/"Downgrade" for each of the 3 tiers) and the `null` planTier fallback.
- Account name update: new API route test (`PATCH /api/account` — auth required, validation, success path) following the existing `change-password` route test as a template.
- Integrations drawer: manual verification only for the drawer mechanics (open/close/backdrop/Escape) — the underlying connect/disconnect/sync logic already has its existing test coverage (if any) untouched, since that logic doesn't change, only its container.
- Team table: new tests for the row-normalization logic (merging members + invites into unified rows with correct status), the filter predicates (email/status/role), and the bulk-remove partial-failure aggregation — these are pure functions worth unit testing independent of the UI. Full click-through (sort, filter, bulk-select, drawer) verified manually in-browser.

## Implementation Waves

Given the scope (5 subsystems, 1 schema change, 2 new UI patterns), the plan splits into two waves so review stays manageable — this is a sequencing decision for the plan, not a scope cut; both waves ship as part of this same design.

- **Wave 1 (smaller, additive):** Sidebar dropdown, Account Name field, Billing plan comparison.
- **Wave 2 (two new UI patterns):** Integrations card grid + drawer, Team data table.

Wave 2 depends on nothing from Wave 1 and could in principle run in parallel, but sequencing them keeps each worktree's review scope focused on one new pattern at a time.
