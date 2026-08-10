# Settings UI Overhaul — Wave 2 (Integrations, Team) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:subagent-driven-development (recommended) or superpowers-extended-cc:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Integrations page as a compact card grid with a right-side drawer for connecting, and rebuild the Team page as a full filterable/sortable data table with bulk actions.

**Architecture:** Two new reusable UI primitives (`PopoverMenu` for any click-to-open panel, `SettingsDrawer` for the right-side slide-over) get built once and consumed by both subsystems. Integrations keeps the existing `ShopifyConnectionCard`/`WooCommerceConnectionCard` state machines unchanged — only their outer chrome moves into the drawer. Team gets a new pure-logic module (row normalization/filter/sort) plus a full UI rewrite of `TeamCard.tsx` that reuses its existing data-fetching functions verbatim.

**Tech Stack:** Next.js 16 App Router, TypeScript, Prisma 7, Vitest 4 + Testing Library, Tailwind v4, @phosphor-icons/react. No new dependencies — no headless-UI/menu library exists in this project, so `PopoverMenu` is hand-built.

**User decisions (already made):**
- Drawer holds the full connect form (not just instructions) — Option A from brainstorm.
- Drawer closes via X, backdrop click, or Escape — no unsaved-input confirmation.
- Real brand logos (`/shopify-logo.svg`, `/woocommerce-logo.jpg`, both already exist in `public/`), not generic icons.
- Team: Members and Pending Invites merge into one filterable table (not two separate lists).
- Team: include bulk-select checkboxes, a column-visibility "View" menu, and pagination, even though current team sizes are small — explicit user decision to include "just in case."
- No section grouping (the reference's "Measure"/"Publish" headers) on Integrations — Zorin only has 2 integrations.

---

## File Structure

- `src/components/ui/PopoverMenu.tsx` (new) — generic click-to-open panel: trigger + content, closes on outside click / Escape.
- `src/components/ui/PopoverMenu.test.tsx` (new).
- `src/components/SettingsDrawer.tsx` (new) — right-side slide-over shell.
- `src/components/SettingsDrawer.test.tsx` (new).
- `src/components/ShopifyConnectionCard.tsx` (modify) — drop outer `<section>`/`<h2>` chrome, now drawer content only.
- `src/components/WooCommerceConnectionCard.tsx` (modify) — same.
- `src/components/IntegrationTile.tsx` (new) — compact status tile, self-fetches connection status.
- `src/components/IntegrationTile.test.tsx` (new).
- `src/app/settings/integrations/page.tsx` (modify) — becomes a client component holding drawer-open state, renders the tile grid + drawer.
- `src/lib/team/rows.ts` (new) — pure row normalization/filter/sort logic.
- `src/lib/team/rows.test.ts` (new).
- `src/components/MultiSelectFilter.tsx` (new) — Status/Role filter dropdowns, built on `PopoverMenu`.
- `src/components/ColumnVisibilityMenu.tsx` (new) — "View" column toggle, built on `PopoverMenu`.
- `src/components/RowActionsMenu.tsx` (new) — per-row `...` action menu, built on `PopoverMenu`.
- `src/components/TeamCard.tsx` (modify) — full rendering rebuild as a data table; existing data-fetch functions reused as-is.

---

### Task 1: PopoverMenu primitive + SettingsDrawer

**Goal:** A reusable click-to-open panel primitive, and the right-side drawer shell built on top of it (drawer itself doesn't reuse PopoverMenu's DOM structure — it's full-screen, not an anchored popover — but both share the same open/close/Escape/outside-click conventions).

**Files:**
- Create: `src/components/ui/PopoverMenu.tsx`
- Test: `src/components/ui/PopoverMenu.test.tsx`
- Create: `src/components/SettingsDrawer.tsx`
- Test: `src/components/SettingsDrawer.test.tsx`

**Acceptance Criteria:**
- [ ] `PopoverMenu` renders its trigger always, and its content only while open
- [ ] Clicking the trigger toggles the content open/closed
- [ ] Clicking outside the popover closes it; clicking inside the content does not
- [ ] Pressing Escape closes an open popover
- [ ] `SettingsDrawer` renders a title and children
- [ ] `SettingsDrawer` calls `onClose` when the X button, the backdrop, or Escape is used, but not when clicking inside the panel

**Verify:** `npx vitest run src/components/ui/PopoverMenu.test.tsx src/components/SettingsDrawer.test.tsx` → all tests pass

**Steps:**

- [ ] **Step 1: Write the failing PopoverMenu test**

Create `src/components/ui/PopoverMenu.test.tsx`:

```tsx
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, afterEach } from "vitest";
import { PopoverMenu } from "./PopoverMenu";

afterEach(() => {
  cleanup();
});

describe("PopoverMenu", () => {
  it("opens content when the trigger is clicked", async () => {
    const user = userEvent.setup();
    render(
      <PopoverMenu trigger={({ toggle }) => <button onClick={toggle}>Open</button>}>
        {() => <div>Menu content</div>}
      </PopoverMenu>,
    );
    expect(screen.queryByText("Menu content")).toBeNull();
    await user.click(screen.getByText("Open"));
    expect(screen.getByText("Menu content")).toBeTruthy();
  });

  it("closes when clicking outside", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <PopoverMenu trigger={({ toggle }) => <button onClick={toggle}>Open</button>}>
          {() => <div>Menu content</div>}
        </PopoverMenu>
        <button>Outside</button>
      </div>,
    );
    await user.click(screen.getByText("Open"));
    expect(screen.getByText("Menu content")).toBeTruthy();
    await user.click(screen.getByText("Outside"));
    expect(screen.queryByText("Menu content")).toBeNull();
  });

  it("does not close when clicking inside the content", async () => {
    const user = userEvent.setup();
    render(
      <PopoverMenu trigger={({ toggle }) => <button onClick={toggle}>Open</button>}>
        {() => <div>Menu content</div>}
      </PopoverMenu>,
    );
    await user.click(screen.getByText("Open"));
    await user.click(screen.getByText("Menu content"));
    expect(screen.getByText("Menu content")).toBeTruthy();
  });

  it("closes on Escape", async () => {
    const user = userEvent.setup();
    render(
      <PopoverMenu trigger={({ toggle }) => <button onClick={toggle}>Open</button>}>
        {() => <div>Menu content</div>}
      </PopoverMenu>,
    );
    await user.click(screen.getByText("Open"));
    expect(screen.getByText("Menu content")).toBeTruthy();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByText("Menu content")).toBeNull();
  });

  it("supports a close() callback passed to content for menu-item clicks", async () => {
    const user = userEvent.setup();
    render(
      <PopoverMenu trigger={({ toggle }) => <button onClick={toggle}>Open</button>}>
        {({ close }) => <button onClick={close}>Item</button>}
      </PopoverMenu>,
    );
    await user.click(screen.getByText("Open"));
    await user.click(screen.getByText("Item"));
    expect(screen.queryByText("Item")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/ui/PopoverMenu.test.tsx`
Expected: FAIL — `Cannot find module './PopoverMenu'`.

- [ ] **Step 3: Write PopoverMenu**

Create `src/components/ui/PopoverMenu.tsx`:

```tsx
"use client";
import { useEffect, useRef, useState } from "react";

export function PopoverMenu({
  trigger,
  children,
  align = "left",
}: {
  trigger: (props: { open: boolean; toggle: () => void }) => React.ReactNode;
  children: (props: { close: () => void }) => React.ReactNode;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div className="relative inline-block" ref={ref}>
      {trigger({ open, toggle: () => setOpen((v) => !v) })}
      {open && (
        <div
          className={`absolute z-20 mt-1 min-w-[10rem] rounded-lg border border-line bg-surface p-2 shadow-lg ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {children({ close: () => setOpen(false) })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/ui/PopoverMenu.test.tsx`
Expected: PASS — all 5 tests green.

- [ ] **Step 5: Write the failing SettingsDrawer test**

Create `src/components/SettingsDrawer.test.tsx`:

```tsx
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, afterEach } from "vitest";
import { SettingsDrawer } from "./SettingsDrawer";

afterEach(() => {
  cleanup();
});

describe("SettingsDrawer", () => {
  it("renders the title and children", () => {
    render(
      <SettingsDrawer title="Shopify" onClose={vi.fn()}>
        <p>Drawer body</p>
      </SettingsDrawer>,
    );
    expect(screen.getByText("Shopify")).toBeTruthy();
    expect(screen.getByText("Drawer body")).toBeTruthy();
  });

  it("calls onClose when the X button is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <SettingsDrawer title="Shopify" onClose={onClose}>
        <p>Drawer body</p>
      </SettingsDrawer>,
    );
    await user.click(screen.getByLabelText("Close"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when the backdrop is clicked", () => {
    const onClose = vi.fn();
    const { container } = render(
      <SettingsDrawer title="Shopify" onClose={onClose}>
        <p>Drawer body</p>
      </SettingsDrawer>,
    );
    fireEvent.click(container.firstElementChild as HTMLElement);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not call onClose when clicking inside the panel", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <SettingsDrawer title="Shopify" onClose={onClose}>
        <p>Drawer body</p>
      </SettingsDrawer>,
    );
    await user.click(screen.getByText("Drawer body"));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("calls onClose on Escape", () => {
    const onClose = vi.fn();
    render(
      <SettingsDrawer title="Shopify" onClose={onClose}>
        <p>Drawer body</p>
      </SettingsDrawer>,
    );
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npx vitest run src/components/SettingsDrawer.test.tsx`
Expected: FAIL — `Cannot find module './SettingsDrawer'`.

- [ ] **Step 7: Write SettingsDrawer**

Create `src/components/SettingsDrawer.tsx`:

```tsx
"use client";
import { useEffect } from "react";
import { X } from "@phosphor-icons/react";

export function SettingsDrawer({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="h-full w-full max-w-md overflow-y-auto border-l border-line bg-surface p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="text-muted transition-colors hover:text-ink">
            <X size={18} />
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npx vitest run src/components/SettingsDrawer.test.tsx`
Expected: PASS — all 5 tests green.

- [ ] **Step 9: Commit**

```bash
git add src/components/ui/PopoverMenu.tsx src/components/ui/PopoverMenu.test.tsx src/components/SettingsDrawer.tsx src/components/SettingsDrawer.test.tsx
git commit -m "feat: add PopoverMenu and SettingsDrawer primitives"
```

---

### Task 2: Strip outer chrome from the connection cards

**Goal:** `ShopifyConnectionCard` and `WooCommerceConnectionCard` render as bare content (no card border/title), ready to sit inside a `SettingsDrawer`, which already supplies both.

**Files:**
- Modify: `src/components/ShopifyConnectionCard.tsx`
- Modify: `src/components/WooCommerceConnectionCard.tsx`

**Acceptance Criteria:**
- [ ] Neither component renders an outer `<section>` border/padding wrapper or its own `<h2>` title anymore
- [ ] All existing state/behavior (loading, disconnected form, connected view, sync, disconnect, errors) is otherwise unchanged
- [ ] The existing `ShopifyConnectionCard.test.tsx` suite still passes unmodified (it doesn't assert on the removed title text or wrapper element)

**Verify:** `npx vitest run src/components/ShopifyConnectionCard.test.tsx` → all existing tests still pass

**Steps:**

- [ ] **Step 1: Strip ShopifyConnectionCard's outer chrome**

In `src/components/ShopifyConnectionCard.tsx`, change the final `return` block. Replace:

```tsx
  return (
    <section className="rounded-xl border border-line bg-surface p-5">
      <h2 className="text-sm font-semibold text-ink">Shopify Connection</h2>

      {uiState === "loading" && (
```

with:

```tsx
  return (
    <>
      {uiState === "loading" && (
```

And replace the closing:

```tsx
      {error && (
        <p role="alert" className="mt-4 text-sm text-danger">
          {error}
        </p>
      )}
    </section>
  );
}
```

with:

```tsx
      {error && (
        <p role="alert" className="mt-4 text-sm text-danger">
          {error}
        </p>
      )}
    </>
  );
}
```

- [ ] **Step 2: Strip WooCommerceConnectionCard's outer chrome**

In `src/components/WooCommerceConnectionCard.tsx`, apply the identical change: replace the opening

```tsx
  return (
    <section className="rounded-xl border border-line bg-surface p-5">
      <h2 className="text-sm font-semibold text-ink">WooCommerce Connection</h2>

      {uiState === "loading" && (
```

with

```tsx
  return (
    <>
      {uiState === "loading" && (
```

and the closing

```tsx
      {error && (
        <p role="alert" className="mt-4 text-sm text-danger">
          {error}
        </p>
      )}
    </section>
  );
}
```

with

```tsx
      {error && (
        <p role="alert" className="mt-4 text-sm text-danger">
          {error}
        </p>
      )}
    </>
  );
}
```

- [ ] **Step 3: Run the existing test suite to confirm nothing broke**

Run: `npx vitest run src/components/ShopifyConnectionCard.test.tsx`
Expected: PASS — all 8 existing tests still green (none of them assert on the removed `<section>`/`<h2>`).

- [ ] **Step 4: Commit**

```bash
git add src/components/ShopifyConnectionCard.tsx src/components/WooCommerceConnectionCard.tsx
git commit -m "refactor: strip outer card chrome from connection components for drawer use"
```

---

### Task 3: IntegrationTile component

**Goal:** A compact status tile showing the brand logo, name, and connection state, that fetches its own status independently of whether its drawer is open.

**Files:**
- Create: `src/components/IntegrationTile.tsx`
- Test: `src/components/IntegrationTile.test.tsx`

**Acceptance Criteria:**
- [ ] Shows the logo, name, and description text while disconnected, with a "Connect →" affordance
- [ ] Shows the connected label (from `getConnectedLabel`), a "Connected" badge, and "Manage →" once connected
- [ ] Clicking anywhere on the tile calls `onOpen`
- [ ] A failed status fetch falls back to the disconnected appearance rather than crashing

**Verify:** `npx vitest run src/components/IntegrationTile.test.tsx` → all tests pass

**Steps:**

- [ ] **Step 1: Write the failing test**

Create `src/components/IntegrationTile.test.tsx`:

```tsx
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { IntegrationTile } from "./IntegrationTile";

beforeEach(() => {
  vi.resetAllMocks();
});

afterEach(() => {
  cleanup();
});

const baseProps = {
  name: "Shopify",
  description: "Sync products, orders, and push price changes back to your store.",
  logoSrc: "/shopify-logo.svg",
  logoAlt: "Shopify",
  statusUrl: "/api/shopify/status",
  getConnectedLabel: (data: Record<string, unknown>) =>
    typeof data.shopDomain === "string" ? data.shopDomain : null,
};

describe("IntegrationTile", () => {
  it("shows the description and Connect when disconnected", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ connected: false }),
    }) as unknown as typeof fetch;

    render(<IntegrationTile {...baseProps} onOpen={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(baseProps.description)).toBeTruthy();
    });
    expect(screen.getByText("Connect →")).toBeTruthy();
  });

  it("shows the connected label and Manage when connected", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ connected: true, shopDomain: "mystore.myshopify.com" }),
    }) as unknown as typeof fetch;

    render(<IntegrationTile {...baseProps} onOpen={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("mystore.myshopify.com")).toBeTruthy();
    });
    expect(screen.getByText("Manage →")).toBeTruthy();
    expect(screen.getByText("Connected")).toBeTruthy();
  });

  it("calls onOpen when clicked", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ connected: false }),
    }) as unknown as typeof fetch;

    render(<IntegrationTile {...baseProps} onOpen={onOpen} />);
    await waitFor(() => {
      expect(screen.getByText("Connect →")).toBeTruthy();
    });
    await user.click(screen.getByRole("button", { name: /Shopify/ }));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("falls back to disconnected appearance when the status fetch fails", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({ ok: false }) as unknown as typeof fetch;

    render(<IntegrationTile {...baseProps} onOpen={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Connect →")).toBeTruthy();
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/IntegrationTile.test.tsx`
Expected: FAIL — `Cannot find module './IntegrationTile'`.

- [ ] **Step 3: Write the component**

Create `src/components/IntegrationTile.tsx`:

```tsx
"use client";
import { useEffect, useState } from "react";

export function IntegrationTile({
  name,
  description,
  logoSrc,
  logoAlt,
  statusUrl,
  getConnectedLabel,
  onOpen,
}: {
  name: string;
  description: string;
  logoSrc: string;
  logoAlt: string;
  statusUrl: string;
  getConnectedLabel: (data: Record<string, unknown>) => string | null;
  onOpen: () => void;
}) {
  const [connected, setConnected] = useState(false);
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch(statusUrl, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : { connected: false }))
      .then((data: Record<string, unknown>) => {
        const isConnected = Boolean(data.connected);
        setConnected(isConnected);
        setLabel(isConnected ? getConnectedLabel(data) : null);
      })
      .catch((err) => {
        if ((err as { name?: string }).name === "AbortError") return;
        setConnected(false);
        setLabel(null);
      });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusUrl]);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex flex-col items-start rounded-xl border border-line bg-surface p-4 text-left transition-colors hover:bg-panel"
    >
      <img src={logoSrc} alt={logoAlt} className="h-6 w-6 object-contain" />
      <p className="mt-2 text-sm font-semibold text-ink">{name}</p>
      <p className="mt-1 text-xs text-muted">{connected && label ? label : description}</p>
      {connected && (
        <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent">
          Connected
        </span>
      )}
      <span className="mt-2 text-xs font-medium text-accent">{connected ? "Manage →" : "Connect →"}</span>
    </button>
  );
}
```

`getConnectedLabel` is intentionally left out of the effect's dependency array — the two call sites in Task 4 pass module-level stable function references, so its identity never changes; including it would only add unnecessary re-fetches if a future caller passed an inline arrow function.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/IntegrationTile.test.tsx`
Expected: PASS — all 4 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/components/IntegrationTile.tsx src/components/IntegrationTile.test.tsx
git commit -m "feat: add IntegrationTile status card"
```

---

### Task 4: Rebuild the Integrations settings page as a card grid + drawer

**Goal:** `/settings/integrations` shows Shopify and WooCommerce as compact tiles; clicking one opens its full connect flow in a right-side drawer.

**Files:**
- Modify: `src/app/settings/integrations/page.tsx`

**Depends on:** Task 1 (SettingsDrawer), Task 2 (stripped connection cards), Task 3 (IntegrationTile)

**Acceptance Criteria:**
- [ ] The page shows a 2-tile grid: Shopify and WooCommerce, each with their real brand logo
- [ ] Clicking the Shopify tile opens a drawer titled "Shopify" containing `ShopifyConnectionCard`
- [ ] Clicking the WooCommerce tile opens a drawer titled "WooCommerce" containing `WooCommerceConnectionCard`
- [ ] Only one drawer is open at a time
- [ ] Closing a drawer (X, backdrop, or Escape) returns to the tile grid with no drawer open

**Verify:** Manual browser verification (this page has no existing automated test, consistent with the prior settings-restructure work)

**Steps:**

- [ ] **Step 1: Rewrite the page**

Replace `src/app/settings/integrations/page.tsx` with:

```tsx
"use client";
import { useState } from "react";
import { IntegrationTile } from "@/components/IntegrationTile";
import { SettingsDrawer } from "@/components/SettingsDrawer";
import { ShopifyConnectionCard } from "@/components/ShopifyConnectionCard";
import { WooCommerceConnectionCard } from "@/components/WooCommerceConnectionCard";

