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

const mockExecuteChunk = vi.hoisted(() => vi.fn());
vi.mock("@/lib/campaigns/execute", () => ({
  executeChunk: mockExecuteChunk,
}));

import { POST } from "./route";

const ctx = { params: Promise.resolve({ id: "c1" }) };

function makeReq(): Request {
  return { json: async () => ({}), text: async () => "{}" } as unknown as Request;
}

beforeEach(() => {
  vi.resetAllMocks();
  mockLogCreate.mockResolvedValue({});
  mockUpdate.mockResolvedValue({ id: "c1", status: "executing" });
});

describe("POST /api/campaigns/[id]/execute", () => {
  it("transitions scheduled campaign to executing and runs first chunk", async () => {
    mockFindUniqueOrThrow
      .mockResolvedValueOnce({ id: "c1", status: "scheduled" })
      .mockResolvedValueOnce({ id: "c1", status: "executing" });
    mockExecuteChunk.mockResolvedValue({ processed: 5, done: false });

    const res = await POST(makeReq(), ctx);
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "executing" }) }),
    );
    expect(mockExecuteChunk).toHaveBeenCalledWith(expect.anything(), "c1", "m1", 0);
  });

  it("transitions to active when chunk reports done", async () => {
    mockFindUniqueOrThrow
      .mockResolvedValueOnce({ id: "c1", status: "scheduled" })
      .mockResolvedValueOnce({ id: "c1", status: "active" });
    mockExecuteChunk.mockResolvedValue({ processed: 2, done: true });

    const res = await POST(makeReq(), ctx);
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "active" }) }),
    );
  });

  it("returns 400 if campaign is not scheduled", async () => {
    mockFindUniqueOrThrow.mockResolvedValueOnce({ id: "c1", status: "active" });
    const res = await POST(makeReq(), ctx);
    expect(res.status).toBe(400);
    expect(mockExecuteChunk).not.toHaveBeenCalled();
  });
});
