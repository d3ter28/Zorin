import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    priceSurvey: { findUnique: vi.fn() },
  },
}));
vi.mock("@/lib/auth/requireSession", () => ({
  requireSessionApi: vi.fn(async () => ({
    merchantId: "m1",
    user: { id: "u1", email: "demo@zorin.example", merchantId: "m1" },
  })),
}));

const { assertProductOwned } = vi.hoisted(() => ({ assertProductOwned: vi.fn(async () => undefined) }));

vi.mock("@/lib/auth/ownership", () => ({
  assertProductOwned,
  filterOwnedProductIds: vi.fn(async (_p: unknown, ids: string[]) => ids),
}));

import { GET } from "./route";
import { prisma } from "@/lib/db";
import { HttpError } from "@/lib/api/errors";

function req(): Request {
  return {} as unknown as Request;
}

function ctx(id: string, surveyId: string) {
  return { params: Promise.resolve({ id, surveyId }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  assertProductOwned.mockResolvedValue(undefined);
});

describe("GET /api/products/[id]/surveys/[surveyId]/results", () => {
  it("returns 404 when the product isn't owned by the caller", async () => {
    assertProductOwned.mockRejectedValue(new HttpError(404, "Not found"));
    const res = await GET(req(), ctx("p1", "s1"));
    expect(res.status).toBe(404);
    expect(prisma.priceSurvey.findUnique).not.toHaveBeenCalled();
  });

  it("returns 404 when the survey does not exist", async () => {
    (prisma.priceSurvey.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await GET(req(), ctx("p1", "s1"));
    expect(res.status).toBe(404);
  });

  it("returns 404 when the survey belongs to a different product", async () => {
    (prisma.priceSurvey.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "s1",
      productId: "other-product",
      responses: [],
    });
    const res = await GET(req(), ctx("p1", "s1"));
    expect(res.status).toBe(404);
  });

  it("returns 200 with the computed Van Westendorp result", async () => {
    (prisma.priceSurvey.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "s1",
      productId: "p1",
      responses: [
        { tooCheapCents: 500, goodValueCents: 1500, gettingExpensiveCents: 2500, tooExpensiveCents: 3500 },
        { tooCheapCents: 600, goodValueCents: 1600, gettingExpensiveCents: 2600, tooExpensiveCents: 3600 },
      ],
    });

    const res = await GET(req(), ctx("p1", "s1"));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      pointOfMarginalCheapness: expect.any(Number),
      pointOfMarginalExpensiveness: expect.any(Number),
      optimalPricePoint: expect.any(Number),
      indifferencePricePoint: expect.any(Number),
      acceptableRange: { min: expect.any(Number), max: expect.any(Number) },
      responseCount: 2,
      confidence: "none",
    });
    expect(prisma.priceSurvey.findUnique).toHaveBeenCalledWith({
      where: { id: "s1" },
      include: { responses: true },
    });
  });
});
