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
