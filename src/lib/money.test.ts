import { describe, expect, it } from "vitest";
import { formatCents, pct, dollarsToCents } from "./money";

describe("formatCents", () => {
  it("formats cents as USD", () => {
    expect(formatCents(1999)).toBe("$19.99");
    expect(formatCents(0)).toBe("$0.00");
    expect(formatCents(100000)).toBe("$1,000.00");
  });
});

describe("pct", () => {
  it("formats a ratio as a percent string", () => {
    expect(pct(0.15)).toBe("15.0%");
    expect(pct(-0.084)).toBe("-8.4%");
  });
});

describe("dollarsToCents", () => {
  it("parses dollar strings to integer cents", () => {
    expect(dollarsToCents("28.50")).toBe(2850);
    expect(dollarsToCents("30")).toBe(3000);
    expect(dollarsToCents("19.99")).toBe(1999);
    expect(dollarsToCents("0")).toBe(0);
    expect(dollarsToCents(12.5)).toBe(1250);
  });

  it("returns null for invalid or negative input", () => {
    expect(dollarsToCents("abc")).toBeNull();
    expect(dollarsToCents("")).toBeNull();
    expect(dollarsToCents("  ")).toBeNull();
    expect(dollarsToCents("-5")).toBeNull();
    expect(dollarsToCents(-1)).toBeNull();
    expect(dollarsToCents(NaN)).toBeNull();
  });
});
