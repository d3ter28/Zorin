# Settings UI Overhaul — Wave 1 (Sidebar, Account, Billing) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:subagent-driven-development (recommended) or superpowers-extended-cc:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Settings sidebar dropdown independently toggleable, add a Name field to the Account page, and add a full plan-comparison section to the Billing page.

**Architecture:** Three independent, additive UI changes on top of the existing 4-page Settings structure (`src/app/settings/{account,billing,team,integrations}`). Sidebar toggle is local component state. Account Name requires one nullable schema field plus a new authenticated PATCH route. Billing reuses the existing `PLAN_CATALOG` data and `/api/billing/checkout` endpoint already wired up for `/billing/reactivate`, adding "current plan" awareness that endpoint's existing picker (`ReactivatePlanPicker`) doesn't need.

**Tech Stack:** Next.js 16 App Router, TypeScript, Prisma 7 (dual schema files, `prisma db push`), Vitest 4 + Testing Library, Tailwind v4, @phosphor-icons/react.

**User decisions (already made):**
- Sidebar "Settings" toggles open/closed on click, independent of route; auto-expanded on load when already under `/settings/*`. (Option A from brainstorm)
- Billing keeps the existing summary + "Manage billing" button, adds plan cards below with full feature lists reused from the app-wide `PLAN_CATALOG` (same data as the marketing pricing page — nothing to keep in sync separately). (Option A from brainstorm, refined)
- Account page gains only a Name field + "Update account" button — no read-only email display, no delete-account section.
- No Notifications/Daily-articles sections, no OAuth/connected-accounts section — out of scope.

---

## File Structure

- `prisma/schema.prisma`, `prisma/schema.production.prisma` — add `name String?` to `User`.
- `src/app/api/account/route.ts` (new) — `PATCH` handler to update the current user's name.
- `src/app/api/account/route.test.ts` (new).
- `src/components/UpdateNameCard.tsx` (new) — Name input + "Update account" button, styled like `ChangePasswordCard`.
- `src/components/UpdateNameCard.test.tsx` (new).
- `src/app/settings/account/page.tsx` (modify) — fetch `user.name`, render `UpdateNameCard` above `ChangePasswordCard`.
- `src/components/Sidebar.tsx` (modify) — `SettingsNavGroup` gains independent `expanded` state and a toggle button instead of a plain link.
- `src/components/BillingCard.tsx` (modify) — add a "Change plan" section reusing `PLAN_CATALOG`.
- `src/components/BillingCard.test.tsx` (modify) — add coverage for the new section.

---

### Task 1: Add `User.name` to the schema and a PATCH /api/account route

**Goal:** Let an authenticated user set their own display name, persisted as a nullable `User.name` field.

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `prisma/schema.production.prisma`
- Create: `src/app/api/account/route.ts`
- Test: `src/app/api/account/route.test.ts`

**Acceptance Criteria:**
- [ ] `User.name` exists as `String?` in both schema files, in the same position in each (right after `email`)
- [ ] `PATCH /api/account` requires a valid session (any authenticated user, not Owner-only — a Member can set their own name)
- [ ] Rejects a missing/empty/whitespace-only `name` with 400
- [ ] Rejects a `name` longer than 100 characters (after trimming) with 400
- [ ] On success, updates `User.name` for the caller and returns `{ ok: true, name }` with the trimmed value

**Verify:** `npx vitest run src/app/api/account/route.test.ts` → all tests pass

**Steps:**

- [ ] **Step 1: Add the schema field to both files**

In `prisma/schema.prisma`, inside `model User`:

```prisma
model User {
  id                  String               @id @default(cuid())
  email               String               @unique
  name                String?
  passwordHash        String
  merchantId          String
  role                String               @default("OWNER") // "OWNER" | "MEMBER"
  merchant            Merchant             @relation(fields: [merchantId], references: [id])
  createdAt           DateTime             @default(now())
  sessions            Session[]
  passwordResetTokens PasswordResetToken[]
  invitationsSent     Invitation[]
}
```

Make the identical change (add `name String?` right after `email`) in `prisma/schema.production.prisma`'s `model User`.

- [ ] **Step 2: Push the schema to the dev database and regenerate the client**

Run: `npx prisma db push`
Expected: "Your database is now in sync with your Prisma schema." No data loss warning (this is a pure additive nullable field).

