import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import {
  createInvitation,
  findValidInvitation,
  markInvitationAccepted,
  revokeInvitation,
  listTeam,
  INVITE_TOKEN_TTL_MS,
} from "./invitation";
import { HttpError } from "@/lib/api/errors";

const create = vi.fn();
const findUnique = vi.fn();
const deleteMany = vi.fn();
const update = vi.fn();
const findMany = vi.fn();
const userFindMany = vi.fn();
const prisma = {
  invitation: { create, findUnique, deleteMany, update, findMany },
  user: { findMany: userFindMany },
} as unknown as PrismaClient;

beforeEach(() => {
  create.mockReset();
  findUnique.mockReset();
  deleteMany.mockReset();
  update.mockReset();
  findMany.mockReset();
  userFindMany.mockReset();
});

describe("createInvitation", () => {
  it("returns a 64-hex-char raw token, stores its hash (not the raw value), with a ~7 day expiry", async () => {
    deleteMany.mockResolvedValue({ count: 0 });
    create.mockResolvedValue({ id: "inv1", email: "teammate@example.com", expiresAt: new Date() });
    const before = Date.now();

    const { token, invitation } = await createInvitation(prisma, {
      merchantId: "m1",
      email: "teammate@example.com",
      invitedByUserId: "u1",
    });

    expect(token).toMatch(/^[0-9a-f]{64}$/);
    expect(invitation.id).toBe("inv1");
    const createArgs = create.mock.calls[0][0];
    expect(createArgs.data.tokenHash).not.toBe(token);
    expect(createArgs.data.merchantId).toBe("m1");
    expect(createArgs.data.email).toBe("teammate@example.com");
    expect(createArgs.data.invitedByUserId).toBe("u1");
    expect(createArgs.data.expiresAt.getTime()).toBeGreaterThanOrEqual(before + INVITE_TOKEN_TTL_MS - 1000);
  });

  it("deletes any existing pending invitation for the same merchant+email before creating a new one", async () => {
    const order: string[] = [];
    deleteMany.mockImplementation(async () => { order.push("deleteMany"); return { count: 1 }; });
    create.mockImplementation(async () => { order.push("create"); return { id: "inv2", email: "teammate@example.com", expiresAt: new Date() }; });

    await createInvitation(prisma, { merchantId: "m1", email: "teammate@example.com", invitedByUserId: "u1" });

    expect(order).toEqual(["deleteMany", "create"]);
    expect(deleteMany).toHaveBeenCalledWith({
      where: { merchantId: "m1", email: "teammate@example.com", acceptedAt: null },
    });
  });
});

describe("findValidInvitation", () => {
  it("returns the invitation for a valid, unexpired, unaccepted token", async () => {
    findUnique.mockResolvedValue({
      id: "inv1",
      merchantId: "m1",
      email: "teammate@example.com",
      acceptedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    });
    await expect(findValidInvitation(prisma, "raw-token")).resolves.toEqual({
      id: "inv1",
      merchantId: "m1",
      email: "teammate@example.com",
    });
  });

  it("returns null for an unknown token", async () => {
    findUnique.mockResolvedValue(null);
    await expect(findValidInvitation(prisma, "nope")).resolves.toBeNull();
  });

  it("returns null for an already-accepted invitation", async () => {
    findUnique.mockResolvedValue({
      id: "inv1",
      merchantId: "m1",
      email: "teammate@example.com",
      acceptedAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
    });
    await expect(findValidInvitation(prisma, "raw-token")).resolves.toBeNull();
  });

  it("returns null for an expired invitation", async () => {
    findUnique.mockResolvedValue({
      id: "inv1",
      merchantId: "m1",
      email: "teammate@example.com",
      acceptedAt: null,
      expiresAt: new Date(Date.now() - 1000),
    });
    await expect(findValidInvitation(prisma, "raw-token")).resolves.toBeNull();
  });
});

describe("markInvitationAccepted", () => {
  it("sets acceptedAt on the given invitation", async () => {
    update.mockResolvedValue({});
    await markInvitationAccepted(prisma, "inv1");
    expect(update).toHaveBeenCalledWith({ where: { id: "inv1" }, data: { acceptedAt: expect.any(Date) } });
  });
});

describe("revokeInvitation", () => {
  it("deletes a pending invitation scoped by merchantId", async () => {
    deleteMany.mockResolvedValue({ count: 1 });
    await revokeInvitation(prisma, "inv1", "m1");
    expect(deleteMany).toHaveBeenCalledWith({ where: { id: "inv1", merchantId: "m1", acceptedAt: null } });
  });

  it("throws 404 when nothing matched (wrong merchant, already accepted, or missing)", async () => {
    deleteMany.mockResolvedValue({ count: 0 });
    await expect(revokeInvitation(prisma, "inv1", "m1")).rejects.toMatchObject(new HttpError(404, "Not found"));
  });
});

describe("listTeam", () => {
  it("returns active members and pending invitations, flagging expired ones", async () => {
    userFindMany.mockResolvedValue([
      { id: "u1", email: "owner@example.com", role: "OWNER", createdAt: new Date("2026-08-01") },
      { id: "u2", email: "member@example.com", role: "MEMBER", createdAt: new Date("2026-08-05") },
    ]);
    (prisma.invitation.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "inv1", email: "pending@example.com", expiresAt: new Date(Date.now() + 60_000) },
      { id: "inv2", email: "stale@example.com", expiresAt: new Date(Date.now() - 60_000) },
    ]);

    const result = await listTeam(prisma, "m1");

    expect(result.members).toEqual([
      { id: "u1", email: "owner@example.com", role: "OWNER", createdAt: new Date("2026-08-01") },
      { id: "u2", email: "member@example.com", role: "MEMBER", createdAt: new Date("2026-08-05") },
    ]);
    expect(result.pendingInvites).toEqual([
      { id: "inv1", email: "pending@example.com", expiresAt: expect.any(Date), expired: false },
      { id: "inv2", email: "stale@example.com", expiresAt: expect.any(Date), expired: true },
    ]);
    expect(prisma.user.findMany).toHaveBeenCalledWith({ where: { merchantId: "m1" }, orderBy: { createdAt: "asc" } });
    expect(prisma.invitation.findMany).toHaveBeenCalledWith({
      where: { merchantId: "m1", acceptedAt: null },
      orderBy: { createdAt: "desc" },
    });
  });
});
