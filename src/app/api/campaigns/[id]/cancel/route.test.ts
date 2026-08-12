import { beforeEach, describe, expect, it, vi } from "vitest";

const mockFindUniqueOrThrow = vi.hoisted(() => vi.fn());
const mockUpdate = vi.hoisted(() => vi.fn());
const mockCpDeleteMany = vi.hoisted(() => vi.fn());
const mockLogCreate = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db", () => ({
  prisma: {
    campaign: { findUniqueOrThrow: mockFindUniqueOrThrow, update: mockUpdate },
    campaignProduct: { deleteMany: mockCpDeleteMany },
    campaignLog: { create: mockLogCreate },
  },
}));

vi.mock("@/lib/auth/requireSession", () => ({
  requireOwnerApi: vi.fn(async () => ({ merchantId: "m1", user: { id: "u1", merchantId: "m1" } })),
}));

vi.mock("@/lib/campaigns/assertions", () => ({
  assertCampaignOwned: vi.fn(async () => {}),
}));

import { POST } from "./route";

const ctx = { params: Promise.resolve({ id: "c1" }) };

function makeReq(): Request {
  return { json: async () => ({}), text: async () => "{}" } as unknown as Request;
}

beforeEach(() => {
  vi.resetAllMocks();
  mockLogCreate.mockResolvedValue({});
});

describe("POST /api/campaigns/[id]/cancel", () => {
  it("cancels a scheduled campaign", async () => {
    mockFindUniqueOrThrow.mockResolvedValue({ id: "c1", status: "scheduled" });
    mockCpDeleteMany.mockResolvedValue({ count: 5 });
    mockUpdate.mockResolvedValue({ id: "c1", status: "draft" });

    const res = await POST(makeReq(), ctx);
    expect(res.status).toBe(200);
    expect(mockCpDeleteMany).toHaveBeenCalledWith({ where: { campaignId: "c1" } });
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: "draft" }),
    }));
  });

  it("returns 400 for non-scheduled campaign", async () => {
    mockFindUniqueOrThrow.mockResolvedValue({ id: "c1", status: "active" });
    const res = await POST(makeReq(), ctx);
    expect(res.status).toBe(400);
  });
});
