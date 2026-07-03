# Competitor Discovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merchants click "Find competitors" on a product and get price-verified candidate URLs (from their saved competitor list, open web search, or both), review them, and confirm — confirmed competitors flow into the existing scrape/auto-refresh pipeline.

**Architecture:** New `src/lib/discovery/` module mirroring `src/lib/scrape/` conventions (failure-as-data, injectable deps, one network seam). Search providers (Brave / fixture) behind a `SearchProvider` interface. Candidates are scrape-verified via existing `scrapeOne` before the merchant ever sees them; confirmed candidates persist via existing `recordObservation`. One new Prisma model (`CompetitorDomain`) for the merchant's saved competitor list.

**Tech Stack:** Next.js 16 App Router (Turbopack), TypeScript, Prisma 7 + SQLite, Vitest 4 (node + jsdom projects), Brave Search API.

**Spec:** `docs/superpowers/specs/2026-07-04-competitor-discovery-design.md`

---

## Read these before starting

- `AGENTS.md` — **this Next.js version has breaking changes**; read `node_modules/next/dist/docs/` before writing route/page code. Async route `params` is `Promise<{id}>`.
- All Bash commands run from `C:\Users\pohde` — **always prefix with `cd /c/Users/pohde/projects/priceiq &&`**.
- Conventions to copy: `src/lib/scrape/scrapeOne.ts` (failure-as-data + `Deps`), `src/app/api/products/[id]/refresh/route.ts` (auth + ownership + `withErrorHandling`), `src/lib/api/validation.ts` (`parseJsonBody`), `src/components/ManageCompetitors.tsx` (client component style), `src/components/ManageCompetitors.test.tsx` (UI test style).
- Run tests: `cd /c/Users/pohde/projects/priceiq && npx vitest run <path>` (or `npm test` for everything; expect 300 passing before Task 1).

## File structure

| File | Responsibility |
|---|---|
| `prisma/schema.prisma` | + `CompetitorDomain` model |
| `src/lib/discovery/domain.ts` (+test) | `normalizeDomain` — one place that turns user/URL input into a canonical domain |
| `src/lib/discovery/searchProvider.ts` | `SearchResult`/`SearchProvider` types + `getSearchProvider()` selection |
| `src/lib/discovery/braveProvider.ts` (+test) | Brave Search API client (the only search-network code) |
| `src/lib/discovery/fixtureProvider.ts` (+test) | Canned results for demo/dev without a key |
| `src/lib/discovery/discoverCompetitors.ts` (+test) | Orchestrator: queries → search → filter → scrape-verify → candidates |
| `src/lib/scrape/recordObservation.ts` | source union gains `"discovery"` |
| `src/app/api/settings/competitors/route.ts` (+test) | GET/PUT saved competitor domains |
| `src/app/api/products/[id]/discover/route.ts` (+test) | POST discovery run |
| `src/app/api/products/[id]/competitors/route.ts` (+test) | POST confirm candidates |
| `src/components/DiscoverCompetitors.tsx` (+test) | Product-page discovery UI |
| `src/components/CompetitorSettings.tsx` (+test) | Saved-domains editor |
| `src/app/settings/page.tsx` | Settings page shell |
| `src/app/page.tsx`, `src/app/product/[id]/page.tsx` | Link to /settings; mount DiscoverCompetitors |

---

### Task 1: Schema — CompetitorDomain model

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add the model and back-relation**

Add to `prisma/schema.prisma`:

```prisma
model CompetitorDomain {
  id         String   @id @default(cuid())
  merchantId String
  merchant   Merchant @relation(fields: [merchantId], references: [id])
  domain     String   // normalized, e.g. "walmart.com"
  createdAt  DateTime @default(now())

  @@unique([merchantId, domain])
}
```

And add to the `Merchant` model body:

```prisma
  competitorDomains CompetitorDomain[]
```

- [ ] **Step 2: Push schema + regenerate client**

Run: `cd /c/Users/pohde/projects/priceiq && npx prisma db push`
Expected: "Your database is now in sync" (stop the dev server first if it holds the SQLite lock).

- [ ] **Step 3: Verify types compile**

Run: `cd /c/Users/pohde/projects/priceiq && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd /c/Users/pohde/projects/priceiq && git add prisma/schema.prisma && git commit -m "feat: CompetitorDomain schema for saved competitor lists"
```

---

### Task 2: recordObservation source union gains "discovery"

**Files:**
- Modify: `src/lib/scrape/recordObservation.ts:14`
- Test: `src/lib/scrape/recordObservation.test.ts`

- [ ] **Step 1: Write the failing test**

Append to the existing describe block in `recordObservation.test.ts` (copy the stub-prisma pattern already used in that file):

```ts
it("accepts source 'discovery' and persists it on the history row", async () => {
  const prisma = makeStubPrisma(); // reuse the file's existing stub helper
  await recordObservation(prisma, {
    productId: "p1",
    competitorName: "walmart.com",
    competitorUrl: "https://walmart.com/item",
    priceCents: 1499,
    source: "discovery",
  });
  expect(prisma.competitorPriceObservation.create).toHaveBeenCalledWith(
    expect.objectContaining({ data: expect.objectContaining({ source: "discovery" }) }),
  );
});
```

