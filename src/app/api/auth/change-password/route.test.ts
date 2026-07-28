import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireSessionApi } = vi.hoisted(() => ({ requireSessionApi: vi.fn() }));
const { userFindUnique, userUpdate } = vi.hoisted(() => ({ userFindUnique: vi.fn(), userUpdate: vi.fn() }));
const { verifyPassword, hashPassword } = vi.hoisted(() => ({ verifyPassword: vi.fn(), hashPassword: vi.fn() }));
const { destroyOtherSessions } = vi.hoisted(() => ({ destroyOtherSessions: vi.fn() }));
const { cookies } = vi.hoisted(() => ({ cookies: vi.fn() }));
const { checkRateLimit } = vi.hoisted(() => ({ checkRateLimit: vi.fn() }));

vi.mock("@/lib/auth/requireSession", () => ({ requireSessionApi }));
vi.mock("@/lib/db", () => ({ prisma: { user: { findUnique: userFindUnique, update: userUpdate } } }));
vi.mock("@/lib/auth/password", () => ({ verifyPassword, hashPassword }));
vi.mock("@/lib/auth/session", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth/session")>()),
  destroyOtherSessions,
}));
vi.mock("next/headers", () => ({ cookies }));
vi.mock("@/lib/auth/rateLimit", () => ({ checkRateLimit }));

import { HttpError } from "@/lib/api/errors";
import { POST } from "./route";

const fakeHeaders = new Headers({ "x-forwarded-for": "127.0.0.1" });
const req = (body: unknown) =>
  ({ json: async () => body, headers: fakeHeaders }) as unknown as Request;

beforeEach(() => {
  requireSessionApi.mockReset();
  userFindUnique.mockReset();
  userUpdate.mockReset();
  verifyPassword.mockReset();
  hashPassword.mockReset();
  destroyOtherSessions.mockReset();
  cookies.mockReset();
  cookies.mockResolvedValue({ get: () => ({ value: "current-session-token" }) });
  checkRateLimit.mockReset();
  checkRateLimit.mockResolvedValue({ allowed: true, retryAfterMs: 0 });
});

describe("POST /api/auth/change-password", () => {
  it("updates the password and invalidates other sessions, keeping the current one", async () => {
    requireSessionApi.mockResolvedValue({ user: { id: "u1", email: "demo@zorin.example", merchantId: "m1" }, merchantId: "m1" });
    userFindUnique.mockResolvedValue({ id: "u1", passwordHash: "oldhash" });
    verifyPassword.mockResolvedValue(true);
    hashPassword.mockResolvedValue("newhash");
    userUpdate.mockResolvedValue({});

    const res = await POST(req({ currentPassword: "oldpassword1", newPassword: "newpassword1" }));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
    expect(userUpdate).toHaveBeenCalledWith({ where: { id: "u1" }, data: { passwordHash: "newhash" } });
    expect(destroyOtherSessions).toHaveBeenCalledWith(expect.anything(), "u1", "current-session-token");
  });

  it("rejects the wrong current password with 401 and does not update", async () => {
    requireSessionApi.mockResolvedValue({ user: { id: "u1", email: "demo@zorin.example", merchantId: "m1" }, merchantId: "m1" });
    userFindUnique.mockResolvedValue({ id: "u1", passwordHash: "oldhash" });
    verifyPassword.mockResolvedValue(false);

    const res = await POST(req({ currentPassword: "wrong", newPassword: "newpassword1" }));

    expect(res.status).toBe(401);
    expect(userUpdate).not.toHaveBeenCalled();
  });

  it("rejects a short new password with 400", async () => {
    requireSessionApi.mockResolvedValue({ user: { id: "u1", email: "demo@zorin.example", merchantId: "m1" }, merchantId: "m1" });
    const res = await POST(req({ currentPassword: "oldpassword1", newPassword: "short" }));
    expect(res.status).toBe(400);
  });

  it("propagates the 401 from requireSessionApi when unauthenticated", async () => {
    requireSessionApi.mockRejectedValue(new HttpError(401, "unauthorized"));
    const res = await POST(req({ currentPassword: "x", newPassword: "newpassword1" }));
    expect(res.status).toBe(401);
  });

  it("falls back to an empty token if the session cookie is unexpectedly missing (destroys all sessions as a fail-safe)", async () => {
    requireSessionApi.mockResolvedValue({ user: { id: "u1", email: "demo@zorin.example", merchantId: "m1" }, merchantId: "m1" });
    userFindUnique.mockResolvedValue({ id: "u1", passwordHash: "oldhash" });
    verifyPassword.mockResolvedValue(true);
    hashPassword.mockResolvedValue("newhash");
    userUpdate.mockResolvedValue({});
    cookies.mockResolvedValue({ get: () => undefined });

    const res = await POST(req({ currentPassword: "oldpassword1", newPassword: "newpassword1" }));

    expect(res.status).toBe(200);
    expect(destroyOtherSessions).toHaveBeenCalledWith(expect.anything(), "u1", "");
  });

  it("returns 429 when rate-limited", async () => {
    checkRateLimit.mockResolvedValue({ allowed: false, retryAfterMs: 60_000 });
    const res = await POST(req({ currentPassword: "oldpassword1", newPassword: "newpassword1" }));
    expect(res.status).toBe(429);
  });
});
