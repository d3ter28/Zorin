import { beforeEach, describe, expect, it, vi } from "vitest";

const { findValidInvitation } = vi.hoisted(() => ({ findValidInvitation: vi.fn() }));
const { findUnique } = vi.hoisted(() => ({ findUnique: vi.fn() }));

vi.mock("@/lib/db", () => ({ prisma: { merchant: { findUnique } } }));
vi.mock("@/lib/team/invitation", () => ({ findValidInvitation }));

import { GET } from "./route";

const ctx = (token: string) => ({ params: Promise.resolve({ token }) });

beforeEach(() => {
  findValidInvitation.mockReset();
  findUnique.mockReset();
});

describe("GET /api/invite/[token]", () => {
  it("returns 404 for an invalid token", async () => {
    findValidInvitation.mockResolvedValue(null);
    const res = await GET(undefined as unknown as Request, ctx("bad-token"));
    expect(res.status).toBe(404);
  });

  it("returns the merchant name and invited email for a valid token", async () => {
    findValidInvitation.mockResolvedValue({ id: "inv1", merchantId: "m1", email: "teammate@example.com" });
    findUnique.mockResolvedValue({ name: "Acme Co" });
    const res = await GET(undefined as unknown as Request, ctx("good-token"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ merchantName: "Acme Co", email: "teammate@example.com" });
  });
});
