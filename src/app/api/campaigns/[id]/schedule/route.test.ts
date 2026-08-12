import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCampaignFindUniqueOrThrow = vi.hoisted(() => vi.fn());
const mockCampaignUpdate = vi.hoisted(() => vi.fn());
const mockProductFindMany = vi.hoisted(() => vi.fn());
const mockCpCreateMany = vi.hoisted(() => vi.fn());
const mockCpDeleteMany = vi.hoisted(() => vi.fn());
const mockLogCreate = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db", () => ({
  prisma: {
    campaign: { findUniqueOrThrow: mockCampaignFindUniqueOrThrow, update: mockCampaignUpdate },
    product: { findMany: mockProductFindMany },
    campaignProduct: { createMany: mockCpCreateMany, deleteMany: mockCpDeleteMany },
    campaignLog: { create: mockLogCreate },
  },
}));

vi.mock("@/lib/auth/requireSession", () => ({
  requireOwnerApi: vi.fn(async () => ({ merchantId: "m1", user: { id: "u1", merchantId: "m1" } })),
}));

vi.mock("@/lib/campaigns/assertions", () => ({
  assertCampaignOwned: vi.fn(async () => {}),
}));

const mockFindConflicts = vi.hoisted(() => vi.fn());
vi.mock("@/lib/campaigns/conflicts", () => ({
  findConflicts: mockFindConflicts,
}));

import { POST } from "./route";

const ctx = { params: Promise.resolve({ id: "c1" }) };

function makeReq(body: unknown): Request {
  return { json: async () => body, text: async () => JSON.stringify(body) } as unknown as Request;
}

beforeEach(() => {
  vi.resetAllMocks();
  mockLogCreate.mockResolvedValue({});
  mockCampaignUpdate.mockResolvedValue({ id: "c1", status: "scheduled" });
  mockFindConflicts.mockResolvedValue([]);
  mockCpCreateMany.mockResolvedValue({ count: 1 });
});

describe("POST /api/campaigns/[id]/schedule", () => {
  it("schedules a draft campaign", async () => {
    mockCampaignFindUniqueOrThrow.mockResolvedValue({
      id: "c1",
      status: "draft",
      startsAt: new Date(),
      rules: JSON.stringify({ mode: "percentage", percentage: 10, rounding: "none", marginFloorPct: 10 }),
    });
    mockProductFindMany.mockResolvedValue([
      { id: "p1", currentPrice: 1000, cogs: null, recommendation: null, competitorPrices: [] },
    ]);

    const res = await POST(makeReq({ productIds: ["p1"] }), ctx);
    expect(res.status).toBe(200);
    expect(mockCpCreateMany).toHaveBeenCalled();
    expect(mockCampaignUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "scheduled" }) }),
    );
  });

  it("returns 400 if not draft", async () => {
    mockCampaignFindUniqueOrThrow.mockResolvedValue({ id: "c1", status: "active" });
    const res = await POST(makeReq({ productIds: ["p1"] }), ctx);
    expect(res.status).toBe(400);
  });

  it("returns 400 if startsAt not set", async () => {
    mockCampaignFindUniqueOrThrow.mockResolvedValue({ id: "c1", status: "draft", startsAt: null });
    const res = await POST(makeReq({ productIds: ["p1"] }), ctx);
    expect(res.status).toBe(400);
  });

  it("returns 409 with conflicts", async () => {
    mockCampaignFindUniqueOrThrow.mockResolvedValue({
      id: "c1",
      status: "draft",
      startsAt: new Date(),
      rules: JSON.stringify({ mode: "percentage", percentage: 10, rounding: "none", marginFloorPct: 10 }),
    });
    mockFindConflicts.mockResolvedValue([
      { productId: "p1", productTitle: "Mug", existingCampaignId: "c2", existingCampaignName: "Old Sale" },
    ]);

    const res = await POST(makeReq({ productIds: ["p1"] }), ctx);
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.conflicts).toHaveLength(1);
  });

  it("overrides conflicts when overrideConflicts is true", async () => {
    mockCampaignFindUniqueOrThrow.mockResolvedValue({
      id: "c1",
      status: "draft",
      startsAt: new Date(),
      rules: JSON.stringify({ mode: "percentage", percentage: 10, rounding: "none", marginFloorPct: 10 }),
    });
    mockFindConflicts.mockResolvedValue([
      { productId: "p1", productTitle: "Mug", existingCampaignId: "c2", existingCampaignName: "Old" },
    ]);
    mockProductFindMany.mockResolvedValue([
      { id: "p1", currentPrice: 1000, cogs: null, recommendation: null, competitorPrices: [] },
    ]);

    const res = await POST(makeReq({ productIds: ["p1"], overrideConflicts: true }), ctx);
    expect(res.status).toBe(200);
    expect(mockCpDeleteMany).toHaveBeenCalled();
  });
});
