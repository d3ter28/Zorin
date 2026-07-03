# SSRF Hardening of `fetchPage` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent the competitor-price scraper from being used as an SSRF vector: only http/https URLs whose hosts resolve to public IPs may be fetched, with every redirect hop re-validated — while keeping the localhost demo working in development.

**Architecture:** A new pure module `src/lib/scrape/urlGuard.ts` owns all validation (scheme allowlist, IP classification, DNS resolution with injectable lookup). `fetchPage` calls the guard on the initial URL, switches to `redirect: "manual"`, and re-validates each redirect Location (max 5 hops). Blocked fetches stay failure-as-data: `FetchResult` gains `blocked?: true`, and `scrapeOne` maps it to a new `ScrapeFailureReason` of `"blocked_url"`. Private/loopback targets are permitted when `NODE_ENV !== "production"` or `SCRAPE_ALLOW_PRIVATE === "1"` so the local demo (`http://localhost:3000/demo-competitor.html`) is unaffected.

**Known residual risk (accepted, documented):** validate-then-fetch leaves a DNS-rebinding TOCTOU window (attacker DNS answers public IP during validation, private IP during fetch). Closing it requires pinning the connection IP via a custom undici dispatcher — out of scope for this slice; noted in code comment and HANDOVER.

**Tech Stack:** Node 24 built-in `fetch`, `node:dns/promises` (`lookup`), `node:net` (`isIP`), Vitest 4 (node env, no jsdom), TypeScript. Money/DB untouched.

**Project gotchas for the implementer:**
- Bash commands run from `C:\Users\pohde` — **always prefix with `cd /c/Users/pohde/projects/priceiq && `**.
- Vitest only picks up `src/**/*.test.ts`. Run a single file: `npx vitest run src/lib/scrape/urlGuard.test.ts`.
- Suite baseline before this work: **125 passing**.
- This repo's Next.js has breaking changes vs training data; this plan touches no Next-specific code (pure lib modules only), so no Next docs reading is needed.

---

## File Structure

- **Create** `src/lib/scrape/urlGuard.ts` — scheme allowlist, `isPrivateIp`, `validateScrapeUrl` (DNS lookup injectable).
- **Create** `src/lib/scrape/urlGuard.test.ts`
- **Modify** `src/lib/scrape/fetcher.ts` — guard integration + manual redirect loop; `FetchResult.blocked`.
- **Modify** `src/lib/scrape/fetcher.test.ts` — blocked + redirect tests.
- **Modify** `src/lib/scrape/scrapeOne.ts` — map `blocked` → `"blocked_url"`.
- **Modify** `src/lib/scrape/scrapeOne.test.ts`
- **Modify** `docs/HANDOVER.md` — mark next-step 1 done, note residual risk.

---

### Task 1: `isPrivateIp` — pure IP classification

**Files:**
- Create: `src/lib/scrape/urlGuard.ts`
- Test: `src/lib/scrape/urlGuard.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/scrape/urlGuard.test.ts
import { describe, expect, it } from "vitest";
import { isPrivateIp } from "./urlGuard";

describe("isPrivateIp", () => {
  it.each([
    "127.0.0.1", "127.255.255.255",      // loopback
    "10.0.0.1", "10.255.255.255",        // RFC1918
    "172.16.0.1", "172.31.255.255",      // RFC1918
    "192.168.1.1",                       // RFC1918
    "169.254.169.254",                   // link-local / cloud metadata
    "100.64.0.1",                        // CGNAT
    "0.0.0.0",                           // "this" network
    "::1",                               // v6 loopback
    "fc00::1", "fdff::1",                // v6 ULA
    "fe80::1",                           // v6 link-local
    "::ffff:127.0.0.1", "::ffff:10.0.0.1", // v4-mapped v6
    "::",                                // unspecified
  ])("classifies %s as private", (ip) => {
    expect(isPrivateIp(ip)).toBe(true);
  });

  it.each([
    "8.8.8.8", "1.1.1.1", "93.184.216.34", // public v4
    "172.15.255.255", "172.32.0.1",        // just outside 172.16/12
    "2606:4700::1111",                      // public v6
    "::ffff:8.8.8.8",                       // v4-mapped public
  ])("classifies %s as public", (ip) => {
    expect(isPrivateIp(ip)).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /c/Users/pohde/projects/priceiq && npx vitest run src/lib/scrape/urlGuard.test.ts`
