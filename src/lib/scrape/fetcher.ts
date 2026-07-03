import { validateScrapeUrl, type GuardDeps } from "./urlGuard";
import { getPinnedAgent, isPrivateIpError } from "./pinnedAgent";

export interface FetchResult {
  ok: boolean;
  status: number;
  html: string;
  // true when the URL was rejected by the SSRF guard (never fetched).
  blocked?: true;
}

export interface FetchPageOptions {
  guardDeps?: GuardDeps;
  // Permit private/loopback targets. Defaults to true outside production or when SCRAPE_ALLOW_PRIVATE=1.
  allowPrivate?: boolean;
}

const TIMEOUT_MS = 10_000;
const MAX_REDIRECTS = 5;
const USER_AGENT =
  "Mozilla/5.0 (compatible; PriceIQBot/1.0; +https://priceiq.example/bot)";

const BLOCKED = Object.freeze<FetchResult>({ ok: false, status: 0, html: "", blocked: true });

function defaultAllowPrivate(): boolean {
  return process.env.SCRAPE_ALLOW_PRIVATE === "1" || process.env.NODE_ENV !== "production";
}

// Fetch page HTML. Never throws. Each URL (including redirect hops, max 5) is
// validated by the SSRF guard. DNS rebinding is closed by connect-time IP pinning (pinnedAgent.ts).
export async function fetchPage(
  url: string,
  opts: FetchPageOptions = {},
): Promise<FetchResult> {
  const allowPrivate = opts.allowPrivate ?? defaultAllowPrivate();
  const guardOpts = { deps: opts.guardDeps, allowPrivate };
  const pin = !allowPrivate;

  let current = url;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const verdict = await validateScrapeUrl(current, guardOpts);
    if (!verdict.ok) return BLOCKED;

    const res = await fetchOnce(current, pin);
    if (res.kind === "blocked") return BLOCKED;
    if (res.kind === "error") return { ok: false, status: 0, html: "" };

    const { response } = res;
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) return { ok: false, status: response.status, html: "" };
      current = new URL(location, current).toString();
      continue;
    }
    if (!response.ok) return { ok: false, status: response.status, html: "" };
    return { ok: true, status: response.status, html: await response.text() };
  }
  return { ok: false, status: 0, html: "" };
}

type FetchOnce =
  | { kind: "ok"; response: Response }
  | { kind: "error" }
  | { kind: "blocked" };

type Attempt = FetchOnce | { kind: "retryable" };

// One HTTP request with timeout; single retry on thrown network error.
// pin=true routes through the pinned dispatcher (connect-time private-IP checks).
async function fetchOnce(url: string, pin: boolean): Promise<FetchOnce> {
  const first = await attempt(url, pin);
  if (first.kind !== "retryable") return first;
  const second = await attempt(url, pin);
  return second.kind === "retryable" ? { kind: "error" } : second;
}

async function attempt(url: string, pin: boolean): Promise<Attempt> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    // undici (Node 24 fetch) surfaces the real status + Location on redirect: "manual" despite spec saying status=0
    const response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
      redirect: "manual",
      signal: controller.signal,
      ...(pin ? { dispatcher: getPinnedAgent() } : {}),
    } as RequestInit);
    return { kind: "ok", response };
  } catch (err) {
    if (isPrivateIpError(err)) return { kind: "blocked" }; // pinned guard fired — no retry
    if (err instanceof Error && err.name === "AbortError") {
      return { kind: "error" }; // timed out — no retry
    }
    return { kind: "retryable" };
  } finally {
    clearTimeout(timer);
  }
}
