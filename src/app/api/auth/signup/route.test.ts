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

vi.mock("@/lib/db", () => ({
  prisma: { user: { findUnique: userFindUnique }, $transaction: transaction },
}));
vi.mock("@/lib/auth/session", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth/session")>()),
  createSession,
}));
vi.mock("@/lib/auth/password", () => ({ hashPassword }));

import { POST } from "./route";

const req = (body: unknown) =>
  ({ json: async () => body }) as unknown as Request;

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
});

describe("POST /api/auth/signup", () => {
  it("creates merchant + user, starts a session, sets the cookie, returns 201", async () => {
    userFindUnique.mockResolvedValue(null);
    hashPassword.mockResolvedValue("hashed");
    txMerchantCreate.mockResolvedValue({ id: "m-new" });
    txUserCreate.mockResolvedValue({ id: "u-new" });
    createSession.mockResolvedValue({
      token: "tok123",
      expiresAt: new Date(Date.now() + 1000),
    });

    const res = await POST(req(valid));

    expect(res.status).toBe(201);
    expect(txMerchantCreate).toHaveBeenCalledWith({
      data: { name: "New Shop", storeUrl: "https://new.example" },
    });
    expect(txUserCreate).toHaveBeenCalledWith({
      data: { email: "new@shop.example", passwordHash: "hashed", merchantId: "m-new" },
    });
    expect(createSession.mock.calls[0][1]).toBe("u-new");
    expect(res.headers.get("set-cookie")).toContain("zorin_session=tok123");
    expect(res.headers.get("set-cookie")).toContain("HttpOnly");
  });

  it("returns 409 for a duplicate email", async () => {
    userFindUnique.mockResolvedValue({ id: "u-exists" });
    const res = await POST(req(valid));
    expect(res.status).toBe(409);
    expect(transaction).not.toHaveBeenCalled();
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
