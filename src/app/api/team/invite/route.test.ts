import { beforeEach, describe, expect, it, vi } from "vitest";

const { findUnique: userFindUnique } = vi.hoisted(() => ({ findUnique: vi.fn() }));
const { findUnique: merchantFindUnique } = vi.hoisted(() => ({ findUnique: vi.fn() }));
const { createInvitation } = vi.hoisted(() => ({ createInvitation: vi.fn() }));
const { sendInviteEmail } = vi.hoisted(() => ({ sendInviteEmail: vi.fn(async () => undefined) }));

vi.mock("@/lib/db", () => ({
  prisma: {
    user: { findUnique: userFindUnique },
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

const reqWith = (body: unknown) =>
  ({ json: async () => body, url: "https://tryzorin.com/api/team/invite" }) as unknown as Request;

beforeEach(() => {
  userFindUnique.mockReset();
  merchantFindUnique.mockReset();
  createInvitation.mockReset();
  sendInviteEmail.mockClear();
});

describe("POST /api/team/invite", () => {
  it("returns 400 for an invalid email", async () => {
    const res = await POST(reqWith({ email: "not-an-email" }));
    expect(res.status).toBe(400);
    expect(createInvitation).not.toHaveBeenCalled();
  });

  it("returns 409 when the email already has a Zorin account", async () => {
    userFindUnique.mockResolvedValue({ id: "existing" });
    const res = await POST(reqWith({ email: "taken@example.com" }));
    expect(res.status).toBe(409);
    expect(createInvitation).not.toHaveBeenCalled();
  });

  it("creates an invitation and sends the email", async () => {
    userFindUnique.mockResolvedValue(null);
    merchantFindUnique.mockResolvedValue({ name: "Acme Co" });
    createInvitation.mockResolvedValue({
      token: "raw-token",
      invitation: { id: "inv1", email: "teammate@example.com", expiresAt: new Date() },
    });

    const res = await POST(reqWith({ email: "teammate@example.com" }));

    expect(res.status).toBe(200);
    expect(createInvitation).toHaveBeenCalledWith(expect.anything(), {
      merchantId: "m1",
      email: "teammate@example.com",
      invitedByUserId: "u1",
    });
    expect(sendInviteEmail).toHaveBeenCalledWith(
      "teammate@example.com",
      "Acme Co",
      "https://tryzorin.com/invite/raw-token",
    );
  });
});