function getShopifyLabel(data: Record<string, unknown>): string | null {
  return typeof data.shopDomain === "string" ? data.shopDomain : null;
}

function getWooCommerceLabel(data: Record<string, unknown>): string | null {
  const storeUrl = typeof data.storeUrl === "string" ? data.storeUrl : null;
  if (!storeUrl) return null;
  try {
    return new URL(storeUrl).hostname;
  } catch {
    return storeUrl;
  }
}

const INTEGRATION_DESCRIPTION = "Sync products, orders, and push price changes back to your store.";

export default function IntegrationsSettingsPage() {
  const [openDrawer, setOpenDrawer] = useState<"shopify" | "woocommerce" | null>(null);

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2">
        <IntegrationTile
          name="Shopify"
          description={INTEGRATION_DESCRIPTION}
          logoSrc="/shopify-logo.svg"
          logoAlt="Shopify"
          statusUrl="/api/shopify/status"
          getConnectedLabel={getShopifyLabel}
          onOpen={() => setOpenDrawer("shopify")}
        />
        <IntegrationTile
          name="WooCommerce"
          description={INTEGRATION_DESCRIPTION}
          logoSrc="/woocommerce-logo.jpg"
          logoAlt="WooCommerce"
          statusUrl="/api/woocommerce/status"
          getConnectedLabel={getWooCommerceLabel}
          onOpen={() => setOpenDrawer("woocommerce")}
        />
      </div>

      {openDrawer === "shopify" && (
        <SettingsDrawer title="Shopify" onClose={() => setOpenDrawer(null)}>
          <ShopifyConnectionCard />
        </SettingsDrawer>
      )}
      {openDrawer === "woocommerce" && (
        <SettingsDrawer title="WooCommerce" onClose={() => setOpenDrawer(null)}>
          <WooCommerceConnectionCard />
        </SettingsDrawer>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Manual verification**

Run `npm run dev`, log in, visit `/settings/integrations`. Confirm:
1. Both tiles render with their real logos and "Connect →".
2. Clicking Shopify opens a drawer titled "Shopify" with the shop domain/access token/API secret form.
3. Closing via the X button returns to the grid.
4. Reopening and closing via a backdrop click, then via Escape, both work.
5. If you have Shopify test credentials, connect and confirm the tile now shows the connected domain and "Connected" badge after closing the drawer and the page's tiles re-fetch (note: the tile only re-fetches on mount, so after connecting inside the drawer you may need to close and the tile's own effect will not automatically refresh — confirm this is acceptable by reloading the page and observing the tile now shows connected; if a live update without reload is wanted, that's a follow-up, not required by this plan).

- [ ] **Step 3: Commit**

```bash
git add src/app/settings/integrations/page.tsx
git commit -m "feat: rebuild Integrations settings page as a card grid + drawer"
```

---

### Task 5: Team row normalization, filter, and sort logic

**Goal:** Pure, independently-testable functions that merge members and pending invites into unified rows, filter them by email/status/role, and sort them — the data layer the Team table UI (Task 7) will consume.

**Files:**
- Create: `src/lib/team/rows.ts`
- Test: `src/lib/team/rows.test.ts`

**Acceptance Criteria:**
- [ ] `normalizeTeamRows` maps active members to `status: "Active"` rows and pending invites to `status: "Invited"` or `status: "Expired"` rows based on their `expired` flag
- [ ] `filterTeamRows` applies email substring (case-insensitive), status set, and role set filters with AND logic; an empty filter set means "no restriction" for that dimension
- [ ] `sortTeamRows` sorts by email (locale-aware) or by date, ascending or descending
- [ ] `removableRowIds` excludes the Owner's own member row from a selected-ID set, keeping every other selected row
- [ ] `summarizeRemovalFailures` returns `null` when every result succeeded, and a single formatted multi-line message listing only the failed rows otherwise

**Verify:** `npx vitest run src/lib/team/rows.test.ts` → all tests pass

**Steps:**

- [ ] **Step 1: Write the failing test**

Create `src/lib/team/rows.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import {
  normalizeTeamRows,
  filterTeamRows,
  sortTeamRows,
  removableRowIds,
  summarizeRemovalFailures,
} from "./rows";

const members = [
  { id: "u1", email: "owner@example.com", role: "OWNER", createdAt: "2026-01-01T00:00:00Z" },
  { id: "u2", email: "member@example.com", role: "MEMBER", createdAt: "2026-02-01T00:00:00Z" },
];

const pendingInvites = [
  {
    id: "i1",
    email: "pending@example.com",
    expiresAt: "2099-01-01T00:00:00Z",
    createdAt: "2026-03-01T00:00:00Z",
    expired: false,
  },
  {
    id: "i2",
    email: "gone@example.com",
    expiresAt: "2020-01-01T00:00:00Z",
    createdAt: "2026-01-15T00:00:00Z",
    expired: true,
  },
];

describe("normalizeTeamRows", () => {
  it("maps members to Active rows and invites to Invited/Expired rows", () => {
    const rows = normalizeTeamRows(members, pendingInvites);
    expect(rows).toHaveLength(4);
    expect(rows.find((r) => r.id === "u1")).toMatchObject({ status: "Active", role: "OWNER", kind: "member" });
    expect(rows.find((r) => r.id === "u2")).toMatchObject({ status: "Active", role: "MEMBER", kind: "member" });
    expect(rows.find((r) => r.id === "i1")).toMatchObject({ status: "Invited", role: "MEMBER", kind: "invite" });
    expect(rows.find((r) => r.id === "i2")).toMatchObject({ status: "Expired", role: "MEMBER", kind: "invite" });
  });
});

describe("filterTeamRows", () => {
  const rows = normalizeTeamRows(members, pendingInvites);

  it("filters by email substring, case-insensitively", () => {
    const result = filterTeamRows(rows, { emailQuery: "OWNER", statuses: new Set(), roles: new Set() });
    expect(result.map((r) => r.id)).toEqual(["u1"]);
  });

  it("filters by status", () => {
    const result = filterTeamRows(rows, { emailQuery: "", statuses: new Set(["Expired"]), roles: new Set() });
    expect(result.map((r) => r.id)).toEqual(["i2"]);
  });

  it("filters by role", () => {
    const result = filterTeamRows(rows, { emailQuery: "", statuses: new Set(), roles: new Set(["OWNER"]) });
    expect(result.map((r) => r.id)).toEqual(["u1"]);
  });

  it("combines email, status, and role filters with AND logic", () => {
    const result = filterTeamRows(rows, {
      emailQuery: "example.com",
      statuses: new Set(["Active"]),
      roles: new Set(["MEMBER"]),
    });
    expect(result.map((r) => r.id)).toEqual(["u2"]);
  });

  it("returns all rows when no filters are set", () => {
    const result = filterTeamRows(rows, { emailQuery: "", statuses: new Set(), roles: new Set() });
    expect(result).toHaveLength(4);
  });
});

describe("sortTeamRows", () => {
  const rows = normalizeTeamRows(members, pendingInvites);

  it("sorts by email ascending", () => {
    const result = sortTeamRows(rows, "email", "asc");
    expect(result.map((r) => r.email)).toEqual([
      "gone@example.com",
      "member@example.com",
      "owner@example.com",
      "pending@example.com",
    ]);
  });

  it("sorts by date descending", () => {
    const result = sortTeamRows(rows, "date", "desc");
    expect(result.map((r) => r.id)).toEqual(["i1", "u2", "i2", "u1"]);
  });
});

describe("removableRowIds", () => {
  const rows = normalizeTeamRows(members, pendingInvites);

  it("excludes the Owner's own member row from a selection", () => {
    const result = removableRowIds(rows, new Set(["u1", "u2", "i1"]));
    expect(result.sort()).toEqual(["i1", "u2"]);
  });

  it("returns an empty array when only the Owner row is selected", () => {
    const result = removableRowIds(rows, new Set(["u1"]));
    expect(result).toEqual([]);
  });

  it("ignores IDs that don't match any row", () => {
    const result = removableRowIds(rows, new Set(["does-not-exist"]));
    expect(result).toEqual([]);
  });
});

describe("summarizeRemovalFailures", () => {
  it("returns null when every result succeeded", () => {
    const result = summarizeRemovalFailures([
      { email: "a@example.com", ok: true },
      { email: "b@example.com", ok: true },
    ]);
    expect(result).toBeNull();
  });

  it("formats only the failed rows into one multi-line message", () => {
    const result = summarizeRemovalFailures([
      { email: "a@example.com", ok: true },
      { email: "b@example.com", ok: false, error: "Not found" },
      { email: "c@example.com", ok: false },
    ]);
    expect(result).toBe(
      "Some removals failed:\nb@example.com: Not found\nc@example.com: failed",
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/team/rows.test.ts`
Expected: FAIL — `Cannot find module './rows'`.

- [ ] **Step 3: Write the module**

Create `src/lib/team/rows.ts`:

```typescript
export type RowStatus = "Active" | "Invited" | "Expired";
export type RowRole = "OWNER" | "MEMBER";

export interface TeamRow {
  id: string;
  email: string;
  role: RowRole;
  status: RowStatus;
  date: string;
  kind: "member" | "invite";
}

export interface TeamMember {
  id: string;
  email: string;
  role: string;
  createdAt: string;
}

export interface TeamPendingInvite {
  id: string;
  email: string;
  expiresAt: string;
  createdAt: string;
  expired: boolean;
}

export function normalizeTeamRows(members: TeamMember[], pendingInvites: TeamPendingInvite[]): TeamRow[] {
  const memberRows: TeamRow[] = members.map((m) => ({
    id: m.id,
    email: m.email,
    role: m.role === "OWNER" ? "OWNER" : "MEMBER",
    status: "Active",
    date: m.createdAt,
    kind: "member",
  }));
  const inviteRows: TeamRow[] = pendingInvites.map((inv) => ({
    id: inv.id,
    email: inv.email,
    role: "MEMBER",
    status: inv.expired ? "Expired" : "Invited",
    date: inv.createdAt,
    kind: "invite",
  }));
  return [...memberRows, ...inviteRows];
}

export interface TeamRowFilters {
  emailQuery: string;
  statuses: Set<RowStatus>;
  roles: Set<RowRole>;
}

export function filterTeamRows(rows: TeamRow[], filters: TeamRowFilters): TeamRow[] {
  const query = filters.emailQuery.trim().toLowerCase();
  return rows.filter((row) => {
    if (query !== "" && !row.email.toLowerCase().includes(query)) return false;
    if (filters.statuses.size > 0 && !filters.statuses.has(row.status)) return false;
    if (filters.roles.size > 0 && !filters.roles.has(row.role)) return false;
    return true;
  });
}

export type SortField = "email" | "date";
export type SortDirection = "asc" | "desc";

export function sortTeamRows(rows: TeamRow[], field: SortField, direction: SortDirection): TeamRow[] {
  const sorted = [...rows].sort((a, b) => {
    if (field === "email") return a.email.localeCompare(b.email);
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });
  return direction === "asc" ? sorted : sorted.reverse();
}

/** A row is removable via bulk-remove unless it's the account Owner's own member row. */
export function removableRowIds(rows: TeamRow[], selected: Set<string>): string[] {
  return [...selected].filter((id) => {
    const row = rows.find((r) => r.id === id);
    return row !== undefined && !(row.kind === "member" && row.role === "OWNER");
  });
}

export interface RemovalResult {
  email: string;
  ok: boolean;
  error?: string;
}

/** Formats per-row bulk-remove failures into one message; null when everything succeeded. */
export function summarizeRemovalFailures(results: RemovalResult[]): string | null {
  const failures = results.filter((r) => !r.ok);
  if (failures.length === 0) return null;
  return `Some removals failed:\n${failures.map((f) => `${f.email}: ${f.error ?? "failed"}`).join("\n")}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/team/rows.test.ts`
Expected: PASS — all 13 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/team/rows.ts src/lib/team/rows.test.ts
git commit -m "feat: add pure Team row normalization, filter, and sort logic"
```

---

### Task 6: MultiSelectFilter, ColumnVisibilityMenu, RowActionsMenu

**Goal:** Three small `PopoverMenu`-based components the Team table (Task 7) composes: the Status/Role filter dropdowns, the "View" column toggle, and the per-row `...` action menu.

**Files:**
- Create: `src/components/MultiSelectFilter.tsx`
- Create: `src/components/ColumnVisibilityMenu.tsx`
- Create: `src/components/RowActionsMenu.tsx`

**Depends on:** Task 1 (PopoverMenu)

**Acceptance Criteria:**
- [ ] `MultiSelectFilter` shows a checkbox list of the given options; toggling one calls `onChange` with an updated `Set`; the trigger label shows a count when any are selected
- [ ] `ColumnVisibilityMenu` shows checkboxes for Role/Status/Joined; toggling one calls `onChange` with the updated visibility object
- [ ] `RowActionsMenu` renders nothing when given an empty actions array; otherwise renders a `...` trigger that opens a list of the given actions, each closing the menu after firing

**Verify:** Manual verification via Task 7's Team table (no standalone tests for these — they're thin composition wrappers around the already-tested `PopoverMenu`; their real behavior is exercised through the Team table in Task 7)

**Steps:**

- [ ] **Step 1: Write MultiSelectFilter**

Create `src/components/MultiSelectFilter.tsx`:

```tsx
"use client";
import { PopoverMenu } from "./ui/PopoverMenu";

export function MultiSelectFilter<T extends string>({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  selected: Set<T>;
  onChange: (next: Set<T>) => void;
}) {
  function toggle(value: T) {
    const next = new Set(selected);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    onChange(next);
  }

  return (
    <PopoverMenu
      trigger={({ toggle: toggleOpen }) => (
        <button type="button" onClick={toggleOpen} className="btn btn-ghost text-xs">
          + {label}
          {selected.size > 0 ? ` (${selected.size})` : ""}
        </button>
      )}
    >
      {() => (
        <div className="space-y-1">
          {options.map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-2 rounded px-2 py-1 text-sm text-ink hover:bg-panel"
            >
              <input
                type="checkbox"
                checked={selected.has(opt.value)}
                onChange={() => toggle(opt.value)}
                className="size-4 accent-[var(--accent)]"
              />
              {opt.label}
            </label>
          ))}
        </div>
      )}
    </PopoverMenu>
  );
}
```

- [ ] **Step 2: Write ColumnVisibilityMenu**

Create `src/components/ColumnVisibilityMenu.tsx`:

```tsx
"use client";
import { PopoverMenu } from "./ui/PopoverMenu";

export interface ColumnVisibility {
  role: boolean;
  status: boolean;
  date: boolean;
}

const COLUMNS: { key: keyof ColumnVisibility; label: string }[] = [
  { key: "role", label: "Role" },
  { key: "status", label: "Status" },
  { key: "date", label: "Joined" },
];

export function ColumnVisibilityMenu({
  visibility,
  onChange,
}: {
  visibility: ColumnVisibility;
  onChange: (next: ColumnVisibility) => void;
}) {
  return (
    <PopoverMenu
      align="right"
      trigger={({ toggle }) => (
        <button type="button" onClick={toggle} className="btn btn-ghost text-xs">
          View
        </button>
      )}
    >
      {() => (
        <div className="space-y-1">
          {COLUMNS.map((col) => (
            <label
              key={col.key}
              className="flex items-center gap-2 rounded px-2 py-1 text-sm text-ink hover:bg-panel"
            >
              <input
                type="checkbox"
                checked={visibility[col.key]}
                onChange={() => onChange({ ...visibility, [col.key]: !visibility[col.key] })}
                className="size-4 accent-[var(--accent)]"
              />
              {col.label}
            </label>
          ))}
        </div>
      )}
    </PopoverMenu>
  );
}
```

- [ ] **Step 3: Write RowActionsMenu**

Create `src/components/RowActionsMenu.tsx`:

```tsx
"use client";
import { DotsThree } from "@phosphor-icons/react";
import { PopoverMenu } from "./ui/PopoverMenu";

export interface RowAction {
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}

export function RowActionsMenu({ actions }: { actions: RowAction[] }) {
  if (actions.length === 0) return null;

  return (
    <PopoverMenu
      align="right"
      trigger={({ toggle }) => (
        <button
          type="button"
          onClick={toggle}
          aria-label="Row actions"
          className="rounded p-1 text-faint hover:bg-panel hover:text-ink"
        >
          <DotsThree size={18} weight="bold" />
        </button>
      )}
    >
      {({ close }) => (
        <div className="space-y-0.5">
          {actions.map((a) => (
            <button
              key={a.label}
              type="button"
              disabled={a.disabled}
              onClick={() => {
                a.onClick();
                close();
              }}
              className={`block w-full rounded px-2 py-1 text-left text-sm hover:bg-panel disabled:opacity-50 ${
                a.danger ? "text-danger" : "text-ink"
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
    </PopoverMenu>
  );
}
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: No errors from the three new files (they have no runtime logic beyond composition, so a clean type-check is the acceptance bar here).

- [ ] **Step 5: Commit**

```bash
git add src/components/MultiSelectFilter.tsx src/components/ColumnVisibilityMenu.tsx src/components/RowActionsMenu.tsx
git commit -m "feat: add Team table filter, column-visibility, and row-action menus"
```

---

### Task 7: Rebuild TeamCard as a full data table

**Goal:** `/settings/team` shows one merged, filterable, sortable table of members and pending invites, with bulk-select + bulk-remove, column visibility, and pagination.

**Files:**
- Modify: `src/components/TeamCard.tsx`

**Depends on:** Task 5 (row logic), Task 6 (filter/menu components)

**Acceptance Criteria:**
- [ ] Members and pending invites render as one table, sorted by email ascending by default
- [ ] Email search box filters rows by substring
- [ ] Status and Role dropdown filters combine with the search box and each other via AND logic
- [ ] Clicking the Email or Joined column header toggles sort field/direction
- [ ] The "View" menu can hide/show the Role, Status, and Joined columns
- [ ] Row checkboxes only appear for the Owner, and never for the Owner's own row (the Owner row can't be bulk-removed)
- [ ] Selecting rows and clicking "Remove selected" removes each selected member/invite via the existing per-row endpoints, aggregates any per-row failures into one error message, and refreshes the table
- [ ] Row action menu shows Remove (Owner viewing a Member), Resend/Revoke (Owner viewing a pending invite), Leave team (Member viewing their own row), or nothing (Member viewing another row) — same permission logic as before
- [ ] Pagination controls (rows-per-page selector, Previous/Next, "Page X of Y") work against the filtered/sorted row set

