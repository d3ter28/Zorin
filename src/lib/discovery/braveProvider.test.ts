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