Expected: FAIL — cannot resolve `./urlGuard` / `isPrivateIp` not exported.

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/scrape/urlGuard.ts
import { isIP } from "node:net";

/**
 * True if the IP must not be scraped: loopback, RFC1918, link-local (incl.
 * cloud metadata 169.254.169.254), CGNAT, unspecified, or IPv6 ULA. IPv4-mapped
 * IPv6 addresses are unwrapped and judged as their embedded IPv4.
 */
export function isPrivateIp(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) return isPrivateV4(ip);
  if (version === 6) return isPrivateV6(ip);
  return true; // not a valid IP — treat as unsafe
}

function isPrivateV4(ip: string): boolean {
  const [a, b] = ip.split(".").map(Number);
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64/10
  return false;
}

function isPrivateV6(ip: string): boolean {
  const lower = ip.toLowerCase();
  // IPv4-mapped (::ffff:a.b.c.d) — judge the embedded IPv4
  const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateV4(mapped[1]);
  if (lower === "::" || lower === "::1") return true;
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // ULA fc00::/7
  if (/^fe[89ab]/.test(lower)) return true; // link-local fe80::/10
  return false;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /c/Users/pohde/projects/priceiq && npx vitest run src/lib/scrape/urlGuard.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
cd /c/Users/pohde/projects/priceiq && git add src/lib/scrape/urlGuard.ts src/lib/scrape/urlGuard.test.ts && git commit -m "feat: private-IP classification for scrape URL guard"
```

---

### Task 2: `validateScrapeUrl` — scheme allowlist + DNS resolution

**Files:**
- Modify: `src/lib/scrape/urlGuard.ts`
- Test: `src/lib/scrape/urlGuard.test.ts`

- [ ] **Step 1: Write the failing tests** (append to `urlGuard.test.ts`)

```ts
import { validateScrapeUrl, type GuardDeps } from "./urlGuard";

// lookup stub: hostname → resolved addresses
function lookupOf(map: Record<string, string[]>): GuardDeps["lookup"] {
  return async (hostname: string) => {
    const addrs = map[hostname];
    if (!addrs) throw new Error(`ENOTFOUND ${hostname}`);
    return addrs.map((address) => ({ address, family: address.includes(":") ? 6 : 4 }));
  };
}

describe("validateScrapeUrl", () => {
  const deps: GuardDeps = { lookup: lookupOf({ "shop.example": ["93.184.216.34"] }) };

  it("accepts a public https URL", async () => {
    const res = await validateScrapeUrl("https://shop.example/p", { deps });
    expect(res).toEqual({ ok: true });
  });

  it("rejects non-http(s) schemes", async () => {
    for (const url of ["file:///etc/passwd", "ftp://shop.example/", "gopher://x/"]) {
      expect(await validateScrapeUrl(url, { deps })).toEqual({ ok: false, reason: "scheme" });
    }
  });

  it("rejects unparseable URLs", async () => {
    expect(await validateScrapeUrl("not a url", { deps })).toEqual({ ok: false, reason: "invalid" });
  });

  it("rejects private IP literals without a DNS lookup", async () => {
    const noLookup: GuardDeps = {
      lookup: async () => { throw new Error("lookup must not be called for IP literals"); },
    };
    expect(await validateScrapeUrl("http://169.254.169.254/latest/meta-data/", { deps: noLookup }))
      .toEqual({ ok: false, reason: "private_ip" });
    expect(await validateScrapeUrl("http://[::1]/", { deps: noLookup }))
      .toEqual({ ok: false, reason: "private_ip" });
  });

  it("rejects hostnames resolving to a private IP (any record)", async () => {
    const d: GuardDeps = { lookup: lookupOf({ "evil.example": ["93.184.216.34", "10.0.0.5"] }) };
    expect(await validateScrapeUrl("https://evil.example/", { deps: d }))
      .toEqual({ ok: false, reason: "private_ip" });
  });

  it("rejects hostnames that fail to resolve", async () => {
    expect(await validateScrapeUrl("https://nxdomain.example/", { deps }))
      .toEqual({ ok: false, reason: "dns" });
  });

  it("allows private targets when allowPrivate is set (demo mode)", async () => {
    const noLookup: GuardDeps = { lookup: async () => [{ address: "127.0.0.1", family: 4 }] };
    expect(await validateScrapeUrl("http://localhost:3000/demo-competitor.html", { deps: noLookup, allowPrivate: true }))
      .toEqual({ ok: true });
    // scheme check still applies even in demo mode
    expect(await validateScrapeUrl("file:///etc/passwd", { deps: noLookup, allowPrivate: true }))
      .toEqual({ ok: false, reason: "scheme" });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /c/Users/pohde/projects/priceiq && npx vitest run src/lib/scrape/urlGuard.test.ts`
Expected: FAIL — `validateScrapeUrl` not exported.

- [ ] **Step 3: Write the implementation** (append to `urlGuard.ts`)

```ts
import { lookup as dnsLookup } from "node:dns/promises";

export interface GuardDeps {
  /** DNS resolution seam — injectable so tests never hit real DNS. */
  lookup: (hostname: string) => Promise<Array<{ address: string; family: number }>>;
}

export type GuardResult =
  | { ok: true }
  | { ok: false; reason: "invalid" | "scheme" | "private_ip" | "dns" };

const defaultDeps: GuardDeps = {
  lookup: (hostname) => dnsLookup(hostname, { all: true }),
};

/**
 * SSRF guard for merchant-supplied scrape URLs. Rejects non-http(s) schemes,
 * private/loopback/link-local/metadata IP literals, and hostnames any of whose
 * DNS records resolve to such an IP. `allowPrivate` skips only the IP checks
 * (never the scheme check) — used in development so the localhost demo works.
 *
 * NOTE: validate-then-fetch leaves a DNS-rebinding TOCTOU window; closing it
 * needs connection-level IP pinning (custom undici dispatcher). Accepted risk
 * for the current single-tenant MVP.
 */
export async function validateScrapeUrl(
  url: string,
  opts: { deps?: GuardDeps; allowPrivate?: boolean } = {},
): Promise<GuardResult> {
  const { deps = defaultDeps, allowPrivate = false } = opts;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, reason: "invalid" };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, reason: "scheme" };
  }
  if (allowPrivate) return { ok: true };

  // URL brackets IPv6 hosts: [::1] — strip for isIP/classification.
  const host = parsed.hostname.replace(/^\[|\]$/g, "");

  if (isIP(host) !== 0) {
    return isPrivateIp(host) ? { ok: false, reason: "private_ip" } : { ok: true };
  }

  let records: Array<{ address: string }>;
  try {
    records = await deps.lookup(host);
  } catch {
    return { ok: false, reason: "dns" };
  }
  if (records.length === 0) return { ok: false, reason: "dns" };
  if (records.some((r) => isPrivateIp(r.address))) {
    return { ok: false, reason: "private_ip" };
  }
  return { ok: true };
}
```

(Adjust the existing `import { isIP } from "node:net";` line — it is already at the top of the file from Task 1; do not duplicate it.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /c/Users/pohde/projects/priceiq && npx vitest run src/lib/scrape/urlGuard.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd /c/Users/pohde/projects/priceiq && git add src/lib/scrape/urlGuard.ts src/lib/scrape/urlGuard.test.ts && git commit -m "feat: validateScrapeUrl — scheme allowlist + DNS private-IP blocking"
```

---

### Task 3: Integrate guard into `fetchPage` with manual redirect re-validation

**Files:**
- Modify: `src/lib/scrape/fetcher.ts`
- Test: `src/lib/scrape/fetcher.test.ts`

- [ ] **Step 1: Write the failing tests** (append inside the `describe("fetchPage")` block; add imports at top of file)

```ts
// add to imports:
import type { GuardDeps } from "./urlGuard";

// Helper: lookup stub resolving every hostname to the given address.
function lookupAll(address: string): GuardDeps["lookup"] {
  return async () => [{ address, family: 4 }];
}

it("blocks a private-IP URL without calling fetch", async () => {
  const fetchSpy = vi.fn();
  vi.stubGlobal("fetch", fetchSpy);
  const res = await fetchPage("http://169.254.169.254/latest/meta-data/", {
    guardDeps: { lookup: lookupAll("169.254.169.254") },
    allowPrivate: false,
  });
  expect(res).toMatchObject({ ok: false, status: 0, blocked: true });
  expect(fetchSpy).not.toHaveBeenCalled();
});

it("blocks a hostname resolving to a private IP", async () => {
  const fetchSpy = vi.fn();
  vi.stubGlobal("fetch", fetchSpy);
  const res = await fetchPage("https://internal.example/", {
    guardDeps: { lookup: lookupAll("10.0.0.5") },
    allowPrivate: false,
  });
  expect(res).toMatchObject({ ok: false, blocked: true });
  expect(fetchSpy).not.toHaveBeenCalled();
});

it("follows a public→public redirect and returns the final page", async () => {
  const fetchSpy = vi
    .fn()
    .mockResolvedValueOnce(
      new Response(null, { status: 301, headers: { Location: "https://shop.example/final" } }),
    )
    .mockResolvedValueOnce(new Response("<html>final</html>", { status: 200 }));
  vi.stubGlobal("fetch", fetchSpy);
  const res = await fetchPage("https://shop.example/start", {
    guardDeps: { lookup: lookupAll("93.184.216.34") },
    allowPrivate: false,
  });
  expect(res).toMatchObject({ ok: true, status: 200, html: "<html>final</html>" });
  expect(fetchSpy).toHaveBeenCalledTimes(2);
  expect(fetchSpy.mock.calls[1][0]).toBe("https://shop.example/final");
});

it("blocks a redirect hop that targets a private address", async () => {
  const fetchSpy = vi.fn().mockResolvedValueOnce(
    new Response(null, { status: 302, headers: { Location: "http://127.0.0.1:8080/admin" } }),
  );
  vi.stubGlobal("fetch", fetchSpy);
  const res = await fetchPage("https://shop.example/start", {
    guardDeps: { lookup: lookupAll("93.184.216.34") },
    allowPrivate: false,
  });
  expect(res).toMatchObject({ ok: false, blocked: true });
  expect(fetchSpy).toHaveBeenCalledTimes(1); // never fetched the private hop
});

it("gives up after too many redirects", async () => {
  const fetchSpy = vi.fn(async () =>
    new Response(null, { status: 302, headers: { Location: "https://shop.example/loop" } }),
  );
  vi.stubGlobal("fetch", fetchSpy);
  const res = await fetchPage("https://shop.example/loop", {
    guardDeps: { lookup: lookupAll("93.184.216.34") },
    allowPrivate: false,
  });
  expect(res.ok).toBe(false);
  expect(fetchSpy.mock.calls.length).toBeLessThanOrEqual(6); // initial + 5 hops max
});

it("allows localhost when allowPrivate is true (demo mode)", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response("<html>demo</html>", { status: 200 })));
  const res = await fetchPage("http://localhost:3000/demo-competitor.html", {
    guardDeps: { lookup: lookupAll("127.0.0.1") },
    allowPrivate: true,
  });
  expect(res).toMatchObject({ ok: true, html: "<html>demo</html>" });
});
```

The three pre-existing tests (200 / 404 / network-error) must keep passing **unchanged** — in test runs `NODE_ENV` is not `"production"`, so the default `allowPrivate` is true and no DNS lookup happens for them.

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /c/Users/pohde/projects/priceiq && npx vitest run src/lib/scrape/fetcher.test.ts`
Expected: FAIL — `fetchPage` takes no second argument yet / `blocked` undefined.

- [ ] **Step 3: Rewrite `fetcher.ts`**

```ts
// src/lib/scrape/fetcher.ts
import { validateScrapeUrl, type GuardDeps } from "./urlGuard";

export interface FetchResult {
  ok: boolean;
  status: number; // HTTP status, or 0 for network/timeout/blocked
  html: string;
  /** true when the URL was rejected by the SSRF guard (never fetched). */
  blocked?: true;
}

export interface FetchPageOptions {
  guardDeps?: GuardDeps;
  /** Permit private/loopback targets (local demo). Defaults to true outside production, or when SCRAPE_ALLOW_PRIVATE=1. */
  allowPrivate?: boolean;
}

const TIMEOUT_MS = 10_000;
const MAX_REDIRECTS = 5;
const USER_AGENT =
  "Mozilla/5.0 (compatible; PriceIQBot/1.0; +https://priceiq.example/bot)";

const BLOCKED: FetchResult = { ok: false, status: 0, html: "", blocked: true };

function defaultAllowPrivate(): boolean {
  return process.env.SCRAPE_ALLOW_PRIVATE === "1" || process.env.NODE_ENV !== "production";
}

/**
 * Fetch a page's HTML. Never throws: a non-200, timeout, network error, or
 * SSRF-blocked URL is returned as { ok:false } so callers handle failure as
 * data. Every URL — including each redirect hop (followed manually, max 5) —
 * must pass the SSRF guard in urlGuard.ts. One retry on a thrown (network)
 * error. Residual risk: DNS-rebinding TOCTOU between validation and fetch is
 * accepted for the single-tenant MVP (fix = connection-level IP pinning).
 */
export async function fetchPage(
  url: string,
  opts: FetchPageOptions = {},
): Promise<FetchResult> {
  const allowPrivate = opts.allowPrivate ?? defaultAllowPrivate();
  const guardOpts = { deps: opts.guardDeps, allowPrivate };

  let current = url;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const verdict = await validateScrapeUrl(current, guardOpts);
    if (!verdict.ok) return BLOCKED;

    const res = await fetchOnce(current);
    if (res.kind === "error") return { ok: false, status: 0, html: "" };

    const { response } = res;
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) return { ok: false, status: response.status, html: "" };
      current = new URL(location, current).toString(); // resolve relative redirects
      continue;
    }
    if (!response.ok) return { ok: false, status: response.status, html: "" };
    return { ok: true, status: response.status, html: await response.text() };
  }
  return { ok: false, status: 0, html: "" }; // redirect limit exceeded
}

