import { describe, it, expect } from "vitest";
import { calculateMarketStats } from "./marketStats";

describe("calculateMarketStats", () => {
  it("computes min/max/median for a single price", () => {
    const stats = calculateMarketStats([5000]);
    expect(stats).toEqual({
      minCents: 5000,
      maxCents: 5000,
      medianCents: 5000,
      q1Cents: 5000,
      q3Cents: 5000,
    });
  });

  it("computes stats for an odd-length sorted array", () => {
    const stats = calculateMarketStats([3000, 7000, 8000, 9000, 10000]);
    expect(stats.minCents).toBe(3000);
    expect(stats.maxCents).toBe(10000);
    expect(stats.medianCents).toBe(8000);
    expect(stats.q1Cents).toBe(7000);
  });

  it("computes stats for an even-length sorted array", () => {
    const stats = calculateMarketStats([4000, 5000, 9000, 10000]);
    expect(stats.medianCents).toBe(7000);
    expect(stats.q3Cents).toBe(9250);
  });
});
