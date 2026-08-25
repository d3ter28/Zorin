import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  productFindUnique: vi.fn(),
  productFindMany: vi.fn(),
}));

import { GLOBAL_PRIOR_ELASTICITY } from "./bayesianShrinkage";
import {
  selectFallbackElasticity,
  computeCategoryFallback,
  type SiblingElasticity,
} from "./categoryFallback";

const fakePrisma = {
  product: {
    findUnique: mocks.productFindUnique,
    findMany: mocks.productFindMany,
  },
} as any;

beforeEach(() => {
  vi.resetAllMocks();
});

describe("selectFallbackElasticity", () => {
  it("returns the median when exactly 3 siblings qualify (odd count)", () => {
    const siblings: SiblingElasticity[] = [
      { elasticity: -1.0, confidenceScore: 0.5 },
      { elasticity: -2.0, confidenceScore: 0.6 },
      { elasticity: -1.5, confidenceScore: 0.9 },
    ];
    // sorted: -2.0, -1.5, -1.0 -> median -1.5
    const result = selectFallbackElasticity(siblings);
    expect(result.elasticity).toBeCloseTo(-1.5);
    expect(result.qualifyingCount).toBe(3);
  });

  it("returns null elasticity when fewer than 3 siblings qualify", () => {
    const siblings: SiblingElasticity[] = [
      { elasticity: -1.0, confidenceScore: 0.5 },
      { elasticity: -2.0, confidenceScore: 0.6 },
    ];
    const result = selectFallbackElasticity(siblings);
    expect(result.elasticity).toBeNull();
    expect(result.qualifyingCount).toBe(2);
  });

  it("excludes low-confidence siblings even when raw count would be enough", () => {
    const siblings: SiblingElasticity[] = [
      { elasticity: -1.0, confidenceScore: 0.39 },
      { elasticity: -2.0, confidenceScore: 0.1 },
      { elasticity: -1.5, confidenceScore: 0.9 },
      { elasticity: -1.2, confidenceScore: 0.05 },
    ];
    // only one qualifies (0.9 >= 0.4) -> insufficient
    const result = selectFallbackElasticity(siblings);
    expect(result.elasticity).toBeNull();
    expect(result.qualifyingCount).toBe(1);
  });

  it("includes a sibling with confidenceScore exactly at the 0.4 boundary", () => {
    const siblings: SiblingElasticity[] = [
      { elasticity: -1.0, confidenceScore: 0.4 },
      { elasticity: -2.0, confidenceScore: 0.6 },
      { elasticity: -1.5, confidenceScore: 0.9 },
    ];
    // sorted: -2.0, -1.5, -1.0 -> median -1.5, all 3 qualify (0.4 >= 0.4)
    const result = selectFallbackElasticity(siblings);
    expect(result.elasticity).toBeCloseTo(-1.5);
    expect(result.qualifyingCount).toBe(3);
  });

  it("returns the average of the two middle values for an even qualifying count", () => {
    const siblings: SiblingElasticity[] = [
      { elasticity: -1.0, confidenceScore: 0.5 },
      { elasticity: -2.0, confidenceScore: 0.6 },
      { elasticity: -1.5, confidenceScore: 0.9 },
      { elasticity: -3.0, confidenceScore: 0.45 },
    ];
    // sorted: -3.0, -2.0, -1.5, -1.0 -> mid values -2.0 and -1.5 -> avg -1.75
    const result = selectFallbackElasticity(siblings);
    expect(result.elasticity).toBeCloseTo(-1.75);
    expect(result.qualifyingCount).toBe(4);
  });
});

describe("computeCategoryFallback", () => {
  it("uses category-level siblings when sufficient, and never queries catalog-wide", async () => {
    mocks.productFindUnique.mockResolvedValue({ category: "Widgets" });
    mocks.productFindMany.mockResolvedValueOnce([
      { elasticityModel: { elasticity: -1.0, confidenceScore: 0.5 } },
      { elasticityModel: { elasticity: -2.0, confidenceScore: 0.6 } },
      { elasticityModel: { elasticity: -1.5, confidenceScore: 0.9 } },
    ]);

    const result = await computeCategoryFallback(fakePrisma, "merchant1", "product1");

    expect(result).toEqual({
      elasticity: -1.5,
      level: "category",
      sourceCount: 3,
      categoryName: "Widgets",
    });
    expect(mocks.productFindMany).toHaveBeenCalledTimes(1);
  });

  it("falls back to catalog-level siblings when category is insufficient", async () => {
    mocks.productFindUnique.mockResolvedValue({ category: "Widgets" });
    mocks.productFindMany
      .mockResolvedValueOnce([
        { elasticityModel: { elasticity: -1.0, confidenceScore: 0.5 } },
      ]) // category: only 1 qualifying sibling
      .mockResolvedValueOnce([
        { elasticityModel: { elasticity: -1.0, confidenceScore: 0.5 } },
        { elasticityModel: { elasticity: -2.0, confidenceScore: 0.6 } },
        { elasticityModel: { elasticity: -1.5, confidenceScore: 0.9 } },
        { elasticityModel: null },
      ]); // catalog: 3 qualifying + 1 without a model

    const result = await computeCategoryFallback(fakePrisma, "merchant1", "product1");

    expect(result).toEqual({
      elasticity: -1.5,
      level: "catalog",
      sourceCount: 3,
    });
    expect(mocks.productFindMany).toHaveBeenCalledTimes(2);
  });

  it("falls back to the global prior when both category and catalog are insufficient", async () => {
    mocks.productFindUnique.mockResolvedValue({ category: "Widgets" });
    mocks.productFindMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { elasticityModel: { elasticity: -1.0, confidenceScore: 0.5 } },
      ]);

    const result = await computeCategoryFallback(fakePrisma, "merchant1", "product1");

    expect(result).toEqual({
      elasticity: GLOBAL_PRIOR_ELASTICITY,
      level: "global",
      sourceCount: 0,
    });
  });
});
