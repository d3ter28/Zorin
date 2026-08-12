import { beforeEach, describe, expect, it, vi } from "vitest";

const { findUnique: campaignFindUnique } = vi.hoisted(() => ({
  findUnique: vi.fn(),
}));

const { findUniqueOrThrow: campaignFindUniqueOrThrow } = vi.hoisted(() => ({
  findUniqueOrThrow: vi.fn(),
}));

const { update: campaignUpdate } = vi.hoisted(() => ({
  update: vi.fn(),
}));

const { delete: campaignDelete } = vi.hoisted(() => ({
  delete: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    campaign: {
      findUnique: campaignFindUnique,
      findUniqueOrThrow: campaignFindUniqueOrThrow,
      update: campaignUpdate,
      delete: campaignDelete,
    },
  },
}));

const mockRequireSessionApi = vi.hoisted(() => vi.fn());
const mockRequireOwnerApi = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/requireSession", () => ({
  requireSessionApi: mockRequireSessionApi,
  requireOwnerApi: mockRequireOwnerApi,
}));

const mockAssertCampaignOwned = vi.hoisted(() => vi.fn());

vi.mock("@/lib/campaigns/assertions", () => ({
  assertCampaignOwned: mockAssertCampaignOwned,
}));

import { GET, PATCH, DELETE } from "./route";

function makeReq(body?: unknown): Request {
  return {
    url: "http://localhost/api/campaigns/c1",
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Request;
}

const ctx = { params: Promise.resolve({ id: "c1" }) };

const ownerSession = { merchantId: "m1", user: { id: "u1", role: "OWNER", merchantId: "m1" } };
const memberSession = { merchantId: "m1", user: { id: "u1", role: "MEMBER", merchantId: "m1" } };

const draftCampaign = {
  id: "c1",
  merchantId: "m1",
  name: "Summer Sale",
  type: "sale",
  status: "draft",
  rules: "{}",
  revertOnEnd: true,
  createdAt: new Date().toISOString(),
};

const activeCampaign = { ...draftCampaign, status: "active" };

beforeEach(() => {
  campaignFindUnique.mockReset();
  campaignFindUniqueOrThrow.mockReset();
  campaignUpdate.mockReset();
  campaignDelete.mockReset();
  mockRequireSessionApi.mockReset();
  mockRequireOwnerApi.mockReset();
  mockAssertCampaignOwned.mockReset();
  mockAssertCampaignOwned.mockResolvedValue(undefined);
});

describe("GET /api/campaigns/[id]", () => {
  it("returns campaign with products and logs", async () => {
    mockRequireSessionApi.mockResolvedValue(memberSession);
    const fullCampaign = {
      ...draftCampaign,
      products: [{ id: "cp1", product: { title: "Widget", sku: "WDG-001" } }],
      logs: [{ id: "l1", event: "created", createdAt: new Date().toISOString() }],
    };
    campaignFindUniqueOrThrow.mockResolvedValue(fullCampaign);

    const res = await GET(makeReq(), ctx);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual(fullCampaign);
    expect(mockAssertCampaignOwned).toHaveBeenCalledWith(expect.anything(), "c1", "m1");
    expect(campaignFindUniqueOrThrow).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "c1" },
        include: expect.objectContaining({
          products: expect.any(Object),
          logs: expect.any(Object),
        }),
      }),
    );
  });

  it("returns 404 when campaign belongs to another merchant", async () => {
    const { HttpError } = await import("@/lib/api/errors");
    mockRequireSessionApi.mockResolvedValue(memberSession);
    mockAssertCampaignOwned.mockRejectedValue(new HttpError(404, "Not found"));

    const res = await GET(makeReq(), ctx);
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/campaigns/[id]", () => {
  it("updates a draft campaign and returns 200", async () => {
    mockRequireOwnerApi.mockResolvedValue(ownerSession);
    campaignFindUniqueOrThrow.mockResolvedValue(draftCampaign);
    const updated = { ...draftCampaign, name: "Winter Sale" };
    campaignUpdate.mockResolvedValue(updated);

    const res = await PATCH(makeReq({ name: "Winter Sale" }), ctx);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.name).toBe("Winter Sale");
    expect(mockAssertCampaignOwned).toHaveBeenCalledWith(expect.anything(), "c1", "m1");
    expect(campaignUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "c1" },
        data: expect.objectContaining({ name: "Winter Sale" }),
      }),
    );
  });

  it("returns 400 when campaign is not in draft status", async () => {
    mockRequireOwnerApi.mockResolvedValue(ownerSession);
    campaignFindUniqueOrThrow.mockResolvedValue(activeCampaign);

    const res = await PATCH(makeReq({ name: "New Name" }), ctx);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain("draft");
    expect(campaignUpdate).not.toHaveBeenCalled();
  });

  it("returns 404 when campaign belongs to another merchant", async () => {
    const { HttpError } = await import("@/lib/api/errors");
    mockRequireOwnerApi.mockResolvedValue(ownerSession);
    mockAssertCampaignOwned.mockRejectedValue(new HttpError(404, "Not found"));

    const res = await PATCH(makeReq({ name: "X" }), ctx);
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/campaigns/[id]", () => {
  it("deletes a draft campaign and returns ok", async () => {
    mockRequireOwnerApi.mockResolvedValue(ownerSession);
    campaignFindUniqueOrThrow.mockResolvedValue(draftCampaign);
    campaignDelete.mockResolvedValue(draftCampaign);

    const res = await DELETE(makeReq(), ctx);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(mockAssertCampaignOwned).toHaveBeenCalledWith(expect.anything(), "c1", "m1");
    expect(campaignDelete).toHaveBeenCalledWith({ where: { id: "c1" } });
  });

  it("returns 400 when campaign is not in draft status", async () => {
    mockRequireOwnerApi.mockResolvedValue(ownerSession);
    campaignFindUniqueOrThrow.mockResolvedValue(activeCampaign);

    const res = await DELETE(makeReq(), ctx);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain("draft");
    expect(campaignDelete).not.toHaveBeenCalled();
  });

  it("returns 404 when campaign belongs to another merchant", async () => {
    const { HttpError } = await import("@/lib/api/errors");
    mockRequireOwnerApi.mockResolvedValue(ownerSession);
    mockAssertCampaignOwned.mockRejectedValue(new HttpError(404, "Not found"));

    const res = await DELETE(makeReq(), ctx);
    expect(res.status).toBe(404);
  });
});
