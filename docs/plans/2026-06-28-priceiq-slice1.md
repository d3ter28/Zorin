# PriceIQ Slice 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single-merchant, seeded-data pricing dashboard that shows products with margins, compares them to competitors, and produces a plain-English AI pricing recommendation (rules decide, LLM phrases).

**Architecture:** One Next.js (App Router) + TypeScript app. Pure domain logic in `/lib` (margin, comparison, recommendation rules) with no I/O so it is fully unit-testable. Prisma + SQLite for persistence. An AI phrasing layer that takes the rules-engine `Decision` and turns its `reasons` into copy via Claude, with a deterministic fallback so the app never depends on the network. Two views: products table and product detail panel.

**Tech Stack:** Next.js 15 (App Router), TypeScript, Prisma + SQLite, Vitest, Tailwind CSS, `@anthropic-ai/sdk` (model `claude-haiku-4-5`).

---

## File Structure

| Path | Responsibility |
|---|---|
| `prisma/schema.prisma` | Merchant, Product, CompetitorPrice, Recommendation models |
| `prisma/seed.ts` | Seed one merchant, ~8 products, ~3 competitors each |
| `src/lib/money.ts` | Integer-cents helpers (format, percent) |
| `src/lib/margin.ts` | `marginPct(price, cogs)` pure fn |
| `src/lib/comparison.ts` | `compare(price, competitorPrices)` → median/min/max/position |
| `src/lib/recommendation.ts` | `decide(product, competitorPrices)` → `Decision` (rules engine) |
| `src/lib/types.ts` | Shared `Decision`, `Signals`, DTO types |
| `src/lib/ai/phrase.ts` | `phraseRecommendation(decision)` → string (LLM + fallback) |
| `src/lib/ai/fallback.ts` | Deterministic templated phrasing from `reasons` |
| `src/lib/db.ts` | Prisma client singleton |
| `src/app/api/products/route.ts` | `GET` products with computed margin + comparison |
| `src/app/api/products/[id]/cogs/route.ts` | `POST` update COGS, invalidate recommendation |
| `src/app/api/products/[id]/recommendation/route.ts` | `POST` generate/regenerate recommendation |
| `src/app/page.tsx` | Products table view |
| `src/app/product/[id]/page.tsx` | Product detail panel (slider, confidence, recommendation) |
| `src/components/*` | Table, COGS input, what-if slider, recommendation card |

---

## Task 0: Project scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `vitest.config.ts`, `.gitignore`, `.env.example`

- [ ] **Step 1: Scaffold Next.js + TypeScript app**

Run in `C:\Users\pohde\projects\priceiq`:
```bash
npx create-next-app@latest . --typescript --tailwind --app --src-dir --no-eslint --use-npm --yes
```
Expected: app files created under `src/`.

- [ ] **Step 2: Add dev/test deps**

```bash
npm install prisma @prisma/client @anthropic-ai/sdk
npm install -D vitest @vitejs/plugin-react tsx
```

- [ ] **Step 3: Add Vitest config**

Create `vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { environment: "node", include: ["src/**/*.test.ts"] },
});
```

- [ ] **Step 4: Add test + seed scripts to package.json**

In `package.json` `"scripts"` add:
```json
"test": "vitest run",
"test:watch": "vitest",
"seed": "tsx prisma/seed.ts"
```

- [ ] **Step 5: Create `.env.example`**

```
DATABASE_URL="file:./dev.db"
ANTHROPIC_API_KEY=""
```

- [ ] **Step 6: Verify the app builds**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js + TS app with Vitest and Prisma deps"
```

---

## Task 1: Prisma schema + client + migration

**Files:**
- Create: `prisma/schema.prisma`, `src/lib/db.ts`

- [ ] **Step 1: Write the schema**

Create `prisma/schema.prisma`:
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model Merchant {
  id        String    @id @default(cuid())
  name      String
  storeUrl  String
  createdAt DateTime  @default(now())
  products  Product[]
}

model Product {
  id           String            @id @default(cuid())
  merchantId   String
  merchant     Merchant          @relation(fields: [merchantId], references: [id])
  title        String
  sku          String
  currentPrice Int
  cogs         Int?
  category     String
  estUnits     Int?
  createdAt    DateTime          @default(now())
  competitors  CompetitorPrice[]
  recommendation Recommendation?
}

model CompetitorPrice {
  id             String   @id @default(cuid())
  productId      String
  product        Product  @relation(fields: [productId], references: [id])
  competitorName String
  competitorUrl  String?
  price          Int
  observedAt     DateTime @default(now())
}

model Recommendation {
  id          String   @id @default(cuid())
  productId   String   @unique
  product     Product  @relation(fields: [productId], references: [id])
  action      String
  deltaPct    Float
  rulesJson   String
  phrasing    String
  generatedAt DateTime @default(now())
}
```

- [ ] **Step 2: Create the migration**

Run: `npx prisma migrate dev --name init`
Expected: `dev.db` created, migration applied, client generated.

- [ ] **Step 3: Create the Prisma client singleton**

