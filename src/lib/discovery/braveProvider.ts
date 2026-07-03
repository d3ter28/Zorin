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
