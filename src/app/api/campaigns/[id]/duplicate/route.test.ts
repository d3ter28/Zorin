import { beforeEach, describe, expect, it, vi } from "vitest";

const mockFindUniqueOrThrow = vi.hoisted(() => vi.fn());
const mockCreate = vi.hoisted(() => vi.fn());
const mockLogCreate = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db", () => ({
  prisma: {
    campaign: { findUniqueOrThrow: mockFindUniqueOrThrow, create: mockCreate },
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

describe("POST /api/campaigns/[id]/duplicate", () => {
  it("creates a draft copy of a completed campaign with (copy) suffix", async () => {
    mockFindUniqueOrThrow.mockResolvedValue({
      id: "c1",
      name: "Summer Sale",
      status: "completed",
      type: "sale",
      rules: "{}",
      revertOnEnd: true,
      products: [{ productId: "p1" }, { productId: "p2" }],
    });
    mockCreate.mockResolvedValue({ id: "c2", name: "Summer Sale (copy)", status: "draft" });

    const res = await POST(makeReq(), ctx);
    expect(res.status).toBe(201);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: "Summer Sale (copy)", status: "draft" }),
      }),
    );
  });

  it("returns 400 if campaign is not completed", async () => {
    mockFindUniqueOrThrow.mockResolvedValue({
      id: "c1",
      status: "active",
      products: [],
    });
    const res = await POST(makeReq(), ctx);
    expect(res.status).toBe(400);
  });
});
