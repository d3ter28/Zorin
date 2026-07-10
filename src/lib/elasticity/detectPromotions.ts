/**
 * Flags sales records where unitsSold is a statistical outlier on the high
 * side — a sign of a promotion or external spike that would skew the demand
 * model toward a flatter (less elastic) curve.
 *
 * Strategy: compute residuals in log-space against the fitted model
 * (intercept + elasticity * ln(price)). A record whose log-residual is more
 * than THRESHOLD standard deviations above the mean residual is flagged.
 */

const THRESHOLD = 2.0; // z-score above which a record is considered promotional

export interface PromoRecord {
  id: string;
  priceCents: number;
  unitsSold: number;
}

export function detectPromotions(
  records: PromoRecord[],
  model: { elasticity: number; intercept: number },
): Set<string> {
  const valid = records.filter((r) => r.priceCents > 0 && r.unitsSold > 0);
  if (valid.length < 4) return new Set();

  const residuals = valid.map((r) => {
    const predicted = model.intercept + model.elasticity * Math.log(r.priceCents);
    return Math.log(r.unitsSold) - predicted;
  });

  const mean = residuals.reduce((a, b) => a + b, 0) / residuals.length;
  const variance =
    residuals.reduce((a, r) => a + (r - mean) ** 2, 0) / residuals.length;
  const std = Math.sqrt(variance);

  if (std === 0) return new Set();

  const flagged = new Set<string>();
  valid.forEach((r, i) => {
    const z = (residuals[i] - mean) / std;
    if (z > THRESHOLD) flagged.add(r.id);
  });

  return flagged;
}
