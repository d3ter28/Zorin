import { describe, expect, it } from "vitest";
import { hasActiveSubscription } from "./subscriptionGate";

const future = new Date(Date.now() + 60_000);
const past = new Date(Date.now() - 60_000);

describe("hasActiveSubscription", () => {
  it("allows active regardless of trialEndsAt", () => {
    expect(hasActiveSubscription("active", null)).toBe(true);
    expect(hasActiveSubscription("active", past)).toBe(true);
  });

  it("allows trialing when trialEndsAt is in the future", () => {
    expect(hasActiveSubscription("trialing", future)).toBe(true);
  });

  it("allows trialing when trialEndsAt is null (no expiry tracked)", () => {
    expect(hasActiveSubscription("trialing", null)).toBe(true);
  });

  it("blocks trialing once trialEndsAt has passed", () => {
    expect(hasActiveSubscription("trialing", past)).toBe(false);
  });

  it("blocks past_due, canceled, incomplete, unpaid", () => {
    expect(hasActiveSubscription("past_due", future)).toBe(false);
    expect(hasActiveSubscription("canceled", future)).toBe(false);
    expect(hasActiveSubscription("incomplete", future)).toBe(false);
    expect(hasActiveSubscription("unpaid", future)).toBe(false);
  });

  it("blocks null and unknown strings", () => {
    expect(hasActiveSubscription(null, null)).toBe(false);
    expect(hasActiveSubscription("something-unexpected", future)).toBe(false);
  });
});
