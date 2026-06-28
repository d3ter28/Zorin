import { describe, expect, it } from "vitest";
import { marginPct } from "./margin";

describe("marginPct", () => {
  it("computes margin as (price - cogs) / price", () => {
    expect(marginPct(10000, 6000)).toBeCloseTo(0.4);
  });
  it("returns null when cogs is null (unknown)", () => {
    expect(marginPct(10000, null)).toBeNull();
  });
  it("returns null when price is 0", () => {
    expect(marginPct(0, 0)).toBeNull();
  });
  it("can be negative when cogs exceeds price", () => {
    expect(marginPct(5000, 6000)).toBeCloseTo(-0.2);
  });
});
