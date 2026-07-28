import { beforeEach, describe, expect, it, vi } from "vitest";

const { userFindUnique } = vi.hoisted(() => ({ userFindUnique: vi.fn() }));
const { createPasswordResetToken } = vi.hoisted(() => ({ createPasswordResetToken: vi.fn() }));
const { sendPasswordResetEmail } = vi.hoisted(() => ({ sendPasswordResetEmail: vi.fn() }));
const { checkRateLimit } = vi.hoisted(() => ({ checkRateLimit: vi.fn() }));

vi.mock("@/lib/db", () => ({ prisma: { user: { findUnique: userFindUnique } } }));
vi.mock("@/lib/auth/resetToken", () => ({ createPasswordResetToken }));
vi.mock("@/lib/email/sendPasswordResetEmail", () => ({ sendPasswordResetEmail }));
vi.mock("@/lib/auth/rateLimit", () => ({ checkRateLimit }));

import { POST } from "./route";

const fakeHeaders = new Headers({ "x-forwarded-for": "127.0.0.1" });
const req = (body: unknown) =>
  ({ json: async () => body, headers: fakeHeaders, url: "http://localhost:3000/api/auth/forgot-password" }) as unknown as Request;

beforeEach(() => {
  userFindUnique.mockReset();
  createPasswordResetToken.mockReset();
  sendPasswordResetEmail.mockReset();
  sendPasswordResetEmail.mockResolvedValue(undefined);
  checkRateLimit.mockReset();
  checkRateLimit.mockResolvedValue({ allowed: true, retryAfterMs: 0 });
});

describe("POST /api/auth/forgot-password", () => {
  it("returns ok:true and sends nothing for an unknown email", async () => {
    userFindUnique.mockResolvedValue(null);
    const res = await POST(req({ email: "nobody@example.com" }));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
    expect(createPasswordResetToken).not.toHaveBeenCalled();
    expect(sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it("creates a token and emails a reset link for a known email", async () => {
    userFindUnique.mockResolvedValue({ id: "u1", email: "demo@zorin.example" });
    createPasswordResetToken.mockResolvedValue("rawtoken123");

    const res = await POST(req({ email: "demo@zorin.example" }));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
    expect(createPasswordResetToken).toHaveBeenCalledWith(expect.anything(), "u1");
    expect(sendPasswordResetEmail).toHaveBeenCalledWith(
      "demo@zorin.example",
      "http://localhost:3000/reset-password?token=rawtoken123",
    );
  });

  it("returns 429 when rate-limited", async () => {
    checkRateLimit.mockResolvedValue({ allowed: false, retryAfterMs: 60_000 });
    const res = await POST(req({ email: "demo@zorin.example" }));
    expect(res.status).toBe(429);
  });
});
