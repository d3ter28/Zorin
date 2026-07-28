import { beforeEach, describe, expect, it, vi } from "vitest";

const { userUpdate } = vi.hoisted(() => ({ userUpdate: vi.fn() }));
const { consumePasswordResetToken } = vi.hoisted(() => ({ consumePasswordResetToken: vi.fn() }));
const { hashPassword } = vi.hoisted(() => ({ hashPassword: vi.fn() }));
const { destroyAllSessions } = vi.hoisted(() => ({ destroyAllSessions: vi.fn() }));
const { checkRateLimit } = vi.hoisted(() => ({ checkRateLimit: vi.fn() }));

vi.mock("@/lib/db", () => ({ prisma: { user: { update: userUpdate } } }));
vi.mock("@/lib/auth/resetToken", () => ({ consumePasswordResetToken }));
vi.mock("@/lib/auth/password", () => ({ hashPassword }));
vi.mock("@/lib/auth/session", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth/session")>()),
  destroyAllSessions,
}));
vi.mock("@/lib/auth/rateLimit", () => ({ checkRateLimit }));

import { POST } from "./route";

const fakeHeaders = new Headers({ "x-forwarded-for": "127.0.0.1" });
const req = (body: unknown) =>
  ({ json: async () => body, headers: fakeHeaders }) as unknown as Request;

beforeEach(() => {
  userUpdate.mockReset();
  consumePasswordResetToken.mockReset();
  hashPassword.mockReset();
  destroyAllSessions.mockReset();
  checkRateLimit.mockReset();
  checkRateLimit.mockResolvedValue({ allowed: true, retryAfterMs: 0 });
});

describe("POST /api/auth/reset-password", () => {
  it("resets the password and invalidates all sessions for a valid token", async () => {
    consumePasswordResetToken.mockResolvedValue({ userId: "u1" });
    hashPassword.mockResolvedValue("newhash");
    userUpdate.mockResolvedValue({});
    destroyAllSessions.mockResolvedValue(undefined);

    const res = await POST(req({ token: "rawtoken", newPassword: "newpassword1" }));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
    expect(userUpdate).toHaveBeenCalledWith({ where: { id: "u1" }, data: { passwordHash: "newhash" } });
    expect(destroyAllSessions).toHaveBeenCalledWith(expect.anything(), "u1");
  });

  it("rejects an invalid or expired token with a generic 400", async () => {
    consumePasswordResetToken.mockResolvedValue(null);
    const res = await POST(req({ token: "bad", newPassword: "newpassword1" }));
    expect(res.status).toBe(400);
    expect(userUpdate).not.toHaveBeenCalled();
  });

  it("rejects a short new password with 400 before touching the token", async () => {
    const res = await POST(req({ token: "rawtoken", newPassword: "short" }));
    expect(res.status).toBe(400);
    expect(consumePasswordResetToken).not.toHaveBeenCalled();
  });

  it("rejects a missing token with 400", async () => {
    const res = await POST(req({ newPassword: "newpassword1" }));
    expect(res.status).toBe(400);
  });

  it("returns 429 when rate-limited", async () => {
    checkRateLimit.mockResolvedValue({ allowed: false, retryAfterMs: 60_000 });
    const res = await POST(req({ token: "rawtoken", newPassword: "newpassword1" }));
    expect(res.status).toBe(429);
  });
});
