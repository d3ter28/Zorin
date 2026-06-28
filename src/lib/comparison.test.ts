import { describe, expect, it } from "vitest";
import { compare } from "./comparison";

const obs = (price: number) => ({ price, observedAt: "2026-06-28T00:00:00.000Z" });

describe("compare", () => {
  it("returns nulls when there are no competitors", () => {
    const r = compare(10000, []);
    expect(r.compMedian).toBeNull();
    expect(r.competitorCount).toBe(0);
    expect(r.pctVsMedian).toBeNull();
  });

  it("computes median for odd count", () => {
    const r = compare(10000, [obs(8000), obs(9000), obs(11000)]);
    expect(r.compMedian).toBe(9000);
    expect(r.compMin).toBe(8000);
    expect(r.compMax).toBe(11000);
    expect(r.competitorCount).toBe(3);
  });

  it("computes median for even count as average of middle two", () => {
    const r = compare(10000, [obs(8000), obs(10000)]);
    expect(r.compMedian).toBe(9000);
  });

  it("computes pctVsMedian relative to median", () => {
    const r = compare(11000, [obs(10000)]);
    expect(r.pctVsMedian).toBeCloseTo(0.1);
  });

  it("tracks the oldest observation", () => {
    const r = compare(10000, [
      { price: 9000, observedAt: "2026-06-01T00:00:00.000Z" },
      { price: 9500, observedAt: "2026-06-20T00:00:00.000Z" },
    ]);
    expect(r.oldestObservedAt).toBe("2026-06-01T00:00:00.000Z");
  });
});
