import { validateScrapeUrl, type GuardDeps } from "./urlGuard";

export interface FetchResult {
  ok: boolean;
  status: number;
  html: string;
  /** true when the URL was rejected by the SSRF guard (never fetched). */
  blocked?: true;
}

export interface FetchPageOptions {
  guardDeps?: GuardDeps;
  /** Permit private/loopback targets. Defaults to true outside production or when SCRAPE_ALLOW_PRIVATE=1. */
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

// Fetch page HTML. Never throws. Each URL (including redirect hops, max 5) is
// validated by the SSRF guard. DNS-rebinding TOCTOU is accepted risk for this MVP.
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
      current = new URL(location, current).toString();
      continue;
    }
    if (!response.ok) return { ok: false, status: response.status, html: "" };
    return { ok: true, status: response.status, html: await response.text() };
  }
  return { ok: false, status: 0, html: "" };
}

type FetchOnce = { kind: "ok"; response: Response } | { kind: "error" };

// One HTTP request with timeout; single retry on thrown network error.
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
