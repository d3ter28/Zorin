# Competitor Price Scraping (Phase A) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a merchant supply a competitor product URL per competitor once, then fetch and update those prices automatically (on demand now, scheduler-ready), so recommendations always reflect current competitor prices.

**Architecture:** A new `src/lib/scrape/` module is the only new source feeding the existing pricing pipeline. A pure `extractPrice` reads the price from page HTML (JSON-LD → Open Graph → CSS selector); a `fetcher` is the only unit touching the network; `recordObservation` is the single persistence path (immutable history row + upserted "latest" projection) shared with CSV ingest; `refreshProduct` orchestrates per-product scraping; a staleness gate drops rotted prices from the decision engine. The decision engine, `apply.ts`, and the `CompetitorPrice` read path are reused unchanged except for one staleness filter.

**Tech Stack:** Next.js 16.2.9 (App Router, Turbopack), TypeScript, Prisma 7 + better-sqlite3 adapter (SQLite), Vitest 4, cheerio (new — HTML parsing). Money is integer cents everywhere.

**Spec:** `docs/superpowers/specs/2026-06-30-competitor-price-scraping-design.md`

---

## Conventions for this plan

- Run all commands from the project root `C:\Users\pohde\projects\priceiq` (in bash: `cd /c/Users/pohde/projects/priceiq` first; the Bash tool's working dir drifts).
- Tests live next to source as `*.test.ts` under `src/` (Vitest config: `environment: "node"`, `include: ["src/**/*.test.ts"]`, alias `@/` → `src/`). No jsdom.
- Run a single test file with `npx vitest run <path>`; run everything with `npm test`.
- Prisma functions take an injected `prisma` surface (like `src/lib/ingest/applyIngest.ts`), so tests pass a stateful mock and API routes pass the real singleton.
- **Next.js caveat:** this Next version differs from training data — for the API-route tasks, copy the existing route patterns shown in the steps (do not invent new ones).

## File Structure

**Create:**
- `src/lib/scrape/extractPrice.ts` — pure: HTML string → price in cents (or null)
- `src/lib/scrape/extractPrice.test.ts`
- `src/lib/scrape/fetcher.ts` — the only network unit: `fetch(url) → { ok, status, html }`
- `src/lib/scrape/fetcher.test.ts`
- `src/lib/scrape/scrapeOne.ts` — fetch + extract + plausibility → `ScrapeResult`
- `src/lib/scrape/scrapeOne.test.ts`
- `src/lib/scrape/recordObservation.ts` — write history row + upsert projection (shared persistence)
- `src/lib/scrape/recordObservation.test.ts`
- `src/lib/scrape/staleness.ts` — pure staleness logic + `markStale` writer
- `src/lib/scrape/staleness.test.ts`
- `src/lib/scrape/refreshProduct.ts` — orchestrate a product's competitor refresh
- `src/lib/scrape/refreshProduct.test.ts`
- `src/app/api/products/[id]/refresh/route.ts` — single-product refresh endpoint
- `src/app/api/refresh/route.ts` — bulk refresh endpoint

**Modify:**
- `prisma/schema.prisma` — add `CompetitorPriceObservation`; add `lastObservedAt`, `isStale` to `CompetitorPrice`
- `src/lib/recommendation.ts` — filter `isStale` competitors in `decideForProduct`
- `src/lib/recommendation.test.ts` — add staleness-filter cases
- `src/lib/ingest/parseCsv.ts` — accept optional `competitor_url` column
- `src/lib/ingest/parseCsv.test.ts` — cover the new column
- `src/lib/ingest/applyIngest.ts` — write through `recordObservation`, persist `competitorUrl`
- `src/lib/ingest/applyIngest.test.ts` — adjust expectations
- `package.json` — add `cheerio`

---

## Task 1: Schema — history table + staleness fields

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add the observation model and projection fields**

In `prisma/schema.prisma`, replace the `CompetitorPrice` model with the version below and add the new `CompetitorPriceObservation` model after it:

```prisma
model CompetitorPrice {
  id             String   @id @default(cuid())
  productId      String
  product        Product  @relation(fields: [productId], references: [id])
  competitorName String
  competitorUrl  String?
  price          Int
  observedAt     DateTime @default(now())
  lastObservedAt DateTime @default(now()) // last SUCCESSFUL confirmation; default keeps migration safe for existing rows
  isStale        Boolean  @default(false)

  @@unique([productId, competitorName])
}

model CompetitorPriceObservation {
  id             String   @id @default(cuid())
  productId      String
  product        Product  @relation(fields: [productId], references: [id])
  competitorName String
  competitorUrl  String
  price          Int      // integer cents
  source         String   // "csv" | "scrape"
  observedAt     DateTime @default(now())

  @@index([productId, competitorName, observedAt])
}
```

Also add the back-relation on `Product` (inside the `Product` model, next to `competitors CompetitorPrice[]`):

```prisma
  observations CompetitorPriceObservation[]
```

- [ ] **Step 2: Push the schema to SQLite and regenerate the client**

Run: `cd /c/Users/pohde/projects/priceiq && npx prisma db push && npx prisma generate`
Expected: "Your database is now in sync with your Prisma schema" and "Generated Prisma Client". Existing rows survive because the new columns have defaults.

- [ ] **Step 3: Verify the app still builds against the new client**

Run: `cd /c/Users/pohde/projects/priceiq && npm test`
Expected: existing suite still passes (no code uses the new fields yet).

- [ ] **Step 4: Commit**

```bash
cd /c/Users/pohde/projects/priceiq
git add prisma/schema.prisma
git commit -m "feat: schema for competitor price history + staleness"
```

---

## Task 2: Add cheerio dependency

**Files:**
- Modify: `package.json` (via npm)

- [ ] **Step 1: Install cheerio**

Run: `cd /c/Users/pohde/projects/priceiq && npm install cheerio`
Expected: `cheerio` appears under `dependencies` in `package.json`.

- [ ] **Step 2: Commit**

```bash
cd /c/Users/pohde/projects/priceiq
git add package.json package-lock.json
git commit -m "chore: add cheerio for HTML price extraction"
```

---

## Task 3: `extractPrice` — pure price extraction

**Files:**
- Create: `src/lib/scrape/extractPrice.ts`
- Test: `src/lib/scrape/extractPrice.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/lib/scrape/extractPrice.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { extractPrice, normalizePrice } from "./extractPrice";

describe("normalizePrice", () => {
  it("parses plain decimals to cents", () => {
    expect(normalizePrice("12.99")).toBe(1299);
  });
  it("strips currency symbols and spaces", () => {
    expect(normalizePrice(" $12.99 ")).toBe(1299);
  });
  it("handles US thousands separators", () => {
    expect(normalizePrice("$1,299.00")).toBe(129900);
  });
  it("handles EU format (comma decimal, dot thousands)", () => {
    expect(normalizePrice("1.299,00")).toBe(129900);
  });
  it("rejects zero and negatives", () => {
    expect(normalizePrice("$0")).toBeNull();
    expect(normalizePrice("-5")).toBeNull();
  });
  it("rejects garbage", () => {
    expect(normalizePrice("call for price")).toBeNull();
  });
});

describe("extractPrice", () => {
  it("reads price from JSON-LD Product/Offer", () => {
    const html = `<html><head><script type="application/ld+json">
      {"@type":"Product","name":"X","offers":{"@type":"Offer","price":"24.50","priceCurrency":"USD"}}
    </script></head><body></body></html>`;
    expect(extractPrice(html)).toBe(2450);
  });
  it("reads price when JSON-LD offers is an array", () => {
    const html = `<script type="application/ld+json">
      {"@type":"Product","offers":[{"@type":"Offer","price":"30.00"}]}
    </script>`;
    expect(extractPrice(html)).toBe(3000);
  });
  it("reads price from a JSON-LD @graph node", () => {
    const html = `<script type="application/ld+json">
      {"@graph":[{"@type":"WebSite"},{"@type":"Product","offers":{"price":"9.99"}}]}
    </script>`;
    expect(extractPrice(html)).toBe(999);
  });
  it("falls back to Open Graph meta when no JSON-LD", () => {
    const html = `<html><head>
      <meta property="product:price:amount" content="15.00">
    </head></html>`;
    expect(extractPrice(html)).toBe(1500);
  });
  it("falls back to a CSS selector when no structured data", () => {
    const html = `<html><body><span itemprop="price">$42.00</span></body></html>`;
    expect(extractPrice(html)).toBe(4200);
  });
  it("returns null when no price is present", () => {
    const html = `<html><body><p>no price here</p></body></html>`;
    expect(extractPrice(html)).toBeNull();
  });
  it("ignores malformed JSON-LD and falls through", () => {
    const html = `<script type="application/ld+json">{ not json </script>
      <meta property="og:price:amount" content="7.50">`;
    expect(extractPrice(html)).toBe(750);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /c/Users/pohde/projects/priceiq && npx vitest run src/lib/scrape/extractPrice.test.ts`
Expected: FAIL — cannot find module `./extractPrice`.

- [ ] **Step 3: Implement `extractPrice.ts`**

Create `src/lib/scrape/extractPrice.ts`:

```ts
import * as cheerio from "cheerio";

/**
 * Parse a price string that may carry currency symbols, thousands separators,
 * and either US (1,299.00) or EU (1.299,00) decimal conventions, into integer
 * cents. Returns null for zero, negative, or unparseable input.
 */
export function normalizePrice(raw: string | number | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;
  let s = String(raw).trim();
  if (s === "") return null;
  // keep only digits, separators, and a leading minus
  s = s.replace(/[^0-9.,-]/g, "");
  if (s === "" || s === "-") return null;

  const lastDot = s.lastIndexOf(".");
  const lastComma = s.lastIndexOf(",");
  let decimalSep: "." | "," | null = null;
  if (lastDot !== -1 && lastComma !== -1) {
    decimalSep = lastDot > lastComma ? "." : ",";
  } else if (lastComma !== -1) {
    // a lone comma: treat as decimal only if it looks like one (e.g. "12,99")
    decimalSep = /,\d{1,2}$/.test(s) ? "," : null;
  } else if (lastDot !== -1) {
    decimalSep = ".";
  }

  let normalized: string;
  if (decimalSep === ",") {
    normalized = s.replace(/\./g, "").replace(",", ".");
  } else if (decimalSep === ".") {
    normalized = s.replace(/,/g, "");
  } else {
    normalized = s.replace(/[.,]/g, "");
  }

  const n = Number(normalized);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100);
}

/** Recursively search a parsed JSON-LD value for the first usable Offer price. */
function findOfferPrice(node: unknown): number | null {
  if (node === null || typeof node !== "object") return null;
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findOfferPrice(item);
      if (found !== null) return found;
    }
    return null;
  }
  const obj = node as Record<string, unknown>;
  // direct offer-ish shape
  if ("price" in obj) {
    const cents = normalizePrice(obj.price as string | number);
    if (cents !== null) return cents;
  }
  for (const key of ["offers", "@graph", "itemListElement"]) {
    if (key in obj) {
      const found = findOfferPrice(obj[key]);
      if (found !== null) return found;
    }
  }
  return null;
}

function fromJsonLd($: cheerio.CheerioAPI): number | null {
  const scripts = $('script[type="application/ld+json"]');
  for (let i = 0; i < scripts.length; i++) {
    const text = $(scripts[i]).text().trim();
    if (!text) continue;
    try {
      const parsed = JSON.parse(text);
      const cents = findOfferPrice(parsed);
      if (cents !== null) return cents;
    } catch {
      // malformed JSON-LD — ignore and try the next block
    }
  }
  return null;
}

function fromMeta($: cheerio.CheerioAPI): number | null {
  const selectors = [
    'meta[property="product:price:amount"]',
    'meta[property="og:price:amount"]',
    'meta[itemprop="price"]',
  ];
  for (const sel of selectors) {
    const content = $(sel).attr("content");
    const cents = normalizePrice(content);
    if (cents !== null) return cents;
  }
  return null;
}

function fromSelector($: cheerio.CheerioAPI): number | null {
  const selectors = ["[itemprop=price]", ".price", "[data-price]"];
  for (const sel of selectors) {
    const el = $(sel).first();
    if (el.length === 0) continue;
    const cents = normalizePrice(el.attr("content") ?? el.text());
    if (cents !== null) return cents;
  }
  return null;
}

/**
 * Extract a product price (integer cents) from page HTML, trying the most
 * reliable sources first: JSON-LD structured data, then Open Graph/meta tags,
 * then a CSS-selector fallback. Returns null when no plausible price is found.
 */
export function extractPrice(html: string): number | null {
  const $ = cheerio.load(html);
  return fromJsonLd($) ?? fromMeta($) ?? fromSelector($);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /c/Users/pohde/projects/priceiq && npx vitest run src/lib/scrape/extractPrice.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
cd /c/Users/pohde/projects/priceiq
git add src/lib/scrape/extractPrice.ts src/lib/scrape/extractPrice.test.ts
git commit -m "feat: pure price extraction from page HTML (JSON-LD/OG/selector)"
```

---

## Task 4: `fetcher` — network unit (failure-as-data)

**Files:**
- Create: `src/lib/scrape/fetcher.ts`
- Test: `src/lib/scrape/fetcher.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/lib/scrape/fetcher.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchPage } from "./fetcher";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchPage", () => {
  it("returns ok with html on 200", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("<html>hi</html>", { status: 200 })),
    );
    const res = await fetchPage("https://shop.example/p");
    expect(res).toMatchObject({ ok: true, status: 200, html: "<html>hi</html>" });
  });

  it("returns not-ok (never throws) on non-200", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("nope", { status: 404 })),
    );
    const res = await fetchPage("https://shop.example/missing");
    expect(res.ok).toBe(false);
    expect(res.status).toBe(404);
  });

  it("returns not-ok (never throws) on network error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("ECONNRESET");
      }),
    );
    const res = await fetchPage("https://shop.example/down");
    expect(res.ok).toBe(false);
    expect(res.status).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /c/Users/pohde/projects/priceiq && npx vitest run src/lib/scrape/fetcher.test.ts`
Expected: FAIL — cannot find module `./fetcher`.

- [ ] **Step 3: Implement `fetcher.ts`**

Create `src/lib/scrape/fetcher.ts`:

```ts
export interface FetchResult {
  ok: boolean;
  status: number; // HTTP status, or 0 for network/timeout errors
  html: string;
}

const TIMEOUT_MS = 10_000;
const USER_AGENT =
  "Mozilla/5.0 (compatible; PriceIQBot/1.0; +https://priceiq.example/bot)";

/**
 * Fetch a page's HTML. Never throws: a non-200, timeout, or network error is
 * returned as { ok:false, status } so callers handle failure as data. One retry
 * on a thrown (network) error.
 */
export async function fetchPage(url: string): Promise<FetchResult> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok) return { ok: false, status: res.status, html: "" };
      const html = await res.text();
      return { ok: true, status: res.status, html };
    } catch {
      clearTimeout(timer);
      if (attempt === 1) return { ok: false, status: 0, html: "" };
    }
  }
  return { ok: false, status: 0, html: "" };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /c/Users/pohde/projects/priceiq && npx vitest run src/lib/scrape/fetcher.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd /c/Users/pohde/projects/priceiq
git add src/lib/scrape/fetcher.ts src/lib/scrape/fetcher.test.ts
git commit -m "feat: page fetcher returning failures as data"
```

---

## Task 5: `scrapeOne` — fetch + extract + plausibility

**Files:**
- Create: `src/lib/scrape/scrapeOne.ts`
- Test: `src/lib/scrape/scrapeOne.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/lib/scrape/scrapeOne.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { scrapeOne } from "./scrapeOne";
import type { FetchResult } from "./fetcher";

const ok = (html: string): FetchResult => ({ ok: true, status: 200, html });

const PRICE_HTML = `<meta property="product:price:amount" content="12.00">`;

describe("scrapeOne", () => {
  it("returns the extracted price on success", async () => {
    const fetchPage = vi.fn(async () => ok(PRICE_HTML));
    const res = await scrapeOne("https://x/p", null, { fetchPage });
    expect(res).toMatchObject({ ok: true, priceCents: 1200 });
  });

  it("reports http failure with status", async () => {
    const fetchPage = vi.fn(async () => ({ ok: false, status: 404, html: "" }));
    const res = await scrapeOne("https://x/p", null, { fetchPage });
    expect(res).toMatchObject({ ok: false, reason: "http_404" });
  });

  it("reports no_price_found when extraction is empty", async () => {
    const fetchPage = vi.fn(async () => ok("<p>no price</p>"));
    const res = await scrapeOne("https://x/p", null, { fetchPage });
    expect(res).toMatchObject({ ok: false, reason: "no_price_found" });
  });

  it("rejects an implausible price far from the last known price", async () => {
    const fetchPage = vi.fn(async () => ok(PRICE_HTML)); // 1200 cents
    const res = await scrapeOne("https://x/p", 100_000, { fetchPage }); // last $1000
    expect(res).toMatchObject({ ok: false, reason: "implausible" });
  });

  it("accepts a plausible change within the band", async () => {
    const fetchPage = vi.fn(async () => ok(PRICE_HTML)); // 1200 cents
    const res = await scrapeOne("https://x/p", 1500, { fetchPage }); // last $15
    expect(res).toMatchObject({ ok: true, priceCents: 1200 });
  });

  it("skips the band check on the first scrape (no last price)", async () => {
    const fetchPage = vi.fn(async () => ok(PRICE_HTML));
    const res = await scrapeOne("https://x/p", null, { fetchPage });
    expect(res.ok).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /c/Users/pohde/projects/priceiq && npx vitest run src/lib/scrape/scrapeOne.test.ts`
Expected: FAIL — cannot find module `./scrapeOne`.

- [ ] **Step 3: Implement `scrapeOne.ts`**

Create `src/lib/scrape/scrapeOne.ts`:

```ts
import { extractPrice } from "./extractPrice";
import { fetchPage as defaultFetchPage, type FetchResult } from "./fetcher";

export type ScrapeFailureReason =
  | `http_${number}`
  | "timeout"
  | "no_price_found"
  | "implausible";

export type ScrapeResult =
  | { ok: true; priceCents: number }
  | { ok: false; reason: ScrapeFailureReason };

/** A new price is plausible if it is within 1/5x..5x of the last known price. */
const PLAUSIBLE_FACTOR = 5;

export function isPlausible(candidateCents: number, lastCents: number | null): boolean {
  if (lastCents === null || lastCents <= 0) return true; // no baseline yet
  return (
    candidateCents >= lastCents / PLAUSIBLE_FACTOR &&
    candidateCents <= lastCents * PLAUSIBLE_FACTOR
  );
}

interface Deps {
  fetchPage: (url: string) => Promise<FetchResult>;
}

/**
 * Fetch one competitor URL and extract its price. `lastCents` is the current
 * stored price for this competitor (or null on first scrape) and gates an
 * implausible-jump sanity check. Returns failure as data, never throws.
 */
export async function scrapeOne(
  url: string,
  lastCents: number | null,
  deps: Deps = { fetchPage: defaultFetchPage },
): Promise<ScrapeResult> {
  const res = await deps.fetchPage(url);
  if (!res.ok) {
    return { ok: false, reason: res.status === 0 ? "timeout" : `http_${res.status}` };
  }
  const priceCents = extractPrice(res.html);
  if (priceCents === null) return { ok: false, reason: "no_price_found" };
  if (!isPlausible(priceCents, lastCents)) return { ok: false, reason: "implausible" };
  return { ok: true, priceCents };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /c/Users/pohde/projects/priceiq && npx vitest run src/lib/scrape/scrapeOne.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd /c/Users/pohde/projects/priceiq
git add src/lib/scrape/scrapeOne.ts src/lib/scrape/scrapeOne.test.ts
git commit -m "feat: scrapeOne — fetch, extract, plausibility gate"
```

---

## Task 6: `recordObservation` — shared persistence path

**Files:**
- Create: `src/lib/scrape/recordObservation.ts`
- Test: `src/lib/scrape/recordObservation.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/lib/scrape/recordObservation.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { recordObservation } from "./recordObservation";

interface Projection {
  productId: string;
  competitorName: string;
  competitorUrl: string | null;
  price: number;
  lastObservedAt: Date;
  isStale: boolean;
}

const projections = new Map<string, Projection>();
const observations: unknown[] = [];

const key = (p: string, c: string) => `${p}::${c}`;

const prisma = {
  competitorPriceObservation: {
    create: vi.fn(async ({ data }: { data: unknown }) => {
      observations.push(data);
      return data;
    }),
  },
  competitorPrice: {
    upsert: vi.fn(
      async ({
        where,
        create,
        update,
      }: {
        where: { productId_competitorName: { productId: string; competitorName: string } };
        create: Projection;
        update: Partial<Projection>;
      }) => {
        const { productId, competitorName } = where.productId_competitorName;
        const k = key(productId, competitorName);
        const existing = projections.get(k);
        if (existing) {
          Object.assign(existing, update);
          return existing;
        }
        const row = { ...create };
        projections.set(k, row);
        return row;
      },
    ),
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any;

beforeEach(() => {
  projections.clear();
  observations.length = 0;
  vi.clearAllMocks();
});

describe("recordObservation", () => {
  it("writes a history row and upserts the projection", async () => {
    await recordObservation(prisma, {
      productId: "p1",
      competitorName: "Acme",
      competitorUrl: "https://acme/p",
      priceCents: 2500,
      source: "scrape",
      now: new Date("2026-06-30T00:00:00.000Z"),
    });

    expect(observations).toHaveLength(1);
    expect(observations[0]).toMatchObject({
      productId: "p1",
      competitorName: "Acme",
      price: 2500,
      source: "scrape",
    });

    const proj = projections.get("p1::Acme")!;
    expect(proj.price).toBe(2500);
    expect(proj.isStale).toBe(false);
    expect(proj.competitorUrl).toBe("https://acme/p");
  });

  it("clears staleness and updates lastObservedAt on a repeat observation", async () => {
    projections.set("p1::Acme", {
      productId: "p1",
      competitorName: "Acme",
      competitorUrl: "https://acme/p",
      price: 2000,
      lastObservedAt: new Date("2026-01-01T00:00:00.000Z"),
      isStale: true,
    });

    await recordObservation(prisma, {
      productId: "p1",
      competitorName: "Acme",
      competitorUrl: "https://acme/p",
      priceCents: 2600,
      source: "scrape",
      now: new Date("2026-06-30T00:00:00.000Z"),
    });

    const proj = projections.get("p1::Acme")!;
    expect(proj.price).toBe(2600);
    expect(proj.isStale).toBe(false);
    expect(proj.lastObservedAt).toEqual(new Date("2026-06-30T00:00:00.000Z"));
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /c/Users/pohde/projects/priceiq && npx vitest run src/lib/scrape/recordObservation.test.ts`
Expected: FAIL — cannot find module `./recordObservation`.

- [ ] **Step 3: Implement `recordObservation.ts`**

Create `src/lib/scrape/recordObservation.ts`:

```ts
import type { PrismaClient } from "@prisma/client";

/** Minimal Prisma surface this function needs (real client is assignable). */
type PrismaSurface = Pick<
  PrismaClient,
  "competitorPrice" | "competitorPriceObservation"
>;

export interface ObservationInput {
  productId: string;
  competitorName: string;
  competitorUrl: string;
  priceCents: number;
  source: "csv" | "scrape";
  now?: Date;
}

/**
 * The single persistence path for a confirmed competitor price, shared by CSV
 * ingest and scraping. Appends an immutable history row AND upserts the
 * "latest price" projection the decision engine reads, clearing staleness.
 */
export async function recordObservation(
  prisma: PrismaSurface,
  input: ObservationInput,
): Promise<void> {
  const { productId, competitorName, competitorUrl, priceCents, source } = input;
  const now = input.now ?? new Date();

  await prisma.competitorPriceObservation.create({
    data: { productId, competitorName, competitorUrl, price: priceCents, source, observedAt: now },
  });

  await prisma.competitorPrice.upsert({
    where: { productId_competitorName: { productId, competitorName } },
    create: {
      productId,
      competitorName,
      competitorUrl,
      price: priceCents,
      observedAt: now,
      lastObservedAt: now,
      isStale: false,
    },
    update: {
      competitorUrl,
      price: priceCents,
      observedAt: now,
      lastObservedAt: now,
      isStale: false,
    },
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /c/Users/pohde/projects/priceiq && npx vitest run src/lib/scrape/recordObservation.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd /c/Users/pohde/projects/priceiq
git add src/lib/scrape/recordObservation.ts src/lib/scrape/recordObservation.test.ts
git commit -m "feat: shared recordObservation persistence (history + projection)"
```

---

## Task 7: `staleness` — threshold logic + writer

**Files:**
- Create: `src/lib/scrape/staleness.ts`
- Test: `src/lib/scrape/staleness.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/lib/scrape/staleness.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { isStale, markStale, STALE_AFTER_MS } from "./staleness";

describe("isStale", () => {
  const now = new Date("2026-06-30T00:00:00.000Z");
  it("is false exactly at the threshold", () => {
    const at = new Date(now.getTime() - STALE_AFTER_MS);
    expect(isStale(at, now)).toBe(false);
  });
  it("is true just past the threshold", () => {
    const at = new Date(now.getTime() - STALE_AFTER_MS - 1);
    expect(isStale(at, now)).toBe(true);
  });
  it("is false for a fresh observation", () => {
    expect(isStale(now, now)).toBe(false);
  });
});

describe("markStale", () => {
  it("flags only projections older than the threshold", async () => {
    const now = new Date("2026-06-30T00:00:00.000Z");
    const fresh = { id: "a", lastObservedAt: now, isStale: false };
    const old = {
      id: "b",
      lastObservedAt: new Date(now.getTime() - STALE_AFTER_MS - 1000),
      isStale: false,
    };
    const findMany = vi.fn(async () => [fresh, old]);
    const update = vi.fn(async () => ({}));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prisma = { competitorPrice: { findMany, update } } as any;

    await markStale(prisma, "p1", now);

    expect(update).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith({ where: { id: "b" }, data: { isStale: true } });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /c/Users/pohde/projects/priceiq && npx vitest run src/lib/scrape/staleness.test.ts`
Expected: FAIL — cannot find module `./staleness`.

- [ ] **Step 3: Implement `staleness.ts`**

Create `src/lib/scrape/staleness.ts`:

```ts
import type { PrismaClient } from "@prisma/client";

/** A confirmed price older than this stops feeding the decision engine. */
export const STALE_AFTER_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

export function isStale(lastObservedAt: Date, now: Date = new Date()): boolean {
  return now.getTime() - lastObservedAt.getTime() > STALE_AFTER_MS;
}

type PrismaSurface = Pick<PrismaClient, "competitorPrice">;

/** Recompute and persist `isStale` for every competitor of one product. */
export async function markStale(
  prisma: PrismaSurface,
  productId: string,
  now: Date = new Date(),
): Promise<void> {
  const rows = await prisma.competitorPrice.findMany({ where: { productId } });
  for (const row of rows) {
    const stale = isStale(row.lastObservedAt, now);
    if (stale !== row.isStale) {
      await prisma.competitorPrice.update({
        where: { id: row.id },
        data: { isStale: stale },
      });
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /c/Users/pohde/projects/priceiq && npx vitest run src/lib/scrape/staleness.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd /c/Users/pohde/projects/priceiq
git add src/lib/scrape/staleness.ts src/lib/scrape/staleness.test.ts
git commit -m "feat: staleness threshold logic + markStale writer"
```

---

## Task 8: Engine staleness filter in `decideForProduct`

**Files:**
- Modify: `src/lib/recommendation.ts:127-137`
- Test: `src/lib/recommendation.test.ts`

- [ ] **Step 1: Write failing tests**

Append to `src/lib/recommendation.test.ts` (inside the `describe("decideForProduct", ...)` block, before its closing `});`):

```ts
  it("excludes stale competitors from the decision", () => {
    // Two competitors at 10000, one stale low outlier at 4000. Without filtering
    // the median would be dragged down; with filtering it stays at 10000.
    const product = {
      currentPrice: 8000,
      cogs: 4000,
      competitors: [
        { price: 10000, observedAt: new Date("2026-06-28T00:00:00.000Z"), isStale: false },
        { price: 10000, observedAt: new Date("2026-06-28T00:00:00.000Z"), isStale: false },
        { price: 4000, observedAt: new Date("2026-06-01T00:00:00.000Z"), isStale: true },
      ],
    };
    const d = decideForProduct(product);
    expect(d.action).toBe("raise");
    expect(d.suggestedPrice).toBe(10000);
    expect(d.signals.competitorCount).toBe(2);
  });

  it("holds when every competitor is stale (treated as no data)", () => {
    const product = {
      currentPrice: 8000,
      cogs: 4000,
      competitors: [
        { price: 10000, observedAt: new Date("2026-06-01T00:00:00.000Z"), isStale: true },
      ],
    };
    const d = decideForProduct(product);
    expect(d.action).toBe("hold");
    expect(d.reasons.join(" ")).toMatch(/competitor data/i);
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /c/Users/pohde/projects/priceiq && npx vitest run src/lib/recommendation.test.ts`
Expected: FAIL — stale competitor still counted; `competitorCount` is 3 / median dragged to ~10000-or-lower mismatch.

- [ ] **Step 3: Implement the filter**

In `src/lib/recommendation.ts`, replace the `decideForProduct` function (currently lines 127-137) with:

```ts
/** Build observations from a product's competitor rows and produce a Decision. */
export function decideForProduct(product: {
  currentPrice: number;
  cogs: number | null;
  competitors: { price: number; observedAt: Date; isStale?: boolean }[];
}): Decision {
  const obs = product.competitors
    .filter((c) => !c.isStale)
    .map((c) => ({
      price: c.price,
      observedAt: c.observedAt.toISOString(),
    }));
  return decide({ currentPrice: product.currentPrice, cogs: product.cogs }, obs);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /c/Users/pohde/projects/priceiq && npx vitest run src/lib/recommendation.test.ts`
Expected: PASS (new cases plus all existing cases — competitors without `isStale` are kept).

- [ ] **Step 5: Commit**

```bash
cd /c/Users/pohde/projects/priceiq
git add src/lib/recommendation.ts src/lib/recommendation.test.ts
git commit -m "feat: exclude stale competitors from pricing decisions"
```

---

## Task 9: `refreshProduct` — orchestration

**Files:**
- Create: `src/lib/scrape/refreshProduct.ts`
- Test: `src/lib/scrape/refreshProduct.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/lib/scrape/refreshProduct.test.ts`. This uses a stateful prisma mock so a refresh is observable end-to-end:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { refreshProduct } from "./refreshProduct";
import type { ScrapeResult } from "./scrapeOne";

interface Proj {
  id: string;
  productId: string;
  competitorName: string;
  competitorUrl: string | null;
  price: number;
  lastObservedAt: Date;
  isStale: boolean;
}

let projections: Proj[] = [];
const observations: unknown[] = [];
const deletedRecsFor: string[] = [];

const prisma = {
  competitorPrice: {
    findMany: vi.fn(async ({ where }: { where: { productId: string } }) =>
      projections.filter((p) => p.productId === where.productId),
    ),
    upsert: vi.fn(
      async ({
        where,
        update,
      }: {
        where: { productId_competitorName: { productId: string; competitorName: string } };
        create: Proj;
        update: Partial<Proj>;
      }) => {
        const { productId, competitorName } = where.productId_competitorName;
        const row = projections.find(
          (p) => p.productId === productId && p.competitorName === competitorName,
        );
        if (row) Object.assign(row, update);
        return row;
      },
    ),
    update: vi.fn(async ({ where, data }: { where: { id: string }; data: Partial<Proj> }) => {
      const row = projections.find((p) => p.id === where.id);
      if (row) Object.assign(row, data);
      return row;
    }),
  },
  competitorPriceObservation: {
    create: vi.fn(async ({ data }: { data: unknown }) => {
      observations.push(data);
      return data;
    }),
  },
  recommendation: {
    deleteMany: vi.fn(async ({ where }: { where: { productId: string } }) => {
      deletedRecsFor.push(where.productId);
      return { count: 1 };
    }),
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any;

beforeEach(() => {
  observations.length = 0;
  deletedRecsFor.length = 0;
  projections = [
    {
      id: "c1",
      productId: "p1",
      competitorName: "Acme",
      competitorUrl: "https://acme/p",
      price: 2000,
      lastObservedAt: new Date("2026-06-29T00:00:00.000Z"),
      isStale: false,
    },
    {
      id: "c2",
      productId: "p1",
      competitorName: "Globex",
      competitorUrl: "https://globex/p",
      price: 3000,
      lastObservedAt: new Date("2026-06-29T00:00:00.000Z"),
      isStale: false,
    },
  ];
  vi.clearAllMocks();
});

const now = new Date("2026-06-30T00:00:00.000Z");

describe("refreshProduct", () => {
  it("updates competitors that scrape successfully", async () => {
    const scrapeOne = vi.fn(
      async (url: string): Promise<ScrapeResult> =>
        url.includes("acme")
          ? { ok: true, priceCents: 2100 }
          : { ok: true, priceCents: 3100 },
    );

    const summary = await refreshProduct(prisma, "p1", { scrapeOne, now });

    expect(summary).toMatchObject({ refreshed: 2, failed: 0 });
    expect(projections.find((p) => p.id === "c1")!.price).toBe(2100);
    expect(projections.find((p) => p.id === "c2")!.price).toBe(3100);
    expect(observations).toHaveLength(2);
    expect(deletedRecsFor).toEqual(["p1"]); // recommendation invalidated
  });

  it("preserves the last good price when a competitor fails", async () => {
    const scrapeOne = vi.fn(
      async (url: string): Promise<ScrapeResult> =>
        url.includes("acme")
          ? { ok: true, priceCents: 2100 }
          : { ok: false, reason: "http_404" },
    );

    const summary = await refreshProduct(prisma, "p1", { scrapeOne, now });

    expect(summary).toMatchObject({ refreshed: 1, failed: 1 });
    expect(projections.find((p) => p.id === "c1")!.price).toBe(2100); // updated
    expect(projections.find((p) => p.id === "c2")!.price).toBe(3000); // untouched
    expect(observations).toHaveLength(1);
    expect(summary.results.find((r) => r.competitorName === "Globex")).toMatchObject({
      ok: false,
      reason: "http_404",
    });
  });

  it("recomputes staleness after refreshing", async () => {
    // Globex hasn't been confirmed in 20 days -> should be marked stale, and a
    // failed scrape must not rescue it.
    projections.find((p) => p.id === "c2")!.lastObservedAt = new Date(
      now.getTime() - 20 * 24 * 60 * 60 * 1000,
    );
    const scrapeOne = vi.fn(
      async (url: string): Promise<ScrapeResult> =>
        url.includes("acme")
          ? { ok: true, priceCents: 2100 }
          : { ok: false, reason: "timeout" },
    );

    await refreshProduct(prisma, "p1", { scrapeOne, now });

    expect(projections.find((p) => p.id === "c2")!.isStale).toBe(true);
    expect(projections.find((p) => p.id === "c1")!.isStale).toBe(false);
  });

  it("skips competitors without a URL", async () => {
    projections.find((p) => p.id === "c2")!.competitorUrl = null;
    const scrapeOne = vi.fn(async (): Promise<ScrapeResult> => ({ ok: true, priceCents: 2100 }));

    const summary = await refreshProduct(prisma, "p1", { scrapeOne, now });

    expect(scrapeOne).toHaveBeenCalledTimes(1); // only Acme
    expect(summary.results.find((r) => r.competitorName === "Globex")).toMatchObject({
      ok: false,
      reason: "no_url",
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /c/Users/pohde/projects/priceiq && npx vitest run src/lib/scrape/refreshProduct.test.ts`
Expected: FAIL — cannot find module `./refreshProduct`.

- [ ] **Step 3: Implement `refreshProduct.ts`**

Create `src/lib/scrape/refreshProduct.ts`:

```ts
import type { PrismaClient } from "@prisma/client";
import { scrapeOne as defaultScrapeOne, type ScrapeResult } from "./scrapeOne";
import { recordObservation } from "./recordObservation";
import { markStale } from "./staleness";

type PrismaSurface = Pick<
  PrismaClient,
  "competitorPrice" | "competitorPriceObservation" | "recommendation"
>;

export interface CompetitorRefreshResult {
  competitorName: string;
  ok: boolean;
  priceCents?: number;
  reason?: string;
}

export interface RefreshSummary {
  productId: string;
  refreshed: number;
  failed: number;
  results: CompetitorRefreshResult[];
}

interface Deps {
  scrapeOne?: (url: string, lastCents: number | null) => Promise<ScrapeResult>;
  now?: Date;
}

/**
 * Refresh every competitor URL for one product: scrape, record successes
 * (history + projection), preserve last-good prices on failure, recompute
 * staleness, and invalidate the stored recommendation if anything changed.
 */
export async function refreshProduct(
  prisma: PrismaSurface,
  productId: string,
  deps: Deps = {},
): Promise<RefreshSummary> {
  const scrapeOne = deps.scrapeOne ?? defaultScrapeOne;
  const now = deps.now ?? new Date();

  const competitors = await prisma.competitorPrice.findMany({ where: { productId } });
  const results: CompetitorRefreshResult[] = [];
  let refreshed = 0;
  let failed = 0;

  for (const c of competitors) {
    if (!c.competitorUrl) {
      results.push({ competitorName: c.competitorName, ok: false, reason: "no_url" });
      failed++;
      continue;
    }
    const res = await scrapeOne(c.competitorUrl, c.price);
    if (res.ok) {
      await recordObservation(prisma, {
        productId,
        competitorName: c.competitorName,
        competitorUrl: c.competitorUrl,
        priceCents: res.priceCents,
        source: "scrape",
        now,
      });
      results.push({ competitorName: c.competitorName, ok: true, priceCents: res.priceCents });
      refreshed++;
    } else {
      results.push({ competitorName: c.competitorName, ok: false, reason: res.reason });
      failed++;
    }
  }

  await markStale(prisma, productId, now);

  if (refreshed > 0) {
    await prisma.recommendation.deleteMany({ where: { productId } });
  }

  return { productId, refreshed, failed, results };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /c/Users/pohde/projects/priceiq && npx vitest run src/lib/scrape/refreshProduct.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd /c/Users/pohde/projects/priceiq
git add src/lib/scrape/refreshProduct.ts src/lib/scrape/refreshProduct.test.ts
git commit -m "feat: refreshProduct orchestration with staleness + invalidation"
```

---

## Task 10: CSV `competitor_url` column + ingest through `recordObservation`

**Files:**
- Modify: `src/lib/ingest/parseCsv.ts`
- Modify: `src/lib/ingest/parseCsv.test.ts`
- Modify: `src/lib/ingest/applyIngest.ts`
- Modify: `src/lib/ingest/applyIngest.test.ts`

- [ ] **Step 1: Write failing parser tests**

Append to `src/lib/ingest/parseCsv.test.ts` (inside the existing top-level `describe`, before its closing `});` — match the existing style of that file):

```ts
  it("accepts an optional competitor_url 4th column", () => {
    const csv = [
      "sku,competitor_name,price,competitor_url",
      "TEE-001,Acme,12.99,https://acme/p",
    ].join("\n");
    const result = parseCsv(csv);
    expect(result.errors).toEqual([]);
    expect(result.rows[0]).toMatchObject({
      sku: "TEE-001",
      competitorName: "Acme",
      priceCents: 1299,
      competitorUrl: "https://acme/p",
    });
  });

  it("still accepts the legacy 3-column format (no url)", () => {
    const csv = ["sku,competitor_name,price", "TEE-001,Acme,12.99"].join("\n");
    const result = parseCsv(csv);
    expect(result.errors).toEqual([]);
    expect(result.rows[0].competitorUrl).toBeUndefined();
  });
```

- [ ] **Step 2: Run parser tests to verify they fail**

Run: `cd /c/Users/pohde/projects/priceiq && npx vitest run src/lib/ingest/parseCsv.test.ts`
Expected: FAIL — 4-column line reported as "expected 3 columns"; `competitorUrl` undefined assertion errors.

- [ ] **Step 3: Update `parseCsv.ts`**

Replace `src/lib/ingest/parseCsv.ts` with:

```ts
import { dollarsToCents } from "../money";

export interface ParsedRow {
  line: number;
  sku: string;
  competitorName: string;
  priceCents: number;
  competitorUrl?: string;
}

export interface RowError {
  line: number;
  raw: string;
  reason: string;
}

export interface ParseResult {
  rows: ParsedRow[];
  errors: RowError[];
}

const HEADER_3 = "sku,competitor_name,price";
const HEADER_4 = "sku,competitor_name,price,competitor_url";

/** Parse competitor-price CSV text. Never throws; problems become RowErrors. */
export function parseCsv(input: string): ParseResult {
  const rows: ParsedRow[] = [];
  const errors: RowError[] = [];
  let sawFirstContentLine = false;

  input.split(/\r?\n/).forEach((raw, index) => {
    const line = index + 1;
    const trimmed = raw.trim();
    if (trimmed === "") return; // skip blank lines

    const fields = trimmed.split(",").map((f) => f.trim());

    // Skip a header row if it is the first non-blank line.
    if (!sawFirstContentLine) {
      sawFirstContentLine = true;
      const header = fields.join(",").toLowerCase();
      if (header === HEADER_3 || header === HEADER_4) return;
    }

    if (fields.length !== 3 && fields.length !== 4) {
      errors.push({ line, raw, reason: "malformed line: expected 3 or 4 columns" });
      return;
    }
    const [sku, competitorName, priceStr, urlStr] = fields;
    if (sku === "" || competitorName === "") {
      errors.push({ line, raw, reason: "missing sku or competitor_name" });
      return;
    }
    const priceCents = dollarsToCents(priceStr);
    if (priceCents === null) {
      errors.push({ line, raw, reason: "invalid price" });
      return;
    }
    const row: ParsedRow = { line, sku, competitorName, priceCents };
    if (urlStr && urlStr !== "") row.competitorUrl = urlStr;
    rows.push(row);
  });

  return { rows, errors };
}
```

- [ ] **Step 4: Run parser tests to verify they pass**

Run: `cd /c/Users/pohde/projects/priceiq && npx vitest run src/lib/ingest/parseCsv.test.ts`
Expected: PASS (new + existing cases).

- [ ] **Step 5: Update `applyIngest.ts` to persist via `recordObservation`**

Replace the body of the per-row loop in `src/lib/ingest/applyIngest.ts`. Change the imports at the top to add:

```ts
import { recordObservation } from "../scrape/recordObservation";
```

Widen the `PrismaSurface` type to include the observation table:

```ts
type PrismaSurface = Pick<
  PrismaClient,
  "product" | "competitorPrice" | "recommendation" | "competitorPriceObservation"
>;
```

Then replace the `prisma.competitorPrice.upsert(...)` call inside the loop (currently lines 53-59) with a call to the shared path, preserving the existing inserted/updated counting and the URL passthrough:

```ts
    await recordObservation(prisma, {
      productId,
      competitorName: row.competitorName,
      competitorUrl: row.competitorUrl ?? "",
      priceCents: row.priceCents,
      source: "csv",
    });
    touched.add(productId);
```

> Note: `recordObservation` requires a non-null `competitorUrl`; CSV rows without a URL pass `""` (the projection keeps an empty URL, and refresh skips empty-URL competitors with reason `no_url`). The history row still records the price.

- [ ] **Step 6: Update `applyIngest.test.ts`**

The existing tests mock only `product`, `competitorPrice`, and `recommendation`. Add a mock for `competitorPriceObservation.create` so `recordObservation` works. In `src/lib/ingest/applyIngest.test.ts`, find the `vi.hoisted` / mock setup and add a `create` fn for the observation table, then pass it on the prisma object handed to `applyIngest`. Concretely, wherever the test builds its `prisma` mock object, add:

```ts
const observationCreate = vi.fn(async () => ({}));
// ...inside the prisma object passed to applyIngest:
competitorPriceObservation: { create: observationCreate },
```

If the existing tests assert on `update`/`upsert` call shapes for competitor prices, update those assertions to assert on `competitorPriceObservation.create` being called and `competitorPrice.upsert` being called with the new fields (`competitorUrl`, `lastObservedAt`, `isStale`). Run the file after editing to confirm the new shape:

Run: `cd /c/Users/pohde/projects/priceiq && npx vitest run src/lib/ingest/applyIngest.test.ts`
Expected: PASS after assertions are aligned to the `recordObservation` shape.

- [ ] **Step 7: Run the full suite**

Run: `cd /c/Users/pohde/projects/priceiq && npm test`
Expected: PASS (all files).

- [ ] **Step 8: Commit**

```bash
cd /c/Users/pohde/projects/priceiq
git add src/lib/ingest/parseCsv.ts src/lib/ingest/parseCsv.test.ts src/lib/ingest/applyIngest.ts src/lib/ingest/applyIngest.test.ts
git commit -m "feat: CSV competitor_url column + ingest through shared recordObservation"
```

---

## Task 11: API routes — single + bulk refresh

**Files:**
- Create: `src/app/api/products/[id]/refresh/route.ts`
- Create: `src/app/api/refresh/route.ts`

> Pattern reference (already in the codebase): `src/app/api/products/[id]/route.ts` (async `params`, `withErrorHandling`, `HttpError`) and `src/app/api/apply/bulk/route.ts` (`parseJsonBody`, loop, `NextResponse.json`). Copy these patterns exactly — do not introduce new route conventions.

- [ ] **Step 1: Create the single-product refresh route**

Create `src/app/api/products/[id]/refresh/route.ts`:

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { HttpError, withErrorHandling } from "@/lib/api/errors";
import { refreshProduct } from "@/lib/scrape/refreshProduct";

export const POST = withErrorHandling(
  async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) throw new HttpError(404, "Not found");

    const summary = await refreshProduct(prisma, id);
    return NextResponse.json(summary);
  },
);
```

- [ ] **Step 2: Create the bulk refresh route**

Create `src/app/api/refresh/route.ts`:

```ts
import { NextResponse } from "next/server";
import { HttpError, withErrorHandling } from "@/lib/api/errors";
import { parseJsonBody } from "@/lib/api/validation";
import { refreshProduct } from "@/lib/scrape/refreshProduct";
import { prisma } from "@/lib/db";

export const POST = withErrorHandling(async (req: Request) => {
  const body = await parseJsonBody(req);
  const ids = body.productIds;
  if (!Array.isArray(ids) || ids.some((id) => typeof id !== "string")) {
    throw new HttpError(400, "productIds must be an array of strings");
  }

  let refreshed = 0;
  let failed = 0;
  for (const id of ids as string[]) {
    const summary = await refreshProduct(prisma, id);
    refreshed += summary.refreshed;
    failed += summary.failed;
  }

  return NextResponse.json({ refreshed, failed });
});
```

- [ ] **Step 3: Verify the app builds (route codegen)**

Run: `cd /c/Users/pohde/projects/priceiq && npm run build`
Expected: build succeeds and the two new routes appear in the route list. (If a stale `.next/types` error appears, clear it with `rm -rf .next` and rebuild — see the handover's Bug #1 note.)

- [ ] **Step 4: Commit**

```bash
cd /c/Users/pohde/projects/priceiq
git add src/app/api/products/[id]/refresh/route.ts src/app/api/refresh/route.ts
git commit -m "feat: refresh API routes (single + bulk)"
```

---

## Task 12: UI — manage competitors + refresh buttons + CSV template

**Files:**
- Read first: `node_modules/next/dist/docs/` (any client-component / data-fetching guide relevant to this Next version) and the existing `src/components/WhatIfSlider.tsx` + the product detail page that renders it.
- Modify: the product detail page (find with `grep -rl WhatIfSlider src/app`) to add a "Manage competitors" panel.
- Modify: the dashboard page to add a "Refresh all prices" button.
- Modify: the CSV template/sample and any in-app upload helper text to mention the new `competitor_url` column.

> This task is UI wiring; logic already exists and is tested. Keep the components thin — they call the routes from Task 11 and re-render, mirroring how `WhatIfSlider` calls `/api/products/[id]/apply` and reloads.

- [ ] **Step 1: Locate the product detail page and dashboard**

Run: `cd /c/Users/pohde/projects/priceiq && grep -rl "WhatIfSlider" src/app && grep -rl "Apply" src/app`
Expected: prints the detail page path and the dashboard path.

- [ ] **Step 2: Add a "Manage competitors" client component**

Create a client component (e.g. `src/components/ManageCompetitors.tsx`) that:
- Lists the product's competitors with name, `formatCents(price)`, and a status line derived from `lastObservedAt`/`isStale`: `confirmed <relative time>`, `⚠ stale`, or last failure reason.
- Has inputs to add/edit a competitor name + URL (persist via a small route or extend the product PATCH — if no such route exists yet, add `POST /api/products/[id]/competitors` following the Task 11 route pattern; keep it out of scope if you prefer to seed URLs via CSV first and ship read-only status here).
- Has a "Refresh now" button that `POST`s to `/api/products/[id]/refresh`, then reloads (mirror `WhatIfSlider`'s `window.location.reload()` approach).

Render it on the product detail page next to `WhatIfSlider`.

- [ ] **Step 3: Add a "Refresh all prices" button to the dashboard**

Add a button that collects the visible product IDs and `POST`s `{ productIds }` to `/api/refresh`, then reloads. Show the returned `refreshed`/`failed` counts. Mirror the existing bulk-apply button.

- [ ] **Step 4: Update the CSV template + helper text**

Update the sample CSV / upload instructions to document the optional `competitor_url` column (`sku,competitor_name,price,competitor_url`).

- [ ] **Step 5: Manual verification with the preview server**

Start the preview (`priceiq-dev` in `C:\Users\pohde\.claude\launch.json`, port 3000), open a product detail page, confirm the competitors panel renders and "Refresh now" updates a price + status. Then confirm the dashboard "Refresh all" works. (Live scraping needs a real competitor URL; for a local smoke test, point a competitor URL at a simple static product page that embeds JSON-LD/OG price, or temporarily seed one.)

- [ ] **Step 6: Commit**

```bash
cd /c/Users/pohde/projects/priceiq
git add src/components/ManageCompetitors.tsx src/app
git commit -m "feat: manage-competitors UI + refresh buttons + CSV url column"
```

---

## Final verification

- [ ] **Run the full suite**

Run: `cd /c/Users/pohde/projects/priceiq && npm test`
Expected: all tests pass.

- [ ] **Build**

Run: `cd /c/Users/pohde/projects/priceiq && npm run build`
Expected: build succeeds, new routes present.

---

## Notes / deferred (do NOT build here)

- Playwright/headless fetching for JS-rendered pages — `fetcher.ts` is the swap point.
- Paid scraping-as-a-service fallback for anti-bot-protected sites.
- Scheduled/cron execution — `refreshProduct` is already the callable unit; a scheduler just loops it.
- Phase B auto-discovery — would feed competitor URLs into `recordObservation`/`refreshProduct`.
- UI component tests (jsdom) — same open decision as the WhatIfSlider coverage gap.
```