Run: `npx prisma generate`
Expected: Prisma Client regenerated with `name` on `User`.

- [ ] **Step 3: Write the failing test for the PATCH route**

Create `src/app/api/account/route.test.ts`:

```typescript
import { NextRequest } from "next/server";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { PATCH } from "./route";

const mockRequireSessionApi = vi.fn();
const mockUserUpdate = vi.fn();

vi.mock("@/lib/auth/requireSession", () => ({
  requireSessionApi: () => mockRequireSessionApi(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      update: (...args: unknown[]) => mockUserUpdate(...args),
    },
  },
}));

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/account", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  mockRequireSessionApi.mockResolvedValue({
    user: { id: "user_1", email: "a@example.com", merchantId: "merchant_1", role: "OWNER" },
    merchantId: "merchant_1",
  });
});

describe("PATCH /api/account", () => {
  it("returns 401 when there is no session", async () => {
    mockRequireSessionApi.mockRejectedValueOnce(
      Object.assign(new Error("unauthorized"), { status: 401 }),
    );
    const res = await PATCH(makeRequest({ name: "Dexter" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when name is missing", async () => {
    const res = await PATCH(makeRequest({}));
    expect(res.status).toBe(400);
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it("returns 400 when name is empty after trimming", async () => {
    const res = await PATCH(makeRequest({ name: "   " }));
    expect(res.status).toBe(400);
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it("returns 400 when name exceeds 100 characters", async () => {
    const res = await PATCH(makeRequest({ name: "a".repeat(101) }));
    expect(res.status).toBe(400);
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it("trims and saves a valid name, returning it", async () => {
    mockUserUpdate.mockResolvedValueOnce({ id: "user_1", name: "Dexter" });
    const res = await PATCH(makeRequest({ name: "  Dexter  " }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({ ok: true, name: "Dexter" });
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: "user_1" },
      data: { name: "Dexter" },
    });
  });
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `npx vitest run src/app/api/account/route.test.ts`
Expected: FAIL — `Cannot find module './route'` (the route file doesn't exist yet).

- [ ] **Step 5: Write the route**

Create `src/app/api/account/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { HttpError, withErrorHandling } from "@/lib/api/errors";
import { parseJsonBody } from "@/lib/api/validation";
import { requireSessionApi } from "@/lib/auth/requireSession";

export const PATCH = withErrorHandling(async (req: Request) => {
  const { user } = await requireSessionApi();

  const body = await parseJsonBody(req);
  const rawName = typeof body.name === "string" ? body.name : "";
  const name = rawName.trim();

  if (name === "") throw new HttpError(400, "Name is required");
  if (name.length > 100) throw new HttpError(400, "Name must be 100 characters or fewer");

  await prisma.user.update({ where: { id: user.id }, data: { name } });

  return NextResponse.json({ ok: true, name });
});
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx vitest run src/app/api/account/route.test.ts`
Expected: PASS — all 5 tests green.

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma prisma/schema.production.prisma src/app/api/account/route.ts src/app/api/account/route.test.ts
git commit -m "feat: add User.name field and PATCH /api/account route"
```

---

### Task 2: UpdateNameCard component, wired into the Account settings page

**Goal:** Merchants (and Members) can view and update their display name from `/settings/account`.

**Files:**
- Create: `src/components/UpdateNameCard.tsx`
- Test: `src/components/UpdateNameCard.test.tsx`
- Modify: `src/app/settings/account/page.tsx`

**Acceptance Criteria:**
- [ ] `/settings/account` shows a Name card above the existing Change Password card
- [ ] The Name input is pre-filled with the current user's saved name, or empty if none is set yet
- [ ] Submitting an empty/whitespace name shows an inline error and does not call the API
- [ ] Submitting a valid name calls `PATCH /api/account`, shows a success message on 200, and shows the server's error message on failure
- [ ] A network failure shows "Network error — please try again"

**Verify:** `npx vitest run src/components/UpdateNameCard.test.tsx` → all tests pass

**Steps:**

- [ ] **Step 1: Write the failing test**

Create `src/components/UpdateNameCard.test.tsx`:

