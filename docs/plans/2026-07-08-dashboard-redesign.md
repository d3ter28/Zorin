# PriceIQ Dashboard Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:subagent-driven-development (recommended) or superpowers-extended-cc:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform PriceIQ into a cohesive SaaS analytics app with a persistent sidebar, tabbed dashboard, portfolio trend chart, top-opportunities panel, and CSV export.

**Architecture:** Introduce a client-side `AppShell` wrapping a dark sidebar + scrollable main area. The dashboard splits into Overview (stats + chart + opportunity leaderboard) and Products tabs. New portfolio trend API aggregates `SalesRecord` data by month for the SVG line chart.

**Tech Stack:** Next.js 16 App Router, Tailwind v4 (OKLCH tokens), Prisma 7, Phosphor Icons v2 (`@phosphor-icons/react`), pure SVG charts.

**User decisions (already made):**
- "Make the UI look like this style" — referring to a dark-sidebar SaaS analytics dashboard (freebeat/Otterly-style) with tabs, line charts, and ranked leaderboard panels side-by-side.
- Keep existing color system (`--color-accent` indigo, OKLCH tokens). Sidebar uses hardcoded dark `oklch(0.18 0.012 265)` (darker than `--ink`) since the design token system doesn't include a sidebar dark shade.

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `src/components/AppShell.tsx` | Create | Layout wrapper: sidebar + main content area |
| `src/components/Sidebar.tsx` | Create | Dark left nav with icons, active-state, logout |
| `src/components/Dashboard.tsx` | Modify | Add tab state (Overview/Products), top-opportunities panel |
| `src/components/PortfolioTrendChart.tsx` | Create | Pure SVG line chart for monthly avg price |
| `src/app/api/products/portfolio/trend/route.ts` | Create | Monthly sales trend aggregation |
| `src/app/api/products/export/route.ts` | Create | CSV export of all products |
| `src/app/dashboard/page.tsx` | Modify | Remove standalone header, wrap with AppShell |
| `src/app/product/[id]/page.tsx` | Modify | Remove Back link + standalone header, wrap with AppShell |
| `src/app/settings/page.tsx` | Modify | Wrap with AppShell |

---

## Tasks

---

### Task 1: AppShell + Sidebar Navigation

**Goal:** Add a persistent dark left sidebar with navigation links, replacing per-page headers.

**Files:**
- Create: `src/components/AppShell.tsx`
- Create: `src/components/Sidebar.tsx`
- Modify: `src/app/dashboard/page.tsx`
- Modify: `src/app/product/[id]/page.tsx` (remove Back link, add AppShell)
- Modify: `src/app/settings/page.tsx`

