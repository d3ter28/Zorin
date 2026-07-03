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
