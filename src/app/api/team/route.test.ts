import { beforeEach, describe, expect, it, vi } from "vitest";

const { findMany: userFindMany } = vi.hoisted(() => ({ findMany: vi.fn() }));
const { findMany: invitationFindMany } = vi.hoisted(() => ({ findMany: vi.fn() }));

vi.mock("@/lib/db", () => ({
  prisma: {
    user: { findMany: userFindMany },
    invitation: { findMany: invitationFindMany },
  },
}));

vi.mock("@/lib/auth/requireSession", () => ({
  requireSessionApi: vi.fn(async () => ({
    merchantId: "m1",
    user: { id: "u1", email: "owner@example.com", merchantId: "m1", role: "OWNER" },
  })),
}));

import { GET } from "./route";

beforeEach(() => {
  userFindMany.mockReset();
  invitationFindMany.mockReset();
});

describe("GET /api/team", () => {
  it("returns members and pending invitations for the caller's merchant", async () => {
    userFindMany.mockResolvedValue([
      { id: "u1", email: "owner@example.com", role: "OWNER", createdAt: new Date("2026-08-01") },
    ]);
    invitationFindMany.mockResolvedValue([
      {
        id: "inv1",
        email: "teammate@example.com",
        expiresAt: new Date(Date.now() + 60_000),
        createdAt: new Date("2026-08-06T00:00:00.000Z"),
      },
    ]);

    const res = await GET();

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.members).toEqual([
      { id: "u1", email: "owner@example.com", role: "OWNER", createdAt: "2026-08-01T00:00:00.000Z" },
    ]);
    expect(body.pendingInvites[0]).toMatchObject({
      id: "inv1",
      email: "teammate@example.com",
      createdAt: "2026-08-06T00:00:00.000Z",
      expired: false,
    });
  });
});
