import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { createPasswordResetToken, consumePasswordResetToken, RESET_TOKEN_TTL_MS } from "./resetToken";

const create = vi.fn();
const findUnique = vi.fn();
const deleteMany = vi.fn();
const prisma = {
  passwordResetToken: { create, findUnique, deleteMany },
} as unknown as PrismaClient;

beforeEach(() => {
  create.mockReset();
  findUnique.mockReset();
  deleteMany.mockReset();
});

describe("createPasswordResetToken", () => {
  it("returns a 64-hex-char raw token, stores its hash (not the raw value), with a ~1h expiry", async () => {
    deleteMany.mockResolvedValue({ count: 0 });
    create.mockResolvedValue({});
    const before = Date.now();

    const token = await createPasswordResetToken(prisma, "u1");

    expect(token).toMatch(/^[0-9a-f]{64}$/);
    expect(deleteMany).toHaveBeenCalledWith({ where: { userId: "u1" } });
    expect(create).toHaveBeenCalledTimes(1);
    const createArgs = create.mock.calls[0][0];
    expect(createArgs.data.userId).toBe("u1");
    expect(createArgs.data.tokenHash).not.toBe(token);
    expect(createArgs.data.expiresAt.getTime()).toBeGreaterThanOrEqual(before + RESET_TOKEN_TTL_MS - 1000);
  });

  it("deletes any existing token for the user before creating a new one", async () => {
    const order: string[] = [];
    deleteMany.mockImplementation(async () => { order.push("deleteMany"); return { count: 1 }; });
    create.mockImplementation(async () => { order.push("create"); return {}; });
    await createPasswordResetToken(prisma, "u1");
    expect(order).toEqual(["deleteMany", "create"]);
  });
});

describe("consumePasswordResetToken", () => {
  it("returns the userId and deletes the row for a valid, unexpired token", async () => {
    findUnique.mockResolvedValue({
      id: "prt1",
      userId: "u1",
      expiresAt: new Date(Date.now() + 60_000),
    });
    deleteMany.mockResolvedValue({ count: 1 });

    await expect(consumePasswordResetToken(prisma, "raw-token")).resolves.toEqual({ userId: "u1" });
    expect(deleteMany).toHaveBeenCalledWith({ where: { id: "prt1" } });
  });

  it("returns null for an unknown token", async () => {
    findUnique.mockResolvedValue(null);
    await expect(consumePasswordResetToken(prisma, "nope")).resolves.toBeNull();
  });

  it("returns null and deletes the row for an expired token", async () => {
    findUnique.mockResolvedValue({
      id: "prt1",
      userId: "u1",
      expiresAt: new Date(Date.now() - 1000),
    });
    deleteMany.mockResolvedValue({ count: 1 });

    await expect(consumePasswordResetToken(prisma, "raw-token")).resolves.toBeNull();
    expect(deleteMany).toHaveBeenCalledWith({ where: { id: "prt1" } });
  });
});
