export interface ElasticityResult {
  elasticity: number; // price elasticity of demand (typically negative)
  intercept: number; // ln-space intercept
  r2: number; // coefficient of determination
  dataPoints: number; // number of valid records used
}

export function fitElasticityModel(
  records: { priceCents: number; unitsSold: number }[]
): ElasticityResult | null {
  const valid = records.filter((r) => r.priceCents > 0 && r.unitsSold > 0);
  if (valid.length < 3) return null;

  // Transform to log space: x = ln(price), y = ln(units)
  const xs = valid.map((r) => Math.log(r.priceCents));
  const ys = valid.map((r) => Math.log(r.unitsSold));
  const n = valid.length;

  const sumX = xs.reduce((a, b) => a + b, 0);
  const sumY = ys.reduce((a, b) => a + b, 0);
  const sumXY = xs.reduce((a, x, i) => a + x * ys[i], 0);
  const sumX2 = xs.reduce((a, x) => a + x * x, 0);

  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return null;

  const elasticity = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - elasticity * sumX) / n;

  // R² calculation
  const yMean = sumY / n;
  const ssTot = ys.reduce((a, y) => a + (y - yMean) ** 2, 0);
  const ssRes = ys.reduce((a, y, i) => {
    const yHat = intercept + elasticity * xs[i];
    return a + (y - yHat) ** 2;
  }, 0);
  const r2 = ssTot === 0 ? 0 : Math.max(0, 1 - ssRes / ssTot);

  return { elasticity, intercept, r2, dataPoints: n };
}