**Acceptance Criteria:**
- [ ] Sidebar visible on `/dashboard`, `/product/[id]`, and `/settings` pages
- [ ] Active item highlighted (accent) based on current route — Dashboard item active on both `/dashboard` and `/product/*`
- [ ] Logout button in sidebar signs out and redirects to `/login`
- [ ] Main content area fills remaining horizontal space and scrolls independently
- [ ] Sidebar is sticky (doesn't scroll with content)

**Verify:** Visit `http://localhost:3000/dashboard`, `http://localhost:3000/product/<any-id>`, `http://localhost:3000/settings` — all show the dark sidebar with correct active state.

**Steps:**

- [ ] **Step 1: Create `AppShell.tsx`**

`AppShell` is a `"use client"` wrapper (required because `Sidebar` inside it uses `usePathname`). Server components can still pass server-rendered `children` to it — this is the React Server Components composition pattern.

```tsx
// src/components/AppShell.tsx
"use client";
import { Sidebar } from "./Sidebar";

export function AppShell({
  children,
  merchantName,
}: {
  children: React.ReactNode;
  merchantName?: string;
}) {
  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar merchantName={merchantName} />
      <div className="flex-1 min-w-0 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `Sidebar.tsx`**

```tsx
// src/components/Sidebar.tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SquaresFour, Gear, SignOut } from "@phosphor-icons/react";

const SIDEBAR_BG = "oklch(0.18 0.012 265)";
const ITEM_TEXT = "oklch(0.62 0.010 265)";
const ITEM_HOVER_BG = "oklch(0.26 0.012 265)";
const ITEM_HOVER_TEXT = "oklch(0.88 0.005 265)";
const DIVIDER = "oklch(0.28 0.012 265)";
const BRAND_TEXT = "oklch(0.95 0.003 265)";
const MERCHANT_TEXT = "oklch(0.50 0.010 265)";

const NAV = [
  { href: "/dashboard", icon: SquaresFour, label: "Dashboard", matchPrefix: ["/dashboard", "/product"] },
  { href: "/settings", icon: Gear, label: "Settings", matchPrefix: ["/settings"] },
];

function NavItem({
  href,
  icon: Icon,
  label,
  active,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
        active
          ? "bg-accent text-accent-fg"
          : ""
      }`}
      style={
        active
          ? undefined
          : {
              color: ITEM_TEXT,
            }
      }
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
      <Icon size={16} weight={active ? "fill" : "regular"} />
      {label}
    </Link>
  );
}

export function Sidebar({ merchantName }: { merchantName?: string }) {
  const pathname = usePathname();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <aside
      className="w-56 shrink-0 flex flex-col sticky top-0 h-screen overflow-y-auto"
      style={{ backgroundColor: SIDEBAR_BG }}
    >
      {/* Brand */}
      <div className="px-5 pt-5 pb-6">
        <span className="text-sm font-semibold tracking-tight" style={{ color: BRAND_TEXT }}>
          PriceIQ
        </span>
        {merchantName && (
          <p className="text-xs mt-0.5 truncate" style={{ color: MERCHANT_TEXT }}>
            {merchantName}
          </p>
        )}
      </div>

      {/* Nav */}
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

      {/* Logout */}
      <div className="px-3 pb-5 pt-3" style={{ borderTop: `1px solid ${DIVIDER}` }}>
        <button
          onClick={logout}
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
          <SignOut size={16} />
          Log out
        </button>
      </div>
    </aside>
  );
}
```

> **Note on inline styles:** The sidebar dark palette uses raw oklch values not in the Tailwind theme (the theme only goes as dark as `--ink`). Using `style={}` for these specific colors is intentional.

- [ ] **Step 3: Modify `src/app/dashboard/page.tsx`**

Read the file first to see the current content, then replace. The server component wraps with AppShell and drops its old standalone `<header>`.

Current structure:
```tsx
// Current (remove this)
<main className="mx-auto max-w-5xl px-6 py-10 pb-28">
  <header className="mb-8 flex items-start justify-between">
    <div>...</div>
    <div>...<LogoutButton />...</div>
  </header>
  <Dashboard />
</main>
```

Replace with:
```tsx
// src/app/dashboard/page.tsx
import { requireSessionPage } from "@/lib/auth/requireSession";
import { prisma } from "@/lib/db";
import { AppShell } from "@/components/AppShell";
import { Dashboard } from "@/components/Dashboard";

export default async function DashboardPage() {
  const user = await requireSessionPage();
  const merchant = await prisma.merchant.findFirst({
    where: { id: user.merchantId },
    select: { name: true },
  });

  return (
    <AppShell merchantName={merchant?.name ?? undefined}>
      <div className="px-8 py-8 max-w-6xl">
        <header className="mb-8">
          <h1 className="text-xl font-semibold text-ink">Dashboard</h1>
          <p className="text-sm text-muted mt-0.5">{merchant?.name ?? "Your store"}</p>
        </header>
        <Dashboard />
      </div>
    </AppShell>
  );
}
```

- [ ] **Step 4: Modify `src/app/product/[id]/page.tsx`**

The product page is already a `"use client"` component. Wrap the entire return in `<AppShell>` and remove the `← Back to dashboard` Link (the sidebar now handles navigation context). Keep the inner `<main>` for content layout.

Find this in the `return` of the successful load branch (around line 183):
```tsx
// Remove this line:
<Link className="text-sm text-muted hover:text-accent" href="/dashboard">
  ← Back to dashboard
</Link>
```

And wrap the outer `<main>` with AppShell:
```tsx
import { AppShell } from "@/components/AppShell";

// In the failed-load return:
return (
  <AppShell>
    <main className="mx-auto max-w-3xl px-6 py-10">
      {/* ... error content unchanged ... */}
    </main>
  </AppShell>
);

// In the loading return:
return (
  <AppShell>
    <main className="mx-auto max-w-3xl px-6 py-10 text-sm text-muted">Loading…</main>
  </AppShell>
);

// In the successful load return:
return (
  <AppShell>
    <main className="mx-auto max-w-3xl space-y-8 px-6 py-10">
      {/* remove the Back link, keep everything else */}
      <header>...</header>
      <SalesHistoryUpload ... />
      ...
    </main>
  </AppShell>
);
```

- [ ] **Step 5: Modify `src/app/settings/page.tsx`**

Read the file, then wrap its outermost element with `<AppShell>`, removing any standalone logout button or back-to-dashboard link.

- [ ] **Step 6: Verify visually**

Start the dev server (`npm run dev`), log in, and confirm:
- Sidebar shows on dashboard, product page, and settings
- "Dashboard" item highlights on `/dashboard` and when navigating to a product
- "Settings" item highlights on `/settings`
- Logout in sidebar works (redirects to `/login`)

---

### Task 2: Dashboard Tabs + Top Opportunities Panel

**Goal:** Split the dashboard into Overview and Products tabs; the Overview tab shows portfolio stats + a two-column layout with the trend chart (Task 3 placeholder) and a ranked "Top Opportunities" panel.

**Files:**
- Modify: `src/components/Dashboard.tsx`

**Acceptance Criteria:**
- [ ] Two tabs render: "Overview" and "Products"
- [ ] Overview tab shows `<PortfolioStats />` and a two-column grid below it: left column is a chart placeholder (wired up in Task 3), right column is the Top Opportunities panel
- [ ] Top Opportunities panel lists products with `raise` or `lower` recommendations, sorted by `expectedProfitLiftPct` descending, showing product name, action badge, suggested price, and expected lift
- [ ] Products tab shows the existing `<ProductsTable />` and `<ProductUpload />` components unchanged
- [ ] Clicking a row in Top Opportunities navigates to `/product/[id]`
- [ ] "Export CSV" button renders in the page header (wired to the API added in Task 5 — render the button as disabled/placeholder for now, mark with `data-testid="export-btn"`)

**Verify:** Load `/dashboard`, switch between tabs — both render correct content without errors in the console.

**Steps:**

- [ ] **Step 1: Read `src/components/Dashboard.tsx` to understand current state**

Current shape (from exploration):
```tsx
"use client";
// imports...
export function Dashboard() {
  const [refreshToken, setRefreshToken] = useState(0);
  return (
    <>
      <PortfolioStats refreshToken={refreshToken} />
      <ProductUpload onSuccess={() => setRefreshToken(t => t + 1)} />
      <ProductsTable refreshToken={refreshToken} />
    </>
  );
}
```

- [ ] **Step 2: Rewrite `Dashboard.tsx` with tabs and opportunity panel**

```tsx
// src/components/Dashboard.tsx
"use client";
import { useState } from "react";
import Link from "next/link";
import { PortfolioStats } from "./PortfolioStats";
import { ProductsTable } from "./ProductsTable";
import { ProductUpload } from "./ProductUpload";
import { formatCents } from "@/lib/money";

type Tab = "overview" | "products";

interface OpportunityRow {
  id: string;
  title: string;
  sku: string;
  recommendedAction: "raise" | "lower" | null;
  suggestedPrice: number | null;
  currentPrice: number;
}

function TopOpportunities({ rows }: { rows: OpportunityRow[] }) {
  const actionable = rows
    .filter((r) => r.recommendedAction === "raise" || r.recommendedAction === "lower")
    .sort((a, b) => {
      // sort raise first, then lower; within each group by price delta magnitude
      if (a.recommendedAction !== b.recommendedAction) {
        return a.recommendedAction === "raise" ? -1 : 1;
      }
      const deltaA = Math.abs((a.suggestedPrice ?? a.currentPrice) - a.currentPrice);
      const deltaB = Math.abs((b.suggestedPrice ?? b.currentPrice) - b.currentPrice);
      return deltaB - deltaA;
    })
    .slice(0, 8);

  if (!actionable.length) {
    return (
      <div className="rounded-xl border border-line bg-surface p-5 flex items-center justify-center h-40">
        <p className="text-sm text-muted">No actionable recommendations yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-line bg-surface overflow-hidden">
      <div className="px-5 py-4 border-b border-line">
        <h2 className="text-sm font-semibold text-ink">Top Opportunities</h2>
        <p className="text-xs text-muted mt-0.5">Products with active recommendations</p>
      </div>
      <div className="divide-y divide-line">
        {actionable.map((r, i) => (
          <Link
            key={r.id}
            href={`/product/${r.id}`}
            className="flex items-center gap-3 px-5 py-3 hover:bg-panel transition-colors"
          >
            <span className="text-xs tabular text-faint w-4">{i + 1}.</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-ink truncate">{r.title}</p>
              <p className="text-xs text-faint">{r.sku}</p>
            </div>
            <div className="text-right shrink-0">
              <span
                className={`text-xs font-semibold uppercase tracking-wide ${
                  r.recommendedAction === "raise" ? "text-positive" : "text-warning"
                }`}
              >
                {r.recommendedAction}
              </span>
              {r.suggestedPrice !== null && (
                <p className="text-xs text-muted">{formatCents(r.suggestedPrice)}</p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function Dashboard() {
  const [tab, setTab] = useState<Tab>("overview");
  const [refreshToken, setRefreshToken] = useState(0);
  const [rows, setRows] = useState<OpportunityRow[]>([]);

  // Load product list for opportunities panel (overview tab only)
  useState(() => {
    fetch("/api/products")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: OpportunityRow[]) => setRows(data))
      .catch(() => {});
  });

  function refresh() {
    setRefreshToken((t) => t + 1);
    // Reload opportunities too
    fetch("/api/products")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: OpportunityRow[]) => setRows(data))
      .catch(() => {});
  }

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-6 border-b border-line mb-8">
        {(["overview", "products"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`pb-3 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              tab === t
                ? "border-accent text-ink"
                : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {t === "overview" ? "Overview" : "Products"}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="space-y-6">
          <PortfolioStats refreshToken={refreshToken} />
          {/* Two-column layout: chart left, opportunities right */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Chart placeholder — replaced in Task 3 */}
            <div
              className="rounded-xl border border-line bg-surface p-5 flex items-center justify-center"
              style={{ minHeight: 280 }}
              data-slot="trend-chart"
            >
              <p className="text-sm text-muted">Sales trend chart loading…</p>
            </div>
            <TopOpportunities rows={rows} />
          </div>
        </div>
      )}

      {tab === "products" && (
        <div className="space-y-6">
          <ProductUpload onSuccess={refresh} />
          <ProductsTable refreshToken={refreshToken} />
        </div>
      )}
    </div>
  );
}
```

> **Note:** `useState(() => { ... })` with an initializer that has side effects is not idiomatic — use `useEffect`. Change the opportunity fetch to:
```tsx
useEffect(() => {
  fetch("/api/products")
    .then((r) => (r.ok ? r.json() : []))
    .then((data: OpportunityRow[]) => setRows(data))
    .catch(() => {});
}, [refreshToken]);
```
Add `useEffect` to the imports from `"react"`.

- [ ] **Step 3: Verify tabs**

Log in, go to `/dashboard`. Click "Products" tab — table shows. Click "Overview" — stats + two-column panel shows. No console errors.

---

### Task 3: Portfolio Sales Trend Chart

**Goal:** Add a line chart to the Overview tab showing monthly average price across all products from sales history.

**Files:**
- Create: `src/app/api/products/portfolio/trend/route.ts`
- Create: `src/components/PortfolioTrendChart.tsx`
- Modify: `src/components/Dashboard.tsx` (replace chart placeholder with component)

**Acceptance Criteria:**
- [ ] `GET /api/products/portfolio/trend` returns up to 12 months of `{ month, avgPriceCents, totalUnits }` from `SalesRecord` data
- [ ] Chart renders a smooth line with x-axis month labels and a y-axis showing price
- [ ] "No sales data yet" empty state renders when API returns an empty array
- [ ] Chart shows a "Strong" green dot + label for months with ≥30 data records

**Verify:** After uploading sales history CSV for at least one product, the Overview tab shows a line chart with month labels and a price curve.

**Steps:**

- [ ] **Step 1: Create the trend API route**

```typescript
// src/app/api/products/portfolio/trend/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withErrorHandling } from "@/lib/api/errors";
import { requireSessionApi } from "@/lib/auth/requireSession";

