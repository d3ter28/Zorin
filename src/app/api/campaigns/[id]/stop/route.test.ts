import { beforeEach, describe, expect, it, vi } from "vitest";

const mockFindUniqueOrThrow = vi.hoisted(() => vi.fn());
const mockUpdate = vi.hoisted(() => vi.fn());
const mockLogCreate = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db", () => ({
  prisma: {
    campaign: { findUniqueOrThrow: mockFindUniqueOrThrow, update: mockUpdate },
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
  mockUpdate.mockResolvedValue({ id: "c1" });
});

describe("POST /api/campaigns/[id]/stop", () => {
  it("transitions active campaign with revertOnEnd=true to reverting", async () => {
    mockFindUniqueOrThrow.mockResolvedValue({ id: "c1", status: "active", revertOnEnd: true });
    const res = await POST(makeReq(), ctx);
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "reverting" }) }),
    );
  });

  it("transitions active campaign with revertOnEnd=false to completed", async () => {
    mockFindUniqueOrThrow.mockResolvedValue({ id: "c1", status: "active", revertOnEnd: false });
    const res = await POST(makeReq(), ctx);
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "completed" }) }),
    );
  });

  it("returns 400 for draft campaign", async () => {
    mockFindUniqueOrThrow.mockResolvedValue({ id: "c1", status: "draft", revertOnEnd: true });
    const res = await POST(makeReq(), ctx);
    expect(res.status).toBe(400);
  });

  it("returns 400 for completed campaign", async () => {
    mockFindUniqueOrThrow.mockResolvedValue({ id: "c1", status: "completed", revertOnEnd: false });
    const res = await POST(makeReq(), ctx);
    expect(res.status).toBe(400);
  });

  it("transitions reverting campaign to completed when stopped", async () => {
    mockFindUniqueOrThrow.mockResolvedValue({ id: "c1", status: "reverting", revertOnEnd: true });
    const res = await POST(makeReq(), ctx);
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "completed" }) }),
    );
  });
});
