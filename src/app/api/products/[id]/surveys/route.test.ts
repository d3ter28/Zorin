import { beforeEach, describe, expect, it, vi } from "vitest";

const { generateSurveyToken } = vi.hoisted(() => ({
  generateSurveyToken: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    priceSurvey: { create: vi.fn(), findMany: vi.fn() },
  },
}));
vi.mock("@/lib/priceSurvey/token", () => ({ generateSurveyToken }));
vi.mock("@/lib/auth/requireSession", () => ({
  requireSessionApi: vi.fn(async () => ({
    merchantId: "m1",
    user: { id: "u1", email: "demo@zorin.example", merchantId: "m1" },
  })),
}));
vi.mock("@/lib/appConfig", () => ({ getAppUrl: () => "https://tryzorin.com" }));

const { assertProductOwned } = vi.hoisted(() => ({ assertProductOwned: vi.fn(async () => undefined) }));

vi.mock("@/lib/auth/ownership", () => ({
  assertProductOwned,
  filterOwnedProductIds: vi.fn(async (_p: unknown, ids: string[]) => ids),
}));

import { POST, GET } from "./route";
import { prisma } from "@/lib/db";
import { HttpError } from "@/lib/api/errors";

function req(): Request {
  return {} as unknown as Request;
}

function ctx(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  generateSurveyToken.mockReturnValue("a".repeat(64));
  assertProductOwned.mockResolvedValue(undefined);
});

describe("POST /api/products/[id]/surveys", () => {
  it("returns 404 when the product isn't owned by the caller", async () => {
    assertProductOwned.mockRejectedValue(new HttpError(404, "Not found"));
    const res = await POST(req(), ctx("p1"));
    expect(res.status).toBe(404);
    expect(prisma.priceSurvey.create).not.toHaveBeenCalled();
  });

  it("creates a survey and returns its shareable URL", async () => {
    (prisma.priceSurvey.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "s1",
      token: "a".repeat(64),
    });

    const res = await POST(req(), ctx("p1"));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      id: "s1",
      token: "a".repeat(64),
      shareUrl: `https://tryzorin.com/survey/${"a".repeat(64)}`,
    });
    expect(prisma.priceSurvey.create).toHaveBeenCalledWith({
      data: { productId: "p1", merchantId: "m1", token: "a".repeat(64) },
    });
  });
});

describe("GET /api/products/[id]/surveys", () => {
  it("returns 404 when the product isn't owned by the caller", async () => {
    assertProductOwned.mockRejectedValue(new HttpError(404, "Not found"));
    const res = await GET(req(), ctx("p1"));
    expect(res.status).toBe(404);
  });

  it("lists surveys with a response count, most recent first", async () => {
    (prisma.priceSurvey.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "s2", token: "b".repeat(64), createdAt: new Date("2026-08-01"), _count: { responses: 3 } },
      { id: "s1", token: "a".repeat(64), createdAt: new Date("2026-07-01"), _count: { responses: 12 } },
    ]);

    const res = await GET(req(), ctx("p1"));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([
      { id: "s2", shareUrl: `https://tryzorin.com/survey/${"b".repeat(64)}`, createdAt: "2026-08-01T00:00:00.000Z", responseCount: 3 },
      { id: "s1", shareUrl: `https://tryzorin.com/survey/${"a".repeat(64)}`, createdAt: "2026-07-01T00:00:00.000Z", responseCount: 12 },
    ]);
    expect(prisma.priceSurvey.findMany).toHaveBeenCalledWith({
      where: { productId: "p1" },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { responses: true } } },
    });
  });
});