interface MonthBucket {
  month: string; // "YYYY-MM"
  totalPriceCents: number;
  totalUnits: number;
  count: number;
}

export const GET = withErrorHandling(async () => {
  const { merchantId } = await requireSessionApi();

  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - 12);

  const records = await prisma.salesRecord.findMany({
    where: {
      merchantId,
      date: { gte: cutoff },
      promotionFlag: false,
    },
    select: { date: true, priceCents: true, unitsSold: true },
    orderBy: { date: "asc" },
  });

  const buckets = new Map<string, MonthBucket>();

  for (const r of records) {
    const d = new Date(r.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const existing = buckets.get(key) ?? { month: key, totalPriceCents: 0, totalUnits: 0, count: 0 };
    existing.totalPriceCents += r.priceCents;
    existing.totalUnits += r.unitsSold;
    existing.count += 1;
    buckets.set(key, existing);
  }

  const result = Array.from(buckets.values())
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((b) => ({
      month: b.month,
      avgPriceCents: Math.round(b.totalPriceCents / b.count),
      totalUnits: b.totalUnits,
      dataPoints: b.count,
    }));

  return NextResponse.json(result);
});
```

- [ ] **Step 2: Create `PortfolioTrendChart.tsx`**

Pure SVG chart — same approach as `DemandCurve.tsx`. X-axis: months. Y-axis: avg price in dollars.

```tsx
// src/components/PortfolioTrendChart.tsx
"use client";
import { useEffect, useState } from "react";
import { formatCents } from "@/lib/money";