**Verify:** Manual browser verification (per the design spec, this UI's automated coverage lives in Task 5's pure-logic tests; the full table interaction is verified by hand)

**Steps:**

- [ ] **Step 1: Replace the component**

Replace `src/components/TeamCard.tsx` in full with:

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  normalizeTeamRows,
  filterTeamRows,
  sortTeamRows,
  removableRowIds,
  summarizeRemovalFailures,
  type TeamRow,
  type RowStatus,
  type RowRole,
  type SortField,
  type SortDirection,
} from "@/lib/team/rows";
import { MultiSelectFilter } from "./MultiSelectFilter";
import { ColumnVisibilityMenu, type ColumnVisibility } from "./ColumnVisibilityMenu";
import { RowActionsMenu } from "./RowActionsMenu";

interface Member {
  id: string;
  email: string;
  role: string;
  createdAt: string;
}

interface PendingInvite {
  id: string;
  email: string;
  expiresAt: string;
  createdAt: string;
  expired: boolean;
}

const STATUS_OPTIONS: { value: RowStatus; label: string }[] = [
  { value: "Active", label: "Active" },
  { value: "Invited", label: "Invited" },
  { value: "Expired", label: "Expired" },
];

const ROLE_OPTIONS: { value: RowRole; label: string }[] = [
  { value: "OWNER", label: "Owner" },
  { value: "MEMBER", label: "Member" },
];

