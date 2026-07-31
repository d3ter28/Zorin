import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    wooCommerceConnection: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth/requireSession", () => ({
  requireSessionApi: vi.fn(async () => ({
    merchantId: "m1",
    user: { id: "u1", email: "demo@zorin.example", merchantId: "m1" },
  })),
}));

import { GET } from "./route";
import { prisma } from "@/lib/db";

function req(): Request {
  return {} as unknown as Request;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/woocommerce/status", () => {
  it("returns connected: false when no connection exists", async () => {
    (prisma.wooCommerceConnection.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await GET(req());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ connected: false });
  });

  it("returns connected: true with storeUrl and lastSyncedAt when connected", async () => {
    const lastSyncedAt = new Date("2026-06-01T00:00:00.000Z");
    (prisma.wooCommerceConnection.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      storeUrl: "https://mystore.example.com",
      lastSyncedAt,
      webhookIds: JSON.stringify(["wh-1", "wh-2"]),
    });
    const res = await GET(req());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.connected).toBe(true);
    expect(body.storeUrl).toBe("https://mystore.example.com");
    expect(body.lastSyncedAt).toBe(lastSyncedAt.toISOString());
  });

  it("returns connected: true with null lastSyncedAt when never synced", async () => {
    (prisma.wooCommerceConnection.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      storeUrl: "https://mystore.example.com",
      lastSyncedAt: null,
      webhookIds: JSON.stringify([]),
    });
    const res = await GET(req());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.connected).toBe(true);
    expect(body.lastSyncedAt).toBeNull();
  });

  it("returns webhooksActive: true when webhookIds is non-empty", async () => {
    (prisma.wooCommerceConnection.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      storeUrl: "https://mystore.example.com",
      lastSyncedAt: null,
      webhookIds: JSON.stringify(["wh-1", "wh-2"]),
    });
    const res = await GET(req());
    const body = await res.json();
    expect(body.webhooksActive).toBe(true);
  });

  it("returns webhooksActive: false when webhookIds is empty", async () => {
    (prisma.wooCommerceConnection.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      storeUrl: "https://mystore.example.com",
      lastSyncedAt: null,
      webhookIds: JSON.stringify([]),
    });
    const res = await GET(req());
    const body = await res.json();
    expect(body.webhooksActive).toBe(false);
  });
});
