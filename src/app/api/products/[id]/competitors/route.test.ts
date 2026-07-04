import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: { product: { findUnique: vi.fn() } },
}));
vi.mock("@/lib/auth/requireSession", () => ({
  requireSessionApi: vi.fn(async () => ({ user: { id: "u1" }, merchantId: "m1" })),
}));
const recordObservation = vi.fn(async () => {});
vi.mock("@/lib/scrape/recordObservation", () => ({
  recordObservation: (...a: unknown[]) => recordObservation(...a),
}));

import { POST } from "./route";
import { prisma } from "@/lib/db";

const productFindUnique = vi.mocked(prisma.product.findUnique);

function post(body: unknown): Request {
  return new Request("http://t/api/products/p1/competitors", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}
const ctx = { params: Promise.resolve({ id: "p1" }) };

beforeEach(() => {
  vi.clearAllMocks();
  productFindUnique.mockResolvedValue({ id: "p1", merchantId: "m1" });
});

describe("POST /api/products/[id]/competitors", () => {
  it("records each candidate with source discovery and returns the count", async () => {
    const res = await POST(
      post({
        candidates: [
          { url: "https://walmart.com/ip/mug", competitorName: "walmart.com", priceCents: 1499 },
          { url: "https://target.com/p/mug", competitorName: "Target", priceCents: 1550 },
        ],
      }),
      ctx,
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ added: 2 });
    expect(recordObservation).toHaveBeenCalledTimes(2);
    expect(recordObservation).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        productId: "p1",
        competitorName: "walmart.com",
        competitorUrl: "https://walmart.com/ip/mug",
        priceCents: 1499,
        source: "discovery",
      }),
    );
  });

  it("400s on malformed candidates", async () => {
    expect((await POST(post({}), ctx)).status).toBe(400);
    expect((await POST(post({ candidates: "x" }), ctx)).status).toBe(400);
    expect((await POST(post({ candidates: [{ url: "https://a.com" }] }), ctx)).status).toBe(400);
    expect(
      (await POST(post({ candidates: [{ url: "https://a.com", competitorName: "a", priceCents: -5 }] }), ctx)).status,
    ).toBe(400);
    expect((await POST(post({ candidates: [] }), ctx)).status).toBe(400);
    expect(recordObservation).not.toHaveBeenCalled();
  });

  it("404s on a foreign product without recording anything", async () => {
    productFindUnique.mockResolvedValue({ id: "p1", merchantId: "OTHER" });
    const res = await POST(
      post({ candidates: [{ url: "https://a.com/x", competitorName: "a", priceCents: 100 }] }),
      ctx,
    );
    expect(res.status).toBe(404);
    expect(recordObservation).not.toHaveBeenCalled();
  });
});
