import { beforeEach, describe, expect, it, vi } from "vitest";

const { findUnique, upsert } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  upsert: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    product: { findUnique },
    recommendation: { upsert },
  },
}));

vi.mock("@/lib/auth/requireSession", () => ({
  requireSessionApi: vi.fn(async () => ({
    merchantId: "m1",
    user: { id: "u1", email: "demo@priceiq.example", merchantId: "m1" },
  })),
}));

vi.mock("@/lib/auth/ownership", () => ({
  assertProductOwned: vi.fn(async () => undefined),
  filterOwnedProductIds: vi.fn(async (_p: unknown, ids: string[]) => ids),
}));

import { POST } from "./route";

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  findUnique.mockReset();
  upsert.mockReset();
  delete process.env.ANTHROPIC_API_KEY; // force deterministic fallback phrasing
});

describe("POST /api/products/[id]/recommendation", () => {
  it("returns 404 for an unknown product", async () => {
    findUnique.mockResolvedValue(null);
    const res = await POST({} as Request, ctx("nope"));
    expect(res.status).toBe(404);
    expect(upsert).not.toHaveBeenCalled();
  });

  it("computes a decision and persists it via upsert", async () => {
    // priced 20% below a $100 median with healthy margin -> raise toward median
    findUnique.mockResolvedValue({
      id: "p1",
      currentPrice: 8000,
      cogs: 4000,
      competitors: [
        { price: 10000, observedAt: new Date("2026-06-28T00:00:00.000Z") },
        { price: 10000, observedAt: new Date("2026-06-28T00:00:00.000Z") },
      ],
    });
    const generatedAt = new Date("2026-06-28T12:00:00.000Z");
    upsert.mockResolvedValue({ generatedAt });

    const res = await POST({} as Request, ctx("p1"));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.decision.action).toBe("raise");
    expect(body.decision.suggestedPrice).toBe(10000);
    expect(typeof body.phrasing).toBe("string");
    expect(body.phrasing.length).toBeGreaterThan(0);
    expect(upsert).toHaveBeenCalledOnce();
  });
});