type FetchOnce = { kind: "ok"; response: Response } | { kind: "error" };

/** One HTTP request with timeout and a single retry on thrown network error. */
async function fetchOnce(url: string): Promise<FetchOnce> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
        redirect: "manual",
        signal: controller.signal,
      });
      clearTimeout(timer);
      return { kind: "ok", response };
    } catch {
      clearTimeout(timer);
    }
  }
  return { kind: "error" };
}
```

Behavior notes for the implementer:
- `redirect: "manual"` makes 3xx responses visible instead of auto-followed; `Response` objects constructed in tests with a 301/302 status work the same way.
- `new URL(location, current)` handles relative `Location` headers.
- The old code retried only thrown errors; that behavior is preserved inside `fetchOnce`.

- [ ] **Step 4: Run the scrape-module tests**

Run: `cd /c/Users/pohde/projects/priceiq && npx vitest run src/lib/scrape/`
Expected: PASS — all fetcher tests (old + new), urlGuard, extractPrice, scrapeOne, etc.

- [ ] **Step 5: Commit**

```bash
cd /c/Users/pohde/projects/priceiq && git add src/lib/scrape/fetcher.ts src/lib/scrape/fetcher.test.ts && git commit -m "feat: SSRF guard in fetchPage with per-hop redirect re-validation"
```

---

### Task 4: Surface `blocked_url` through `scrapeOne`

**Files:**
- Modify: `src/lib/scrape/scrapeOne.ts`
- Test: `src/lib/scrape/scrapeOne.test.ts`

- [ ] **Step 1: Write the failing test** (append inside the existing describe block, matching the file's existing style of stubbing `deps.fetchPage`)

```ts
it("maps a guard-blocked fetch to reason blocked_url", async () => {
  const res = await scrapeOne("http://169.254.169.254/", null, {
    fetchPage: async () => ({ ok: false, status: 0, html: "", blocked: true }),
  });
  expect(res).toEqual({ ok: false, reason: "blocked_url" });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /c/Users/pohde/projects/priceiq && npx vitest run src/lib/scrape/scrapeOne.test.ts`
Expected: FAIL — currently maps `status: 0` to `"timeout"`.

- [ ] **Step 3: Implement the mapping**

In `src/lib/scrape/scrapeOne.ts`, extend the reason union and the failure branch:

```ts
export type ScrapeFailureReason =
  | `http_${number}`
  | "timeout"
  | "no_price_found"
  | "implausible"
  | "blocked_url";
```

```ts
  const res = await deps.fetchPage(url);
  if (!res.ok) {
    if (res.blocked) return { ok: false, reason: "blocked_url" };
    return { ok: false, reason: res.status === 0 ? "timeout" : `http_${res.status}` };
  }
```

No changes needed downstream: `refreshProduct` and the UI pass failure reasons through as opaque strings, so `blocked_url` shows up in `RefreshSummary.results[]` and the competitor status line automatically.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /c/Users/pohde/projects/priceiq && npx vitest run src/lib/scrape/scrapeOne.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd /c/Users/pohde/projects/priceiq && git add src/lib/scrape/scrapeOne.ts src/lib/scrape/scrapeOne.test.ts && git commit -m "feat: surface SSRF-blocked scrapes as blocked_url failure reason"
```

---

### Task 5: Whole-suite verification + live demo check + docs

**Files:**
- Modify: `docs/HANDOVER.md` (section 5 "Next steps", item 1; section 2 pipeline list)

- [ ] **Step 1: Run the full test suite**

Run: `cd /c/Users/pohde/projects/priceiq && npm test`
Expected: all tests pass — baseline 125 + new tests (≈23 IP cases + 7 guard + 6 fetcher + 1 scrapeOne), zero failures.

- [ ] **Step 2: Production build**

Run: `cd /c/Users/pohde/projects/priceiq && npm run build`
Expected: typecheck + build succeed.

- [ ] **Step 3: Verify the localhost demo still works (dev = allowPrivate)**

Start the dev server in the background (`npm run dev`, `run_in_background: true`), then:

Run: `cd /c/Users/pohde/projects/priceiq && curl -s -X POST http://localhost:3000/api/products/cmqzfk2b5000r1gieh35y2mfi/refresh`
Expected: JSON with LocalDemoShop `ok` (price from `public/demo-competitor.html`, e.g. `1325`) — NOT `blocked_url`. (If the product id has changed after a reseed, find the Ceramic Mug MUG-008 id via `GET /api/products`.) If nested `[id]` routes 404, apply the known fix: kill node, `rm -rf .next`, restart dev.

- [ ] **Step 4: Verify production mode blocks private targets**

Quick node check (no server needed):

Run: `cd /c/Users/pohde/projects/priceiq && NODE_ENV=production npx tsx -e "import { fetchPage } from './src/lib/scrape/fetcher'; fetchPage('http://127.0.0.1:9/x').then(r => console.log(JSON.stringify(r)))"`
Expected: `{"ok":false,"status":0,"html":"","blocked":true}`

- [ ] **Step 5: Update `docs/HANDOVER.md`**

- In section 2's pipeline list, add: `urlGuard.ts` — SSRF guard: scheme allowlist + DNS private-IP blocking; `fetchPage` re-validates every redirect hop; dev/demo bypass via `NODE_ENV !== "production"` or `SCRAPE_ALLOW_PRIVATE=1`.
- Replace next-step 1 with a note that it is **done**, keeping one line for the accepted residual risk: DNS-rebinding TOCTOU (fix would be connection-level IP pinning via a custom undici dispatcher).

- [ ] **Step 6: Commit**

```bash
cd /c/Users/pohde/projects/priceiq && git add docs/HANDOVER.md docs/superpowers/plans/2026-07-03-ssrf-hardening.md && git commit -m "docs: SSRF hardening complete; note residual rebinding risk"
```