const PAGE_SIZE_OPTIONS = [10, 25, 50];

export function TeamCard({ currentUserId, currentUserRole }: { currentUserId: string; currentUserRole: string }) {
  const isOwner = currentUserRole === "OWNER";

  const [members, setMembers] = useState<Member[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [loaded, setLoaded] = useState(false);

  const [inviteEmail, setInviteEmail] = useState("");
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [emailQuery, setEmailQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<Set<RowStatus>>(new Set());
  const [roleFilter, setRoleFilter] = useState<Set<RowRole>>(new Set());
  const [sortField, setSortField] = useState<SortField>("email");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [visibility, setVisibility] = useState<ColumnVisibility>({ role: true, status: true, date: true });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [bulkBusy, setBulkBusy] = useState(false);

  async function refresh() {
    const res = await fetch("/api/team");
    if (res.ok) {
      const data = await res.json();
      setMembers(data.members);
      setPendingInvites(data.pendingInvites);
    }
    setLoaded(true);
  }

  useEffect(() => {
    refresh();
  }, []);

  const rows = useMemo(() => normalizeTeamRows(members, pendingInvites), [members, pendingInvites]);
  const filtered = useMemo(
    () => filterTeamRows(rows, { emailQuery, statuses: statusFilter, roles: roleFilter }),
    [rows, emailQuery, statusFilter, roleFilter],
  );
  const sorted = useMemo(() => sortTeamRows(filtered, sortField, sortDirection), [filtered, sortField, sortDirection]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const paged = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  }

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAllOnPage() {
    const pageIds = removableRowIds(paged, new Set(paged.map((r) => r.id)));
    const allSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        pageIds.forEach((id) => next.delete(id));
      } else {
        pageIds.forEach((id) => next.add(id));
      }
      return next;
    });
  }

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const email = inviteEmail.trim();
    if (email === "") {
      setError("Enter an email address.");
      return;
    }
    setBusyId("invite");
    try {
      const res = await fetch("/api/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to send invite");
      }
      setInviteEmail("");
      setShowInviteForm(false);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send invite");
    } finally {
      setBusyId(null);
    }
  }

  async function removeMember(userId: string) {
    setError(null);
    setBusyId(userId);
    try {
      const res = await fetch(`/api/team/${userId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to remove member");
      }
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to remove member");
    } finally {
      setBusyId(null);
    }
  }

  async function leaveTeam() {
    setError(null);
    setBusyId(currentUserId);
    try {
      const res = await fetch("/api/team/leave", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to leave team");
      }
      window.location.href = "/login";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to leave team");
      setBusyId(null);
    }
  }

  async function resendInvite(id: string) {
    setError(null);
    setBusyId(id);
    try {
      const res = await fetch(`/api/team/invitations/${id}/resend`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to resend invite");
      }
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to resend invite");
    } finally {
      setBusyId(null);
    }
  }

  async function revokeInvite(id: string) {
    setError(null);
    setBusyId(id);
    try {
      const res = await fetch(`/api/team/invitations/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to revoke invite");
      }
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to revoke invite");
    } finally {
      setBusyId(null);
    }
  }

  async function removeSelected() {
    const removableIds = removableRowIds(rows, selected);
    if (removableIds.length === 0) return;
    setBulkBusy(true);
    setError(null);
    const results: { email: string; ok: boolean; error?: string }[] = [];
    for (const id of removableIds) {
      const row = rows.find((r) => r.id === id);
      if (!row) continue;
      try {
        const url = row.kind === "member" ? `/api/team/${id}` : `/api/team/invitations/${id}`;
        const res = await fetch(url, { method: "DELETE" });
        if (res.ok) {
          results.push({ email: row.email, ok: true });
        } else {
          const data = await res.json().catch(() => null);
          results.push({ email: row.email, ok: false, error: data?.error });
        }
      } catch {
        results.push({ email: row.email, ok: false, error: "network error" });
      }
    }
    setSelected(new Set());
    setBulkBusy(false);
    const summary = summarizeRemovalFailures(results);
    if (summary) setError(summary);
    await refresh();
  }

  function actionsForRow(row: TeamRow) {
    if (isOwner && row.kind === "member" && row.role !== "OWNER") {
      return [{ label: "Remove", onClick: () => removeMember(row.id), danger: true, disabled: busyId === row.id }];
    }
    if (isOwner && row.kind === "invite") {
      return [
        { label: "Resend", onClick: () => resendInvite(row.id), disabled: busyId === row.id },
        { label: "Revoke", onClick: () => revokeInvite(row.id), danger: true, disabled: busyId === row.id },
      ];
    }
    if (!isOwner && row.kind === "member" && row.id === currentUserId) {
      return [{ label: "Leave team", onClick: leaveTeam, danger: true, disabled: busyId === currentUserId }];
    }
    return [];
  }

  const pageSelectableIds = removableRowIds(paged, new Set(paged.map((r) => r.id)));
  const allOnPageSelected = pageSelectableIds.length > 0 && pageSelectableIds.every((id) => selected.has(id));
  const selectableCount = removableRowIds(rows, selected).length;

  return (
    <section className="rounded-xl border border-line bg-surface p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-ink">Team members</h2>
          <p className="mt-0.5 text-xs text-muted">Manage your team members and their roles.</p>
        </div>
        {isOwner && (
          <button onClick={() => setShowInviteForm((v) => !v)} className="btn btn-ghost text-xs">
            {showInviteForm ? "Cancel" : "Invite member"}
          </button>
        )}
      </div>

      {isOwner && showInviteForm && (
        <form onSubmit={sendInvite} className="mt-3 flex items-end gap-2">
          <label className="flex-1 text-xs font-medium text-muted">
            Email
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="field mt-1 w-full"
              placeholder="teammate@example.com"
            />
          </label>
          <button type="submit" disabled={busyId === "invite"} className="btn btn-primary text-xs">
            {busyId === "invite" ? "Sending..." : "Send invite"}
          </button>
        </form>
      )}

      {error && (
        <p role="alert" className="mt-3 whitespace-pre-line text-sm text-danger">
          {error}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={emailQuery}
          onChange={(e) => {
            setEmailQuery(e.target.value);
            setPage(1);
          }}
          placeholder="Filter by email..."
          className="field w-56 text-sm"
        />
        <MultiSelectFilter
          label="Status"
          options={STATUS_OPTIONS}
          selected={statusFilter}
          onChange={(next) => {
            setStatusFilter(next);
            setPage(1);
          }}
        />
        <MultiSelectFilter
          label="Role"
          options={ROLE_OPTIONS}
          selected={roleFilter}
          onChange={(next) => {
            setRoleFilter(next);
            setPage(1);
          }}
        />
        <div className="ml-auto">
          <ColumnVisibilityMenu visibility={visibility} onChange={setVisibility} />
        </div>
      </div>

      {isOwner && selected.size > 0 && (
        <div className="mt-3 flex items-center gap-3 rounded-lg bg-panel px-3 py-2">
          <span className="text-xs text-muted">{selected.size} selected</span>
          <button
            onClick={removeSelected}
            disabled={bulkBusy || selectableCount === 0}
            className="btn btn-ghost text-xs text-danger"
          >
            {bulkBusy ? "Removing..." : `Remove selected (${selectableCount})`}
          </button>
        </div>
      )}

      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-[0.7rem] uppercase tracking-wide text-muted">
              {isOwner && (
                <th scope="col" className="w-8 py-2 pr-2">
                  <input
                    type="checkbox"
                    checked={allOnPageSelected}
                    onChange={toggleSelectAllOnPage}
                    aria-label="Select all rows on this page"
                    className="size-4 accent-[var(--accent)]"
                  />
                </th>
              )}
              <th scope="col" className="py-2 pr-3 font-medium">
                <button type="button" onClick={() => toggleSort("email")} className="hover:text-ink">
                  Email {sortField === "email" ? (sortDirection === "asc" ? "↑" : "↓") : ""}
                </button>
              </th>
              {visibility.role && (
                <th scope="col" className="py-2 pr-3 font-medium">
                  Role
                </th>
              )}
              {visibility.status && (
                <th scope="col" className="py-2 pr-3 font-medium">
                  Status
                </th>
              )}
              {visibility.date && (
                <th scope="col" className="py-2 pr-3 font-medium">
                  <button type="button" onClick={() => toggleSort("date")} className="hover:text-ink">
                    Joined {sortField === "date" ? (sortDirection === "asc" ? "↑" : "↓") : ""}
                  </button>
                </th>
              )}
              <th scope="col" className="w-10 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {paged.map((row) => {
              const actions = actionsForRow(row);
              const rowSelectable = isOwner && !(row.kind === "member" && row.role === "OWNER");
              return (
                <tr key={row.id} className="border-b border-line last:border-0">
                  {isOwner && (
                    <td className="py-2 pr-2">
                      {rowSelectable && (
                        <input
                          type="checkbox"
                          checked={selected.has(row.id)}
                          onChange={() => toggleSelected(row.id)}
                          aria-label={`Select ${row.email}`}
                          className="size-4 accent-[var(--accent)]"
                        />
                      )}
                    </td>
                  )}
                  <td className="py-2 pr-3 text-ink">{row.email}</td>
                  {visibility.role && (
                    <td className="py-2 pr-3 text-muted">{row.role === "OWNER" ? "Owner" : "Member"}</td>
                  )}
                  {visibility.status && (
                    <td className="py-2 pr-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          row.status === "Active"
                            ? "bg-accent-soft text-accent"
                            : row.status === "Expired"
                              ? "bg-panel text-faint"
                              : "bg-panel text-muted"
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                  )}
                  {visibility.date && (
                    <td className="py-2 pr-3 text-muted">{new Date(row.date).toLocaleDateString()}</td>
                  )}
                  <td className="py-2">
                    <RowActionsMenu actions={actions} />
                  </td>
                </tr>
              );
            })}
            {loaded && paged.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-sm text-muted">
                  No team members match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-muted">
        <label className="flex items-center gap-2">
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="field text-xs"
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
          Rows per page
        </label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage <= 1}
            className="btn btn-ghost text-xs"
          >
            Previous
          </button>
          <span>
            Page {safePage} of {pageCount}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
            disabled={safePage >= pageCount}
            className="btn btn-ghost text-xs"
          >
            Next
          </button>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Manual verification**