```tsx
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { UpdateNameCard } from "./UpdateNameCard";

beforeEach(() => {
  vi.resetAllMocks();
});

afterEach(() => {
  cleanup();
});

describe("UpdateNameCard", () => {
  it("pre-fills the input with the initial name", () => {
    render(<UpdateNameCard initialName="Dexter" />);
    expect((screen.getByLabelText("Your name") as HTMLInputElement).value).toBe("Dexter");
  });

  it("renders an empty input when there is no initial name", () => {
    render(<UpdateNameCard initialName="" />);
    expect((screen.getByLabelText("Your name") as HTMLInputElement).value).toBe("");
  });

  it("shows an inline error when submitting a blank name", async () => {
    const user = userEvent.setup();
    render(<UpdateNameCard initialName="Dexter" />);
    await user.clear(screen.getByLabelText("Your name"));
    await user.type(screen.getByLabelText("Your name"), "   ");
    await user.click(screen.getByRole("button", { name: "Update account" }));
    expect(screen.getByRole("alert").textContent).toBe("Name is required");
    expect(global.fetch).toBeUndefined();
  });

  it("saves a valid name and shows a success message", async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, name: "New Name" }),
    }) as unknown as typeof fetch;

    render(<UpdateNameCard initialName="Old Name" />);
    await user.clear(screen.getByLabelText("Your name"));
    await user.type(screen.getByLabelText("Your name"), "New Name");
    await user.click(screen.getByRole("button", { name: "Update account" }));

    await waitFor(() => {
      expect(screen.getByText("Name updated.")).toBeTruthy();
    });
    expect(fetch).toHaveBeenCalledWith("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "New Name" }),
    });
  });

  it("shows the server error message on failure", async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Name must be 100 characters or fewer" }),
    }) as unknown as typeof fetch;

    render(<UpdateNameCard initialName="Dexter" />);
    await user.click(screen.getByRole("button", { name: "Update account" }));

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toBe("Name must be 100 characters or fewer");
    });
  });

  it("shows a network error message when the fetch call throws", async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn().mockRejectedValueOnce(new Error("fetch failed")) as unknown as typeof fetch;

    render(<UpdateNameCard initialName="Dexter" />);
    await user.click(screen.getByRole("button", { name: "Update account" }));

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toBe("Network error — please try again");
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/UpdateNameCard.test.tsx`
Expected: FAIL — `Cannot find module './UpdateNameCard'`.

- [ ] **Step 3: Write the component**

Create `src/components/UpdateNameCard.tsx`:

```tsx
"use client";
import { useState } from "react";

export function UpdateNameCard({ initialName }: { initialName: string }) {
  const [name, setName] = useState(initialName);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const trimmed = name.trim();
    if (trimmed === "") {
      setError("Name is required");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Something went wrong" }));
        setError(data.error ?? "Something went wrong");
        setBusy(false);
        return;
      }
      setName(trimmed);
      setSuccess(true);
      setBusy(false);
    } catch {
      setError("Network error — please try again");
      setBusy(false);
    }
  }

  return (
    <section className="rounded-xl border border-line bg-surface p-5">
      <h2 className="text-sm font-semibold text-ink">Name</h2>
      <form onSubmit={submit} className="mt-3 space-y-3">
        <label className="block">
          <span className="text-sm text-muted">Your name</span>
          <input
            type="text"
            required
            maxLength={100}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="field mt-1 w-full"
          />
        </label>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        {success && <p className="text-sm text-positive">Name updated.</p>}
        <button type="submit" disabled={busy} className="btn btn-primary">
          {busy ? "Saving…" : "Update account"}
        </button>
      </form>
    </section>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/UpdateNameCard.test.tsx`
Expected: PASS — all 6 tests green.

- [ ] **Step 5: Wire it into the Account settings page**

Replace `src/app/settings/account/page.tsx` with:

```tsx
import { requireSessionPage } from "@/lib/auth/requireSession";
import { prisma } from "@/lib/db";
import { UpdateNameCard } from "@/components/UpdateNameCard";
import { ChangePasswordCard } from "@/components/ChangePasswordCard";

export default async function AccountSettingsPage() {
  const session = await requireSessionPage();
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true },
  });

  return (
    <div className="space-y-6">
      <UpdateNameCard initialName={user?.name ?? ""} />
      <ChangePasswordCard />
    </div>
  );
}
```

- [ ] **Step 6: Manual verification**

