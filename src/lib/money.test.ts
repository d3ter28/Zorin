import { describe, expect, it } from "vitest";
import { formatCents, pct } from "./money";

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
