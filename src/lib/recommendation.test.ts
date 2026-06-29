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
    // floor price so that (p - 9500)/p >= 0.15 => p = ceil(9500 / 0.85) = 11177
    expect(d.suggestedPrice).toBe(Math.ceil(9500 / (1 - MIN_MARGIN_FLOOR)));
    expect(d.reasons.join(" ")).toMatch(/margin floor/i);
  });

  it("raises straight to the median when below both the floor and the median (one-pass convergence)", () => {
    // FILTER-400 regression: price 1000, cogs 900 => 10% margin (below 15% floor),
    // competitors [1300, 1400] => median 1350. The floor price is only
    // ceil(900/0.85) = 1059. Raising just to the floor leaves the product still
    // below the median, so a SECOND apply was needed to reach the median.
    // The single recommendation must be the median, which also clears the floor.
    const comps = [obs(1300), obs(1400)];
    const d = decide({ currentPrice: 1000, cogs: 900 }, comps);
    expect(d.action).toBe("raise");
    expect(d.suggestedPrice).toBe(1350);
    // Re-deciding at the recommended price must hold — converges in one apply.
    const again = decide({ currentPrice: d.suggestedPrice, cogs: 900 }, comps);
    expect(again.action).toBe("hold");
  });

  it("recommends a floor price that actually clears the margin floor (converges)", () => {
    // cogs 2200: Math.round(2200/0.85) = 2588, but (2588-2200)/2588 = 0.1499 < 0.15,
    // so a price raised to 2588 would STILL be below floor -> never converges.
    // The recommended floor price must satisfy the margin floor when re-evaluated.
    const d = decide({ currentPrice: 2000, cogs: 2200 }, [obs(1800), obs(1900)]);
    expect(d.action).toBe("raise");
    const fp = d.suggestedPrice;
    // Re-deciding at the recommended price must NOT raise again — it must hold.
    const again = decide({ currentPrice: fp, cogs: 2200 }, [obs(1800), obs(1900)]);
    expect(again.action).not.toBe("raise");
    expect((fp - 2200) / fp).toBeGreaterThanOrEqual(MIN_MARGIN_FLOOR);
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
    // floor price = ceil(5500/0.85) = 6471 > median, so clamp to floor.
    const d = decide({ currentPrice: 12000, cogs: 5500 }, [obs(6000), obs(6000)]);
    expect(d.action).toBe("lower");
    expect(d.suggestedPrice).toBe(Math.ceil(5500 / (1 - MIN_MARGIN_FLOOR)));
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
