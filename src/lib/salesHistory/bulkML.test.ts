import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  productFindMany: vi.fn(),
  salesRecordFindMany: vi.fn(),
  elasticityModelUpsert: vi.fn(),
  recommendationUpsert: vi.fn(),
  fitElasticityModel: vi.fn(),
  bayesianShrinkage: vi.fn(),
  computeConfidenceScore: vi.fn(),
  generateRecommendation: vi.fn(),
  computeCategoryFallback: vi.fn(),
}));

vi.mock("@/lib/elasticity/fitElasticityModel", () => ({
  fitElasticityModel: mocks.fitElasticityModel,
}));
vi.mock("@/lib/elasticity/bayesianShrinkage", () => ({
  bayesianShrinkage: mocks.bayesianShrinkage,
}));
vi.mock("@/lib/elasticity/confidenceScore", () => ({
  computeConfidenceScore: mocks.computeConfidenceScore,
}));
vi.mock("@/lib/elasticity/generateRecommendation", () => ({
  generateRecommendation: mocks.generateRecommendation,
}));
vi.mock("@/lib/elasticity/categoryFallback", () => ({
  computeCategoryFallback: mocks.computeCategoryFallback,
}));

import { runBulkML } from "./bulkML";

const fakePrisma = {
  product: { findMany: mocks.productFindMany },
  salesRecord: { findMany: mocks.salesRecordFindMany },
  elasticityModel: { upsert: mocks.elasticityModelUpsert },
  recommendation: { upsert: mocks.recommendationUpsert },
} as any;

beforeEach(() => {
  vi.resetAllMocks();
});

const rawFit = {
  elasticity: -1.5,
  intercept: 4.2,
  r2: 0.8,
  dataPoints: 5,
  effectiveSampleSize: 5,
  minPriceCents: 1000,
  maxPriceCents: 2000,
  weightedMeanLogPrice: 7.0,
  weightedMeanLogUnits: 3.0,
};

