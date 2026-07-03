import { afterEach, describe, expect, it, vi } from "vitest";
import type { GuardDeps } from "./urlGuard";
import { fetchPage } from "./fetcher";

// Helper: lookup stub resolving every hostname to the given address.
function lookupAll(address: string): GuardDeps["lookup"] {
  return async () => [{ address, family: 4 }];
}

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
    expect(fetchSpy).toHaveBeenCalledTimes(1);
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
    expect(fetchSpy.mock.calls.length).toBeLessThanOrEqual(6);
  });

  it("returns not-ok when a redirect has no Location header", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 301 })),
    );
    const res = await fetchPage("https://shop.example/start", {
      guardDeps: { lookup: lookupAll("93.184.216.34") },
      allowPrivate: false,
    });
    expect(res.ok).toBe(false);
    expect(res.status).toBe(301);
    expect(res.blocked).toBeUndefined();
  });

  it("allows localhost when allowPrivate is true (demo mode)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("<html>demo</html>", { status: 200 })));
    const res = await fetchPage("http://localhost:3000/demo-competitor.html", {
      guardDeps: { lookup: lookupAll("127.0.0.1") },
      allowPrivate: true,
    });
    expect(res).toMatchObject({ ok: true, html: "<html>demo</html>" });
  });

  it("returns BLOCKED without retry when the pinned connection rejects a private IP", async () => {
    const { PrivateIpError } = await import("./pinnedAgent");
    const fetchSpy = vi.fn(async () => {
      throw new TypeError("fetch failed", {
        cause: new PrivateIpError("rebind.example", "127.0.0.1"),
      });
    });
    vi.stubGlobal("fetch", fetchSpy);
    const res = await fetchPage("https://rebind.example/p", {
      guardDeps: { lookup: lookupAll("93.184.216.34") },
      allowPrivate: false,
    });
    expect(res).toMatchObject({ ok: false, status: 0, blocked: true });
    expect(fetchSpy).toHaveBeenCalledTimes(1); // no retry on blocked
  });

  it("passes the pinned dispatcher to fetch when private targets are disallowed", async () => {
    const fetchSpy = vi.fn(async () => new Response("<html>ok</html>", { status: 200 }));
    vi.stubGlobal("fetch", fetchSpy);
    await fetchPage("https://shop.example/p", {
      guardDeps: { lookup: lookupAll("93.184.216.34") },
      allowPrivate: false,
    });
    expect(fetchSpy.mock.calls[0][1].dispatcher).toBeDefined();
  });

  it("omits the dispatcher when allowPrivate is true (demo mode)", async () => {
    const fetchSpy = vi.fn(async () => new Response("<html>demo</html>", { status: 200 }));
    vi.stubGlobal("fetch", fetchSpy);
    await fetchPage("http://localhost:3000/demo-competitor.html", {
      guardDeps: { lookup: lookupAll("127.0.0.1") },
      allowPrivate: true,
    });
    expect(fetchSpy.mock.calls[0][1].dispatcher).toBeUndefined();
  });
});