Run `npm run dev`, log in, visit `/settings/account`. Confirm the Name card renders above Change Password, pre-filled correctly (empty for the seeded demo account), and that submitting a name shows "Name updated." and persists across a page reload.

- [ ] **Step 7: Commit**

```bash
git add src/components/UpdateNameCard.tsx src/components/UpdateNameCard.test.tsx src/app/settings/account/page.tsx
git commit -m "feat: add Name field to the Account settings page"
```

---

### Task 3: Independent Settings dropdown in the sidebar

**Goal:** The "Settings" sidebar item toggles its sub-item list open/closed on click, independent of the current route, while still auto-expanding when the user is already on a settings page.

**Files:**
- Modify: `src/components/Sidebar.tsx`

**Acceptance Criteria:**
- [ ] Clicking "Settings" while on a non-settings page (e.g. `/dashboard`) expands the sub-item list without navigating away from `/dashboard`
- [ ] Clicking "Settings" again collapses the list
- [ ] Loading any `/settings/*` page directly (e.g. via refresh or a bookmark) shows the list already expanded
- [ ] The 4 sub-items still navigate on click exactly as before, with unchanged active-state highlighting
- [ ] Dashboard/Launch Planner/Guide nav items are unaffected

**Verify:** No automated test exists for `Sidebar.tsx` (consistent with prior settings work) — manual browser verification per Step 3 below.

**Steps:**

- [ ] **Step 1: Change `SettingsNavGroup` to a self-toggling button**

In `src/components/Sidebar.tsx`, add `CaretRight` to the phosphor import:

```typescript
import { SquaresFour, RocketLaunch, Gear, SignOut, ChatTeardrop, BookOpen, CaretRight } from "@phosphor-icons/react";
```

Replace the `SettingsNavGroup` function with:

```tsx
function SettingsNavGroup({ pathname }: { pathname: string }) {
  const [expanded, setExpanded] = useState(
    () => pathname === "/settings" || pathname.startsWith("/settings/"),
  );

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="flex w-full items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors"
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
        <CaretRight
          size={12}
          className="ml-auto transition-transform"
          style={{ transform: expanded ? "rotate(90deg)" : "rotate(0deg)" }}
        />
      </button>
      {expanded && (
        <div className="ml-4 mt-0.5 space-y-0.5 border-l pl-3" style={{ borderColor: DIVIDER }}>
          {SETTINGS_SUBNAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
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

Note this drops the `href="/settings"` navigation entirely — the row is now a pure toggle. `useState` is already imported in this file (used for `feedbackOpen`), so no new import is needed for that.

- [ ] **Step 2: Manual verification**

Run `npm run dev`, log in.
1. From `/dashboard`, click "Settings" in the sidebar — confirm the 4 sub-items appear and the URL stays `/dashboard`.
2. Click "Settings" again — confirm the sub-items collapse.
3. Click "Settings" once more, then click "Billing" — confirm navigation to `/settings/billing` and the Billing sub-item is highlighted.
4. Refresh the page while on `/settings/billing` — confirm the sidebar loads with the sub-item list already expanded.
5. Confirm Dashboard/Launch Planner/Guide still navigate normally.

- [ ] **Step 3: Commit**

```bash
git add src/components/Sidebar.tsx
git commit -m "feat: make Settings sidebar item an independent toggle"
```

---

### Task 4: Billing plan-comparison cards

**Goal:** The Billing settings page shows the 3-tier plan catalog below the existing summary, with the merchant's current tier marked and the others offering Upgrade/Downgrade.

**Files:**
- Modify: `src/components/BillingCard.tsx`
- Modify: `src/components/BillingCard.test.tsx`

**Acceptance Criteria:**
- [ ] The existing "Plan: X · Status: Y" summary and "Manage billing" button are unchanged and still render first
- [ ] Below it, a "Change plan" section shows all 3 `PLAN_CATALOG` entries as cards with full feature lists
- [ ] The card matching the merchant's current `planTier` shows a "Current plan" label instead of a button
- [ ] Cards for a higher tier than the current one show an "Upgrade" button; cards for a lower tier show a "Downgrade" button
- [ ] When `planTier` is `null`, no card is marked current and all 3 show "Choose plan"
- [ ] Clicking Upgrade/Downgrade/Choose plan calls `POST /api/billing/checkout` with `{ plan: tier }` and redirects to the returned URL on success, matching `ReactivatePlanPicker`'s existing behavior
- [ ] A checkout failure shows an inline error without disturbing the existing portal button's own error state

**Verify:** `npx vitest run src/components/BillingCard.test.tsx` → all tests pass

**Steps:**

- [ ] **Step 1: Write the failing tests**

Add to `src/components/BillingCard.test.tsx` (append inside the existing `describe("BillingCard", ...)` block, after the existing tests):

```tsx
  it("marks the growth card as the current plan and offers upgrade/downgrade on the others", () => {
    render(<BillingCard planTier="growth" subscriptionStatus="active" />);
    expect(screen.getByText("Current plan")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Downgrade" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Upgrade" })).toBeTruthy();
  });

  it("shows Choose plan for all tiers when there is no current plan", () => {
    render(<BillingCard planTier={null} subscriptionStatus={null} />);
    expect(screen.queryByText("Current plan")).toBeNull();
    expect(screen.getAllByRole("button", { name: "Choose plan" })).toHaveLength(3);
  });

  it("starts checkout for the selected tier and redirects on success", async () => {
    const user = userEvent.setup();
    const originalLocation = window.location;
    // @ts-expect-error -- test-only reassignment of window.location for redirect assertion
    delete window.location;
    window.location = { ...originalLocation, href: "" } as Location;

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ url: "https://checkout.stripe.com/session123" }),
    }) as unknown as typeof fetch;

    render(<BillingCard planTier="growth" subscriptionStatus="active" />);
    await user.click(screen.getByRole("button", { name: "Upgrade" }));

    expect(fetch).toHaveBeenCalledWith("/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: "scale" }),
    });
    await waitFor(() => {
      expect(window.location.href).toBe("https://checkout.stripe.com/session123");
    });
    window.location = originalLocation;
  });

  it("shows an inline checkout error on failure without touching the portal button", async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Plan change failed" }),
    }) as unknown as typeof fetch;

    render(<BillingCard planTier="growth" subscriptionStatus="active" />);
    await user.click(screen.getByRole("button", { name: "Downgrade" }));

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toBe("Plan change failed");
    });
    expect((screen.getByRole("button", { name: "Manage billing" }) as HTMLButtonElement).disabled).toBe(false);
  });
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `npx vitest run src/components/BillingCard.test.tsx`
Expected: The 4 new tests FAIL (no "Change plan" section exists yet); the existing 4 tests still PASS.

