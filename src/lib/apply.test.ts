import { beforeEach, describe, expect, it, vi } from "vitest";

const { findUnique, update, deleteMany } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  update: vi.fn(),
  deleteMany: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    product: { findUnique, update },
    recommendation: { deleteMany },
  },
}));

import { applyDecision, applyManualPrice } from "./apply";

beforeEach(() => {
  findUnique.mockReset();
  update.mockReset();
  deleteMany.mockReset();
});

describe("applyDecision", () => {
  it("reports not found and writes nothing for an unknown product", async () => {
    findUnique.mockResolvedValue(null);

    const result = await applyDecision("nope");

    expect(result).toMatchObject({ found: false, applied: false });
    expect(update).not.toHaveBeenCalled();
    expect(deleteMany).not.toHaveBeenCalled();
  });

  it("applies a raise: writes suggestedPrice, clears recommendation", async () => {
    findUnique.mockResolvedValue({
      id: "p1",
      currentPrice: 8000,
      cogs: 4000,
      competitors: [
        { price: 10000, observedAt: new Date("2026-06-28T00:00:00.000Z") },
        { price: 10000, observedAt: new Date("2026-06-28T00:00:00.000Z") },
      ],
    });
    update.mockResolvedValue({});
    deleteMany.mockResolvedValue({});

    const result = await applyDecision("p1");

    expect(result).toMatchObject({
      found: true,
      applied: true,
      action: "raise",
      currentPrice: 10000,
    });
    expect(update).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: { currentPrice: 10000 },
    });
    expect(deleteMany).toHaveBeenCalledWith({ where: { productId: "p1" } });
  });

  it("is a no-op on hold: no write, applied false", async () => {
    findUnique.mockResolvedValue({
      id: "p2",
      currentPrice: 5000,
      cogs: 2000,
      competitors: [],
    });

    const result = await applyDecision("p2");

    expect(result).toMatchObject({
      found: true,
      applied: false,
      action: "hold",
      currentPrice: 5000,
    });
    expect(update).not.toHaveBeenCalled();
    expect(deleteMany).not.toHaveBeenCalled();
  });
});

describe("applyManualPrice", () => {
  it("reports not found and writes nothing for an unknown product", async () => {
    findUnique.mockResolvedValue(null);

    const result = await applyManualPrice("nope", 1000);

    expect(result).toMatchObject({ found: false, applied: false });
    expect(update).not.toHaveBeenCalled();
    expect(deleteMany).not.toHaveBeenCalled();
  });

  it("writes the given price and clears the recommendation when it differs", async () => {
    findUnique.mockResolvedValue({ id: "p1", currentPrice: 8000 });
    update.mockResolvedValue({});
    deleteMany.mockResolvedValue({});

    const result = await applyManualPrice("p1", 9500);

    expect(result).toMatchObject({ found: true, applied: true, currentPrice: 9500 });
    expect(update).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: { currentPrice: 9500 },
    });
    expect(deleteMany).toHaveBeenCalledWith({ where: { productId: "p1" } });
  });

  it("is a no-op when the given price equals the current price", async () => {
    findUnique.mockResolvedValue({ id: "p2", currentPrice: 5000 });

    const result = await applyManualPrice("p2", 5000);

    expect(result).toMatchObject({ found: true, applied: false, currentPrice: 5000 });
    expect(update).not.toHaveBeenCalled();
    expect(deleteMany).not.toHaveBeenCalled();
  });
});
