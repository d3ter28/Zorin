# Settings Page Restructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:subagent-driven-development (recommended) or superpowers-extended-cc:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single stacked-card `/settings` page with 4 dedicated sub-pages (Account, Billing, Team, Integrations), navigable via an expandable "Settings" section in the sidebar.

**Architecture:** A new `src/app/settings/layout.tsx` wraps all settings pages in `AppShell` and renders the shared "Settings" heading once. Four new pages under `src/app/settings/*/page.tsx` each render exactly one existing card component, fetching only the data that card needs (mirroring the current single page's existing query pattern — no shared context). `src/app/settings/page.tsx` becomes a bare redirect to `/settings/account`. `Sidebar.tsx`'s flat "Settings" nav entry becomes an expandable group: collapsed to a single row everywhere else in the app, expanded with 4 highlighted sub-items whenever the current path is under `/settings`.

**Tech Stack:** Next.js 16 App Router (nested layouts, `redirect()` from `next/navigation`), TypeScript, existing card components (`BillingCard`, `ChangePasswordCard`, `TeamCard`, `ShopifyConnectionCard`, `WooCommerceConnectionCard`) moved as-is with zero internal changes.

**User decisions (already made):**
- Expandable section in the main sidebar, not a separate always-visible sub-nav — see design doc `docs/superpowers/specs/2026-08-08-settings-restructure-design.md`.
- Four sub-pages: Account, Billing, Team, Integrations. Shopify and WooCommerce share one combined Integrations page, not split into two.
- No "Notifications" or "Daily articles" sections (no Zorin equivalent) — explicitly not fabricated to match the reference product's page count.
- No change to any card's internal behavior — pure page/routing/nav restructure.

---

## Task 1: Settings layout + 4 sub-pages + redirect

**Goal:** Move all 5 existing settings cards into 4 dedicated sub-pages under a shared layout, with the bare `/settings` URL redirecting to the first one.

**Files:**
- Create: `src/app/settings/layout.tsx`
- Create: `src/app/settings/account/page.tsx`
- Create: `src/app/settings/billing/page.tsx`
- Create: `src/app/settings/team/page.tsx`
- Create: `src/app/settings/integrations/page.tsx`
- Modify: `src/app/settings/page.tsx`

**Acceptance Criteria:**
- [ ] `/settings` redirects (HTTP redirect, not a client-side flash) to `/settings/account`
- [ ] `/settings/account` renders only `ChangePasswordCard`
- [ ] `/settings/billing` renders only `BillingCard`, with the same `planTier`/`subscriptionStatus` data the original single page passed it
- [ ] `/settings/team` renders only `TeamCard`, with the same `currentUserId`/`currentUserRole` data the original single page passed it
- [ ] `/settings/integrations` renders `ShopifyConnectionCard` and `WooCommerceConnectionCard` together
- [ ] Every settings page is wrapped in `AppShell` with the merchant's name shown in the sidebar header, matching current behavior
- [ ] Unauthenticated visitors to any `/settings/*` URL are redirected to `/login` (via `requireSessionPage()` in the layout)

**Verify:** No automated test for this task (pure page/routing restructure, no new business logic — matches the design doc's stated test approach). Manual verification in Step 6 below.

**Steps:**

- [ ] **Step 1: Create the shared layout**

```tsx
// src/app/settings/layout.tsx
import { requireSessionPage } from "@/lib/auth/requireSession";
import { prisma } from "@/lib/db";
import { AppShell } from "@/components/AppShell";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const user = await requireSessionPage();
  const merchant = await prisma.merchant.findFirst({
    where: { id: user.merchantId },
    select: { name: true },
  });

  return (
    <AppShell merchantName={merchant?.name ?? undefined}>
      <main className="max-w-2xl mx-auto p-8">
        <h1 className="text-2xl font-bold mb-1">Settings</h1>
        <p className="text-sm text-muted mb-6">Manage your account, billing, team, and integrations.</p>
        {children}
      </main>
    </AppShell>
  );
}
```

This layout's `requireSessionPage()` call gates every page under `/settings/*` — individual pages below don't need their own auth check, only their own data queries where they need merchant-specific fields the layout didn't fetch.

- [ ] **Step 2: Create the Account sub-page**

```tsx
// src/app/settings/account/page.tsx
import { ChangePasswordCard } from "@/components/ChangePasswordCard";

export default function AccountSettingsPage() {
  return <ChangePasswordCard />;
}
```

`ChangePasswordCard` takes no props and fetches nothing server-side (it's a pure client component posting to `/api/auth/change-password`), so this page needs no data fetching of its own.

- [ ] **Step 3: Create the Billing sub-page**

```tsx
// src/app/settings/billing/page.tsx
import { requireSessionPage } from "@/lib/auth/requireSession";
import { prisma } from "@/lib/db";
import { BillingCard } from "@/components/BillingCard";

export default async function BillingSettingsPage() {
  const user = await requireSessionPage();
  const merchant = await prisma.merchant.findFirst({
    where: { id: user.merchantId },
    select: { planTier: true, subscriptionStatus: true },
  });

  return (
    <BillingCard
      planTier={merchant?.planTier ?? null}
      subscriptionStatus={merchant?.subscriptionStatus ?? null}
    />
  );
}
```

- [ ] **Step 4: Create the Team sub-page**

```tsx
// src/app/settings/team/page.tsx
import { requireSessionPage } from "@/lib/auth/requireSession";
import { TeamCard } from "@/components/TeamCard";

export default async function TeamSettingsPage() {
  const user = await requireSessionPage();
  return <TeamCard currentUserId={user.user.id} currentUserRole={user.user.role} />;
}
```

- [ ] **Step 5: Create the Integrations sub-page**

```tsx
// src/app/settings/integrations/page.tsx
import { ShopifyConnectionCard } from "@/components/ShopifyConnectionCard";
import { WooCommerceConnectionCard } from "@/components/WooCommerceConnectionCard";

export default function IntegrationsSettingsPage() {
  return (
    <div className="space-y-6">
      <ShopifyConnectionCard />
      <WooCommerceConnectionCard />
    </div>
  );
}
```

Both cards take no props and fetch their own connection status client-side (unchanged from the original single page's usage), so no server-side data fetching is needed on this page either.

- [ ] **Step 6: Replace the old single page with a redirect**

Replace the entire contents of `src/app/settings/page.tsx` with:

```tsx
// src/app/settings/page.tsx
import { redirect } from "next/navigation";

export default function SettingsPage() {
  redirect("/settings/account");
}
```

`redirect()` from `next/navigation`, called inside a Server Component, throws a special Next.js redirect signal that renders a real HTTP redirect — same mechanism already used in `src/app/billing/reactivate/page.tsx`. Since this page renders inside `layout.tsx` (Step 1), the layout's `requireSessionPage()` still runs first, so an unauthenticated visit to bare `/settings` still redirects to `/login`, not `/settings/account`.

- [ ] **Step 7: Manually verify in the browser**

Start the dev server, log in (demo account or any existing account), then:
- Visit `/settings` directly — confirm it lands on `/settings/account` and shows the Change Password card, nothing else.
- Visit `/settings/billing` directly — confirm only the Billing card renders, with the correct plan/status text (compare against what the old single page showed before this change).
- Visit `/settings/team` directly — confirm only the Team card renders, with the same Owner/Member behavior as before (if you're the Owner, you should see the Invite button; if not, "Leave team").
- Visit `/settings/integrations` directly — confirm both Shopify and WooCommerce connection cards render together.
- Confirm the merchant name still shows in the sidebar header on every one of these pages.

- [ ] **Step 8: Commit**

```bash
git add src/app/settings
git commit -m "feat: split /settings into Account/Billing/Team/Integrations sub-pages"
```

---

## Task 2: Expandable Settings section in the sidebar

**Goal:** Replace the flat "Settings" sidebar link with an expandable group showing the 4 new sub-pages, expanded only while inside `/settings/*`.

**Files:**
- Modify: `src/components/Sidebar.tsx`

**Acceptance Criteria:**
- [ ] Anywhere outside `/settings/*`, the sidebar shows a single "Settings" row (unchanged appearance from before this task), no sub-items visible
- [ ] Anywhere under `/settings/*`, the sidebar shows the "Settings" row plus 4 indented sub-items: Account, Billing, Team, Integrations
- [ ] The sub-item matching the current exact path is highlighted (same `bg-accent text-accent-fg` treatment `NavItem` already uses for top-level active links); the other 3 sub-items are not
- [ ] Clicking "Settings" from anywhere else in the app navigates to `/settings` (which redirects to `/settings/account`, per Task 1)
- [ ] Clicking a sub-item navigates to that sub-page directly, no full page flash beyond normal Next.js navigation
- [ ] Dashboard, Launch Planner, and Guide nav items are visually and behaviorally unchanged

**Verify:** No automated test (no `Sidebar.test.tsx` exists in this codebase today, consistent with several other multi-state components like `CompetitorPricesCard`/`PriceSurveyCard` shipping without one). Manual verification in Step 3 below.

**Steps:**

- [ ] **Step 1: Read the current file to confirm nothing has changed since this plan was written**

Read `src/components/Sidebar.tsx` in full before editing — this plan's diff below assumes the exact structure already confirmed during planning (a `NAV` array of `{ href, icon, label, matchPrefix }` objects rendered via a shared `NavItem` component, plus `ITEM_TEXT`/`ITEM_HOVER_BG`/`ITEM_HOVER_TEXT`/`DIVIDER` style constants already defined at the top of the file). If the file has diverged from what's shown below, adapt the edit to match the real current structure rather than blindly overwriting.

- [ ] **Step 2: Apply the sidebar changes**

Remove the `Settings` entry from the `NAV` array — change:

```typescript
const NAV = [
  { href: "/dashboard", icon: SquaresFour, label: "Dashboard", matchPrefix: ["/dashboard", "/product"] },
  { href: "/launch-planner", icon: RocketLaunch, label: "Launch Planner", matchPrefix: ["/launch-planner"] },
  { href: "/guide", icon: BookOpen, label: "Guide", matchPrefix: ["/guide"] },
  { href: "/settings", icon: Gear, label: "Settings", matchPrefix: ["/settings"] },
];
```

to:

```typescript
const NAV = [
  { href: "/dashboard", icon: SquaresFour, label: "Dashboard", matchPrefix: ["/dashboard", "/product"] },
  { href: "/launch-planner", icon: RocketLaunch, label: "Launch Planner", matchPrefix: ["/launch-planner"] },
  { href: "/guide", icon: BookOpen, label: "Guide", matchPrefix: ["/guide"] },
];

const SETTINGS_SUBNAV = [
  { href: "/settings/account", label: "Account" },
  { href: "/settings/billing", label: "Billing" },
  { href: "/settings/team", label: "Team" },
  { href: "/settings/integrations", label: "Integrations" },
];
```

Add a new component, `SettingsNavGroup`, right after the existing `NavItem` function (same file):

```tsx
function SettingsNavGroup({ pathname }: { pathname: string }) {
  const expanded = pathname.startsWith("/settings");

  return (
    <div>
      <Link
        href="/settings"
        className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors"
        style={{ color: ITEM_TEXT }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.backgroundColor = ITEM_HOVER_BG;
          (e.currentTarget as HTMLElement).style.color = ITEM_HOVER_TEXT;
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.backgroundColor = "";
          (e.currentTarget as HTMLElement).style.color = ITEM_TEXT;
        }}
      >
        <Gear size={16} weight={expanded ? "fill" : "regular"} />
        Settings
      </Link>
      {expanded && (
        <div className="ml-4 mt-0.5 space-y-0.5 border-l pl-3" style={{ borderColor: DIVIDER }}>
          {SETTINGS_SUBNAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  active ? "bg-accent text-accent-fg" : ""
                }`}
                style={active ? undefined : { color: ITEM_TEXT }}
                onMouseEnter={(e) => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.backgroundColor = ITEM_HOVER_BG;
                    (e.currentTarget as HTMLElement).style.color = ITEM_HOVER_TEXT;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.backgroundColor = "";
                    (e.currentTarget as HTMLElement).style.color = ITEM_TEXT;
                  }
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

Note the parent "Settings" row deliberately never gets the `bg-accent` "active" treatment (unlike `NavItem`'s top-level links) — only the icon switches to a filled weight when expanded. Selection state is shown entirely by which sub-item below it is highlighted, avoiding two different rows looking "selected" at once. This is a direct extension of the approved design doc's sub-item highlighting rule, not a new decision.

In the `Sidebar` component's `<nav>` block, replace:

```tsx
      <nav className="flex-1 px-3 space-y-0.5">
        {NAV.map(({ href, icon, label, matchPrefix }) => (
          <NavItem
            key={href}
            href={href}
            icon={icon}
            label={label}
            active={matchPrefix.some((p) => pathname === p || pathname.startsWith(p + "/"))}
          />
        ))}
      </nav>
```

with:

```tsx
      <nav className="flex-1 px-3 space-y-0.5">
        {NAV.map(({ href, icon, label, matchPrefix }) => (
          <NavItem
            key={href}
            href={href}
            icon={icon}
            label={label}
            active={matchPrefix.some((p) => pathname === p || pathname.startsWith(p + "/"))}
          />
        ))}
        <SettingsNavGroup pathname={pathname} />
      </nav>
```

- [ ] **Step 3: Manually verify in the browser**

With the dev server running and logged in:
- Visit `/dashboard` — confirm the sidebar shows a single "Settings" row with no sub-items, unchanged from before this task.
- Click "Settings" — confirm it navigates to `/settings/account` (via the Task 1 redirect) and the sidebar now shows the 4 sub-items indented beneath "Settings", with "Account" highlighted.
- Click "Billing", then "Team", then "Integrations" — confirm each navigation updates which sub-item is highlighted, and the "Settings" parent row itself never shows the accent-highlight treatment.
- Navigate back to `/dashboard` (or click "Dashboard" in the sidebar) — confirm the sub-items disappear again and the sidebar returns to its original collapsed state.

- [ ] **Step 4: Commit**

```bash
git add src/components/Sidebar.tsx
git commit -m "feat: expandable Settings section in sidebar with 4 sub-page links"
```

---

## Task 3: Full-suite verification

**Goal:** Confirm the restructure integrates cleanly with no regressions before merge.

**Files:** None (verification only)

**Acceptance Criteria:**
- [ ] Full test suite passes, same count as before this plan's changes (this plan adds no new tests, per Tasks 1 and 2's stated test approach)
- [ ] `npm run build` succeeds with no new route errors — `/settings`, `/settings/account`, `/settings/billing`, `/settings/team`, `/settings/integrations` all listed in the route output
- [ ] Manual regression check: the Stripe Customer Portal's `return_url` (`/settings`, set in `src/app/api/billing/portal/route.ts`) still lands somewhere sensible after this change — confirm it redirects through to `/settings/account`, or if the intent was to land back on Billing specifically, flag this as a possible follow-up rather than silently leaving it inconsistent

**Verify:** `npm test && npm run build` → both succeed

**Steps:**

- [ ] **Step 1: Run the full test suite**

```bash
cd /c/Users/pohde/projects/zorin
npm test
```

Expected: all suites pass, same count as the pre-restructure baseline (check the count reported by the most recent prior session — this plan does not add or remove any test files).

- [ ] **Step 2: Run the production build**

```bash
npm run build
```

Expected: succeeds, route output lists `/settings`, `/settings/account`, `/settings/billing`, `/settings/team`, `/settings/integrations` (the old bare `/settings` entry now marked as a redirect rather than a full page), no new type errors.

- [ ] **Step 3: Check the Stripe Portal return_url**

Read `src/app/api/billing/portal/route.ts` — its `return_url` is currently `${origin}/settings`. After this plan, that URL still resolves correctly (redirects to `/settings/account` via Task 1's Step 6), so no code change is required here. Note in your final report whether landing on Account rather than Billing after returning from the Stripe Portal is worth a follow-up (changing that one string to `/settings/billing` would land the user back where they started) — this is a one-line judgment call, not a blocking issue, and is explicitly out of scope for this plan to decide unilaterally.

- [ ] **Step 4: Full manual walkthrough**

Start the dev server, log in, and click through Dashboard → Settings → each of the 4 sub-pages via the sidebar (not direct URL entry this time, to exercise the actual nav interaction end-to-end) → confirm every card still works exactly as it did before this restructure (change password, view billing/manage billing, invite/view team, connect/view Shopify or WooCommerce status).

- [ ] **Step 5: Final commit (if any cleanup was needed)**

```bash
git add -A
git commit -m "chore: final verification pass for settings restructure"
```

(Skip this commit if Steps 1-4 required no code changes.)

---

## Post-implementation notes

- This plan reverses a decision recorded in `docs/superpowers/specs/2026-08-08-multi-user-teams-design.md` (keeping Team on the single settings page). That doc's relevant line is now superseded by this one — no code conflict, just noting the history for anyone reading both specs later.
- Explicitly deferred (per the design doc): Notifications/Daily-articles-style sections (no Zorin equivalent), splitting Integrations into per-platform sub-pages, mobile sidebar responsiveness improvements.
- Worth a follow-up decision (flagged, not resolved, in Task 3 Step 3): whether the Stripe Portal's `return_url` should point at `/settings/billing` specifically instead of the bare `/settings` redirect-to-Account.
