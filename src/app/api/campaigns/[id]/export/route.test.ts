import { beforeEach, describe, expect, it, vi } from "vitest";

const mockFindUniqueOrThrow = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db", () => ({
  prisma: {
    campaign: { findUniqueOrThrow: mockFindUniqueOrThrow },
  },
}));

vi.mock("@/lib/auth/requireSession", () => ({
  requireSessionApi: vi.fn(async () => ({ merchantId: "m1", user: { id: "u1", merchantId: "m1" } })),
}));

vi.mock("@/lib/campaigns/assertions", () => ({
  assertCampaignOwned: vi.fn(async () => {}),
}));

import { GET } from "./route";

const ctx = { params: Promise.resolve({ id: "c1" }) };

function makeReq(): Request {
  return {} as unknown as Request;
}

beforeEach(() => vi.resetAllMocks());

describe("GET /api/campaigns/[id]/export", () => {
  it("returns CSV with correct headers and product rows", async () => {
    mockFindUniqueOrThrow.mockResolvedValue({
      id: "c1",
      name: "Summer Sale",
      products: [
        {
          originalPriceCents: 1000,
          targetPriceCents: 1100,
          appliedAt: new Date("2024-01-01T00:00:00Z"),
          revertedAt: null,
          error: null,
          product: { title: "Ceramic Mug", sku: "MUG-001" },
        },
      ],
    });

    const res = await GET(makeReq(), ctx);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/csv");
    const text = await res.text();
    expect(text).toContain("SKU,Title,Original Price,Target Price,Change %");
    expect(text).toContain("MUG-001");
    expect(text).toContain("Ceramic Mug");
    expect(text).toContain("10.0"); // change %
  });

  it("escapes double quotes in product titles", async () => {
    mockFindUniqueOrThrow.mockResolvedValue({
      id: "c1",
      name: "Sale",
      products: [
        {
          originalPriceCents: 1000,
          targetPriceCents: 1100,
          appliedAt: null,
          revertedAt: null,
          error: null,
          product: { title: 'He said "hi"', sku: "SKU-1" },
        },
      ],
    });

    const res = await GET(makeReq(), ctx);
    const text = await res.text();
    expect(text).toContain('He said ""hi""');
  });
});