Run `npm run dev`, log in as the Owner of a multi-member merchant (or invite a second account first), visit `/settings/team`. Confirm, in order:
1. The table shows one merged row per member/invite, sorted by email.
2. Typing in "Filter by email..." narrows the rows live.
3. Opening the Status filter and checking "Invited" shows only pending, non-expired invites; combining with the Role filter narrows further; unchecking clears the filter.
4. Clicking the Email column header toggles ascending/descending sort (arrow indicator flips); same for Joined.
5. Opening "View" and unchecking Status hides that column; re-checking restores it.
6. As Owner, row checkboxes appear on every row except the Owner's own row; selecting 2+ rows shows the "Remove selected (N)" bar; clicking it removes them and refreshes the table.
7. The `...` menu on a pending invite shows Resend/Revoke and both work; on a Member row (as Owner) shows Remove; log in as a Member and confirm you see "Leave team" on your own row and no menu on others.
8. With more than `pageSize` total rows (or by setting Rows per page to 10 with a small team), confirm Previous/Next and the page-size selector work.

- [ ] **Step 4: Commit**

```bash
git add src/components/TeamCard.tsx
git commit -m "feat: rebuild Team settings page as a filterable, sortable data table"
```

---

### Task 8: Full-suite verification

**Goal:** Confirm Wave 2 integrates cleanly with no regressions.

