import { beforeEach, describe, expect, it, vi } from "vitest";

const { findValidInvitation, markInvitationAccepted } = vi.hoisted(() => ({
  findValidInvitation: vi.fn(),
  markInvitationAccepted: vi.fn(async () => undefined),
}));
const { findUnique } = vi.hoisted(() => ({ findUnique: vi.fn() }));
const { $transaction } = vi.hoisted(() => ({
  $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn({ user: { create: vi.fn(async () => ({ id: "u2" })) } })),
}));
const { createSession, setSessionCookie } = vi.hoisted(() => ({
  createSession: vi.fn(async () => ({ token: "session-token", expiresAt: new Date() })),
  setSessionCookie: vi.fn(),
}));
const { hashPassword } = vi.hoisted(() => ({ hashPassword: vi.fn(async () => "hashed") }));

vi.mock("@/lib/db", () => ({
  prisma: { user: { findUnique }, $transaction },
}));
vi.mock("@/lib/team/invitation", () => ({ findValidInvitation, markInvitationAccepted }));
vi.mock("@/lib/auth/password", () => ({ hashPassword }));
vi.mock("@/lib/auth/session", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth/session")>()),
  createSession,
  setSessionCookie,
}));

import { POST } from "./route";

const ctx = (token: string) => ({ params: Promise.resolve({ token }) });
const reqWith = (body: unknown) => ({ json: async () => body }) as unknown as Request;

beforeEach(() => {
  findValidInvitation.mockReset();
  markInvitationAccepted.mockClear();
  findUnique.mockReset();
  $transaction.mockClear();
  createSession.mockClear();
  setSessionCookie.mockClear();
  hashPassword.mockClear();
});

describe("POST /api/invite/[token]/accept", () => {
  it("returns 404 for an invalid/expired token", async () => {
    findValidInvitation.mockResolvedValue(null);
    const res = await POST(reqWith({ password: "longenough" }), ctx("bad-token"));
    expect(res.status).toBe(404);
  });

  it("returns 400 for a password under 8 characters", async () => {
    findValidInvitation.mockResolvedValue({ id: "inv1", merchantId: "m1", email: "teammate@example.com" });
    const res = await POST(reqWith({ password: "short" }), ctx("good-token"));
    expect(res.status).toBe(400);
  });

  it("returns 409 if the email was claimed by someone else since the invite was sent", async () => {
    findValidInvitation.mockResolvedValue({ id: "inv1", merchantId: "m1", email: "teammate@example.com" });
    findUnique.mockResolvedValue({ id: "already-exists" });
    const res = await POST(reqWith({ password: "longenough" }), ctx("good-token"));
    expect(res.status).toBe(409);
  });

  it("creates the user, marks the invitation accepted, and starts a session", async () => {
    findValidInvitation.mockResolvedValue({ id: "inv1", merchantId: "m1", email: "teammate@example.com" });
    findUnique.mockResolvedValue(null);

    const res = await POST(reqWith({ password: "longenough" }), ctx("good-token"));

    expect(res.status).toBe(200);
    expect(hashPassword).toHaveBeenCalledWith("longenough");
    expect($transaction).toHaveBeenCalled();
    expect(markInvitationAccepted).toHaveBeenCalledWith(expect.anything(), "inv1");
    expect(createSession).toHaveBeenCalledWith(expect.anything(), "u2");
    expect(setSessionCookie).toHaveBeenCalled();
  });
});
