import { beforeEach, describe, expect, it, vi } from "vitest";

const { findFirst } = vi.hoisted(() => ({ findFirst: vi.fn() }));
const { findUnique: merchantFindUnique } = vi.hoisted(() => ({ findUnique: vi.fn() }));
const { createInvitation } = vi.hoisted(() => ({ createInvitation: vi.fn() }));
const { sendInviteEmail } = vi.hoisted(() => ({ sendInviteEmail: vi.fn(async () => undefined) }));

vi.mock("@/lib/db", () => ({
  prisma: {
    invitation: { findFirst },
    merchant: { findUnique: merchantFindUnique },
  },
}));
vi.mock("@/lib/auth/requireSession", () => ({
  requireOwnerApi: vi.fn(async () => ({
    merchantId: "m1",
    user: { id: "u1", email: "owner@example.com", merchantId: "m1", role: "OWNER" },
  })),
}));
vi.mock("@/lib/team/invitation", () => ({ createInvitation }));
vi.mock("@/lib/email/sendInviteEmail", () => ({ sendInviteEmail }));

import { POST } from "./route";

const req = () => ({ url: "https://tryzorin.com/api/team/invitations/inv1/resend" }) as unknown as Request;
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  findFirst.mockReset();
  merchantFindUnique.mockReset();
  createInvitation.mockReset();
  sendInviteEmail.mockClear();
});

describe("POST /api/team/invitations/[id]/resend", () => {
  it("returns 404 when the pending invitation doesn't belong to this merchant", async () => {
    findFirst.mockResolvedValue(null);
    const res = await POST(req(), ctx("inv1"));
    expect(res.status).toBe(404);
    expect(createInvitation).not.toHaveBeenCalled();
  });

  it("issues a fresh invitation for the same email and re-sends", async () => {
    findFirst.mockResolvedValue({ id: "inv1", email: "teammate@example.com" });
    merchantFindUnique.mockResolvedValue({ name: "Acme Co" });
    createInvitation.mockResolvedValue({
      token: "fresh-token",
      invitation: { id: "inv2", email: "teammate@example.com", expiresAt: new Date() },
    });

    const res = await POST(req(), ctx("inv1"));

    expect(res.status).toBe(200);
    expect(createInvitation).toHaveBeenCalledWith(expect.anything(), {
      merchantId: "m1",
      email: "teammate@example.com",
      invitedByUserId: "u1",
    });
    expect(sendInviteEmail).toHaveBeenCalledWith(
      "teammate@example.com",
      "Acme Co",
      "https://tryzorin.com/invite/fresh-token",
    );
  });
});