describe("runBulkML", () => {
  it("fits a model and generates a recommendation when product has records and COGS", async () => {
    mocks.productFindMany.mockResolvedValue([
      { id: "p1", title: "Widget", currentPrice: 1500, cogs: 800 },
    ]);
    mocks.salesRecordFindMany.mockResolvedValue([
      { priceCents: 1000, unitsSold: 10, date: new Date() },
      { priceCents: 1200, unitsSold: 8, date: new Date() },
      { priceCents: 1500, unitsSold: 5, date: new Date() },
    ]);
    mocks.fitElasticityModel.mockReturnValue(rawFit);
    mocks.bayesianShrinkage.mockReturnValue({ shrunkElasticity: -1.4, priorApplied: false });
    mocks.computeConfidenceScore.mockReturnValue(0.6);
    mocks.generateRecommendation.mockReturnValue({
      action: "raise",
      suggestedPriceCents: 1600,
      deltaPct: 0.0667,
      reasoning: "some reasoning",
      expectedProfitLiftPct: 0.05,
    });
    mocks.elasticityModelUpsert.mockResolvedValue({});
    mocks.recommendationUpsert.mockResolvedValue({});

    const result = await runBulkML(fakePrisma, ["p1"]);

    expect(result).toEqual({
      fitted: 1,
      recommended: 1,
      fitSkipped: [],
      recommendSkipped: [],
    });

    expect(mocks.salesRecordFindMany).toHaveBeenCalledWith({
      where: { productId: "p1", promotionFlag: false },
      select: { priceCents: true, unitsSold: true, date: true },
    });

    expect(mocks.elasticityModelUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { productId: "p1" },
        create: expect.objectContaining({ productId: "p1", elasticity: -1.4 }),
        update: expect.objectContaining({ elasticity: -1.4 }),
      }),
    );
    expect(mocks.recommendationUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { productId: "p1" },
        create: expect.objectContaining({ productId: "p1", action: "raise" }),
      }),
    );
  });

  it("collects product titles in fitSkipped when fitElasticityModel returns null and there is no units baseline", async () => {
    mocks.productFindMany.mockResolvedValue([
      { id: "p2", title: "Sparse Product", currentPrice: 1500, cogs: 800, merchantId: "m1", estUnits: null },
    ]);
    mocks.salesRecordFindMany.mockResolvedValue([]);
    mocks.fitElasticityModel.mockReturnValue(null);

    const result = await runBulkML(fakePrisma, ["p2"]);

    expect(result).toEqual({
      fitted: 0,
      recommended: 0,
      fitSkipped: ["Sparse Product"],
      recommendSkipped: [],
    });
    expect(mocks.elasticityModelUpsert).not.toHaveBeenCalled();
    expect(mocks.recommendationUpsert).not.toHaveBeenCalled();
    expect(mocks.computeCategoryFallback).not.toHaveBeenCalled();
  });

  it("falls back to a borrowed elasticity and creates a recommendation when fit fails but cogs + a real sales baseline exist", async () => {
    mocks.productFindMany.mockResolvedValue([
      { id: "p4", title: "Fallback Product", currentPrice: 1500, cogs: 800, merchantId: "m1", estUnits: null },
    ]);
    mocks.salesRecordFindMany.mockResolvedValue([
      { priceCents: 1000, unitsSold: 10, date: new Date() },
      { priceCents: 1200, unitsSold: 8, date: new Date() },
    ]);
    mocks.fitElasticityModel.mockReturnValue(null);
    mocks.computeCategoryFallback.mockResolvedValue({
      elasticity: -1.2,
      level: "category",
      sourceCount: 3,
      categoryName: "Widgets",
    });
    mocks.generateRecommendation.mockReturnValue({
      action: "raise",
      suggestedPriceCents: 1600,
      deltaPct: 0.0667,
      reasoning: "fallback reasoning",
      expectedProfitLiftPct: 0.05,
      currentUnitsEstimate: 9,
      projectedUnitsEstimate: 8,
      currentProfitCents: 6300,
      projectedProfitCents: 6400,
      profitLiftCents: 100,
    });
    mocks.recommendationUpsert.mockResolvedValue({});

    const result = await runBulkML(fakePrisma, ["p4"]);

    expect(result).toEqual({
      fitted: 0,
      recommended: 1,
      fitSkipped: [],
      recommendSkipped: [],
    });
    expect(mocks.computeCategoryFallback).toHaveBeenCalledWith(fakePrisma, "m1", "p4");
    expect(mocks.elasticityModelUpsert).not.toHaveBeenCalled();
    expect(mocks.recommendationUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { productId: "p4" },
        create: expect.objectContaining({ productId: "p4", action: "raise" }),
      }),
    );
    const call = mocks.recommendationUpsert.mock.calls[0][0];
    const rulesJson = JSON.parse(call.create.rulesJson);
    expect(rulesJson.fallbackLevel).toBe("category");
    expect(rulesJson.fallbackSourceCount).toBe(3);
    expect(rulesJson.fallbackCategoryName).toBe("Widgets");
    expect(rulesJson.r2).toBeNull();
    expect(rulesJson.dataPoints).toBe(0);
    expect(rulesJson.confidenceScore).toBe(0);
    expect(mocks.generateRecommendation).toHaveBeenCalledWith(
      expect.objectContaining({ elasticity: -1.2 }),
      1500,
      800,
      0.10,
      0,
    );
  });

  it("treats an avgUnits of exactly 0 as no baseline (guards against Math.log(0))", async () => {
    mocks.productFindMany.mockResolvedValue([
      { id: "p7", title: "All-Zero Sales Product", currentPrice: 1500, cogs: 800, merchantId: "m1", estUnits: null },
    ]);
    mocks.salesRecordFindMany.mockResolvedValue([
      { priceCents: 1000, unitsSold: 0, date: new Date() },
      { priceCents: 1200, unitsSold: 0, date: new Date() },
    ]);
    mocks.fitElasticityModel.mockReturnValue(null);

    const result = await runBulkML(fakePrisma, ["p7"]);

    expect(result).toEqual({
      fitted: 0,
      recommended: 0,
      fitSkipped: ["All-Zero Sales Product"],
      recommendSkipped: [],
    });
    expect(mocks.computeCategoryFallback).not.toHaveBeenCalled();
    expect(mocks.recommendationUpsert).not.toHaveBeenCalled();
  });

  it("falls back using estUnits as the baseline when there are no real sales records", async () => {
    mocks.productFindMany.mockResolvedValue([
      { id: "p5", title: "No History Product", currentPrice: 1500, cogs: 800, merchantId: "m1", estUnits: 12 },
    ]);
    mocks.salesRecordFindMany.mockResolvedValue([]);
    mocks.fitElasticityModel.mockReturnValue(null);
    mocks.computeCategoryFallback.mockResolvedValue({
      elasticity: -0.8,
      level: "global",
      sourceCount: 0,
    });
    mocks.generateRecommendation.mockReturnValue({
      action: "hold",
      suggestedPriceCents: 1500,
      deltaPct: 0,
      reasoning: "fallback reasoning",
      expectedProfitLiftPct: 0,
      currentUnitsEstimate: 12,
      projectedUnitsEstimate: 12,
      currentProfitCents: 8400,
      projectedProfitCents: 8400,
      profitLiftCents: 0,
    });
    mocks.recommendationUpsert.mockResolvedValue({});

    const result = await runBulkML(fakePrisma, ["p5"]);

    expect(result).toEqual({
      fitted: 0,
      recommended: 1,
      fitSkipped: [],
      recommendSkipped: [],
    });
    expect(mocks.recommendationUpsert).toHaveBeenCalled();
    const call = mocks.recommendationUpsert.mock.calls[0][0];
    const rulesJson = JSON.parse(call.create.rulesJson);
    expect(rulesJson.fallbackLevel).toBe("global");
  });

  it("does not attempt a fallback recommendation when fit fails and cogs is null, even with a baseline", async () => {
    mocks.productFindMany.mockResolvedValue([
      { id: "p6", title: "No Cogs Fallback Product", currentPrice: 1500, cogs: null, merchantId: "m1", estUnits: 12 },
    ]);
    mocks.salesRecordFindMany.mockResolvedValue([]);
    mocks.fitElasticityModel.mockReturnValue(null);

    const result = await runBulkML(fakePrisma, ["p6"]);

    expect(result).toEqual({
      fitted: 0,
      recommended: 0,
      fitSkipped: [],
      recommendSkipped: ["No Cogs Fallback Product"],
    });
    expect(mocks.computeCategoryFallback).not.toHaveBeenCalled();
    expect(mocks.recommendationUpsert).not.toHaveBeenCalled();
  });

  it("fits a model but skips recommendation when product lacks COGS", async () => {
    mocks.productFindMany.mockResolvedValue([
      { id: "p3", title: "No COGS Product", currentPrice: 1500, cogs: null },
    ]);
    mocks.salesRecordFindMany.mockResolvedValue([
      { priceCents: 1000, unitsSold: 10, date: new Date() },
      { priceCents: 1200, unitsSold: 8, date: new Date() },
      { priceCents: 1500, unitsSold: 5, date: new Date() },
    ]);
    mocks.fitElasticityModel.mockReturnValue(rawFit);
    mocks.bayesianShrinkage.mockReturnValue({ shrunkElasticity: -1.4, priorApplied: false });
    mocks.computeConfidenceScore.mockReturnValue(0.6);
    mocks.elasticityModelUpsert.mockResolvedValue({});

    const result = await runBulkML(fakePrisma, ["p3"]);

    expect(result).toEqual({
      fitted: 1,
      recommended: 0,
      fitSkipped: [],
      recommendSkipped: ["No COGS Product"],
    });
    expect(mocks.elasticityModelUpsert).toHaveBeenCalled();
    expect(mocks.generateRecommendation).not.toHaveBeenCalled();
    expect(mocks.recommendationUpsert).not.toHaveBeenCalled();
  });

  it("handles two products: fits both, recommends only the one with COGS", async () => {
    mocks.productFindMany.mockResolvedValue([
      { id: "p1", title: "Widget With COGS", currentPrice: 1500, cogs: 800 },
      { id: "p2", title: "Widget No COGS", currentPrice: 1200, cogs: null },
    ]);
    mocks.salesRecordFindMany.mockResolvedValue([
      { priceCents: 1000, unitsSold: 10, date: new Date() },
      { priceCents: 1200, unitsSold: 8, date: new Date() },
      { priceCents: 1500, unitsSold: 5, date: new Date() },
    ]);
    mocks.fitElasticityModel.mockReturnValue(rawFit);
    mocks.bayesianShrinkage.mockReturnValue({ shrunkElasticity: -1.4, priorApplied: false });
    mocks.computeConfidenceScore.mockReturnValue(0.6);
    mocks.generateRecommendation.mockReturnValue({
      action: "raise",
      suggestedPriceCents: 1600,
      deltaPct: 0.0667,
      reasoning: "some reasoning",
      expectedProfitLiftPct: 0.05,
    });
    mocks.elasticityModelUpsert.mockResolvedValue({});
    mocks.recommendationUpsert.mockResolvedValue({});

    const result = await runBulkML(fakePrisma, ["p1", "p2"]);

    expect(result.fitted).toBe(2);
    expect(result.recommended).toBe(1);
    expect(result.fitSkipped).toEqual([]);
    expect(result.recommendSkipped).toContain("Widget No COGS");
  });

  it("returns all zeros and makes no DB calls when productIds is empty", async () => {
    const result = await runBulkML(fakePrisma, []);

    expect(result).toEqual({
      fitted: 0,
      recommended: 0,
      fitSkipped: [],
      recommendSkipped: [],
    });
    expect(mocks.productFindMany).not.toHaveBeenCalled();
    expect(mocks.salesRecordFindMany).not.toHaveBeenCalled();
    expect(mocks.elasticityModelUpsert).not.toHaveBeenCalled();
    expect(mocks.recommendationUpsert).not.toHaveBeenCalled();
  });
});
