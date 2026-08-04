import { beforeEach, describe, expect, it, vi } from "vitest";

const { findMany, create } = vi.hoisted(() => ({
  findMany: vi.fn(),
  create: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    competitorPrice: { findMany, create },
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

import { GET, POST } from "./route";
import { prisma } from "@/lib/db";
import { HttpError } from "@/lib/api/errors";

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const reqWith = (body: unknown) => ({ json: async () => body }) as unknown as Request;
const reqNoBody = () => ({}) as unknown as Request;

beforeEach(() => {
  findMany.mockReset();
  create.mockReset();
  assertProductOwned.mockReset();
  assertProductOwned.mockResolvedValue(undefined);
});

describe("GET /api/products/[id]/competitor-prices", () => {
  it("returns 404 when the product isn't owned by the caller", async () => {
    assertProductOwned.mockRejectedValue(new HttpError(404, "Not found"));
    const res = await GET(reqNoBody(), ctx("p1"));
    expect(res.status).toBe(404);
    expect(findMany).not.toHaveBeenCalled();
  });

  it("lists rows sorted by priceCents ascending", async () => {
    (findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "cp1", competitorName: "Acme", priceCents: 2900, url: null, capturedAt: new Date("2026-08-01") },
      { id: "cp2", competitorName: "Widgetco", priceCents: 3500, url: "https://widgetco.example/p", capturedAt: new Date("2026-08-02") },
    ]);
    const res = await GET(reqNoBody(), ctx("p1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([
      { id: "cp1", competitorName: "Acme", priceCents: 2900, url: null, capturedAt: "2026-08-01T00:00:00.000Z" },
      { id: "cp2", competitorName: "Widgetco", priceCents: 3500, url: "https://widgetco.example/p", capturedAt: "2026-08-02T00:00:00.000Z" },
    ]);
    expect(prisma.competitorPrice.findMany).toHaveBeenCalledWith({
      where: { productId: "p1" },
      orderBy: { priceCents: "asc" },
    });
  });
});

describe("POST /api/products/[id]/competitor-prices", () => {
  it("returns 404 when the product isn't owned by the caller", async () => {
    assertProductOwned.mockRejectedValue(new HttpError(404, "Not found"));
    const res = await POST(reqWith({ competitorName: "Acme", priceCents: 2900 }), ctx("p1"));
    expect(res.status).toBe(404);
    expect(create).not.toHaveBeenCalled();
  });

  it("returns 400 for an empty competitor name", async () => {
    const res = await POST(reqWith({ competitorName: "  ", priceCents: 2900 }), ctx("p1"));
    expect(res.status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });

  it("returns 400 for a non-positive price", async () => {
    const res = await POST(reqWith({ competitorName: "Acme", priceCents: 0 }), ctx("p1"));
    expect(res.status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });

  it("returns 400 for an invalid url", async () => {
    const res = await POST(
      reqWith({ competitorName: "Acme", priceCents: 2900, url: "not-a-url" }),
      ctx("p1"),
    );
    expect(res.status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });

  it("creates a row with a valid url", async () => {
    (create as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "cp1",
      competitorName: "Acme",
      priceCents: 2900,
      url: "https://acme.example/p",
      capturedAt: new Date("2026-08-04"),
    });
    const res = await POST(
      reqWith({ competitorName: "Acme", priceCents: 2900, url: "https://acme.example/p" }),
      ctx("p1"),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      id: "cp1",
      competitorName: "Acme",
      priceCents: 2900,
      url: "https://acme.example/p",
      capturedAt: "2026-08-04T00:00:00.000Z",
    });
    expect(prisma.competitorPrice.create).toHaveBeenCalledWith({
      data: { productId: "p1", merchantId: "m1", competitorName: "Acme", priceCents: 2900, url: "https://acme.example/p" },
    });
  });

  it("creates a row with no url (stores null)", async () => {
    (create as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "cp1",
      competitorName: "Acme",
      priceCents: 2900,
      url: null,
      capturedAt: new Date("2026-08-04"),
    });
    await POST(reqWith({ competitorName: "Acme", priceCents: 2900 }), ctx("p1"));
    expect(prisma.competitorPrice.create).toHaveBeenCalledWith({
      data: { productId: "p1", merchantId: "m1", competitorName: "Acme", priceCents: 2900, url: null },
    });
  });
});
