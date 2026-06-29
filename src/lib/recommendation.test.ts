import { describe, expect, it } from "vitest";
import { decide, decideForProduct, MIN_MARGIN_FLOOR } from "./recommendation";

const obs = (price: number) => ({ price, observedAt: "2026-06-28T00:00:00.000Z" });

describe("decide", () => {
  it("holds when there are no competitors", () => {
    const d = decide({ currentPrice: 10000, cogs: 5000 }, []);
    expect(d.action).toBe("hold");
    expect(d.reasons.join(" ")).toMatch(/competitor data/i);
  });

  it("raises to the margin floor when margin is below floor (overrides position)", () => {
    // cogs 9500 on price 10000 => 5% margin, below 15% floor.
    // Competitors low so position alone would say 'lower'.
    const d = decide({ currentPrice: 10000, cogs: 9500 }, [obs(8000)]);
    expect(d.action).toBe("raise");
    // floor price so that (p - 9500)/p = 0.15 => p = 9500 / 0.85 = 11176 (rounded)
    expect(d.suggestedPrice).toBe(Math.round(9500 / (1 - MIN_MARGIN_FLOOR)));
    expect(d.reasons.join(" ")).toMatch(/margin floor/i);
  });

  it("lowers toward median when priced >10% above with healthy margin", () => {
    // price 12000, median 10000 => +20%. cogs 5000 => 58% margin, healthy.
    const d = decide({ currentPrice: 12000, cogs: 5000 }, [obs(10000), obs(10000)]);
    expect(d.action).toBe("lower");
    expect(d.suggestedPrice).toBe(10000);
    expect(d.suggestedPrice).toBeGreaterThanOrEqual(
      Math.round(5000 / (1 - MIN_MARGIN_FLOOR)),
    );
  });

  it("does not lower below the margin floor price", () => {
    // price 12000, median 6000 (+100%), cogs 5500.
    // floor price = 5500/0.85 = 6471 > median, so clamp to floor.
    const d = decide({ currentPrice: 12000, cogs: 5500 }, [obs(6000), obs(6000)]);
    expect(d.action).toBe("lower");
    expect(d.suggestedPrice).toBe(Math.round(5500 / (1 - MIN_MARGIN_FLOOR)));
  });

  it("raises toward median when priced >10% below with headroom", () => {
    // price 8000, median 10000 (-20%), cogs 4000 => 50% margin.
    const d = decide({ currentPrice: 8000, cogs: 4000 }, [obs(10000), obs(10000)]);
    expect(d.action).toBe("raise");
    expect(d.suggestedPrice).toBe(10000);
  });

  it("holds when within ±10% of median", () => {
    const d = decide({ currentPrice: 10000, cogs: 5000 }, [obs(9800), obs(10200)]);
    expect(d.action).toBe("hold");
    expect(d.reasons.join(" ")).toMatch(/competitively positioned/i);
  });

  it("handles unknown cogs by advising on position only", () => {
    const d = decide({ currentPrice: 12000, cogs: null }, [obs(10000), obs(10000)]);
    expect(d.action).toBe("lower");
    expect(d.signals.marginPct).toBeNull();
  });
});

describe("decideForProduct", () => {
  it("maps competitor rows (Date observedAt) to observations and matches decide()", () => {
    const product = {
      currentPrice: 8000,
      cogs: 4000,
      competitors: [
        { price: 10000, observedAt: new Date("2026-06-28T00:00:00.000Z") },
        { price: 10000, observedAt: new Date("2026-06-28T00:00:00.000Z") },
      ],
    };
    const d = decideForProduct(product);
    // priced 20% below a $100 median with healthy margin -> raise toward median
    expect(d.action).toBe("raise");
    expect(d.suggestedPrice).toBe(10000);
  });

  it("holds with no competitors", () => {
    const d = decideForProduct({ currentPrice: 10000, cogs: 5000, competitors: [] });
    expect(d.action).toBe("hold");
    expect(d.suggestedPrice).toBe(10000);
  });
});
