import { describe, expect, it } from "vitest";
import { hasActiveSubscription } from "./subscriptionGate";

describe("hasActiveSubscription", () => {
  it("allows trialing and active", () => {
    expect(hasActiveSubscription("trialing")).toBe(true);
    expect(hasActiveSubscription("active")).toBe(true);
  });

  it("blocks past_due, canceled, incomplete, unpaid", () => {
    expect(hasActiveSubscription("past_due")).toBe(false);
    expect(hasActiveSubscription("canceled")).toBe(false);
    expect(hasActiveSubscription("incomplete")).toBe(false);
    expect(hasActiveSubscription("unpaid")).toBe(false);
  });

  it("blocks null and unknown strings", () => {
    expect(hasActiveSubscription(null)).toBe(false);
    expect(hasActiveSubscription("something-unexpected")).toBe(false);
  });
});
