import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCampaignFindMany = vi.hoisted(() => vi.fn());
const mockCampaignUpdate = vi.hoisted(() => vi.fn());
const mockLogCreate = vi.hoisted(() => vi.fn());
const mockExecuteChunk = vi.hoisted(() => vi.fn());
const mockRevertChunk = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db", () => ({
  prisma: {
    campaign: { findMany: mockCampaignFindMany, update: mockCampaignUpdate },
    campaignLog: { create: mockLogCreate },
  },
}));

vi.mock("@/lib/campaigns/execute", () => ({
  executeChunk: mockExecuteChunk,
  revertChunk: mockRevertChunk,
}));

import { GET } from "./route";

function makeReq(headers: Record<string, string> = {}): Request {
  return {
    headers: {
      get: (key: string) => headers[key.toLowerCase()] ?? null,
    },
  } as unknown as Request;
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.unstubAllEnvs();
  mockCampaignUpdate.mockResolvedValue({});
  mockLogCreate.mockResolvedValue({});
  // Default: no campaigns need action
  mockCampaignFindMany.mockResolvedValue([]);
});

describe("GET /api/cron/campaigns — auth", () => {
  it("returns 401 in production when authorization header is missing", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("CRON_SECRET", "secret123");
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it("returns 401 in production when authorization header is wrong", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("CRON_SECRET", "secret123");
    const res = await GET(makeReq({ authorization: "Bearer wrong" }));
    expect(res.status).toBe(401);
  });

  it("returns 200 in production with correct CRON_SECRET", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("CRON_SECRET", "secret123");
    const res = await GET(makeReq({ authorization: "Bearer secret123" }));
    expect(res.status).toBe(200);
  });

  it("skips auth check in development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const res = await GET(makeReq()); // no auth header
    expect(res.status).toBe(200);
  });
});

describe("GET /api/cron/campaigns — scheduled → executing", () => {
  it("transitions scheduled campaigns past startsAt to executing", async () => {
    mockCampaignFindMany
      .mockResolvedValueOnce([{ id: "c1", merchantId: "m1" }]) // scheduled
      .mockResolvedValue([]); // all others
    mockExecuteChunk.mockResolvedValue({ processed: 0, done: true });

    await GET(makeReq());
    expect(mockCampaignUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "executing" }) }),
    );
  });

  it("does nothing when no scheduled campaigns are ready", async () => {
    mockCampaignFindMany.mockResolvedValue([]);
    await GET(makeReq());
    expect(mockCampaignUpdate).not.toHaveBeenCalled();
  });
});

describe("GET /api/cron/campaigns — executing", () => {
  it("continues chunk execution for executing campaigns", async () => {
    mockCampaignFindMany
      .mockResolvedValueOnce([]) // scheduled
      .mockResolvedValueOnce([{ id: "c1", merchantId: "m1" }]) // executing
      .mockResolvedValue([]); // others
    mockExecuteChunk.mockResolvedValue({ processed: 10, done: false });

    await GET(makeReq());
    expect(mockExecuteChunk).toHaveBeenCalledWith(expect.anything(), "c1", "m1");
    expect(mockCampaignUpdate).not.toHaveBeenCalled(); // not done, no transition
  });

  it("transitions executing → active when executeChunk returns done=true", async () => {
    mockCampaignFindMany
      .mockResolvedValueOnce([]) // scheduled
      .mockResolvedValueOnce([{ id: "c1", merchantId: "m1" }]) // executing
      .mockResolvedValue([]);
    mockExecuteChunk.mockResolvedValue({ processed: 5, done: true });

    await GET(makeReq());
    expect(mockCampaignUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "active" }) }),
    );
  });
});

describe("GET /api/cron/campaigns — active → reverting/completed", () => {
  it("transitions active campaign with revertOnEnd=true to reverting", async () => {
    mockCampaignFindMany
      .mockResolvedValueOnce([]) // scheduled
      .mockResolvedValueOnce([]) // executing
      .mockResolvedValueOnce([{ id: "c1", merchantId: "m1", revertOnEnd: true }]) // expired active
      .mockResolvedValue([]);

    await GET(makeReq());
    expect(mockCampaignUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "reverting" }) }),
    );
  });

  it("transitions active campaign with revertOnEnd=false directly to completed", async () => {
    mockCampaignFindMany
      .mockResolvedValueOnce([]) // scheduled
      .mockResolvedValueOnce([]) // executing
      .mockResolvedValueOnce([{ id: "c1", merchantId: "m1", revertOnEnd: false }]) // expired active
      .mockResolvedValue([]);

    await GET(makeReq());
    expect(mockCampaignUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "completed" }) }),
    );
  });
});

describe("GET /api/cron/campaigns — reverting", () => {
  it("continues chunk revert for reverting campaigns", async () => {
    mockCampaignFindMany
      .mockResolvedValueOnce([]) // scheduled
      .mockResolvedValueOnce([]) // executing
      .mockResolvedValueOnce([]) // expired active
      .mockResolvedValueOnce([{ id: "c1", merchantId: "m1" }]); // reverting
    mockRevertChunk.mockResolvedValue({ processed: 10, done: false });

    await GET(makeReq());
    expect(mockRevertChunk).toHaveBeenCalledWith(expect.anything(), "c1", "m1");
    expect(mockCampaignUpdate).not.toHaveBeenCalled();
  });

  it("transitions reverting → completed when revertChunk returns done=true", async () => {
    mockCampaignFindMany
      .mockResolvedValueOnce([]) // scheduled
      .mockResolvedValueOnce([]) // executing
      .mockResolvedValueOnce([]) // expired active
      .mockResolvedValueOnce([{ id: "c1", merchantId: "m1" }]); // reverting
    mockRevertChunk.mockResolvedValue({ processed: 5, done: true });

    await GET(makeReq());
    expect(mockCampaignUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "completed" }) }),
    );
  });
});

describe("GET /api/cron/campaigns — no-op", () => {
  it("returns ok:true when no campaigns need action", async () => {
    mockCampaignFindMany.mockResolvedValue([]);
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(mockCampaignUpdate).not.toHaveBeenCalled();
  });
});