Create `src/lib/db.ts`:
```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

- [ ] **Step 4: Commit**

```bash
git add prisma src/lib/db.ts
git commit -m "feat: add Prisma schema, migration, and client singleton"
```

---

## Task 2: Money helpers (TDD)

**Files:**
- Create: `src/lib/money.ts`, `src/lib/money.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/lib/money.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { formatCents, pct } from "./money";

describe("formatCents", () => {
  it("formats cents as USD", () => {
    expect(formatCents(1999)).toBe("$19.99");
    expect(formatCents(0)).toBe("$0.00");
    expect(formatCents(100000)).toBe("$1,000.00");
  });
});

describe("pct", () => {
  it("formats a ratio as a percent string", () => {
    expect(pct(0.15)).toBe("15.0%");
    expect(pct(-0.084)).toBe("-8.4%");
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- money`
Expected: FAIL — module/exports not found.

- [ ] **Step 3: Implement**

Create `src/lib/money.ts`:
```ts
export function formatCents(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export function pct(ratio: number): string {
  return `${(ratio * 100).toFixed(1)}%`;
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- money`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/money.ts src/lib/money.test.ts
git commit -m "feat: add integer-cents money helpers"
```

---

## Task 3: Margin calculation (TDD)

**Files:**
- Create: `src/lib/margin.ts`, `src/lib/margin.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/lib/margin.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { marginPct } from "./margin";

describe("marginPct", () => {
  it("computes margin as (price - cogs) / price", () => {
    expect(marginPct(10000, 6000)).toBeCloseTo(0.4);
  });
  it("returns null when cogs is null (unknown)", () => {
    expect(marginPct(10000, null)).toBeNull();
  });
  it("returns null when price is 0", () => {
    expect(marginPct(0, 0)).toBeNull();
  });
  it("can be negative when cogs exceeds price", () => {
    expect(marginPct(5000, 6000)).toBeCloseTo(-0.2);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- margin`
Expected: FAIL.

- [ ] **Step 3: Implement**

Create `src/lib/margin.ts`:
```ts
export function marginPct(price: number, cogs: number | null): number | null {
  if (cogs === null || price <= 0) return null;
  return (price - cogs) / price;
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- margin`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/margin.ts src/lib/margin.test.ts
git commit -m "feat: add margin calculation"
```

---

## Task 4: Shared types

**Files:**
- Create: `src/lib/types.ts`

- [ ] **Step 1: Define shared types**

Create `src/lib/types.ts`:
```ts
export type Action = "raise" | "lower" | "hold";

export interface Signals {
  marginPct: number | null;
  compMedian: number | null;
  compMin: number | null;
  compMax: number | null;
  pctVsMedian: number | null;
  marginFloorPrice: number | null;
  competitorCount: number;
  oldestObservedAt: string | null;
}

export interface Decision {
  action: Action;
  deltaPct: number;       // signed
  suggestedPrice: number; // cents
  reasons: string[];
  signals: Signals;
}

export interface CompetitorObservation {
  price: number;        // cents
  observedAt: string;   // ISO
}

export interface ProductInput {
  currentPrice: number; // cents
  cogs: number | null;  // cents
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: add shared Decision/Signals types"
```

---

## Task 5: Comparison logic (TDD)

**Files:**
- Create: `src/lib/comparison.ts`, `src/lib/comparison.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/lib/comparison.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { compare } from "./comparison";

const obs = (price: number) => ({ price, observedAt: "2026-06-28T00:00:00.000Z" });

describe("compare", () => {
  it("returns nulls when there are no competitors", () => {
    const r = compare(10000, []);
    expect(r.compMedian).toBeNull();
    expect(r.competitorCount).toBe(0);
    expect(r.pctVsMedian).toBeNull();
  });

  it("computes median for odd count", () => {
    const r = compare(10000, [obs(8000), obs(9000), obs(11000)]);
    expect(r.compMedian).toBe(9000);
    expect(r.compMin).toBe(8000);
    expect(r.compMax).toBe(11000);
    expect(r.competitorCount).toBe(3);
  });

  it("computes median for even count as average of middle two", () => {
    const r = compare(10000, [obs(8000), obs(10000)]);
    expect(r.compMedian).toBe(9000);
  });

  it("computes pctVsMedian relative to median", () => {
    const r = compare(11000, [obs(10000)]);
    expect(r.pctVsMedian).toBeCloseTo(0.1);
  });

  it("tracks the oldest observation", () => {
    const r = compare(10000, [
      { price: 9000, observedAt: "2026-06-01T00:00:00.000Z" },
      { price: 9500, observedAt: "2026-06-20T00:00:00.000Z" },
    ]);
    expect(r.oldestObservedAt).toBe("2026-06-01T00:00:00.000Z");
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- comparison`
Expected: FAIL.

- [ ] **Step 3: Implement**

Create `src/lib/comparison.ts`:
```ts
import type { CompetitorObservation } from "./types";

export interface ComparisonResult {
  compMedian: number | null;
  compMin: number | null;
  compMax: number | null;
  pctVsMedian: number | null;
  competitorCount: number;
  oldestObservedAt: string | null;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid];
}

export function compare(
  price: number,
  competitors: CompetitorObservation[],
): ComparisonResult {
  if (competitors.length === 0) {
    return {
      compMedian: null,
      compMin: null,
      compMax: null,
      pctVsMedian: null,
      competitorCount: 0,
      oldestObservedAt: null,
    };
  }
  const prices = competitors.map((c) => c.price);
  const med = median(prices);
  const oldest = competitors
    .map((c) => c.observedAt)
    .sort()[0];
  return {
    compMedian: med,
    compMin: Math.min(...prices),
    compMax: Math.max(...prices),
    pctVsMedian: med === 0 ? null : (price - med) / med,
    competitorCount: competitors.length,
    oldestObservedAt: oldest,
  };
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- comparison`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/comparison.ts src/lib/comparison.test.ts
git commit -m "feat: add competitor comparison logic"
```

---

## Task 6: Recommendation rules engine (TDD)

**Files:**
- Create: `src/lib/recommendation.ts`, `src/lib/recommendation.test.ts`

Rule order (first match wins), margin floor checked FIRST: (1) no competitors → hold; (2) margin known and below 15% floor → raise to floor price; (3) >10% above median with healthy margin → lower toward median, never below floor; (4) >10% below median with margin headroom → raise toward median; (5) within ±10% → hold.

- [ ] **Step 1: Write failing tests**

Create `src/lib/recommendation.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { decide, MIN_MARGIN_FLOOR } from "./recommendation";

const obs = (price: number) => ({ price, observedAt: "2026-06-28T00:00:00.000Z" });

describe("decide", () => {
  it("holds when there are no competitors", () => {
    const d = decide({ currentPrice: 10000, cogs: 5000 }, []);
    expect(d.action).toBe("hold");
    expect(d.reasons.join(" ")).toMatch(/competitor data/i);
  });

  it("raises to the margin floor when margin is below floor (overrides position)", () => {
    // cogs 9500 on price 10000 => 5% margin, below 15% floor.
    // Competitors low so position alone would say 'lower'.
    const d = decide({ currentPrice: 10000, cogs: 9500 }, [obs(8000)]);
    expect(d.action).toBe("raise");
    // floor price so that (p - 9500)/p = 0.15 => p = 9500 / 0.85 = 11176 (rounded)
    expect(d.suggestedPrice).toBe(Math.round(9500 / (1 - MIN_MARGIN_FLOOR)));
    expect(d.reasons.join(" ")).toMatch(/margin floor/i);
  });

  it("lowers toward median when priced >10% above with healthy margin", () => {
    // price 12000, median 10000 => +20%. cogs 5000 => 58% margin, healthy.
    const d = decide({ currentPrice: 12000, cogs: 5000 }, [obs(10000), obs(10000)]);
    expect(d.action).toBe("lower");
    expect(d.suggestedPrice).toBe(10000);
    expect(d.suggestedPrice).toBeGreaterThanOrEqual(
      Math.round(5000 / (1 - MIN_MARGIN_FLOOR)),
    );
  });

  it("does not lower below the margin floor price", () => {
    // price 12000, median 6000 (+100%), cogs 5500.
    // floor price = 5500/0.85 = 6471 > median, so clamp to floor.
    const d = decide({ currentPrice: 12000, cogs: 5500 }, [obs(6000), obs(6000)]);
    expect(d.action).toBe("lower");
    expect(d.suggestedPrice).toBe(Math.round(5500 / (1 - MIN_MARGIN_FLOOR)));
  });

  it("raises toward median when priced >10% below with headroom", () => {
    // price 8000, median 10000 (-20%), cogs 4000 => 50% margin.
    const d = decide({ currentPrice: 8000, cogs: 4000 }, [obs(10000), obs(10000)]);
    expect(d.action).toBe("raise");
    expect(d.suggestedPrice).toBe(10000);
  });

  it("holds when within ±10% of median", () => {
    const d = decide({ currentPrice: 10000, cogs: 5000 }, [obs(9800), obs(10200)]);
    expect(d.action).toBe("hold");
    expect(d.reasons.join(" ")).toMatch(/competitively positioned/i);
  });

  it("handles unknown cogs by advising on position only", () => {
    const d = decide({ currentPrice: 12000, cogs: null }, [obs(10000), obs(10000)]);
    expect(d.action).toBe("lower");
    expect(d.signals.marginPct).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- recommendation`
Expected: FAIL.

- [ ] **Step 3: Implement**

Create `src/lib/recommendation.ts`:
```ts
import { compare } from "./comparison";
import { marginPct } from "./margin";
import type {
  CompetitorObservation,
  Decision,
  ProductInput,
  Signals,
} from "./types";

export const MIN_MARGIN_FLOOR = 0.15;
const POSITION_BAND = 0.1; // ±10% of median is "at market"

function floorPrice(cogs: number): number {
  return Math.round(cogs / (1 - MIN_MARGIN_FLOOR));
}

function deltaPct(from: number, to: number): number {
  return (to - from) / from;
}

export function decide(
  product: ProductInput,
  competitors: CompetitorObservation[],
): Decision {
  const cmp = compare(product.currentPrice, competitors);
  const margin = marginPct(product.currentPrice, product.cogs);
  const fp = product.cogs !== null ? floorPrice(product.cogs) : null;

  const signals: Signals = {
    marginPct: margin,
    compMedian: cmp.compMedian,
    compMin: cmp.compMin,
    compMax: cmp.compMax,
    pctVsMedian: cmp.pctVsMedian,
    marginFloorPrice: fp,
    competitorCount: cmp.competitorCount,
    oldestObservedAt: cmp.oldestObservedAt,
  };

  const hold = (reason: string): Decision => ({
    action: "hold",
    deltaPct: 0,
    suggestedPrice: product.currentPrice,
    reasons: [reason],
    signals,
  });

  // Rule 1: no competitor data
  if (cmp.competitorCount === 0) {
    return hold("Not enough competitor data to make a recommendation.");
  }

  // Rule 2: margin below floor (overrides position)
  if (margin !== null && fp !== null && margin < MIN_MARGIN_FLOOR) {
    return {
      action: "raise",
      deltaPct: deltaPct(product.currentPrice, fp),
      suggestedPrice: fp,
      reasons: [
        `Your current price is below your ${Math.round(
          MIN_MARGIN_FLOOR * 100,
        )}% margin floor.`,
        `Raising to the floor price protects profitability.`,
      ],
      signals,
    };
  }

  const median = cmp.compMedian!;
  const pos = cmp.pctVsMedian!;

  // Rule 3: priced >10% above median with healthy margin -> lower toward median
  if (pos > POSITION_BAND) {
    const target = fp !== null ? Math.max(median, fp) : median;
    const clamped = target >= product.currentPrice ? product.currentPrice : target;
    if (clamped < product.currentPrice) {
      const reasons = [
        `You're ${Math.round(pos * 100)}% above the competitor median.`,
      ];
      if (fp !== null && target === fp) {
        reasons.push(`Lowering stops at your margin floor price to protect margin.`);
      } else if (margin !== null) {
        reasons.push(
          `Lowering toward the median still leaves a ${Math.round(
            ((clamped - (product.cogs ?? 0)) / clamped) * 100,
          )}% margin.`,
        );
      }
      return {
        action: "lower",
        deltaPct: deltaPct(product.currentPrice, clamped),
        suggestedPrice: clamped,
        reasons,
        signals,
      };
    }
    return hold("You're competitively positioned given your margin floor.");
  }

  // Rule 4: priced >10% below median with headroom -> raise toward median
  if (pos < -POSITION_BAND) {
    return {
      action: "raise",
      deltaPct: deltaPct(product.currentPrice, median),
      suggestedPrice: median,
      reasons: [
        `You're ${Math.round(Math.abs(pos) * 100)}% below the competitor median.`,
        `Raising toward the median captures margin you're leaving on the table.`,
      ],
      signals,
    };
  }

  // Rule 5: within band -> hold
  return hold("You're competitively positioned near the market median.");
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- recommendation`
Expected: PASS (all 7 cases).

- [ ] **Step 5: Commit**

```bash
git add src/lib/recommendation.ts src/lib/recommendation.test.ts
git commit -m "feat: add margin-aware recommendation rules engine"
```

---

## Task 7: AI phrasing layer + fallback (TDD)

**Files:**
- Create: `src/lib/ai/fallback.ts`, `src/lib/ai/fallback.test.ts`, `src/lib/ai/phrase.ts`, `src/lib/ai/phrase.test.ts`

- [ ] **Step 1: Write failing fallback test**

Create `src/lib/ai/fallback.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { fallbackPhrasing } from "./fallback";
import type { Decision } from "../types";

const decision: Decision = {
  action: "lower",
  deltaPct: -0.1,
  suggestedPrice: 9000,
  reasons: ["You're 20% above the competitor median.", "Margin stays healthy."],
  signals: {
    marginPct: 0.4, compMedian: 9000, compMin: 8000, compMax: 11000,
    pctVsMedian: 0.2, marginFloorPrice: 6000, competitorCount: 3,
    oldestObservedAt: "2026-06-28T00:00:00.000Z",
  },
};

describe("fallbackPhrasing", () => {
  it("renders the action and joins reasons", () => {
    const text = fallbackPhrasing(decision);
    expect(text).toMatch(/lower/i);
    expect(text).toContain("competitor median");
  });
  it("uses no numbers absent from the decision reasons", () => {
    const text = fallbackPhrasing(decision);
    // 50 never appears anywhere in the decision
    expect(text).not.toContain("50");
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- fallback`
Expected: FAIL.

- [ ] **Step 3: Implement fallback**

Create `src/lib/ai/fallback.ts`:
```ts
import type { Decision } from "../types";

const VERB: Record<Decision["action"], string> = {
  raise: "Consider raising this price.",
  lower: "Consider lowering this price.",
  hold: "Hold this price for now.",
};

export function fallbackPhrasing(decision: Decision): string {
  return `${VERB[decision.action]} ${decision.reasons.join(" ")}`.trim();
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- fallback`
Expected: PASS.

- [ ] **Step 5: Write failing phrase test (no API key → fallback)**

Create `src/lib/ai/phrase.test.ts`:
```ts
import { describe, expect, it, beforeEach } from "vitest";
import { phraseRecommendation } from "./phrase";
import type { Decision } from "../types";

const decision: Decision = {
  action: "hold",
  deltaPct: 0,
  suggestedPrice: 10000,
  reasons: ["You're competitively positioned near the market median."],
  signals: {
    marginPct: 0.4, compMedian: 10000, compMin: 9000, compMax: 11000,
    pctVsMedian: 0, marginFloorPrice: 6000, competitorCount: 3,
    oldestObservedAt: "2026-06-28T00:00:00.000Z",
  },
};

describe("phraseRecommendation", () => {
  beforeEach(() => {
    delete process.env.ANTHROPIC_API_KEY;
  });

  it("falls back to deterministic phrasing when no API key is set", async () => {
    const text = await phraseRecommendation(decision);
    expect(text).toMatch(/hold/i);
    expect(text).toContain("competitively positioned");
  });
});
```

- [ ] **Step 6: Run to verify failure**

Run: `npm test -- phrase`
Expected: FAIL.

- [ ] **Step 7: Implement phrase layer**

Create `src/lib/ai/phrase.ts`:
```ts
import Anthropic from "@anthropic-ai/sdk";
import type { Decision } from "../types";
import { fallbackPhrasing } from "./fallback";

const SYSTEM = `You are a pricing copywriter for an ecommerce tool.
You will be given a structured pricing decision with an action and a list of
plain-language reasons. Write 1-2 friendly, plain-English sentences advising the
merchant. RULES: Do not introduce any numbers, prices, or percentages that are not
already present in the reasons. Do not contradict the action. Do not invent facts.`;

export async function phraseRecommendation(decision: Decision): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return fallbackPhrasing(decision);

  try {
    const client = new Anthropic({ apiKey: key });
    const msg = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 200,
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: `Action: ${decision.action}\nReasons:\n- ${decision.reasons.join(
            "\n- ",
          )}`,
        },
      ],
    });
    const block = msg.content.find((b) => b.type === "text");
    return block && "text" in block ? block.text.trim() : fallbackPhrasing(decision);
  } catch {
    return fallbackPhrasing(decision);
  }
}
```

- [ ] **Step 8: Run to verify pass**

Run: `npm test -- phrase`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/lib/ai
git commit -m "feat: add AI phrasing layer with deterministic fallback"
```

---

## Task 8: Seed script

**Files:**
- Create: `prisma/seed.ts`

- [ ] **Step 1: Write the seed**

Create `prisma/seed.ts`:
```ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PRODUCTS = [
  { title: "Organic Cotton Tee", sku: "TEE-001", currentPrice: 3200, cogs: 1200, category: "Apparel", estUnits: 120, comps: [2800, 3000, 3100] },
  { title: "Merino Wool Beanie", sku: "BEAN-002", currentPrice: 2800, cogs: 2600, category: "Apparel", estUnits: 60, comps: [2400, 2500] },
  { title: "Stainless Water Bottle", sku: "BOT-003", currentPrice: 1800, cogs: 700, category: "Drinkware", estUnits: 200, comps: [2200, 2400, 2300] },
  { title: "Canvas Tote Bag", sku: "TOTE-004", currentPrice: 2500, cogs: 900, category: "Bags", estUnits: 90, comps: [2450, 2550, 2500] },
  { title: "Bamboo Toothbrush 4pk", sku: "BRUSH-005", currentPrice: 1200, cogs: 400, category: "Home", estUnits: 300, comps: [1500, 1600] },
  { title: "Soy Wax Candle", sku: "CAND-006", currentPrice: 2200, cogs: 800, category: "Home", estUnits: 150, comps: [2100, 2300, 2200] },
  { title: "Leather Card Wallet", sku: "WALL-007", currentPrice: 4500, cogs: 1500, category: "Accessories", estUnits: 70, comps: [3800, 4000, 4200] },
  { title: "Ceramic Mug", sku: "MUG-008", currentPrice: 1600, cogs: 1450, category: "Drinkware", estUnits: 180, comps: [1400, 1500] },
];

const COMP_NAMES = ["RivalShop", "MarketCo", "PriceLeader"];

async function main() {
  await prisma.recommendation.deleteMany();
  await prisma.competitorPrice.deleteMany();
  await prisma.product.deleteMany();
  await prisma.merchant.deleteMany();

  const merchant = await prisma.merchant.create({
    data: { name: "Demo Store", storeUrl: "https://demo-store.example.com" },
  });

  for (const p of PRODUCTS) {
    await prisma.product.create({
      data: {
        merchantId: merchant.id,
        title: p.title,
        sku: p.sku,
        currentPrice: p.currentPrice,
        cogs: p.cogs,
        category: p.category,
        estUnits: p.estUnits,
        competitors: {
          create: p.comps.map((price, i) => ({
            competitorName: COMP_NAMES[i % COMP_NAMES.length],
            price,
          })),
        },
      },
    });
  }
  console.log(`Seeded merchant ${merchant.id} with ${PRODUCTS.length} products.`);
}

main().finally(() => prisma.$disconnect());
```

- [ ] **Step 2: Run the seed**

Run: `npm run seed`
Expected: "Seeded merchant ... with 8 products."

- [ ] **Step 3: Commit**

```bash
git add prisma/seed.ts
git commit -m "feat: add seed script with demo merchant and products"
```

---

## Task 9: API routes

**Files:**
- Create: `src/app/api/products/route.ts`, `src/app/api/products/[id]/cogs/route.ts`, `src/app/api/products/[id]/recommendation/route.ts`

- [ ] **Step 1: Implement GET /api/products**

Create `src/app/api/products/route.ts`:
```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { marginPct } from "@/lib/margin";
import { compare } from "@/lib/comparison";

export async function GET() {
  const products = await prisma.product.findMany({
    include: { competitors: true, recommendation: true },
    orderBy: { title: "asc" },
  });

  const rows = products.map((p) => {
    const obs = p.competitors.map((c) => ({
      price: c.price,
      observedAt: c.observedAt.toISOString(),
    }));
    return {
      id: p.id,
      title: p.title,
      sku: p.sku,
      currentPrice: p.currentPrice,
      cogs: p.cogs,
      category: p.category,
      estUnits: p.estUnits,
      margin: marginPct(p.currentPrice, p.cogs),
      comparison: compare(p.currentPrice, obs),
      recommendationAction: p.recommendation?.action ?? null,
    };
  });

  return NextResponse.json(rows);
}
```

- [ ] **Step 2: Implement POST cogs (invalidates recommendation)**

Create `src/app/api/products/[id]/cogs/route.ts`:
```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json();
  const cogs: number | null =
    body.cogs === null || body.cogs === "" ? null : Number(body.cogs);

  if (cogs !== null && (!Number.isFinite(cogs) || cogs < 0)) {
    return NextResponse.json({ error: "Invalid cogs" }, { status: 400 });
  }

  await prisma.product.update({ where: { id }, data: { cogs } });
  // Invalidate cached recommendation.
  await prisma.recommendation.deleteMany({ where: { productId: id } });

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Implement POST recommendation (generate/regenerate)**

Create `src/app/api/products/[id]/recommendation/route.ts`:
```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { decide } from "@/lib/recommendation";
import { phraseRecommendation } from "@/lib/ai/phrase";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id },
    include: { competitors: true },
  });
  if (!product) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const obs = product.competitors.map((c) => ({
    price: c.price,
    observedAt: c.observedAt.toISOString(),
  }));
  const decision = decide(
    { currentPrice: product.currentPrice, cogs: product.cogs },
    obs,
  );
  const phrasing = await phraseRecommendation(decision);

  const saved = await prisma.recommendation.upsert({
    where: { productId: id },
    create: {
      productId: id,
      action: decision.action,
      deltaPct: decision.deltaPct,
      rulesJson: JSON.stringify(decision),
      phrasing,
    },
    update: {
      action: decision.action,
      deltaPct: decision.deltaPct,
      rulesJson: JSON.stringify(decision),
      phrasing,
      generatedAt: new Date(),
    },
  });

  return NextResponse.json({ decision, phrasing, generatedAt: saved.generatedAt });
}
```

- [ ] **Step 4: Verify the app builds**

Run: `npm run build`
Expected: build succeeds with all three routes.

- [ ] **Step 5: Commit**

```bash
git add src/app/api
git commit -m "feat: add products, cogs, and recommendation API routes"
```

---

## Task 10: Products table view

**Files:**
- Create: `src/app/page.tsx`, `src/components/ProductsTable.tsx`, `src/components/CogsInput.tsx`

- [ ] **Step 1: Implement the COGS input component**

Create `src/components/CogsInput.tsx`:
```tsx
"use client";
import { useState } from "react";

export function CogsInput({
  productId,
  initialCents,
  onSaved,
}: {
  productId: string;
  initialCents: number | null;
  onSaved: () => void;
}) {
  const [value, setValue] = useState(
    initialCents === null ? "" : (initialCents / 100).toFixed(2),
  );
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const cents = value === "" ? null : Math.round(Number(value) * 100);
    await fetch(`/api/products/${productId}/cogs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cogs: cents }),
    });
    setSaving(false);
    onSaved();
  }

  return (
    <input
      className="w-20 rounded border px-2 py-1 text-right"
      value={value}
      placeholder="—"
      disabled={saving}
      onChange={(e) => setValue(e.target.value)}
      onBlur={save}
    />
  );
}
```

- [ ] **Step 2: Implement the table component**

Create `src/components/ProductsTable.tsx`:
```tsx
"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CogsInput } from "./CogsInput";
import { formatCents, pct } from "@/lib/money";

interface Row {
  id: string;
  title: string;
  sku: string;
  currentPrice: number;
  cogs: number | null;
  category: string;
  estUnits: number | null;
  margin: number | null;
  comparison: {
    compMedian: number | null;
    pctVsMedian: number | null;
    competitorCount: number;
  };
  recommendationAction: string | null;
}

const FLOOR = 0.15;

function positionBadge(pctVsMedian: number | null): string {
  if (pctVsMedian === null) return "—";
  if (pctVsMedian > 0.1) return "Above market";
  if (pctVsMedian < -0.1) return "Below market";
  return "At market";
}

export function ProductsTable() {
  const [rows, setRows] = useState<Row[]>([]);

  const load = useCallback(async () => {
    const res = await fetch("/api/products");
    setRows(await res.json());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <table className="w-full text-sm">
      <thead className="text-left text-gray-500">
        <tr>
          <th className="py-2">Product</th>
          <th>Price</th>
          <th>COGS</th>
          <th>Margin</th>
          <th>Comp. median</th>
          <th>Position</th>
          <th>Opportunity</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const belowFloor = r.margin !== null && r.margin < FLOOR;
          const opp =
            r.estUnits !== null && r.comparison.compMedian !== null
              ? (r.comparison.compMedian - r.currentPrice) * r.estUnits
              : null;
          return (
            <tr key={r.id} className="border-t">
              <td className="py-2">
                <Link className="font-medium underline" href={`/product/${r.id}`}>
                  {r.title}
                </Link>
                <div className="text-xs text-gray-400">{r.sku}</div>
              </td>
              <td>{formatCents(r.currentPrice)}</td>
              <td>
                <CogsInput
                  productId={r.id}
                  initialCents={r.cogs}
                  onSaved={load}
                />
              </td>
              <td className={belowFloor ? "font-semibold text-red-600" : ""}>
                {r.margin === null ? "—" : pct(r.margin)}
                {belowFloor ? " ⚠" : ""}
              </td>
              <td>
                {r.comparison.compMedian === null
                  ? "—"
                  : formatCents(r.comparison.compMedian)}
              </td>
              <td>{positionBadge(r.comparison.pctVsMedian)}</td>
              <td>{opp === null ? "—" : formatCents(opp)}</td>
              <td>{r.recommendationAction ?? ""}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
```

- [ ] **Step 3: Implement the page**

Replace `src/app/page.tsx`:
```tsx
import { ProductsTable } from "@/components/ProductsTable";

export default function Home() {
  return (
    <main className="mx-auto max-w-5xl p-8">
      <h1 className="mb-6 text-2xl font-bold">PriceIQ — Demo Store</h1>
      <ProductsTable />
    </main>
  );
}
```

- [ ] **Step 4: Verify it renders**

Run: `npm run dev` then open `http://localhost:3000`.
Expected: table of 8 seeded products with editable COGS, margins, positions, opportunity. Editing a COGS and blurring updates the margin.

- [ ] **Step 5: Commit**

```bash
git add src/app/page.tsx src/components/ProductsTable.tsx src/components/CogsInput.tsx
git commit -m "feat: add products table view"
```

---

## Task 11: Product detail view (slider, confidence, recommendation)

**Files:**
- Create: `src/app/product/[id]/page.tsx`, `src/components/WhatIfSlider.tsx`, `src/components/RecommendationCard.tsx`
- Create: `src/app/api/products/[id]/route.ts` (single product fetch)

- [ ] **Step 1: Add single-product GET route**

Create `src/app/api/products/[id]/route.ts`:
```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const p = await prisma.product.findUnique({
    where: { id },
    include: { competitors: true },
  });
  if (!p) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    id: p.id,
    title: p.title,
    currentPrice: p.currentPrice,
    cogs: p.cogs,
    competitors: p.competitors.map((c) => ({
      name: c.competitorName,
      price: c.price,
      observedAt: c.observedAt.toISOString(),
    })),
  });
}
```

- [ ] **Step 2: Implement the what-if slider**

Create `src/components/WhatIfSlider.tsx`:
```tsx
"use client";
import { useState } from "react";
import { formatCents, pct } from "@/lib/money";
import { marginPct } from "@/lib/margin";

export function WhatIfSlider({
  currentPrice,
  cogs,
  compMedian,
}: {
  currentPrice: number;
  cogs: number | null;
  compMedian: number | null;
}) {
  const min = Math.round(currentPrice * 0.5);
  const max = Math.round(currentPrice * 1.5);
  const [price, setPrice] = useState(currentPrice);

  const margin = marginPct(price, cogs);
  const vsMedian =
    compMedian && compMedian > 0 ? (price - compMedian) / compMedian : null;

  return (
    <div className="rounded border p-4">
      <div className="mb-2 font-medium">What-if price: {formatCents(price)}</div>
      <input
        type="range"
        min={min}
        max={max}
        step={50}
        value={price}
        className="w-full"
        onChange={(e) => setPrice(Number(e.target.value))}
      />
      <div className="mt-2 text-sm text-gray-600">
        Margin: {margin === null ? "—" : pct(margin)} · vs median:{" "}
        {vsMedian === null ? "—" : pct(vsMedian)}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Implement the recommendation card**

Create `src/components/RecommendationCard.tsx`:
```tsx
"use client";
import { useCallback, useEffect, useState } from "react";

interface RecResponse {
  decision: {
    action: string;
    suggestedPrice: number;
    signals: { competitorCount: number; oldestObservedAt: string | null };
  };
  phrasing: string;
}

export function RecommendationCard({ productId }: { productId: string }) {
  const [data, setData] = useState<RecResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const generate = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/products/${productId}/recommendation`, {
      method: "POST",
    });
    setData(await res.json());
    setLoading(false);
  }, [productId]);

  useEffect(() => {
    generate();
  }, [generate]);

  if (loading && !data) return <div className="rounded border p-4">Analyzing…</div>;
  if (!data) return null;

  const freshness =
    data.decision.signals.competitorCount > 0
      ? `Based on ${data.decision.signals.competitorCount} competitor${
          data.decision.signals.competitorCount === 1 ? "" : "s"
        }`
      : "No competitor data";

  return (
    <div className="rounded border p-4">
      <div className="mb-1 text-xs uppercase text-gray-400">
        Recommendation · {data.decision.action}
      </div>
      <p className="mb-2">{data.phrasing}</p>
      <div className="text-xs text-gray-500">{freshness}</div>
      <button
        className="mt-3 rounded bg-black px-3 py-1 text-sm text-white"
        disabled={loading}
        onClick={generate}
      >
        {loading ? "Regenerating…" : "Regenerate"}
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Implement the detail page**

Create `src/app/product/[id]/page.tsx`:
```tsx
"use client";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import { WhatIfSlider } from "@/components/WhatIfSlider";
import { RecommendationCard } from "@/components/RecommendationCard";
import { formatCents } from "@/lib/money";

interface Detail {
  id: string;
  title: string;
  currentPrice: number;
  cogs: number | null;
  competitors: { name: string; price: number; observedAt: string }[];
}

export default function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [d, setD] = useState<Detail | null>(null);

  useEffect(() => {
    fetch(`/api/products/${id}`).then((r) => r.json()).then(setD);
  }, [id]);

  if (!d) return <main className="p-8">Loading…</main>;

  const median =
    d.competitors.length === 0
      ? null
      : [...d.competitors].map((c) => c.price).sort((a, b) => a - b)[
          Math.floor(d.competitors.length / 2)
        ];

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-8">
      <Link className="text-sm underline" href="/">
        ← Back
      </Link>
      <h1 className="text-2xl font-bold">{d.title}</h1>
      <div>Current price: {formatCents(d.currentPrice)}</div>

      <section>
        <h2 className="mb-2 font-medium">Competitors</h2>
        <ul className="space-y-1 text-sm">
          {d.competitors.map((c, i) => (
            <li key={i} className="flex justify-between border-b py-1">
              <span>{c.name}</span>
              <span>{formatCents(c.price)}</span>
            </li>
          ))}
        </ul>
      </section>

      <WhatIfSlider currentPrice={d.currentPrice} cogs={d.cogs} compMedian={median} />
      <RecommendationCard productId={d.id} />
    </main>
  );
}
```

- [ ] **Step 5: Verify the full flow**

Run: `npm run dev`, open a product. Confirm: competitor list shows, slider updates margin/position live, recommendation renders with confidence line, Regenerate works. Confirm the recommendation reads sensibly even with `ANTHROPIC_API_KEY` unset (fallback text).

- [ ] **Step 6: Commit**

```bash
git add src/app/product src/components/WhatIfSlider.tsx src/components/RecommendationCard.tsx src/app/api/products/[id]/route.ts
git commit -m "feat: add product detail view with what-if slider and recommendation"
```

---

## Task 12: Full test + build verification

- [ ] **Step 1: Run the full unit suite**

Run: `npm test`
Expected: all tests pass (money, margin, comparison, recommendation, fallback, phrase).

- [ ] **Step 2: Production build**

Run: `npm run build`
Expected: build succeeds, no type errors.

- [ ] **Step 3: Commit any fixes**

```bash
git add -A
git commit -m "test: verify full suite and production build pass"
```

---

## Self-Review Notes

- **Spec coverage:** product list + margin (Tasks 3, 10), price comparison (Tasks 5, 11), AI recommendation with rules+LLM split (Tasks 6, 7, 9), what-if slider (Task 11), data-confidence indicator (Task 11), margin-floor badge (Task 10), revenue-opportunity column (Task 10), seed/no-auth single merchant (Task 8), invalidate-on-COGS-change (Task 9), integer cents (Tasks 1, 2). All covered.
- **Deferred per spec:** category benchmarking, discount analysis, scraping, auth, billing — not in this plan by design (spec §9).
- **Type consistency:** `Decision`/`Signals` (Task 4) are reused unchanged by recommendation (6), phrase (7), and the recommendation route (9). `compare()` returns `ComparisonResult` used by route (9) and table (10).
- **Note on revenue-opportunity:** shows "—" when `estUnits` or median is null (Task 10), per the spec's ambiguity resolution.
- **Note on slider range:** ±50% of current price (Task 11), per the design decision.