- [ ] **Step 3: Implement the plan-comparison section**

Replace `src/components/BillingCard.tsx` with:

```tsx
"use client";
import { useState } from "react";
import { Check } from "@phosphor-icons/react";
import { PLAN_CATALOG } from "@/lib/billing/planCatalog";
import { PLAN_TIERS, type PlanTier } from "@/lib/stripe/plans";

export function BillingCard({
  planTier,
  subscriptionStatus,
}: {
  planTier: string | null;
  subscriptionStatus: string | null;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkoutBusyTier, setCheckoutBusyTier] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  async function openPortal() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Something went wrong" }));
        setError(data.error ?? "Something went wrong");
        setBusy(false);
        return;
      }
      const data: { url?: unknown } = await res.json();
      if (typeof data.url !== "string" || data.url === "") {
        setError("Something went wrong");
        setBusy(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Network error — please try again");
      setBusy(false);
    }
  }

  async function choosePlan(tier: PlanTier) {
    setCheckoutBusyTier(tier);
    setCheckoutError(null);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: tier }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Something went wrong" }));
        setCheckoutError(data.error ?? "Something went wrong");
        setCheckoutBusyTier(null);
        return;
      }
      const data: { url?: unknown } = await res.json();
      if (typeof data.url !== "string" || data.url === "") {
        setCheckoutError("Something went wrong");
        setCheckoutBusyTier(null);
        return;
      }
      window.location.href = data.url;
    } catch {
      setCheckoutError("Network error — please try again");
      setCheckoutBusyTier(null);
    }
  }

  const currentTierIndex = planTier ? PLAN_TIERS.indexOf(planTier as PlanTier) : -1;

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-line bg-surface p-5">
        <h2 className="text-sm font-semibold text-ink">Billing</h2>
        <p className="mt-2 text-sm text-muted">
          Plan: <span className="font-medium text-ink">{planTier ?? "None"}</span>
          {" · "}
          Status: <span className="font-medium text-ink">{subscriptionStatus ?? "Inactive"}</span>
        </p>
        <button onClick={openPortal} disabled={busy} className="btn mt-4">
          {busy ? "Loading…" : "Manage billing"}
        </button>
        {error && (
          <p role="alert" className="mt-3 text-sm text-danger">
            {error}
          </p>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold text-ink mb-3">Change plan</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {PLAN_CATALOG.map((plan) => {
            const planIndex = PLAN_TIERS.indexOf(plan.tier);
            const isCurrent = planTier === plan.tier;
            const label = currentTierIndex === -1 ? "Choose plan" : planIndex > currentTierIndex ? "Upgrade" : "Downgrade";
            return (
              <div
                key={plan.tier}
                className={`relative flex flex-col rounded-xl border p-5 ${
                  plan.highlight ? "border-accent bg-surface shadow-sm" : "border-line bg-surface"
                }`}
              >
                {plan.highlight && (
                  <span className="absolute -top-3 left-5 rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold text-accent-fg">
                    Most popular
                  </span>
                )}
                <p className="text-sm font-semibold text-ink">{plan.name}</p>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-ink">{plan.price}</span>
                  <span className="text-sm text-muted">{plan.period}</span>
                </div>
                <p className="mt-2 text-sm text-muted">{plan.description}</p>

                <ul className="mt-4 mb-5 flex flex-1 flex-col gap-2">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-muted">
                      <Check size={15} weight="bold" className="mt-0.5 shrink-0 text-accent" />
                      {f}
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <p className="mt-auto text-center text-sm font-semibold text-accent">Current plan</p>
                ) : (
                  <button
                    onClick={() => choosePlan(plan.tier)}
                    disabled={checkoutBusyTier !== null}
                    className={checkoutBusyTier === plan.tier || !plan.highlight ? "btn btn-ghost mt-auto" : "btn btn-primary mt-auto"}
                  >
                    {checkoutBusyTier === plan.tier ? "Redirecting…" : label}
                  </button>
                )}
              </div>
            );
          })}
        </div>
        {checkoutError && (
          <p role="alert" className="mt-3 text-sm text-danger">
            {checkoutError}
          </p>
        )}
      </section>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/BillingCard.test.tsx`
