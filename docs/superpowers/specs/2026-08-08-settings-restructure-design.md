# Settings Page Restructure — Design

## Problem

`/settings` is a single page with every setting stacked as cards (Billing, Change Password, Team, Shopify Connection, WooCommerce Connection) inside one scrolling column. As more settings areas get added (Team was the most recent), this grows unwieldy and doesn't match the sidebar-driven navigation pattern used by comparable products the user wants Zorin to feel like. User explicitly asked to replace the single stacked-card page with an expandable sidebar section and dedicated sub-pages, reversing an earlier decision (recorded as a non-goal in `docs/superpowers/specs/2026-08-08-multi-user-teams-design.md`) to keep Team on the single page.

## Goal

Replace the single `/settings` page with 4 dedicated sub-pages (Account, Billing, Team, Integrations), navigable via an expandable "Settings" section in the existing left sidebar, matching the reference product's expand-in-place nav pattern.

## Non-goals

- No "Notifications" or "Daily articles" sections — these exist in the reference product but have no Zorin equivalent. Not fabricated just to match the reference's page count.
- No change to any individual card's internal behavior (`BillingCard`, `ChangePasswordCard`, `TeamCard`, `ShopifyConnectionCard`, `WooCommerceConnectionCard` all move as-is).
- No mobile-responsive redesign of the sidebar beyond what already exists.
- No shared client-side data context across settings pages — each page keeps doing its own minimal server-side fetch for exactly what it needs, same as the current single page already does.

## Routing

Real Next.js App Router pages, not client-side tabs/query params — bookmarkable URLs, and lets the sidebar highlight the active section the same way it already highlights `/dashboard` vs `/product/[id]` via prefix matching.

```
src/app/settings/
  layout.tsx           — new: wraps children in AppShell, renders "Settings" H1 + subtitle once
  page.tsx              — changes to a redirect to /settings/account
  account/page.tsx       — new: ChangePasswordCard
  billing/page.tsx       — new: BillingCard
  team/page.tsx          — new: TeamCard
  integrations/page.tsx  — new: ShopifyConnectionCard + WooCommerceConnectionCard together
```

`layout.tsx` does not fetch merchant/session data itself — each page performs its own `requireSessionPage()` + targeted Prisma `select` for only the fields that page's card needs, mirroring the current single page's existing pattern (which already scopes its one query to `{ name, planTier, subscriptionStatus }`). `AppShell` still needs `merchantName` for its header, so `layout.tsx` does call `requireSessionPage()` + a minimal `{ name: true }` merchant query itself, purely to pass `merchantName` to `AppShell` — this is a second, smaller query per settings page load (one in the layout, one in the page), an acceptable duplication given none of these pages are hot paths.

## Sidebar

`src/components/Sidebar.tsx`'s flat `NAV` array entry for Settings becomes an expandable group instead of a plain link:

```typescript
const SETTINGS_SUBNAV = [
  { href: "/settings/account", label: "Account" },
  { href: "/settings/billing", label: "Billing" },
  { href: "/settings/team", label: "Team" },
  { href: "/settings/integrations", label: "Integrations" },
];
```

Rendering logic: when `pathname` starts with `/settings`, the Settings group renders expanded — the parent "Settings" row (still using the existing `Gear` icon) plus the 4 sub-items indented beneath it, each highlighted via exact-match against `pathname`. When the pathname is anywhere else in the app, the group renders collapsed to just the "Settings" row (no sub-items shown), clicking it navigates to `/settings` (which redirects to `/settings/account`, and the sidebar then re-renders expanded on the next page since `pathname` now starts with `/settings`).

No new animation/transition — this is a re-render on navigation (App Router page change), not a client-side accordion toggle, so there's no open/close animation to design; it's simply "expanded when active, collapsed when not."

## Testing

- No new business logic to unit test — this is a pure page/routing/nav restructure. Existing card components (`BillingCard.test.tsx` etc., where they exist) are unaffected since the cards themselves don't change.
- Manual verification: navigate to each of the 4 sub-pages directly by URL, confirm the correct card renders and the sidebar highlights the right sub-item; navigate away and back, confirm the Settings group collapses/expands correctly; hit the bare `/settings` URL and confirm it redirects to `/settings/account`.

## Migration / compatibility

`/settings` as a URL keeps working (redirects rather than 404s), so no existing bookmarks or links elsewhere in the app (e.g. Stripe portal `return_url: /settings` in `src/app/api/billing/portal/route.ts`) break.

## Out of scope (explicitly deferred)

- Notifications and Daily-articles-style settings sections (no Zorin feature they'd correspond to).
- Splitting Integrations into per-platform sub-pages (`/settings/integrations/shopify`, `/settings/integrations/woocommerce`) — considered and rejected in favor of one combined page, revisit only if the integrations list grows significantly.
- Mobile sidebar responsiveness improvements.