interface TrendPoint {
  month: string; // "YYYY-MM"
  avgPriceCents: number;
  totalUnits: number;
  dataPoints: number;
}

const W = 560;
const H = 220;
const PAD = { top: 20, right: 20, bottom: 36, left: 52 };
const INNER_W = W - PAD.left - PAD.right;
const INNER_H = H - PAD.top - PAD.bottom;

function monthLabel(m: string) {
  const [year, month] = m.split("-");
  const d = new Date(Number(year), Number(month) - 1);
  return d.toLocaleString("default", { month: "short" });
}

export function PortfolioTrendChart() {
  const [data, setData] = useState<TrendPoint[] | null>(null);

  useEffect(() => {
    fetch("/api/products/portfolio/trend")
      .then((r) => (r.ok ? r.json() : []))
      .then((d: TrendPoint[]) => setData(d))
      .catch(() => setData([]));
  }, []);

  if (data === null) {
    return (
      <div className="rounded-xl border border-line bg-surface p-5 flex items-center justify-center" style={{ minHeight: 280 }}>
        <p className="text-sm text-muted">Loading…</p>
      </div>
    );
  }

  if (data.length < 2) {
    return (
      <div className="rounded-xl border border-line bg-surface p-5 flex items-center justify-center" style={{ minHeight: 280 }}>
        <p className="text-sm text-muted">Upload sales history to see price trends.</p>
      </div>
    );
  }

  const prices = data.map((d) => d.avgPriceCents);
  const minP = Math.min(...prices);
  const maxP = Math.max(...prices);
  const priceRange = maxP - minP || 1;

  function xOf(i: number) {
    return PAD.left + (i / (data!.length - 1)) * INNER_W;
  }
  function yOf(priceCents: number) {
    return PAD.top + INNER_H - ((priceCents - minP) / priceRange) * INNER_H;
  }

  const linePath = data
    .map((d, i) => `${i === 0 ? "M" : "L"}${xOf(i).toFixed(1)},${yOf(d.avgPriceCents).toFixed(1)}`)
    .join(" ");

  const fillPath =
    linePath +
    ` L${xOf(data.length - 1).toFixed(1)},${(PAD.top + INNER_H).toFixed(1)}` +
    ` L${xOf(0).toFixed(1)},${(PAD.top + INNER_H).toFixed(1)} Z`;

  // Y-axis tick values (3 ticks)
  const yTicks = [minP, minP + priceRange / 2, maxP];

  // X-axis: show label every N months to avoid crowding
  const step = Math.ceil(data.length / 6);

  return (
    <div className="rounded-xl border border-line bg-surface p-5">
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-ink">Avg Price Trend</h2>
        <p className="text-xs text-muted mt-0.5">Monthly average across all products</p>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ fontFamily: "var(--font-mono, monospace)" }}>
        {/* Y gridlines */}
        {yTicks.map((p) => (
          <g key={p}>
            <line
              x1={PAD.left}
              x2={PAD.left + INNER_W}
              y1={yOf(p)}
              y2={yOf(p)}
              stroke="var(--color-line)"
              strokeWidth="1"
            />
            <text
              x={PAD.left - 6}
              y={yOf(p)}
              textAnchor="end"
              dominantBaseline="middle"
              fontSize="9"
              fill="var(--color-faint)"
            >
              {formatCents(p)}
            </text>
          </g>
        ))}

        {/* Fill under curve */}
        <path d={fillPath} fill="var(--color-accent)" opacity="0.08" />

        {/* Line */}
        <path d={linePath} fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

        {/* Data points */}
        {data.map((d, i) => (
          <circle
            key={d.month}
            cx={xOf(i)}
            cy={yOf(d.avgPriceCents)}
            r="3"
            fill="var(--color-accent)"
          />
        ))}

        {/* X-axis month labels */}
        {data.map((d, i) => {
          if (i % step !== 0 && i !== data!.length - 1) return null;
          return (
            <text
              key={d.month}
              x={xOf(i)}
              y={PAD.top + INNER_H + 18}
              textAnchor="middle"
              fontSize="9"
              fill="var(--color-faint)"
            >
              {monthLabel(d.month)}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
```

- [ ] **Step 3: Wire chart into Dashboard.tsx**

In `Dashboard.tsx`, import the chart and replace the placeholder `<div data-slot="trend-chart">`:

```tsx
import { PortfolioTrendChart } from "./PortfolioTrendChart";

// Replace the placeholder div with:
<PortfolioTrendChart />
```

- [ ] **Step 4: Verify**

Load `/dashboard` Overview tab after uploading a sales CSV. The chart renders a line with month labels along the bottom and price labels on the left.

---

### Task 4: Export CSV

**Goal:** Add a "Export CSV" button to the dashboard header that downloads all products as a CSV file.

**Files:**
- Create: `src/app/api/products/export/route.ts`
- Modify: `src/app/dashboard/page.tsx` (add export button to header)

**Acceptance Criteria:**
- [ ] `GET /api/products/export` returns a valid `text/csv` response with headers: `sku,title,current_price,cogs,margin,recommended_action,suggested_price`
- [ ] Downloading the CSV from the dashboard header button prompts a file save dialog
- [ ] CSV values are unquoted for simple values, quoted when the field contains a comma

**Verify:** Click "Export CSV" on the dashboard → browser downloads `priceiq-products.csv`. Open it — rows match the products on screen.

**Steps:**

- [ ] **Step 1: Create the export route**

```typescript
// src/app/api/products/export/route.ts
import { prisma } from "@/lib/db";
import { withErrorHandling } from "@/lib/api/errors";
import { requireSessionApi } from "@/lib/auth/requireSession";

function csvField(value: string | number | null): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  return s.includes(",") || s.includes('"') || s.includes("\n")
    ? `"${s.replace(/"/g, '""')}"`
    : s;
}

export const GET = withErrorHandling(async () => {
  const { merchantId } = await requireSessionApi();

  const products = await prisma.product.findMany({
    where: { merchantId },
    include: { recommendation: true },
    orderBy: { title: "asc" },
  });

  const headers = ["sku", "title", "current_price", "cogs", "margin_pct", "recommended_action", "suggested_price"];

  const rows = products.map((p) => {
    const priceDollars = (p.currentPrice / 100).toFixed(2);
    const cogsDollars = p.cogs !== null ? (p.cogs / 100).toFixed(2) : "";
    const margin =
      p.cogs !== null && p.currentPrice > 0
        ? (((p.currentPrice - p.cogs) / p.currentPrice) * 100).toFixed(1)
        : "";

    let action = "";
    let suggestedPrice = "";
    if (p.recommendation) {
      action = p.recommendation.action;
      try {
        const rules = JSON.parse(p.recommendation.rulesJson) as { suggestedPriceCents?: number };
        if (rules.suggestedPriceCents) {
          suggestedPrice = (rules.suggestedPriceCents / 100).toFixed(2);
        }
      } catch {
        // ignore malformed rulesJson
      }
    }

    return [p.sku, p.title, priceDollars, cogsDollars, margin, action, suggestedPrice]
      .map(csvField)
      .join(",");
  });

  const csv = [headers.join(","), ...rows].join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="priceiq-products.csv"',
    },
  });
});
```

- [ ] **Step 2: Add Export button to dashboard page header**

In `src/app/dashboard/page.tsx`, modify the header section to add the Export button. The header is currently:

```tsx
<header className="mb-8">
  <h1 className="text-xl font-semibold text-ink">Dashboard</h1>
  <p className="text-sm text-muted mt-0.5">{merchant?.name ?? "Your store"}</p>
