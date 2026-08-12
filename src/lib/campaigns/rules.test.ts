import { describe, expect, it } from "vitest";
import { calculateTargetPrice, type CampaignRules, type RuleProduct } from "./rules";

const baseRules: CampaignRules = { mode: "percentage", rounding: "none", marginFloorPct: 10 };

function makeProduct(overrides: Partial<RuleProduct> = {}): RuleProduct {
  return { currentPrice: 1000, cogs: null, ...overrides };
}

describe("calculateTargetPrice — percentage mode", () => {
  it("raises price by positive percentage", () => {
    const result = calculateTargetPrice(makeProduct(), { ...baseRules, percentage: 10 });
    expect(result).toEqual({ targetPriceCents: 1100, skipped: false, clampedByMarginFloor: false });
  });

  it("lowers price by negative percentage", () => {
    const result = calculateTargetPrice(makeProduct(), { ...baseRules, percentage: -20 });
    expect(result).toEqual({ targetPriceCents: 800, skipped: false, clampedByMarginFloor: false });
  });

  it("rounds to nearest cent", () => {
    const result = calculateTargetPrice(makeProduct({ currentPrice: 1001 }), { ...baseRules, percentage: 33 });
    expect(result.targetPriceCents).toBe(1331);
    expect(result.skipped).toBe(false);
  });
});

describe("calculateTargetPrice — ml_recommendation mode", () => {
  const mlRules: CampaignRules = { ...baseRules, mode: "ml_recommendation" };

  it("uses suggestedPriceCents from recommendation", () => {
    const product = makeProduct({
      recommendation: { rulesJson: JSON.stringify({ suggestedPriceCents: 1200 }) },
    });
    const result = calculateTargetPrice(product, mlRules);
    expect(result).toEqual({ targetPriceCents: 1200, skipped: false, clampedByMarginFloor: false });
  });

  it("skips when no recommendation exists", () => {
    const result = calculateTargetPrice(makeProduct(), mlRules);
    expect(result.skipped).toBe(true);
    expect(result.skipReason).toBe("no_recommendation");
  });

  it("skips when rulesJson has no suggestedPriceCents", () => {
    const product = makeProduct({ recommendation: { rulesJson: JSON.stringify({}) } });
    const result = calculateTargetPrice(product, mlRules);
    expect(result.skipped).toBe(true);
    expect(result.skipReason).toBe("no_recommendation");
  });
});

describe("calculateTargetPrice — competitor_match mode", () => {
  const compRules: CampaignRules = {
    ...baseRules,
    mode: "competitor_match",
    competitorStrategy: "median",
    competitorOffset: 0,
  };

  it("matches median competitor price", () => {
    const product = makeProduct({
      competitorPrices: [{ priceCents: 900 }, { priceCents: 1100 }, { priceCents: 1300 }],
    });
    const result = calculateTargetPrice(product, compRules);
    expect(result.targetPriceCents).toBe(1100);
    expect(result.skipped).toBe(false);
  });

  it("undercuts median by offset percentage", () => {
    const product = makeProduct({
      competitorPrices: [{ priceCents: 1000 }, { priceCents: 1000 }],
    });
    const result = calculateTargetPrice(product, { ...compRules, competitorOffset: -5 });
    expect(result.targetPriceCents).toBe(950);
  });

  it("uses min strategy", () => {
    const product = makeProduct({
      competitorPrices: [{ priceCents: 800 }, { priceCents: 1200 }],
    });
    const result = calculateTargetPrice(product, { ...compRules, competitorStrategy: "min" });
    expect(result.targetPriceCents).toBe(800);
  });

  it("skips when no competitor data", () => {
    const result = calculateTargetPrice(makeProduct(), compRules);
    expect(result.skipped).toBe(true);
    expect(result.skipReason).toBe("no_competitor_data");
  });
});

describe("calculateTargetPrice — fixed_price mode", () => {
  it("uses fixed price directly", () => {
    const result = calculateTargetPrice(makeProduct(), {
      ...baseRules,
      mode: "fixed_price",
      fixedPriceCents: 1500,
    });
    expect(result).toEqual({ targetPriceCents: 1500, skipped: false, clampedByMarginFloor: false });
  });
});

describe("calculateTargetPrice — rounding", () => {
  it("rounds to .99", () => {
    const result = calculateTargetPrice(makeProduct({ currentPrice: 1000 }), {
      ...baseRules,
      percentage: 10,
      rounding: "99",
    });
    expect(result.targetPriceCents).toBe(1099);
  });

  it("rounds to .95", () => {
    const result = calculateTargetPrice(makeProduct({ currentPrice: 1000 }), {
      ...baseRules,
      percentage: 10,
      rounding: "95",
    });
    expect(result.targetPriceCents).toBe(1095);
  });

  it("handles price already ending in .99 with no rounding", () => {
    const result = calculateTargetPrice(makeProduct({ currentPrice: 999 }), {
      ...baseRules,
      percentage: 10,
      rounding: "none",
    });
    expect(result.targetPriceCents).toBe(1099);
  });
});

describe("calculateTargetPrice — margin floor", () => {
  it("clamps price upward when margin would go below floor", () => {
    // currentPrice=1200, cogs=900, -20% => base=960
    // margin at 960 = (960-900)/960 = 6.25% < 10% floor
    // floor = ceil(900 / 0.90) = 1000, which differs from currentPrice
    const result = calculateTargetPrice(makeProduct({ currentPrice: 1200, cogs: 900 }), {
      ...baseRules,
      percentage: -20,
      marginFloorPct: 10,
    });
    expect(result.clampedByMarginFloor).toBe(true);
    expect(result.skipped).toBe(false);
  });

  it("skips margin check when cogs is null", () => {
    const result = calculateTargetPrice(makeProduct({ currentPrice: 1000, cogs: null }), {
      ...baseRules,
      percentage: -50,
    });
    expect(result.targetPriceCents).toBe(500);
    expect(result.clampedByMarginFloor).toBe(false);
  });

  it("does not clamp when margin is above floor", () => {
    const result = calculateTargetPrice(makeProduct({ currentPrice: 1000, cogs: 500 }), {
      ...baseRules,
      percentage: -10,
      marginFloorPct: 10,
    });
    expect(result.targetPriceCents).toBe(900);
    expect(result.clampedByMarginFloor).toBe(false);
  });
});

describe("calculateTargetPrice — no-change detection", () => {
  it("skips when target equals current price", () => {
    const result = calculateTargetPrice(makeProduct({ currentPrice: 1000 }), {
      ...baseRules,
      percentage: 0,
    });
    expect(result.skipped).toBe(true);
    expect(result.skipReason).toBe("no_change");
  });
});

describe("calculateTargetPrice — combined adjustments", () => {
  it("applies margin floor then rounding in correct order", () => {
    // cogs=1500, currentPrice=2000, percentage=-50 => base=1000
    // margin at 1000 = (1000-1500)/1000 = -50% < 15% floor
    // floor = ceil(1500 / (1 - 0.15)) = ceil(1500/0.85) = ceil(1764.7) = 1765
    // rounding "99": round(1765/100)*100 - 1 = 1800 - 1 = 1799
    const result = calculateTargetPrice(makeProduct({ currentPrice: 2000, cogs: 1500 }), {
      ...baseRules,
      percentage: -50,
      marginFloorPct: 15,
      rounding: "99",
    });
    expect(result.clampedByMarginFloor).toBe(true);
    expect(result.targetPriceCents).toBe(1799);
  });
});