Expected: PASS — all 8 tests green (4 existing + 4 new).

- [ ] **Step 5: Manual verification**

Run `npm run dev`, log in as the demo account (`demo@priceiq.example` / `demo1234`), visit `/settings/billing`. Confirm the summary + "Manage billing" button render unchanged at the top, and the 3 plan cards render below with the demo account's current tier marked "Current plan" and full feature lists visible.

- [ ] **Step 6: Commit**

```bash
git add src/components/BillingCard.tsx src/components/BillingCard.test.tsx
git commit -m "feat: add plan-comparison cards to the Billing settings page"
```

---

### Task 5: Full-suite verification

**Goal:** Confirm Wave 1 integrates cleanly with no regressions.

**Files:** None (verification only)

**Acceptance Criteria:**
- [ ] Full test suite passes, count higher than the pre-Wave-1 baseline by exactly the new tests added in Tasks 1, 2, and 4 (5 + 6 + 4 = 15 new tests)
- [ ] `npm run build` succeeds with no new type errors
- [ ] Manual click-through: Settings dropdown toggles independent of route; Account page shows and saves a name; Billing page shows plan cards with correct current-tier marking

**Verify:** `npx vitest run && npm run build` → both succeed

**Steps:**

- [ ] **Step 1: Run the full test suite**

Run: `npx vitest run`
Expected: All tests pass, including the 15 new ones from this wave.

- [ ] **Step 2: Run the production build**

Run: `npm run build`
Expected: Build succeeds, no new TypeScript errors, `/settings/account` and `/settings/billing` listed in the route output.

- [ ] **Step 3: Manual click-through**

Per the Acceptance Criteria above — walk through Sidebar → Account → Billing in a running `npm run dev` session, confirming each Wave 1 change from Tasks 2–4.

- [ ] **Step 4: Commit** (only if Steps 1–3 required any fixes; otherwise skip — nothing to commit for a clean pass)