(If the file's stub helper has a different name, use that name — do not add a second stub.)

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /c/Users/pohde/projects/priceiq && npx vitest run src/lib/scrape/recordObservation.test.ts`
Expected: FAIL — TS error: `"discovery"` not assignable to `"csv" | "scrape"`.

- [ ] **Step 3: Widen the union**

In `recordObservation.ts` change:

```ts
  source: "csv" | "scrape" | "discovery";
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /c/Users/pohde/projects/priceiq && npx vitest run src/lib/scrape/recordObservation.test.ts`
Expected: PASS (all tests in file).

- [ ] **Step 5: Commit**

```bash
cd /c/Users/pohde/projects/priceiq && git add src/lib/scrape/recordObservation.ts src/lib/scrape/recordObservation.test.ts && git commit -m "feat: allow 'discovery' as an observation source"
```

---

### Task 3: normalizeDomain

**Files:**
- Create: `src/lib/discovery/domain.ts`
- Test: `src/lib/discovery/domain.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from "vitest";
import { normalizeDomain } from "./domain";

describe("normalizeDomain", () => {
  it("lowercases and passes through a bare domain", () => {
    expect(normalizeDomain("Walmart.com")).toBe("walmart.com");
  });
  it("strips protocol, www., path, query, and port", () => {
    expect(normalizeDomain("https://www.Walmart.com:443/ip/mug?x=1")).toBe("walmart.com");
    expect(normalizeDomain("http://target.com/foo")).toBe("target.com");
  });
  it("trims whitespace", () => {
    expect(normalizeDomain("  rivalshop.example  ")).toBe("rivalshop.example");
  });
  it("keeps subdomains other than www", () => {
    expect(normalizeDomain("shop.example.com")).toBe("shop.example.com");
  });
  it("rejects garbage", () => {
    expect(normalizeDomain("")).toBeNull();
    expect(normalizeDomain("not a domain")).toBeNull();
    expect(normalizeDomain("nodot")).toBeNull();
    expect(normalizeDomain("ftp://weird.com")).toBe("weird.com"); // scheme irrelevant, host is what matters
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd /c/Users/pohde/projects/priceiq && npx vitest run src/lib/discovery/domain.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// Turn user input or a URL into a canonical comparable domain.
// Lowercase, no protocol, no "www.", no path/port. Null when unparseable.
export function normalizeDomain(input: string): string | null {
  const trimmed = input.trim().toLowerCase();
  if (trimmed === "") return null;
  let host: string;
  try {
    // Prepend a scheme when missing so URL() can parse bare domains.
    host = new URL(trimmed.includes("://") ? trimmed : `http://${trimmed}`).hostname;
  } catch {
    return null;
  }
  if (host.startsWith("www.")) host = host.slice(4);
  // Require at least one dot and no spaces — "nodot" or free text is not a domain.
  if (!host.includes(".") || /\s/.test(host)) return null;
  return host;
}
```

- [ ] **Step 4: Run to verify pass**

Run: `cd /c/Users/pohde/projects/priceiq && npx vitest run src/lib/discovery/domain.test.ts`
Expected: PASS. Note: `new URL("http://not a domain")` may parse with host `not` (no dot → rejected) or throw depending on runtime; either path returns null. If the "nodot" case surprises you, check actual behavior with `node -e` before changing the implementation.

- [ ] **Step 5: Commit**

```bash
cd /c/Users/pohde/projects/priceiq && git add src/lib/discovery/domain.ts src/lib/discovery/domain.test.ts && git commit -m "feat: normalizeDomain for competitor domain input"
```

---

### Task 4: SearchProvider types + getSearchProvider

**Files:**
- Create: `src/lib/discovery/searchProvider.ts`
- Test: `src/lib/discovery/searchProvider.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { afterEach, describe, expect, it } from "vitest";
import { getSearchProvider } from "./searchProvider";

const saved = { ...process.env };
afterEach(() => {
  process.env.BRAVE_SEARCH_API_KEY = saved.BRAVE_SEARCH_API_KEY;
  process.env.SEARCH_PROVIDER = saved.SEARCH_PROVIDER;
  if (saved.BRAVE_SEARCH_API_KEY === undefined) delete process.env.BRAVE_SEARCH_API_KEY;
  if (saved.SEARCH_PROVIDER === undefined) delete process.env.SEARCH_PROVIDER;
});

describe("getSearchProvider", () => {
  it("returns null when nothing is configured", () => {
    delete process.env.BRAVE_SEARCH_API_KEY;
    delete process.env.SEARCH_PROVIDER;
    expect(getSearchProvider()).toBeNull();
  });
  it("returns the fixture provider when SEARCH_PROVIDER=fixture", () => {
    process.env.SEARCH_PROVIDER = "fixture";
    expect(getSearchProvider()?.name).toBe("fixture");
  });
  it("returns the brave provider when a key is set", () => {
    delete process.env.SEARCH_PROVIDER;
    process.env.BRAVE_SEARCH_API_KEY = "test-key";
    expect(getSearchProvider()?.name).toBe("brave");
  });
  it("fixture wins over brave when both are set (explicit override)", () => {
    process.env.SEARCH_PROVIDER = "fixture";
    process.env.BRAVE_SEARCH_API_KEY = "test-key";
    expect(getSearchProvider()?.name).toBe("fixture");
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd /c/Users/pohde/projects/priceiq && npx vitest run src/lib/discovery/searchProvider.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
export interface SearchResult {
  url: string;
  title: string;
  snippet: string;
}

export type SearchProviderResult =
  | { ok: true; results: SearchResult[] }
  | { ok: false; reason: "unavailable" | "rate_limited" | "http_error" | "network_error" };

export interface SearchProvider {
  name: string;
  search(query: string): Promise<SearchProviderResult>;
}

// Provider selection: explicit fixture override, then Brave when a key exists,
// otherwise null — the discover route turns null into a 503 "no_provider".
export function getSearchProvider(): SearchProvider | null {
  if (process.env.SEARCH_PROVIDER === "fixture") {
    // Lazy require so the fixture module never loads in production paths.
    const { fixtureProvider } = require("./fixtureProvider") as typeof import("./fixtureProvider");
    return fixtureProvider;
  }
  const key = process.env.BRAVE_SEARCH_API_KEY;
  if (key) {
    const { makeBraveProvider } = require("./braveProvider") as typeof import("./braveProvider");
    return makeBraveProvider(key);
  }
  return null;
}
```

Note: if `require` is unavailable under the bundler settings (ESM-only), switch to top-of-file static imports of both providers — they are tiny and side-effect-free. Do whichever compiles cleanly; keep `getSearchProvider`'s behavior identical.

- [ ] **Step 4: Stub the two providers so this compiles** (real implementations come in Tasks 5–6)

`src/lib/discovery/fixtureProvider.ts`:

```ts
import type { SearchProvider } from "./searchProvider";

export const fixtureProvider: SearchProvider = {
  name: "fixture",
  async search() {
    return { ok: true, results: [] };
  },
};
```

`src/lib/discovery/braveProvider.ts`:

```ts
import type { SearchProvider } from "./searchProvider";

export function makeBraveProvider(apiKey: string): SearchProvider {
  void apiKey;
  return {
    name: "brave",
    async search() {
      return { ok: false, reason: "unavailable" };
    },
  };
}
```

- [ ] **Step 5: Run to verify pass**

Run: `cd /c/Users/pohde/projects/priceiq && npx vitest run src/lib/discovery/searchProvider.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
cd /c/Users/pohde/projects/priceiq && git add src/lib/discovery/searchProvider.ts src/lib/discovery/fixtureProvider.ts src/lib/discovery/braveProvider.ts src/lib/discovery/searchProvider.test.ts && git commit -m "feat: SearchProvider interface + provider selection"
```

---

### Task 5: Brave provider

**Files:**
- Modify: `src/lib/discovery/braveProvider.ts` (replace the stub)
- Test: `src/lib/discovery/braveProvider.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it, vi } from "vitest";
import { makeBraveProvider } from "./braveProvider";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status });
}

describe("braveProvider", () => {
  it("maps web.results to SearchResults and sends the token header", async () => {
    const fetchSpy = vi.fn(async () =>
      jsonResponse(200, {
        web: {
          results: [
            { url: "https://walmart.com/ip/mug", title: "Ceramic Mug", description: "A mug." },
            { url: "https://target.com/p/mug", title: "Mug 12oz", description: "Also a mug." },
          ],
        },
      }),
    );
    const p = makeBraveProvider("k123", { fetch: fetchSpy });
    const res = await p.search("ceramic mug");
    expect(res).toEqual({
      ok: true,
      results: [
        { url: "https://walmart.com/ip/mug", title: "Ceramic Mug", snippet: "A mug." },
        { url: "https://target.com/p/mug", title: "Mug 12oz", snippet: "Also a mug." },
      ],
    });
    const [url, init] = fetchSpy.mock.calls[0];
    expect(String(url)).toContain("api.search.brave.com/res/v1/web/search");
    expect(String(url)).toContain("q=ceramic+mug");
    expect((init as RequestInit).headers).toMatchObject({ "X-Subscription-Token": "k123" });
  });

  it("returns ok:true with empty results when web.results is missing", async () => {
    const p = makeBraveProvider("k", { fetch: async () => jsonResponse(200, {}) });
    expect(await p.search("x")).toEqual({ ok: true, results: [] });
  });

  it("maps 429 to rate_limited", async () => {
    const p = makeBraveProvider("k", { fetch: async () => jsonResponse(429, {}) });
    expect(await p.search("x")).toEqual({ ok: false, reason: "rate_limited" });
  });

  it("maps other non-2xx to http_error", async () => {
    const p = makeBraveProvider("k", { fetch: async () => jsonResponse(500, {}) });
    expect(await p.search("x")).toEqual({ ok: false, reason: "http_error" });
  });

  it("maps a thrown fetch to network_error", async () => {
    const p = makeBraveProvider("k", {
      fetch: async () => {
        throw new Error("boom");
      },
    });
    expect(await p.search("x")).toEqual({ ok: false, reason: "network_error" });
  });

  it("skips malformed result entries instead of crashing", async () => {
    const p = makeBraveProvider("k", {
      fetch: async () =>
        jsonResponse(200, { web: { results: [{ title: "no url" }, { url: "https://a.com/x", title: "ok", description: "d" }] } }),
    });
    expect(await p.search("x")).toEqual({
      ok: true,
      results: [{ url: "https://a.com/x", title: "ok", snippet: "d" }],
    });
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd /c/Users/pohde/projects/priceiq && npx vitest run src/lib/discovery/braveProvider.test.ts`
Expected: FAIL — stub returns `unavailable` / wrong signature.

- [ ] **Step 3: Implement**

Replace `braveProvider.ts`:

```ts
import type { SearchProvider, SearchProviderResult, SearchResult } from "./searchProvider";

const ENDPOINT = "https://api.search.brave.com/res/v1/web/search";
const RESULT_COUNT = 10;

interface Deps {
  fetch?: typeof fetch;
}

// Brave Web Search API client. The only search-network code in the app.
// Failure-as-data, never throws.
export function makeBraveProvider(apiKey: string, deps: Deps = {}): SearchProvider {
  const doFetch = deps.fetch ?? fetch;
  return {
    name: "brave",
    async search(query: string): Promise<SearchProviderResult> {
      const url = `${ENDPOINT}?${new URLSearchParams({ q: query, count: String(RESULT_COUNT) })}`;
      let res: Response;
      try {
        res = await doFetch(url, {
          headers: { Accept: "application/json", "X-Subscription-Token": apiKey },
        });
      } catch {
        return { ok: false, reason: "network_error" };
      }
      if (res.status === 429) return { ok: false, reason: "rate_limited" };
      if (!res.ok) return { ok: false, reason: "http_error" };

      let body: unknown;
      try {
        body = await res.json();
      } catch {
        return { ok: false, reason: "http_error" };
      }
      const raw = (body as { web?: { results?: unknown[] } })?.web?.results ?? [];
      const results: SearchResult[] = [];
      for (const r of raw) {
        const e = r as { url?: unknown; title?: unknown; description?: unknown };
        if (typeof e.url !== "string" || e.url === "") continue;
        results.push({
          url: e.url,
          title: typeof e.title === "string" ? e.title : "",
          snippet: typeof e.description === "string" ? e.description : "",
        });
      }
      return { ok: true, results };
    },
  };
}
```

Update `searchProvider.ts`'s brave branch if needed so it still compiles (`makeBraveProvider(key)` — deps defaulted).

- [ ] **Step 4: Run to verify pass**

Run: `cd /c/Users/pohde/projects/priceiq && npx vitest run src/lib/discovery/braveProvider.test.ts src/lib/discovery/searchProvider.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd /c/Users/pohde/projects/priceiq && git add src/lib/discovery/braveProvider.ts src/lib/discovery/braveProvider.test.ts src/lib/discovery/searchProvider.ts && git commit -m "feat: Brave Search provider"
```

---

### Task 6: Fixture provider

**Files:**
- Modify: `src/lib/discovery/fixtureProvider.ts` (replace the stub)
- Test: `src/lib/discovery/fixtureProvider.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from "vitest";
import { fixtureProvider } from "./fixtureProvider";

describe("fixtureProvider", () => {
  it("returns the local demo page as a result for any query", async () => {
    const res = await fixtureProvider.search("Ceramic Mug 12oz");
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.results.length).toBeGreaterThan(0);
    expect(res.results[0].url).toBe("http://localhost:3000/demo-competitor.html");
    expect(res.results[0].title).toContain("LocalDemoShop");
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd /c/Users/pohde/projects/priceiq && npx vitest run src/lib/discovery/fixtureProvider.test.ts`
Expected: FAIL — stub returns empty results.

- [ ] **Step 3: Implement**

```ts
import type { SearchProvider } from "./searchProvider";

// Canned results for demo/dev without a Brave key (SEARCH_PROVIDER=fixture).
// Points at the committed local demo page so the full discover → confirm →
// auto-refresh loop works offline. Scraping localhost requires the existing
// dev bypass (NODE_ENV !== "production" or SCRAPE_ALLOW_PRIVATE=1).
export const fixtureProvider: SearchProvider = {
  name: "fixture",
  async search() {
    return {
      ok: true,
      results: [
        {
          url: "http://localhost:3000/demo-competitor.html",
          title: "Ceramic Coffee Mug 12oz — LocalDemoShop",
          snippet: "Buy the 12oz ceramic coffee mug at LocalDemoShop.",
        },
      ],
    };
  },
};
```

- [ ] **Step 4: Run to verify pass**

Run: `cd /c/Users/pohde/projects/priceiq && npx vitest run src/lib/discovery/fixtureProvider.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd /c/Users/pohde/projects/priceiq && git add src/lib/discovery/fixtureProvider.ts src/lib/discovery/fixtureProvider.test.ts && git commit -m "feat: fixture search provider for keyless demo"
```

---

### Task 7: discoverCompetitors orchestrator

**Files:**
- Create: `src/lib/discovery/discoverCompetitors.ts`
- Test: `src/lib/discovery/discoverCompetitors.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it, vi } from "vitest";
import { discoverCompetitors, type DiscoveryInput } from "./discoverCompetitors";
import type { SearchProvider } from "./searchProvider";

function provider(resultsByQuery: Record<string, { url: string; title: string }[]>): SearchProvider {
  return {
    name: "test",
    search: vi.fn(async (q: string) => ({
      ok: true as const,
      results: (resultsByQuery[q] ?? []).map((r) => ({ ...r, snippet: "" })),
    })),
  };
}

const okScrape = vi.fn(async () => ({ ok: true as const, priceCents: 1499 }));

function input(overrides: Partial<DiscoveryInput> = {}): DiscoveryInput {
  return {
    productTitle: "Ceramic Mug",
    currentPriceCents: 1500,
    ownDomain: "mystore.example",
    savedDomains: ["walmart.com"],
    existingCompetitorDomains: [],
    mode: "both",
    ...overrides,
  };
}

describe("discoverCompetitors", () => {
  it("builds one site: query per saved domain plus one open query for mode both", async () => {
    const p = provider({});
    await discoverCompetitors(input(), { provider: p, scrapeOne: okScrape });
    const queries = (p.search as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[0]);
    expect(queries).toContain('"Ceramic Mug" site:walmart.com');
    expect(queries).toContain('"Ceramic Mug" buy price');
    expect(queries).toHaveLength(2);
  });

  it("mode saved skips the open query; mode open skips site: queries", async () => {
    const p1 = provider({});
    await discoverCompetitors(input({ mode: "saved" }), { provider: p1, scrapeOne: okScrape });
    expect((p1.search as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[0])).toEqual([
      '"Ceramic Mug" site:walmart.com',
    ]);
    const p2 = provider({});
    await discoverCompetitors(input({ mode: "open" }), { provider: p2, scrapeOne: okScrape });
    expect((p2.search as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[0])).toEqual([
      '"Ceramic Mug" buy price',
    ]);
  });

  it("dedups by domain (keeps first), drops own store and already-tracked domains", async () => {
    const p = provider({
      '"Ceramic Mug" buy price': [
        { url: "https://walmart.com/a", title: "A" },
        { url: "https://www.walmart.com/b", title: "B" }, // dup domain
        { url: "https://mystore.example/self", title: "Self" }, // own store
        { url: "https://tracked.com/x", title: "Tracked" }, // already a competitor
        { url: "https://fresh.com/y", title: "Fresh" },
      ],
    });
    const out = await discoverCompetitors(
      input({ mode: "open", existingCompetitorDomains: ["tracked.com"] }),
      { provider: p, scrapeOne: okScrape },
    );
    expect(out.candidates.map((c) => c.domain)).toEqual(["walmart.com", "fresh.com"]);
  });

  it("caps candidates at 8 before scraping", async () => {
    const many = Array.from({ length: 12 }, (_, i) => ({
      url: `https://shop${i}.com/p`,
      title: `Shop ${i}`,
    }));
    const scrape = vi.fn(async () => ({ ok: true as const, priceCents: 1400 }));
    const out = await discoverCompetitors(
      input({ mode: "open" }),
      { provider: provider({ '"Ceramic Mug" buy price': many }), scrapeOne: scrape },
    );
    expect(scrape).toHaveBeenCalledTimes(8);
    expect(out.candidates).toHaveLength(8);
  });

  it("moves scrape failures and out-of-band prices to skipped with reasons", async () => {
    const p = provider({
      '"Ceramic Mug" buy price': [
        { url: "https://good.com/p", title: "Good" },
        { url: "https://dead.com/p", title: "Dead" },
        { url: "https://cheap.com/p", title: "Cheap" },
        { url: "https://gold.com/p", title: "Gold" },
      ],
    });
    const scrape = vi.fn(async (url: string) => {
      if (url.includes("good")) return { ok: true as const, priceCents: 1450 };
      if (url.includes("dead")) return { ok: false as const, reason: "no_price_found" as const };
      if (url.includes("cheap")) return { ok: true as const, priceCents: 100 }; // < 10% of 1500
      return { ok: true as const, priceCents: 20000 }; // > 10x of 1500
    });
    const out = await discoverCompetitors(input({ mode: "open" }), { provider: p, scrapeOne: scrape });
    expect(out.candidates).toEqual([
      { url: "https://good.com/p", domain: "good.com", title: "Good", priceCents: 1450 },
    ]);
    expect(out.skipped).toEqual([
      { url: "https://dead.com/p", reason: "no_price_found" },
      { url: "https://cheap.com/p", reason: "implausible" },
      { url: "https://gold.com/p", reason: "implausible" },
    ]);
  });

  it("surfaces a provider failure as providerError with empty candidates", async () => {
    const p: SearchProvider = {
      name: "test",
      search: async () => ({ ok: false, reason: "rate_limited" }),
    };
    const out = await discoverCompetitors(input({ mode: "open" }), { provider: p, scrapeOne: okScrape });
    expect(out).toEqual({ candidates: [], skipped: [], providerError: "rate_limited" });
  });

  it("drops results with unparseable URLs to skipped", async () => {
    const p = provider({ '"Ceramic Mug" buy price': [{ url: "not-a-url", title: "?" }] });
    const out = await discoverCompetitors(input({ mode: "open" }), { provider: p, scrapeOne: okScrape });
    expect(out.candidates).toEqual([]);
    expect(out.skipped).toEqual([{ url: "not-a-url", reason: "bad_url" }]);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd /c/Users/pohde/projects/priceiq && npx vitest run src/lib/discovery/discoverCompetitors.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
import type { ScrapeResult } from "../scrape/scrapeOne";
import { scrapeOne as defaultScrapeOne } from "../scrape/scrapeOne";
import { normalizeDomain } from "./domain";
import type { SearchProvider } from "./searchProvider";

export type DiscoveryMode = "saved" | "open" | "both";

export interface DiscoveryInput {
  productTitle: string;
  currentPriceCents: number;
  ownDomain: string | null; // normalized merchant storeUrl domain, if any
  savedDomains: string[];
  existingCompetitorDomains: string[]; // domains already tracked for this product
  mode: DiscoveryMode;
}

export interface Candidate {
  url: string;
  domain: string;
  title: string;
  priceCents: number;
}

export interface DiscoveryOutput {
  candidates: Candidate[];
  skipped: { url: string; reason: string }[];
  providerError?: string;
}

interface Deps {
  provider: SearchProvider;
  scrapeOne?: (url: string, lastCents: number | null) => Promise<ScrapeResult>;
}

const MAX_CANDIDATES = 8;
// No prior price exists for a new competitor, so instead of scrapeOne's 5x
// last-price gate we sanity-band against the merchant's own price.
const BAND_LOW = 0.1; // reject below 10% of own price
const BAND_HIGH = 10; // reject above 10x own price

export function buildQueries(input: DiscoveryInput): string[] {
  const queries: string[] = [];
  if (input.mode !== "open") {
    for (const d of input.savedDomains) queries.push(`"${input.productTitle}" site:${d}`);
  }
  if (input.mode !== "saved") {
    queries.push(`"${input.productTitle}" buy price`);
  }
  return queries;
}

// Search → filter → scrape-verify. Every returned candidate has a live,
// sanity-banded price. Failure-as-data throughout; never throws.
export async function discoverCompetitors(
  input: DiscoveryInput,
  deps: Deps,
): Promise<DiscoveryOutput> {
  const scrape = deps.scrapeOne ?? defaultScrapeOne;
  const skipped: DiscoveryOutput["skipped"] = [];

  // 1. Search (sequential — a handful of queries; keeps rate limits happy).
  const merged: { url: string; title: string }[] = [];
  for (const q of buildQueries(input)) {
    const res = await deps.provider.search(q);
    if (!res.ok) {
      // Any provider failure aborts the run — partial results would be
      // indistinguishable from "searched everything, found little".
      return { candidates: [], skipped: [], providerError: res.reason };
    }
    merged.push(...res.results);
  }

  // 2. Filter: parse domain, dedup (first wins), drop own store + tracked.
  const excluded = new Set([
    ...(input.ownDomain ? [input.ownDomain] : []),
    ...input.existingCompetitorDomains,
  ]);
  const seen = new Set<string>();
  const toVerify: { url: string; domain: string; title: string }[] = [];
  for (const r of merged) {
    const domain = normalizeDomain(r.url);
    if (domain === null) {
      skipped.push({ url: r.url, reason: "bad_url" });
      continue;
    }
    if (excluded.has(domain) || seen.has(domain)) continue;
    seen.add(domain);
    toVerify.push({ url: r.url, domain, title: r.title });
    if (toVerify.length >= MAX_CANDIDATES) break;
  }

  // 3. Scrape-verify each candidate (SSRF guard lives inside scrapeOne's fetch).
  const candidates: Candidate[] = [];
  for (const c of toVerify) {
    const res = await scrape(c.url, null);
    if (!res.ok) {
      skipped.push({ url: c.url, reason: res.reason });
      continue;
    }
    const own = input.currentPriceCents;
    if (own > 0 && (res.priceCents < own * BAND_LOW || res.priceCents > own * BAND_HIGH)) {
      skipped.push({ url: c.url, reason: "implausible" });
      continue;
    }
    candidates.push({ ...c, priceCents: res.priceCents });
  }

  return { candidates, skipped };
}
```

- [ ] **Step 4: Run to verify pass**

Run: `cd /c/Users/pohde/projects/priceiq && npx vitest run src/lib/discovery/discoverCompetitors.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
cd /c/Users/pohde/projects/priceiq && git add src/lib/discovery/discoverCompetitors.ts src/lib/discovery/discoverCompetitors.test.ts && git commit -m "feat: discoverCompetitors orchestrator (search, filter, scrape-verify)"
```

---

### Task 8: Settings API — GET/PUT /api/settings/competitors

**Files:**
- Create: `src/app/api/settings/competitors/route.ts`
- Test: `src/app/api/settings/competitors/route.test.ts`

Copy the mocking approach from an existing route test (e.g. `src/app/api/refresh/route.test.ts`): mock `@/lib/db` and `@/lib/auth/requireSession` with `vi.mock`, then import the route.

- [ ] **Step 1: Write the failing tests**

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const findMany = vi.fn();
const deleteMany = vi.fn();
const createMany = vi.fn();
const txn = vi.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
  fn({ competitorDomain: { deleteMany, createMany } }),
);

vi.mock("@/lib/db", () => ({
  prisma: {
    competitorDomain: { findMany, deleteMany, createMany },
    $transaction: txn,
  },
}));
vi.mock("@/lib/auth/requireSession", () => ({
  requireSessionApi: vi.fn(async () => ({ user: { id: "u1" }, merchantId: "m1" })),
}));

import { GET, PUT } from "./route";

beforeEach(() => {
  vi.clearAllMocks();
  findMany.mockResolvedValue([{ domain: "walmart.com" }, { domain: "target.com" }]);
});

describe("GET /api/settings/competitors", () => {
  it("returns the merchant's domains", async () => {
    const res = await GET(new Request("http://t/api/settings/competitors"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ domains: ["walmart.com", "target.com"] });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { merchantId: "m1" } }),
    );
  });
});

describe("PUT /api/settings/competitors", () => {
  function put(body: unknown): Request {
    return new Request("http://t/api/settings/competitors", {
      method: "PUT",
      body: JSON.stringify(body),
      headers: { "content-type": "application/json" },
    });
  }

  it("normalizes, dedups, replaces the list, and reports rejections", async () => {
    const res = await PUT(put({ domains: ["https://www.Walmart.com/x", "walmart.com", "not a domain", "target.com"] }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      domains: ["walmart.com", "target.com"],
      rejected: ["not a domain"],
    });
    expect(deleteMany).toHaveBeenCalledWith({ where: { merchantId: "m1" } });
    expect(createMany).toHaveBeenCalledWith({
      data: [
        { merchantId: "m1", domain: "walmart.com" },
        { merchantId: "m1", domain: "target.com" },
      ],
    });
  });

  it("400s when domains is not a string array", async () => {
    expect((await PUT(put({ domains: "walmart.com" }))).status).toBe(400);
    expect((await PUT(put({}))).status).toBe(400);
    expect((await PUT(put({ domains: [1, 2] }))).status).toBe(400);
  });

  it("accepts an empty list (clears all)", async () => {
    const res = await PUT(put({ domains: [] }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ domains: [], rejected: [] });
    expect(createMany).not.toHaveBeenCalled();
    expect(deleteMany).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd /c/Users/pohde/projects/priceiq && npx vitest run src/app/api/settings/competitors/route.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withErrorHandling, HttpError } from "@/lib/api/errors";
import { parseJsonBody } from "@/lib/api/validation";
import { requireSessionApi } from "@/lib/auth/requireSession";
import { normalizeDomain } from "@/lib/discovery/domain";

export const GET = withErrorHandling(async () => {
  const { merchantId } = await requireSessionApi();
  const rows = await prisma.competitorDomain.findMany({
    where: { merchantId },
    orderBy: { createdAt: "asc" },
    select: { domain: true },
  });
  return NextResponse.json({ domains: rows.map((r) => r.domain) });
});

export const PUT = withErrorHandling(async (req: Request) => {
  const { merchantId } = await requireSessionApi();
  const body = await parseJsonBody(req);
  const raw = body.domains;
  if (!Array.isArray(raw) || raw.some((d) => typeof d !== "string")) {
    throw new HttpError(400, "domains must be an array of strings");
  }

  const domains: string[] = [];
  const rejected: string[] = [];
  for (const entry of raw as string[]) {
    const normalized = normalizeDomain(entry);
    if (normalized === null) rejected.push(entry);
    else if (!domains.includes(normalized)) domains.push(normalized);
  }

  await prisma.$transaction(async (tx) => {
    await tx.competitorDomain.deleteMany({ where: { merchantId } });
    if (domains.length > 0) {
      await tx.competitorDomain.createMany({ data: domains.map((domain) => ({ merchantId, domain })) });
    }
  });

  return NextResponse.json({ domains, rejected });
});
```

- [ ] **Step 4: Run to verify pass**

Run: `cd /c/Users/pohde/projects/priceiq && npx vitest run src/app/api/settings/competitors/route.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd /c/Users/pohde/projects/priceiq && git add "src/app/api/settings/competitors/route.ts" "src/app/api/settings/competitors/route.test.ts" && git commit -m "feat: settings API for saved competitor domains"
```

---

### Task 9: Discover route — POST /api/products/[id]/discover

**Files:**
- Create: `src/app/api/products/[id]/discover/route.ts`
- Test: `src/app/api/products/[id]/discover/route.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const productFindUnique = vi.fn();
const domainFindMany = vi.fn();
const competitorFindMany = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    product: { findUnique: productFindUnique },
    competitorDomain: { findMany: domainFindMany },
    competitorPrice: { findMany: competitorFindMany },
  },
}));
vi.mock("@/lib/auth/requireSession", () => ({
  requireSessionApi: vi.fn(async () => ({ user: { id: "u1" }, merchantId: "m1" })),
}));

const getSearchProvider = vi.fn();
vi.mock("@/lib/discovery/searchProvider", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getSearchProvider: (...a: unknown[]) => getSearchProvider(...a),
}));

const discoverCompetitors = vi.fn();
vi.mock("@/lib/discovery/discoverCompetitors", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  discoverCompetitors: (...a: unknown[]) => discoverCompetitors(...a),
}));

import { POST } from "./route";

function post(body: unknown): Request {
  return new Request("http://t/api/products/p1/discover", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}
const ctx = { params: Promise.resolve({ id: "p1" }) };

beforeEach(() => {
  vi.clearAllMocks();
  productFindUnique.mockResolvedValue({
    id: "p1",
    merchantId: "m1",
    title: "Ceramic Mug",
    currentPrice: 1500,
    merchant: { storeUrl: "https://mystore.example" },
  });
  domainFindMany.mockResolvedValue([{ domain: "walmart.com" }]);
  competitorFindMany.mockResolvedValue([{ competitorUrl: "https://tracked.com/x" }]);
  getSearchProvider.mockReturnValue({ name: "test", search: vi.fn() });
  discoverCompetitors.mockResolvedValue({ candidates: [], skipped: [] });
});

describe("POST /api/products/[id]/discover", () => {
  it("runs discovery with data assembled from the DB", async () => {
    const res = await POST(post({ mode: "both" }), ctx);
    expect(res.status).toBe(200);
    expect(discoverCompetitors).toHaveBeenCalledWith(
      {
        productTitle: "Ceramic Mug",
        currentPriceCents: 1500,
        ownDomain: "mystore.example",
        savedDomains: ["walmart.com"],
        existingCompetitorDomains: ["tracked.com"],
        mode: "both",
      },
      expect.objectContaining({ provider: expect.anything() }),
    );
  });

  it("503s with no_provider when no provider is configured", async () => {
    getSearchProvider.mockReturnValue(null);
    const res = await POST(post({ mode: "open" }), ctx);
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ reason: "no_provider" });
  });

  it("400s on saved/both modes with an empty saved list", async () => {
    domainFindMany.mockResolvedValue([]);
    expect((await POST(post({ mode: "saved" }), ctx)).status).toBe(400);
    expect((await POST(post({ mode: "both" }), ctx)).status).toBe(400);
    expect((await POST(post({ mode: "open" }), ctx)).status).toBe(200);
  });

  it("400s on an invalid mode", async () => {
    expect((await POST(post({ mode: "nope" }), ctx)).status).toBe(400);
    expect((await POST(post({}), ctx)).status).toBe(400);
  });

  it("404s on a foreign product", async () => {
    productFindUnique.mockResolvedValue({ id: "p1", merchantId: "OTHER", title: "x", currentPrice: 1, merchant: { storeUrl: "" } });
    expect((await POST(post({ mode: "open" }), ctx)).status).toBe(404);
  });

  it("passes providerError through as 200-with-data", async () => {
    discoverCompetitors.mockResolvedValue({ candidates: [], skipped: [], providerError: "rate_limited" });
    const res = await POST(post({ mode: "open" }), ctx);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ candidates: [], skipped: [], providerError: "rate_limited" });
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd /c/Users/pohde/projects/priceiq && npx vitest run "src/app/api/products/[id]/discover/route.test.ts"`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withErrorHandling, HttpError } from "@/lib/api/errors";
import { parseJsonBody } from "@/lib/api/validation";
import { requireSessionApi } from "@/lib/auth/requireSession";
import { normalizeDomain } from "@/lib/discovery/domain";
import { getSearchProvider } from "@/lib/discovery/searchProvider";
import {
  discoverCompetitors,
  type DiscoveryMode,
} from "@/lib/discovery/discoverCompetitors";

const MODES: DiscoveryMode[] = ["saved", "open", "both"];

export const POST = withErrorHandling(
  async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { merchantId } = await requireSessionApi();
    const { id } = await params;

    const body = await parseJsonBody(req);
    const mode = body.mode as DiscoveryMode;
    if (!MODES.includes(mode)) throw new HttpError(400, "mode must be saved | open | both");

    // Inline ownership check (assertProductOwned would cost a second query —
    // we need the product row anyway).
    const product = await prisma.product.findUnique({
      where: { id },
      include: { merchant: { select: { storeUrl: true } } },
    });
    if (!product || product.merchantId !== merchantId) throw new HttpError(404, "Not found");

    const provider = getSearchProvider();
    if (provider === null) {
      return NextResponse.json({ reason: "no_provider" }, { status: 503 });
    }

    const savedRows = await prisma.competitorDomain.findMany({
      where: { merchantId },
      select: { domain: true },
    });
    const savedDomains = savedRows.map((r) => r.domain);
    if (mode !== "open" && savedDomains.length === 0) {
      throw new HttpError(400, "No saved competitors — add some in Settings or use web search");
    }

    const tracked = await prisma.competitorPrice.findMany({
      where: { productId: id },
      select: { competitorUrl: true },
    });
    const existingCompetitorDomains = tracked
      .map((t) => (t.competitorUrl ? normalizeDomain(t.competitorUrl) : null))
      .filter((d): d is string => d !== null);

    const out = await discoverCompetitors(
      {
        productTitle: product.title,
        currentPriceCents: product.currentPrice,
        ownDomain: normalizeDomain(product.merchant.storeUrl),
        savedDomains,
        existingCompetitorDomains,
        mode,
      },
      { provider },
    );
    return NextResponse.json(out);
  },
);
```

- [ ] **Step 4: Run to verify pass**

Run: `cd /c/Users/pohde/projects/priceiq && npx vitest run "src/app/api/products/[id]/discover/route.test.ts"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd /c/Users/pohde/projects/priceiq && git add "src/app/api/products/[id]/discover" && git commit -m "feat: discovery API route"
```

---

### Task 10: Confirm route — POST /api/products/[id]/competitors

**Files:**
- Create: `src/app/api/products/[id]/competitors/route.ts`
- Test: `src/app/api/products/[id]/competitors/route.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const productFindUnique = vi.fn();
vi.mock("@/lib/db", () => ({
  prisma: { product: { findUnique: productFindUnique } },
}));
vi.mock("@/lib/auth/requireSession", () => ({
  requireSessionApi: vi.fn(async () => ({ user: { id: "u1" }, merchantId: "m1" })),
}));
const recordObservation = vi.fn(async () => {});
vi.mock("@/lib/scrape/recordObservation", () => ({
  recordObservation: (...a: unknown[]) => recordObservation(...a),
}));

import { POST } from "./route";

function post(body: unknown): Request {
  return new Request("http://t/api/products/p1/competitors", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}
const ctx = { params: Promise.resolve({ id: "p1" }) };

beforeEach(() => {
  vi.clearAllMocks();
  productFindUnique.mockResolvedValue({ id: "p1", merchantId: "m1" });
});

describe("POST /api/products/[id]/competitors", () => {
  it("records each candidate with source discovery and returns the count", async () => {
    const res = await POST(
      post({
        candidates: [
          { url: "https://walmart.com/ip/mug", competitorName: "walmart.com", priceCents: 1499 },
          { url: "https://target.com/p/mug", competitorName: "Target", priceCents: 1550 },
        ],
      }),
      ctx,
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ added: 2 });
    expect(recordObservation).toHaveBeenCalledTimes(2);
    expect(recordObservation).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        productId: "p1",
        competitorName: "walmart.com",
        competitorUrl: "https://walmart.com/ip/mug",
        priceCents: 1499,
        source: "discovery",
      }),
    );
  });

  it("400s on malformed candidates", async () => {
    expect((await POST(post({}), ctx)).status).toBe(400);
    expect((await POST(post({ candidates: "x" }), ctx)).status).toBe(400);
    expect((await POST(post({ candidates: [{ url: "https://a.com" }] }), ctx)).status).toBe(400); // missing fields
    expect(
      (await POST(post({ candidates: [{ url: "https://a.com", competitorName: "a", priceCents: -5 }] }), ctx)).status,
    ).toBe(400); // negative price
    expect((await POST(post({ candidates: [] }), ctx)).status).toBe(400); // empty
    expect(recordObservation).not.toHaveBeenCalled();
  });

  it("404s on a foreign product without recording anything", async () => {
    productFindUnique.mockResolvedValue({ id: "p1", merchantId: "OTHER" });
    const res = await POST(
      post({ candidates: [{ url: "https://a.com/x", competitorName: "a", priceCents: 100 }] }),
      ctx,
    );
    expect(res.status).toBe(404);
    expect(recordObservation).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd /c/Users/pohde/projects/priceiq && npx vitest run "src/app/api/products/[id]/competitors/route.test.ts"`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withErrorHandling, HttpError } from "@/lib/api/errors";
import { parseJsonBody } from "@/lib/api/validation";
import { requireSessionApi } from "@/lib/auth/requireSession";
import { assertProductOwned } from "@/lib/auth/ownership";
import { recordObservation } from "@/lib/scrape/recordObservation";

interface ConfirmedCandidate {
  url: string;
  competitorName: string;
  priceCents: number;
}

function parseCandidates(value: unknown): ConfirmedCandidate[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new HttpError(400, "candidates must be a non-empty array");
  }
  return value.map((raw) => {
    const c = raw as Record<string, unknown>;
    if (
      typeof c.url !== "string" || c.url === "" ||
      typeof c.competitorName !== "string" || c.competitorName === "" ||
      typeof c.priceCents !== "number" || !Number.isInteger(c.priceCents) || c.priceCents < 0
    ) {
      throw new HttpError(400, "each candidate needs url, competitorName, and non-negative integer priceCents");
    }
    return { url: c.url, competitorName: c.competitorName, priceCents: c.priceCents };
  });
}

export const POST = withErrorHandling(
  async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { merchantId } = await requireSessionApi();
    const { id } = await params;
    const body = await parseJsonBody(req);
    const candidates = parseCandidates(body.candidates);
    await assertProductOwned(prisma, id, merchantId);

    for (const c of candidates) {
      await recordObservation(prisma, {
        productId: id,
        competitorName: c.competitorName,
        competitorUrl: c.url,
        priceCents: c.priceCents,
        source: "discovery",
      });
    }
    return NextResponse.json({ added: candidates.length });
  },
);
```

Note: `assertProductOwned` takes the full `PrismaClient` type; the test's stub prisma only has `product.findUnique`, which is all it uses — if TS complains in the route about the mock, that's test-side only and fine.

- [ ] **Step 4: Run to verify pass**

Run: `cd /c/Users/pohde/projects/priceiq && npx vitest run "src/app/api/products/[id]/competitors/route.test.ts"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd /c/Users/pohde/projects/priceiq && git add "src/app/api/products/[id]/competitors" && git commit -m "feat: confirm-candidates API route"
```

---

### Task 11: DiscoverCompetitors component

**Files:**
- Create: `src/components/DiscoverCompetitors.tsx`
- Test: `src/components/DiscoverCompetitors.test.tsx`
- Modify: `src/app/product/[id]/page.tsx` (mount it under ManageCompetitors)

Copy test setup style from `src/components/ProductsTable.test.tsx` (its `stubApi` fetch-router pattern, `@testing-library/react` + `user-event`, no jest-dom — use `.disabled`).

- [ ] **Step 1: Write the failing tests**

```tsx
import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DiscoverCompetitors } from "./DiscoverCompetitors";

type Handler = (init?: RequestInit) => { status: number; body: unknown };

function stubApi(routes: Record<string, Handler>) {
  const calls: { url: string; init?: RequestInit }[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      calls.push({ url, init });
      for (const [prefix, handler] of Object.entries(routes)) {
        if (url.includes(prefix)) {
          const { status, body } = handler(init);
          return new Response(JSON.stringify(body), { status });
        }
      }
      throw new Error(`unexpected fetch: ${url}`);
    }),
  );
  return calls;
}

const SETTINGS = { "/api/settings/competitors": () => ({ status: 200, body: { domains: ["walmart.com"] } }) };
const CANDIDATES = [
  { url: "https://walmart.com/ip/mug", domain: "walmart.com", title: "Ceramic Mug", priceCents: 1499 },
  { url: "https://target.com/p/mug", domain: "target.com", title: "Mug 12oz", priceCents: 1550 },
];

beforeEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("DiscoverCompetitors", () => {
  it("disables saved-list modes when the saved list is empty", async () => {
    stubApi({ "/api/settings/competitors": () => ({ status: 200, body: { domains: [] } }) });
    render(<DiscoverCompetitors productId="p1" />);
    const select = (await screen.findByLabelText("Search using")) as HTMLSelectElement;
    const options = Array.from(select.options);
    expect(options.find((o) => o.value === "saved")?.disabled).toBe(true);
    expect(options.find((o) => o.value === "both")?.disabled).toBe(true);
    expect(options.find((o) => o.value === "open")?.disabled).toBe(false);
    expect(screen.getByText(/add competitors in settings/i)).toBeTruthy();
  });

  it("shows busy state then a review list with prices", async () => {
    stubApi({
      ...SETTINGS,
      "/discover": () => ({ status: 200, body: { candidates: CANDIDATES, skipped: [{ url: "x", reason: "no_price_found" }] } }),
    });
    render(<DiscoverCompetitors productId="p1" />);
    await userEvent.click(await screen.findByRole("button", { name: "Find competitors" }));
    expect(await screen.findByText("walmart.com")).toBeTruthy();
    expect(screen.getByText("$14.99")).toBeTruthy();
    expect(screen.getByText("$15.50")).toBeTruthy();
    expect(screen.getByText(/3 results found, 2 verified/i)).toBeTruthy();
  });

  it("posts only checked candidates with edited names, then reloads", async () => {
    const calls = stubApi({
      ...SETTINGS,
      "/discover": () => ({ status: 200, body: { candidates: CANDIDATES, skipped: [] } }),
      "/competitors": () => ({ status: 200, body: { added: 1 } }),
    });
    const reload = vi.fn();
    // window.location.reload throws in jsdom; replace it.
    Object.defineProperty(window, "location", {
      value: { ...window.location, reload },
      writable: true,
    });
    render(<DiscoverCompetitors productId="p1" />);
    await userEvent.click(await screen.findByRole("button", { name: "Find competitors" }));
    await screen.findByText("walmart.com");
    // Uncheck the second candidate, rename the first.
    await userEvent.click(screen.getAllByRole("checkbox")[1]);
    const nameInput = screen.getAllByLabelText("Competitor name")[0];
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "Walmart");
    await userEvent.click(screen.getByRole("button", { name: /add 1 selected/i }));
    const confirm = calls.find((c) => c.url.includes("/api/products/p1/competitors"));
    expect(JSON.parse(String(confirm?.init?.body))).toEqual({
      candidates: [{ url: "https://walmart.com/ip/mug", competitorName: "Walmart", priceCents: 1499 }],
    });
    expect(reload).toHaveBeenCalled();
  });

  it("shows the empty message when nothing verifies", async () => {
    stubApi({ ...SETTINGS, "/discover": () => ({ status: 200, body: { candidates: [], skipped: [{ url: "x", reason: "timeout" }] } }) });
    render(<DiscoverCompetitors productId="p1" />);
    await userEvent.click(await screen.findByRole("button", { name: "Find competitors" }));
    expect(await screen.findByText(/no competitors found with a confirmed price/i)).toBeTruthy();
  });

  it("shows an error on providerError", async () => {
    stubApi({ ...SETTINGS, "/discover": () => ({ status: 200, body: { candidates: [], skipped: [], providerError: "rate_limited" } }) });
    render(<DiscoverCompetitors productId="p1" />);
    await userEvent.click(await screen.findByRole("button", { name: "Find competitors" }));
    expect(await screen.findByText(/search failed — try again/i)).toBeTruthy();
  });

  it("shows the setup hint on 503 no_provider", async () => {
    stubApi({ ...SETTINGS, "/discover": () => ({ status: 503, body: { reason: "no_provider" } }) });
    render(<DiscoverCompetitors productId="p1" />);
    await userEvent.click(await screen.findByRole("button", { name: "Find competitors" }));
    expect(await screen.findByText(/BRAVE_SEARCH_API_KEY/)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd /c/Users/pohde/projects/priceiq && npx vitest run src/components/DiscoverCompetitors.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```tsx
"use client";
import { useEffect, useState } from "react";
import { formatCents } from "@/lib/money";

interface Candidate {
  url: string;
  domain: string;
  title: string;
  priceCents: number;
}

interface Row extends Candidate {
  checked: boolean;
  name: string;
}

type Mode = "saved" | "open" | "both";

export function DiscoverCompetitors({ productId }: { productId: string }) {
  const [savedDomains, setSavedDomains] = useState<string[] | null>(null);
  const [mode, setMode] = useState<Mode>("both");
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/settings/competitors")
      .then((r) => (r.ok ? r.json() : { domains: [] }))
      .then((j) => {
        if (!active) return;
        setSavedDomains(j.domains);
        if (j.domains.length === 0) setMode("open");
      })
      .catch(() => active && setSavedDomains([]));
    return () => {
      active = false;
    };
  }, []);

  const noSaved = savedDomains !== null && savedDomains.length === 0;

  async function discover() {
    setBusy(true);
    setError(null);
    setRows(null);
    setSummary(null);
    try {
      const res = await fetch(`/api/products/${productId}/discover`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      const j = await res.json();
      if (res.status === 503) {
        setError("Competitor discovery requires a search API key (BRAVE_SEARCH_API_KEY).");
        return;
      }
      if (!res.ok) throw new Error("discover failed");
      if (j.providerError) {
        setError("Search failed — try again.");
        return;
      }
      const found = j.candidates.length + j.skipped.length;
      setSummary(`${found} results found, ${j.candidates.length} verified`);
      setRows(
        (j.candidates as Candidate[]).map((c) => ({ ...c, checked: true, name: c.domain })),
      );
    } catch {
      setError("Search failed — try again.");
    } finally {
      setBusy(false);
    }
  }

  async function addSelected() {
    if (!rows) return;
    const selected = rows.filter((r) => r.checked);
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/products/${productId}/competitors`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          candidates: selected.map((r) => ({
            url: r.url,
            competitorName: r.name,
            priceCents: r.priceCents,
          })),
        }),
      });
      if (!res.ok) throw new Error("confirm failed");
      window.location.reload();
    } catch {
      setError("Couldn't add competitors — try again.");
      setBusy(false);
    }
  }

  const selectedCount = rows?.filter((r) => r.checked).length ?? 0;

  return (
    <div className="rounded-xl border border-line bg-surface p-5">
      <h2 className="text-sm font-semibold text-ink">Find competitors</h2>

      <div className="mt-3 flex items-center gap-2">
        <label htmlFor="discover-mode" className="text-sm text-muted">
          Search using
        </label>
        <select
          id="discover-mode"
          className="rounded border border-line bg-surface px-2 py-1 text-sm"
          value={mode}
          onChange={(e) => setMode(e.target.value as Mode)}
          disabled={busy}
        >
          <option value="saved" disabled={noSaved}>My saved competitors</option>
          <option value="open">Web search</option>
          <option value="both" disabled={noSaved}>Both</option>
        </select>
        <button className="btn btn-ghost" disabled={busy || savedDomains === null} onClick={discover}>
          {busy && rows === null ? "Searching…" : "Find competitors"}
        </button>
      </div>

      {noSaved && (
        <p className="mt-2 text-sm text-faint">
          No saved competitors yet — add competitors in Settings to search their sites directly.
        </p>
      )}

      {summary && <p className="mt-3 text-sm text-faint">{summary}</p>}

      {rows && rows.length === 0 && (
        <p className="mt-3 text-sm text-muted">No competitors found with a confirmed price.</p>
      )}

      {rows && rows.length > 0 && (
        <>
          <ul className="mt-3 divide-y divide-line text-sm">
            {rows.map((r, i) => (
              <li key={r.url} className="flex items-center gap-3 py-2">
                <input
                  type="checkbox"
                  checked={r.checked}
                  onChange={() =>
                    setRows(rows.map((x, j) => (j === i ? { ...x, checked: !x.checked } : x)))
                  }
                />
                <div className="min-w-0 flex-1">
                  <span className="text-ink">{r.domain}</span>
                  <span className="ml-2 truncate text-faint">{r.title}</span>
                  <div className="mt-0.5">
                    <input
                      aria-label="Competitor name"
                      className="w-40 rounded border border-line bg-surface px-1 py-0.5 text-sm"
                      value={r.name}
                      onChange={(e) =>
                        setRows(rows.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))
                      }
                    />
                  </div>
                </div>
                <span className="tabular text-ink">{formatCents(r.priceCents)}</span>
              </li>
            ))}
          </ul>
          <button
            className="btn mt-3"
            disabled={busy || selectedCount === 0}
            onClick={addSelected}
          >
            {busy ? "Adding…" : `Add ${selectedCount} selected`}
          </button>
        </>
      )}

      {error && (
        <p className="mt-3 text-sm text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
```

(Check `src/app/globals.css` / other components for the right primary-button class — ManageCompetitors uses `btn btn-ghost`; if a filled variant like `btn btn-primary` exists, use it for "Add selected".)

- [ ] **Step 4: Run to verify pass**

Run: `cd /c/Users/pohde/projects/priceiq && npx vitest run src/components/DiscoverCompetitors.test.tsx`
Expected: PASS (6 tests).

- [ ] **Step 5: Mount on the product page**

In `src/app/product/[id]/page.tsx`, import and render below `<ManageCompetitors …/>` (same column/container):

```tsx
import { DiscoverCompetitors } from "@/components/DiscoverCompetitors";
// …in the JSX, directly after the ManageCompetitors element:
<DiscoverCompetitors productId={id} />
```

- [ ] **Step 6: Full test run + typecheck**

Run: `cd /c/Users/pohde/projects/priceiq && npm test && npx tsc --noEmit`
Expected: all tests pass, no TS errors.

- [ ] **Step 7: Commit**

```bash
cd /c/Users/pohde/projects/priceiq && git add src/components/DiscoverCompetitors.tsx src/components/DiscoverCompetitors.test.tsx "src/app/product/[id]/page.tsx" && git commit -m "feat: DiscoverCompetitors UI on the product page"
```

---

### Task 12: CompetitorSettings component + /settings page + dashboard link

**Files:**
- Create: `src/components/CompetitorSettings.tsx`
- Create: `src/app/settings/page.tsx`
- Test: `src/components/CompetitorSettings.test.tsx`
- Modify: `src/app/page.tsx` (header link to /settings)

- [ ] **Step 1: Write the failing tests**

```tsx
import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CompetitorSettings } from "./CompetitorSettings";

function stubApi(handlers: { get?: () => unknown; put?: (body: unknown) => { status: number; body: unknown } }) {
  const puts: unknown[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if ((init?.method ?? "GET") === "GET") {
        return new Response(JSON.stringify(handlers.get?.() ?? { domains: [] }), { status: 200 });
      }
      const body = JSON.parse(String(init?.body));
      puts.push(body);
      const res = handlers.put?.(body) ?? { status: 200, body: { domains: body.domains, rejected: [] } };
      return new Response(JSON.stringify(res.body), { status: res.status });
    }),
  );
  return puts;
}

beforeEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("CompetitorSettings", () => {
  it("lists saved domains", async () => {
    stubApi({ get: () => ({ domains: ["walmart.com", "target.com"] }) });
    render(<CompetitorSettings />);
    expect(await screen.findByText("walmart.com")).toBeTruthy();
    expect(screen.getByText("target.com")).toBeTruthy();
  });

  it("adds a domain via the input and saves the full list", async () => {
    const puts = stubApi({ get: () => ({ domains: ["walmart.com"] }) });
    render(<CompetitorSettings />);
    await screen.findByText("walmart.com");
    await userEvent.type(screen.getByLabelText("Add competitor"), "https://www.Target.com/x");
    await userEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(await screen.findByText("target.com")).toBeTruthy();
    expect(puts).toEqual([{ domains: ["walmart.com", "target.com"] }]);
  });

  it("removes a domain and saves", async () => {
    const puts = stubApi({ get: () => ({ domains: ["walmart.com", "target.com"] }) });
    render(<CompetitorSettings />);
    await screen.findByText("walmart.com");
    await userEvent.click(screen.getAllByRole("button", { name: "Remove" })[0]);
    expect(puts).toEqual([{ domains: ["target.com"] }]);
  });

  it("shows a validation message for a rejected entry", async () => {
    stubApi({
      get: () => ({ domains: [] }),
      put: () => ({ status: 200, body: { domains: [], rejected: ["not a domain"] } }),
    });
    render(<CompetitorSettings />);
    await screen.findByLabelText("Add competitor");
    await userEvent.type(screen.getByLabelText("Add competitor"), "not a domain");
    await userEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(await screen.findByText(/isn't a valid domain/i)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd /c/Users/pohde/projects/priceiq && npx vitest run src/components/CompetitorSettings.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the component**

```tsx
"use client";
import { useEffect, useState } from "react";

// Editor for the merchant's saved competitor domains. Client-side state is a
// simple string list; every add/remove PUTs the whole list (the API replaces).
export function CompetitorSettings() {
  const [domains, setDomains] = useState<string[] | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/settings/competitors")
      .then((r) => (r.ok ? r.json() : { domains: [] }))
      .then((j) => active && setDomains(j.domains))
      .catch(() => active && setDomains([]));
    return () => {
      active = false;
    };
  }, []);

  async function save(next: string[], attempted?: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/settings/competitors", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ domains: next }),
      });
      if (!res.ok) throw new Error("save failed");
      const j = await res.json();
      setDomains(j.domains);
      if (attempted && j.rejected.includes(attempted)) {
        setError(`"${attempted}" isn't a valid domain.`);
      } else {
        setDraft("");
      }
    } catch {
      setError("Couldn't save — try again.");
    } finally {
      setBusy(false);
    }
  }

  if (domains === null) return <p className="text-sm text-muted">Loading…</p>;

  return (
    <div className="rounded-xl border border-line bg-surface p-5">
      <h2 className="text-sm font-semibold text-ink">Saved competitors</h2>
      <p className="mt-1 text-sm text-muted">
        Sites you compete with. "Find competitors" searches these directly.
      </p>

      {domains.length > 0 && (
        <ul className="mt-3 divide-y divide-line text-sm">
          {domains.map((d) => (
            <li key={d} className="flex items-center justify-between py-2">
              <span className="text-ink">{d}</span>
              <button
                className="btn btn-ghost"
                disabled={busy}
                onClick={() => save(domains.filter((x) => x !== d))}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (draft.trim() !== "") save([...domains, draft], draft);
        }}
      >
        <input
          aria-label="Add competitor"
          className="flex-1 rounded border border-line bg-surface px-2 py-1 text-sm"
          placeholder="e.g. walmart.com"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={busy}
        />
        <button type="submit" className="btn btn-ghost" disabled={busy || draft.trim() === ""}>
          Add
        </button>
      </form>

      {error && (
        <p className="mt-3 text-sm text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run to verify pass**

Run: `cd /c/Users/pohde/projects/priceiq && npx vitest run src/components/CompetitorSettings.test.tsx`
Expected: PASS.

- [ ] **Step 5: Settings page + dashboard link**

`src/app/settings/page.tsx` — follow the shape of existing pages; server component gating via `requireSessionPage` (check how `src/app/page.tsx` gates — if the dashboard is a client component redirecting on 401, match the simpler client pattern instead):

```tsx
import Link from "next/link";
import { requireSessionPage } from "@/lib/auth/requireSession";
import { CompetitorSettings } from "@/components/CompetitorSettings";

export default async function SettingsPage() {
  await requireSessionPage();
  return (
    <main className="mx-auto max-w-2xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-ink">Settings</h1>
        <Link href="/" className="text-sm text-muted hover:text-ink">
          ← Dashboard
        </Link>
      </div>
      <CompetitorSettings />
    </main>
  );
}
```

In `src/app/page.tsx`, add next to the existing header controls (logout button or similar):

```tsx
<Link href="/settings" className="text-sm text-muted hover:text-ink">Settings</Link>
```

(Import `Link` from `next/link` if not already imported.)

- [ ] **Step 6: Full test run + typecheck + build**

Run: `cd /c/Users/pohde/projects/priceiq && npm test && npm run build`
Expected: all tests pass; build succeeds (catches App Router mistakes).

- [ ] **Step 7: Commit**

```bash
cd /c/Users/pohde/projects/priceiq && git add src/components/CompetitorSettings.tsx src/components/CompetitorSettings.test.tsx src/app/settings src/app/page.tsx && git commit -m "feat: competitor settings page + dashboard link"
```

---

### Task 13: Live verification + handover doc

**Files:**
- Modify: `docs/HANDOVER.md`

- [ ] **Step 1: Live smoke test with the fixture provider**

```bash
cd /c/Users/pohde/projects/priceiq && rm -rf .next
```
Then start the dev server in the background with `SEARCH_PROVIDER=fixture` (e.g. `SEARCH_PROVIDER=fixture npm run dev`, `run_in_background: true`). Wait for ready, then verify with curl (session cookie required — log in first):

```bash
# login, capture cookie
curl -s -c /tmp/cj -X POST http://localhost:3000/api/auth/login -H "content-type: application/json" -d '{"email":"demo@priceiq.example","password":"demo1234"}'
# find the Ceramic Mug product id
curl -s -b /tmp/cj http://localhost:3000/api/products | head -c 2000
# discover (use the real id)
curl -s -b /tmp/cj -X POST http://localhost:3000/api/products/<ID>/discover -H "content-type: application/json" -d '{"mode":"open"}'
```

Expected: discover returns one candidate for `localhost:3000/demo-competitor.html` with `priceCents: 1325` (or current demo-page price). Then confirm:

```bash
curl -s -b /tmp/cj -X POST http://localhost:3000/api/products/<ID>/competitors -H "content-type: application/json" -d '{"candidates":[{"url":"http://localhost:3000/demo-competitor.html","competitorName":"LocalDemoShop-Discovered","priceCents":1325}]}'
```

Expected: `{"added":1}`; `GET /api/products/<ID>` now lists the new competitor. Note: if the demo product already tracks that URL's domain (localhost), discovery will filter it — pick a product that doesn't, or temporarily use a different SKU's product.

- [ ] **Step 2: Verify no-provider path**

Restart the server without `SEARCH_PROVIDER`/`BRAVE_SEARCH_API_KEY`; the same discover call must return `503 {"reason":"no_provider"}`.

- [ ] **Step 3: Update HANDOVER.md**

Add a "Most recent work" section describing: discovery module layout, the three routes, the two components, `SEARCH_PROVIDER=fixture` demo flow, `BRAVE_SEARCH_API_KEY` env var, new test count (run `npm test` and record the real number), and move "Real competitor discovery" out of Next steps.

- [ ] **Step 4: Final full run + commit**

```bash
cd /c/Users/pohde/projects/priceiq && npm test && git add docs/HANDOVER.md && git commit -m "docs: competitor discovery complete"
```

---

## Self-review notes (already applied)

- Spec coverage: schema (T1), source union (T2), normalize (T3), provider interface/selection (T4), Brave (T5), fixture (T6), orchestrator incl. queries/dedup/cap/band/skipped (T7), settings API (T8), discover route incl. 503/400/404/providerError (T9), confirm route (T10), product-page UI incl. all states (T11), settings UI + page + link (T12), live verify + docs (T13). Deferred items from the spec have no tasks by design.
- Type names consistent: `SearchResult`/`SearchProvider`/`SearchProviderResult` (T4) used in T5–T7; `DiscoveryInput`/`Candidate`/`DiscoveryOutput` (T7) used in T9; confirm body shape (T10) matches what T11 posts.
- The discover route inlines its ownership check (needs the product row anyway) — intentional deviation from `assertProductOwned`, noted in code.
