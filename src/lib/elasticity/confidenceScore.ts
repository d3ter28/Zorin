/**
 * Combines r² (fit quality) and effectiveSampleSize (data quantity) into a
 * single 0–1 confidence score.
 *
 * confidenceScore = r² × min(1, effectiveSampleSize / 20)
 *
 * Interpretation:
 *  1.0 → strong fit with ≥20 effective data points (full confidence)
 *  0.5 → either moderate fit or sparse data
 *  0.0 → model explains nothing, or no data
 */
export function computeConfidenceScore(r2: number, effectiveSampleSize: number): number {
  const clampedR2 = Math.max(0, Math.min(1, r2));
  const dataSufficiency = Math.max(0, Math.min(1, effectiveSampleSize / 20));
  return Math.max(0, Math.min(1, clampedR2 * dataSufficiency));
}
