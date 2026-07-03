import { describe, expect, it } from "vitest";
import { isPrivateIp, validateScrapeUrl, type GuardDeps } from "./urlGuard";

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
    "::ffff:7f00:1",    // hex-form ::ffff:127.0.0.1 — private
    "::ffff:0a00:0001", // hex-form ::ffff:10.0.0.1 — private
    "::",                                // unspecified
  ])("classifies %s as private", (ip) => {
    expect(isPrivateIp(ip)).toBe(true);
  });

  it.each([
    "8.8.8.8", "1.1.1.1", "93.184.216.34", // public v4
    "172.15.255.255", "172.32.0.1",        // just outside 172.16/12
    "2606:4700::1111",                      // public v6
    "::ffff:8.8.8.8",                       // v4-mapped public
    "::ffff:0808:0808", // hex-form ::ffff:8.8.8.8 — public
  ])("classifies %s as public", (ip) => {
    expect(isPrivateIp(ip)).toBe(false);
  });
});

// Helper: lookup stub resolving every hostname to the given address.
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

  it("accepts a public IP literal without a DNS lookup", async () => {
    const noLookup: GuardDeps = {
      lookup: async () => { throw new Error("must not be called"); },
    };
    const res = await validateScrapeUrl("http://93.184.216.34/p", { deps: noLookup });
    expect(res).toEqual({ ok: true });
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
    const noLookup: GuardDeps = { lookup: async () => { throw new Error("must not be called"); } };
    expect(await validateScrapeUrl("http://localhost:3000/demo-competitor.html", { deps: noLookup, allowPrivate: true }))
      .toEqual({ ok: true });
    // scheme check still applies even in demo mode
    expect(await validateScrapeUrl("file:///etc/passwd", { deps: noLookup, allowPrivate: true }))
      .toEqual({ ok: false, reason: "scheme" });
  });
});
