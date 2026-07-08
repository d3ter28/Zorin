export interface ShrinkageResult {
  shrunkElasticity: number;
  priorApplied: boolean;
}

/**
 * James-Stein shrinkage toward a retail prior elasticity.
 *
 * weight = n / (n + k) where n = effectiveSampleSize, k = priorStrength.
 * shrunkElasticity = weight * elasticity + (1 - weight) * priorElasticity.
 *
 * With little data (n ≈ 0), result → prior.
 * With lots of data (n >> k), result → raw elasticity.
 */
export function bayesianShrinkage(
  elasticity: number,
  effectiveSampleSize: number,
  priorElasticity = -1.2,
  priorStrength = 5
): ShrinkageResult {
  if (effectiveSampleSize <= 0) {
    return { shrunkElasticity: priorElasticity, priorApplied: true };
  }
  const weight = effectiveSampleSize / (effectiveSampleSize + priorStrength);
  const shrunkElasticity = weight * elasticity + (1 - weight) * priorElasticity;
  return { shrunkElasticity, priorApplied: true };
}
