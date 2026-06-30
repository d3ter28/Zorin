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