**Files:** None (verification only)

**Acceptance Criteria:**
- [ ] Full test suite passes, count higher than the pre-Wave-2 baseline by exactly the new tests added in Tasks 1, 3, and 5 (PopoverMenu 5 + SettingsDrawer 5 + IntegrationTile 4 + rows.ts 13 = 27 new tests; Tasks 2, 4, 6, 7 add no new automated tests per their own acceptance criteria)
- [ ] `npm run build` succeeds with no new type errors
- [ ] Manual click-through: Integrations tiles + drawer per Task 4 Step 2; Team table per Task 7 Step 3

**Verify:** `npx vitest run && npm run build` → both succeed

**Steps:**

- [ ] **Step 1: Run the full test suite**

Run: `npx vitest run`
Expected: All tests pass, including the 22 new ones from this wave.

- [ ] **Step 2: Run the production build**

Run: `npm run build`
Expected: Build succeeds, no new TypeScript errors, `/settings/integrations` and `/settings/team` listed in the route output.

- [ ] **Step 3: Manual click-through**

Repeat Task 4 Step 2 (Integrations) and Task 7 Step 3 (Team) in a running `npm run dev` session as a final end-to-end pass.

- [ ] **Step 4: Commit** (only if Steps 1–3 required any fixes; otherwise skip — nothing to commit for a clean pass)
