import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PLAN_TIERS, isValidPlanTier, priceIdForTier, tierForPriceId } from "./plans";

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  process.env.STRIPE_PRICE_STARTER = "price_starter_123";
  process.env.STRIPE_PRICE_GROWTH = "price_growth_123";
  process.env.STRIPE_PRICE_SCALE = "price_scale_123";
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("PLAN_TIERS", () => {
  it("lists exactly starter, growth, scale in that order", () => {
    expect(PLAN_TIERS).toEqual(["starter", "growth", "scale"]);
  });
});

describe("isValidPlanTier", () => {
  it("returns true for each known tier", () => {
    expect(isValidPlanTier("starter")).toBe(true);
    expect(isValidPlanTier("growth")).toBe(true);
    expect(isValidPlanTier("scale")).toBe(true);
  });

  it("returns false for unknown strings", () => {
    expect(isValidPlanTier("enterprise")).toBe(false);
    expect(isValidPlanTier("")).toBe(false);
  });
});

describe("priceIdForTier", () => {
  it("returns the configured price id for a valid tier", () => {
    expect(priceIdForTier("growth")).toBe("price_growth_123");
  });

  it("throws when the tier's env var is missing", () => {
    delete process.env.STRIPE_PRICE_SCALE;
    expect(() => priceIdForTier("scale")).toThrow(/STRIPE_PRICE_SCALE/);
  });
});

describe("tierForPriceId", () => {
  it("resolves a known price id back to its tier", () => {
    expect(tierForPriceId("price_growth_123")).toBe("growth");
  });

  it("returns null for an unrecognized price id", () => {
    expect(tierForPriceId("price_unknown")).toBeNull();
  });

  it("returns null for undefined", () => {
    expect(tierForPriceId(undefined)).toBeNull();
  });
});
