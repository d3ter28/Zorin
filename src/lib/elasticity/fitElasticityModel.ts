export interface ElasticityResult {
  elasticity: number;
  intercept: number;
  r2: number;
  dataPoints: number;
  /** Sum of time-decay weights. Equals dataPoints when no dates are supplied. */
  effectiveSampleSize: number;
  minPriceCents: number;
  maxPriceCents: number;
}

export interface FitOptions {
  /** Exponential half-life in days. Default 90. Use Infinity to disable decay. */
  halfLifeDays?: number;
  /** Reference date for computing daysAgo. Default: now. */
  referenceDate?: Date;
}

export function fitElasticityModel(
  records: { priceCents: number; unitsSold: number; date?: Date | null }[],
  options: FitOptions = {}
): ElasticityResult | null {
  const { halfLifeDays = 90, referenceDate = new Date() } = options;
  const valid = records.filter((r) => r.priceCents > 0 && r.unitsSold > 0);
  if (valid.length < 3) return null;

  const refMs = referenceDate.getTime();
  const msPerDay = 86_400_000;

  const xs = valid.map((r) => Math.log(r.priceCents));
  const ys = valid.map((r) => Math.log(r.unitsSold));
  const ws = valid.map((r) => {
    if (!r.date) return 1;
    const daysAgo = (refMs - new Date(r.date).getTime()) / msPerDay;
    return halfLifeDays === Infinity ? 1 : Math.pow(2, -daysAgo / halfLifeDays);
  });

  // Weighted least squares
  const W   = ws.reduce((a, w) => a + w, 0);
  const Wx  = ws.reduce((a, w, i) => a + w * xs[i], 0);
  const Wy  = ws.reduce((a, w, i) => a + w * ys[i], 0);
  const Wxx = ws.reduce((a, w, i) => a + w * xs[i] * xs[i], 0);
  const Wxy = ws.reduce((a, w, i) => a + w * xs[i] * ys[i], 0);

  const denom = W * Wxx - Wx * Wx;
  if (denom === 0) return null;

  const elasticity = (W * Wxy - Wx * Wy) / denom;
  const intercept  = (Wy - elasticity * Wx) / W;

  // Weighted R²
  const yMean = Wy / W;
  const ssTot = ws.reduce((a, w, i) => a + w * (ys[i] - yMean) ** 2, 0);
  const ssRes = ws.reduce((a, w, i) => {
    const yHat = intercept + elasticity * xs[i];
    return a + w * (ys[i] - yHat) ** 2;
  }, 0);
  const r2 = ssTot === 0 ? 0 : Math.max(0, 1 - ssRes / ssTot);

  const minPriceCents = Math.min(...valid.map((r) => r.priceCents));
  const maxPriceCents = Math.max(...valid.map((r) => r.priceCents));

  return {
    elasticity,
    intercept,
    r2,
    dataPoints: valid.length,
    effectiveSampleSize: W,
    minPriceCents,
    maxPriceCents,
  };
}
