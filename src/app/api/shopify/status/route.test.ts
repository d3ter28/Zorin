import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    shopifyConnection: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth/requireSession", () => ({
  requireSessionApi: vi.fn(async () => ({
    merchantId: "m1",
    user: { id: "u1", email: "demo@priceiq.example", merchantId: "m1" },
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

describe("GET /api/shopify/status", () => {
  it("returns connected: false when no connection exists", async () => {
    (prisma.shopifyConnection.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await GET(req());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ connected: false });
  });

  it("returns connected: true with shopDomain and lastSyncedAt when connected", async () => {
    const lastSyncedAt = new Date("2026-06-01T00:00:00.000Z");
    (prisma.shopifyConnection.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      shopDomain: "mystore.myshopify.com",
      lastSyncedAt,
    });
    const res = await GET(req());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.connected).toBe(true);
    expect(body.shopDomain).toBe("mystore.myshopify.com");
    expect(body.lastSyncedAt).toBe(lastSyncedAt.toISOString());
  });

  it("returns connected: true with null lastSyncedAt when never synced", async () => {
    (prisma.shopifyConnection.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      shopDomain: "mystore.myshopify.com",
      lastSyncedAt: null,
    });
    const res = await GET(req());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.connected).toBe(true);
    expect(body.lastSyncedAt).toBeNull();
  });
});
