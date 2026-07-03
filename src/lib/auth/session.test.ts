import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { createSession, destroySession, getSessionUser, SESSION_TTL_MS } from "./session";

const create = vi.fn();
const findUnique = vi.fn();
const del = vi.fn();
const deleteMany = vi.fn();
const prisma = {
  session: { create, findUnique, delete: del, deleteMany },
} as unknown as PrismaClient;

beforeEach(() => {
  create.mockReset();
  findUnique.mockReset();
  del.mockReset();
  deleteMany.mockReset();
});

describe("createSession", () => {
  it("stores a 64-hex-char token with a ~30 day expiry and returns both", async () => {
    create.mockResolvedValue({});
    const before = Date.now();
    const { token, expiresAt } = await createSession(prisma, "u1");
    expect(token).toMatch(/^[0-9a-f]{64}$/);
    expect(expiresAt.getTime()).toBeGreaterThanOrEqual(before + SESSION_TTL_MS - 1000);
    expect(create).toHaveBeenCalledWith({
      data: { token, userId: "u1", expiresAt },
    });
  });

  it("generates a different token every call", async () => {
    create.mockResolvedValue({});
    const a = await createSession(prisma, "u1");
    const b = await createSession(prisma, "u1");
    expect(a.token).not.toBe(b.token);
  });
});

describe("getSessionUser", () => {
  const user = { id: "u1", email: "d@e.f", merchantId: "m1" };

  it("returns the user for a live session", async () => {
    findUnique.mockResolvedValue({
      token: "t",
      expiresAt: new Date(Date.now() + 60_000),
      user,
    });
    await expect(getSessionUser(prisma, "t")).resolves.toEqual(user);
  });

  it("returns null for an unknown token", async () => {
    findUnique.mockResolvedValue(null);
    await expect(getSessionUser(prisma, "nope")).resolves.toBeNull();
  });

  it("returns null and deletes the row for an expired session", async () => {
    findUnique.mockResolvedValue({
      token: "t",
      expiresAt: new Date(Date.now() - 1000),
      user,
    });
    deleteMany.mockResolvedValue({ count: 1 });
    await expect(getSessionUser(prisma, "t")).resolves.toBeNull();
    expect(deleteMany).toHaveBeenCalledWith({ where: { token: "t" } });
  });

  it("returns null for an empty token without querying", async () => {
    await expect(getSessionUser(prisma, "")).resolves.toBeNull();
    expect(findUnique).not.toHaveBeenCalled();
  });
});

describe("destroySession", () => {
  it("deletes by token, tolerating already-gone rows", async () => {
    deleteMany.mockResolvedValue({ count: 0 });
    await destroySession(prisma, "t");
    expect(deleteMany).toHaveBeenCalledWith({ where: { token: "t" } });
  });
});
