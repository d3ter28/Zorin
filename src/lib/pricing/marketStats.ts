export interface MarketStats {
  minCents: number;
  maxCents: number;
  medianCents: number;
  q1Cents: number;
  q3Cents: number;
}

/** Expects `prices` already sorted ascending. */
export function calculateMarketStats(prices: number[]): MarketStats {
  return {
    minCents: prices[0],
    maxCents: prices[prices.length - 1],
    medianCents: percentile(prices, 0.5),
    q1Cents: percentile(prices, 0.25),
    q3Cents: percentile(prices, 0.75),
  };
}

function percentile(sortedPrices: number[], pct: number): number {
  const index = (sortedPrices.length - 1) * pct;
  const lowerIndex = Math.floor(index);
  const upperIndex = Math.ceil(index);

  if (lowerIndex === upperIndex) {
    return sortedPrices[lowerIndex];
  }

  const weight = index - lowerIndex;
  return Math.round(sortedPrices[lowerIndex] * (1 - weight) + sortedPrices[upperIndex] * weight);
}