</header>
```

Replace with:
```tsx
<header className="mb-8 flex items-start justify-between">
  <div>
    <h1 className="text-xl font-semibold text-ink">Dashboard</h1>
    <p className="text-sm text-muted mt-0.5">{merchant?.name ?? "Your store"}</p>
  </div>
  <a
    href="/api/products/export"
    download="priceiq-products.csv"
    className="btn btn-ghost text-sm flex items-center gap-1.5"
  >
    ↓ Export CSV
  </a>
</header>
```

Using `<a href=... download>` triggers a native browser download — no JS needed.

- [ ] **Step 3: Verify**

Click "Export CSV" on the dashboard. File downloads. Open it — correct columns and data.

---

## Self-Review

### Spec coverage
| Requirement | Task |
|-------------|------|
| Dark sidebar navigation | Task 1 |
| Active state per route | Task 1 |
| Tabbed dashboard | Task 2 |
| Top opportunities leaderboard (side-by-side with chart) | Task 2 |
| Portfolio trend line chart | Task 3 |
| Trend chart API | Task 3 |
| Export button | Task 4 |

### Features deferred (not in plan)
- **Date range filter**: requires storing portfolio snapshots historically; no existing time-series data for margin/action counts. Scope too large for this plan.
- **Period-comparison delta badges** on stat cards (e.g. "+2 actionable vs last week"): same issue — no historical metric snapshots. Would need a new scheduled aggregation job.
- **Competitor leaderboard panel**: competitor data in the DB is limited (only `comparison.compMedian`). Deferred until competitor data model is expanded.

### Placeholder scan
- No TBDs or "similar to" references. All code blocks are complete.

### Type consistency
- `OpportunityRow` defined in Dashboard.tsx matches fields returned by `/api/products` (uses `recommendedAction`, `suggestedPrice` — these are the field names in the existing Row interface in `ProductsTable.tsx`).
- `TrendPoint` in `PortfolioTrendChart.tsx` matches the shape returned by `/api/products/portfolio/trend`.
