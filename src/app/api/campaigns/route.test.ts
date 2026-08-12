import { beforeEach, describe, expect, it, vi } from "vitest";

const { findMany: campaignFindMany } = vi.hoisted(() => ({
  findMany: vi.fn(),
}));

const { create: campaignCreate } = vi.hoisted(() => ({
  create: vi.fn(),
}));

const { create: campaignLogCreate } = vi.hoisted(() => ({
  create: vi.fn(),
}));

const { $transaction: prismaTransaction } = vi.hoisted(() => ({
  $transaction: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    campaign: { findMany: campaignFindMany, create: campaignCreate },
    campaignLog: { create: campaignLogCreate },
    $transaction: prismaTransaction,
  },
}));

const mockRequireSessionApi = vi.hoisted(() => vi.fn());
const mockRequireOwnerApi = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/requireSession", () => ({
  requireSessionApi: mockRequireSessionApi,
  requireOwnerApi: mockRequireOwnerApi,
}));

import { GET, POST } from "./route";

function makeReq(body?: unknown, searchParams?: Record<string, string>): Request {
  const url = new URL("http://localhost/api/campaigns");
  if (searchParams) {
    for (const [k, v] of Object.entries(searchParams)) url.searchParams.set(k, v);
  }
  return {
    url: url.toString(),
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Request;
}

const ownerSession = { merchantId: "m1", user: { id: "u1", role: "OWNER", merchantId: "m1" } };
const memberSession = { merchantId: "m1", user: { id: "u1", role: "MEMBER", merchantId: "m1" } };

beforeEach(() => {
  campaignFindMany.mockReset();
  campaignCreate.mockReset();
  campaignLogCreate.mockReset();
  mockRequireSessionApi.mockReset();
  mockRequireOwnerApi.mockReset();
  prismaTransaction.mockReset();
  prismaTransaction.mockImplementation(
    (fn: (tx: unknown) => unknown) =>
      fn({
        campaign: { create: campaignCreate },
        campaignLog: { create: campaignLogCreate },
      }),
  );
});

describe("GET /api/campaigns", () => {
  it("returns campaigns for the authenticated merchant", async () => {
    mockRequireSessionApi.mockResolvedValue(memberSession);
    const fakeCampaigns = [
      { id: "c1", merchantId: "m1", name: "Summer Sale", status: "draft", _count: { products: 3 } },
    ];
    campaignFindMany.mockResolvedValue(fakeCampaigns);

    const res = await GET(makeReq());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual(fakeCampaigns);
    expect(campaignFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { merchantId: "m1" },
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { products: true } } },
      }),
    );
  });

  it("filters by ?status= query param", async () => {
    mockRequireSessionApi.mockResolvedValue(memberSession);
    campaignFindMany.mockResolvedValue([]);

    await GET(makeReq(undefined, { status: "active" }));

    expect(campaignFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { merchantId: "m1", status: "active" },
      }),
    );
  });

  it("returns 401 when not authenticated", async () => {
    const { HttpError } = await import("@/lib/api/errors");
    mockRequireSessionApi.mockRejectedValue(new HttpError(401, "unauthorized"));

    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });
});

describe("POST /api/campaigns", () => {
  const validBody = { name: "Summer Sale", type: "sale", rules: { discount: 10 } };

  it("creates a draft campaign and returns 201", async () => {
    mockRequireOwnerApi.mockResolvedValue(ownerSession);
    const created = { id: "c1", merchantId: "m1", name: "Summer Sale", type: "sale", status: "draft", revertOnEnd: true };
    campaignCreate.mockResolvedValue(created);
    campaignLogCreate.mockResolvedValue({});

    const res = await POST(makeReq(validBody));
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body).toEqual(created);
    expect(campaignCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          merchantId: "m1",
          name: "Summer Sale",
          type: "sale",
          status: "draft",
          revertOnEnd: true,
        }),
      }),
    );
    expect(campaignLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ campaignId: "c1", event: "created" }),
      }),
    );
  });

  it("sets revertOnEnd=true by default for 'sale' type", async () => {
    mockRequireOwnerApi.mockResolvedValue(ownerSession);
    campaignCreate.mockResolvedValue({ id: "c2" });
    campaignLogCreate.mockResolvedValue({});

    await POST(makeReq({ name: "Sale", type: "sale", rules: {} }));

    expect(campaignCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ revertOnEnd: true }),
      }),
    );
  });

  it("sets revertOnEnd=false by default for 'ml_recommendation' type", async () => {
    mockRequireOwnerApi.mockResolvedValue(ownerSession);
    campaignCreate.mockResolvedValue({ id: "c3" });
    campaignLogCreate.mockResolvedValue({});

    await POST(makeReq({ name: "ML", type: "ml_recommendation", rules: {} }));

    expect(campaignCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ revertOnEnd: false }),
      }),
    );
  });

  it("returns 400 when name is empty", async () => {
    mockRequireOwnerApi.mockResolvedValue(ownerSession);

    const res = await POST(makeReq({ name: "  ", type: "sale", rules: {} }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain("name");
    expect(campaignCreate).not.toHaveBeenCalled();
  });

  it("returns 400 when name is missing", async () => {
    mockRequireOwnerApi.mockResolvedValue(ownerSession);

    const res = await POST(makeReq({ type: "sale", rules: {} }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when type is invalid", async () => {
    mockRequireOwnerApi.mockResolvedValue(ownerSession);

    const res = await POST(makeReq({ name: "My Campaign", type: "discount", rules: {} }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain("type");
    expect(campaignCreate).not.toHaveBeenCalled();
  });

  it("returns 400 when rules is missing", async () => {
    mockRequireOwnerApi.mockResolvedValue(ownerSession);

    const res = await POST(makeReq({ name: "My Campaign", type: "sale" }));
    expect(res.status).toBe(400);
    expect(campaignCreate).not.toHaveBeenCalled();
  });

  it("returns 403 when caller is not owner", async () => {
    const { HttpError } = await import("@/lib/api/errors");
    mockRequireOwnerApi.mockRejectedValue(new HttpError(403, "Owner access required"));

    const res = await POST(makeReq(validBody));
    expect(res.status).toBe(403);
    expect(campaignCreate).not.toHaveBeenCalled();
  });
});
