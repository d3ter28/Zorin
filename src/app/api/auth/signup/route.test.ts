import { beforeEach, describe, expect, it, vi } from "vitest";

const { userFindUnique, txMerchantCreate, txUserCreate, transaction } = vi.hoisted(() => {
  const txMerchantCreate = vi.fn();
  const txUserCreate = vi.fn();
  return {
    userFindUnique: vi.fn(),
    txMerchantCreate,
    txUserCreate,
    transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({ merchant: { create: txMerchantCreate }, user: { create: txUserCreate } }),
    ),
  };
});
const { createSession } = vi.hoisted(() => ({ createSession: vi.fn() }));
const { hashPassword } = vi.hoisted(() => ({ hashPassword: vi.fn() }));
const { checkRateLimit } = vi.hoisted(() => ({ checkRateLimit: vi.fn() }));

vi.mock("@/lib/db", () => ({
  prisma: { user: { findUnique: userFindUnique }, $transaction: transaction },
}));
vi.mock("@/lib/auth/session", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth/session")>()),
  createSession,
}));
vi.mock("@/lib/auth/password", () => ({ hashPassword }));
vi.mock("@/lib/auth/rateLimit", () => ({ checkRateLimit }));

import { POST } from "./route";

const req = (body: unknown) =>
  ({ json: async () => body, headers: new Headers() }) as unknown as Request;

const valid = {
  email: "new@shop.example",
  password: "longenough",
  storeName: "New Shop",
  storeUrl: "https://new.example",
};

beforeEach(() => {
  userFindUnique.mockReset();
  txMerchantCreate.mockReset();
  txUserCreate.mockReset();
  transaction.mockClear();
  createSession.mockReset();
  hashPassword.mockReset();
  checkRateLimit.mockReset();
  checkRateLimit.mockResolvedValue({ allowed: true, retryAfterMs: 0 });
});

describe("POST /api/auth/signup", () => {
  it("creates merchant + user, starts a 7-day no-card trial, starts a session, returns 201", async () => {
    userFindUnique.mockResolvedValue(null);
    hashPassword.mockResolvedValue("hashed");
    txMerchantCreate.mockResolvedValue({ id: "m-new" });
    txUserCreate.mockResolvedValue({ id: "u-new" });
    createSession.mockResolvedValue({
      token: "tok123",
      expiresAt: new Date(Date.now() + 1000),
    });

    const before = Date.now();
    const res = await POST(req({ ...valid, plan: "starter" }));

    expect(res.status).toBe(201);
    expect(txMerchantCreate).toHaveBeenCalledTimes(1);
    const merchantArgs = txMerchantCreate.mock.calls[0][0];
    expect(merchantArgs.data.name).toBe("New Shop");
    expect(merchantArgs.data.storeUrl).toBe("https://new.example");
    expect(merchantArgs.data.subscriptionStatus).toBe("trialing");
    expect(merchantArgs.data.planTier).toBe("starter");
    expect(merchantArgs.data.trialEndsAt.getTime()).toBeGreaterThanOrEqual(
      before + 7 * 24 * 60 * 60 * 1000 - 1000,
    );
    expect(txUserCreate).toHaveBeenCalledWith({
      data: { email: "new@shop.example", passwordHash: "hashed", merchantId: "m-new" },
    });
    expect(createSession.mock.calls[0][1]).toBe("u-new");
    expect(res.headers.get("set-cookie")).toContain("zorin_session=tok123");
    expect(res.headers.get("set-cookie")).toContain("HttpOnly");
  });

  it("defaults to the growth plan tier when no plan is provided", async () => {
    userFindUnique.mockResolvedValue(null);
    hashPassword.mockResolvedValue("hashed");
    txMerchantCreate.mockResolvedValue({ id: "m-new" });
    txUserCreate.mockResolvedValue({ id: "u-new" });
    createSession.mockResolvedValue({ token: "tok123", expiresAt: new Date(Date.now() + 1000) });

    await POST(req(valid));

    expect(txMerchantCreate.mock.calls[0][0].data.planTier).toBe("growth");
  });

  it("returns 400 for an invalid plan tier", async () => {
    const res = await POST(req({ ...valid, plan: "enterprise" }));
    expect(res.status).toBe(400);
    expect(txMerchantCreate).not.toHaveBeenCalled();
  });

  it("returns 409 for a duplicate email", async () => {
    userFindUnique.mockResolvedValue({ id: "u-exists" });
    const res = await POST(req(valid));
    expect(res.status).toBe(409);
    expect(transaction).not.toHaveBeenCalled();
  });

  it("normalizes email before the uniqueness check, blocking Gmail dot/+tag trial-farming variants", async () => {
    userFindUnique.mockResolvedValue({ id: "u-exists" });

    const res = await POST(req({ ...valid, email: "N.ew+trial@Gmail.com" }));

    expect(res.status).toBe(409);
    expect(userFindUnique).toHaveBeenCalledWith({ where: { email: "new@gmail.com" } });
  });

  it("stores the normalized email, not the raw input, on a fresh signup", async () => {
    userFindUnique.mockResolvedValue(null);
    hashPassword.mockResolvedValue("hashed");
    txMerchantCreate.mockResolvedValue({ id: "m-new" });
    txUserCreate.mockResolvedValue({ id: "u-new" });
    createSession.mockResolvedValue({ token: "tok123", expiresAt: new Date(Date.now() + 1000) });

    await POST(req({ ...valid, email: "New+trial@Gmail.com" }));

    expect(txUserCreate.mock.calls[0][0].data.email).toBe("new@gmail.com");
  });

  it("returns 400 for an invalid email", async () => {
    const res = await POST(req({ ...valid, email: "not-an-email" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for a password under 8 chars", async () => {
    const res = await POST(req({ ...valid, password: "short" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for an empty store name", async () => {
    const res = await POST(req({ ...valid, storeName: "  " }));
    expect(res.status).toBe(400);
  });
});
