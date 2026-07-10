import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    shopifyConnection: {
      delete: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth/requireSession", () => ({
  requireSessionApi: vi.fn(async () => ({
    merchantId: "m1",
    user: { id: "u1", email: "demo@zorin.example", merchantId: "m1" },
  })),
}));

import { POST } from "./route";
import { prisma } from "@/lib/db";

function req(): Request {
  return {} as unknown as Request;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/shopify/disconnect", () => {
  it("deletes the connection and returns { success: true }", async () => {
    (prisma.shopifyConnection.delete as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const res = await POST(req());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ success: true });
    expect(prisma.shopifyConnection.delete).toHaveBeenCalledWith({
      where: { merchantId: "m1" },
    });
  });

  it("returns 404 when no connection exists (Prisma P2025)", async () => {
    const err = Object.assign(new Error("Record not found"), { code: "P2025" });
    (prisma.shopifyConnection.delete as ReturnType<typeof vi.fn>).mockRejectedValue(err);
    const res = await POST(req());
    expect(res.status).toBe(404);
  });
});
