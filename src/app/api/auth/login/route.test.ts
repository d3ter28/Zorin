import { beforeEach, describe, expect, it, vi } from "vitest";

const { userFindUnique } = vi.hoisted(() => ({ userFindUnique: vi.fn() }));
const { createSession } = vi.hoisted(() => ({ createSession: vi.fn() }));
const { verifyPassword } = vi.hoisted(() => ({ verifyPassword: vi.fn() }));

vi.mock("@/lib/db", () => ({ prisma: { user: { findUnique: userFindUnique } } }));
vi.mock("@/lib/auth/session", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth/session")>()),
  createSession,
}));
vi.mock("@/lib/auth/password", () => ({ verifyPassword }));
vi.mock("@/lib/auth/rateLimit", () => ({
  checkRateLimit: vi.fn(() => ({ allowed: true, retryAfterMs: 0 })),
  clearRateLimit: vi.fn(),
}));

import { POST } from "./route";

const fakeHeaders = new Headers({ "x-forwarded-for": "127.0.0.1" });
const req = (body: unknown) =>
  ({ json: async () => body, headers: fakeHeaders }) as unknown as Request;

beforeEach(() => {
  userFindUnique.mockReset();
  createSession.mockReset();
  verifyPassword.mockReset();
});

describe("POST /api/auth/login", () => {
  it("sets the session cookie on valid credentials", async () => {
    userFindUnique.mockResolvedValue({ id: "u1", passwordHash: "h" });
    verifyPassword.mockResolvedValue(true);
    createSession.mockResolvedValue({
      token: "tok9",
      expiresAt: new Date(Date.now() + 1000),
    });

    const res = await POST(req({ email: "demo@zorin.example", password: "demo1234" }));

    expect(res.status).toBe(200);
    expect(res.headers.get("set-cookie")).toContain("zorin_session=tok9");
  });

  it("returns the same generic 401 for unknown email and wrong password", async () => {
    userFindUnique.mockResolvedValue(null);
    const unknownEmail = await POST(req({ email: "who@x.example", password: "whatever1" }));

    userFindUnique.mockResolvedValue({ id: "u1", passwordHash: "h" });
    verifyPassword.mockResolvedValue(false);
    const wrongPassword = await POST(req({ email: "demo@zorin.example", password: "wrongpass" }));

    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.status).toBe(401);
    await expect(unknownEmail.json()).resolves.toEqual(await wrongPassword.json());
  });

  it("returns 400 when email or password is missing", async () => {
    const res = await POST(req({ email: "demo@zorin.example" }));
    expect(res.status).toBe(400);
  });
});
