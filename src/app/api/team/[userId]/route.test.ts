import { beforeEach, describe, expect, it, vi } from "vitest";

const { findFirst, deleteUser } = vi.hoisted(() => ({ findFirst: vi.fn(), deleteUser: vi.fn() }));
const { destroyAllSessions } = vi.hoisted(() => ({ destroyAllSessions: vi.fn(async () => undefined) }));

vi.mock("@/lib/db", () => ({ prisma: { user: { findFirst, delete: deleteUser } } }));
vi.mock("@/lib/auth/requireSession", () => ({
  requireOwnerApi: vi.fn(async () => ({
    merchantId: "m1",
    user: { id: "owner1", email: "owner@example.com", merchantId: "m1", role: "OWNER" },
  })),
}));
vi.mock("@/lib/auth/session", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth/session")>()),
  destroyAllSessions,
}));

import { DELETE } from "./route";

const ctx = (userId: string) => ({ params: Promise.resolve({ userId }) });

beforeEach(() => {
  findFirst.mockReset();
  deleteUser.mockReset();
  destroyAllSessions.mockClear();
});

describe("DELETE /api/team/[userId]", () => {
  it("returns 400 when the Owner targets themselves", async () => {
    findFirst.mockResolvedValue({ id: "owner1", merchantId: "m1", role: "OWNER" });
    const res = await DELETE(undefined as unknown as Request, ctx("owner1"));
    expect(res.status).toBe(400);
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it("returns 400 when the target is an Owner other than the caller", async () => {
    findFirst.mockResolvedValue({ id: "owner2", merchantId: "m1", role: "OWNER" });
    const res = await DELETE(undefined as unknown as Request, ctx("owner2"));
    expect(res.status).toBe(400);
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it("returns 404 when the target isn't in the caller's merchant", async () => {
    findFirst.mockResolvedValue(null);
    const res = await DELETE(undefined as unknown as Request, ctx("u2"));
    expect(res.status).toBe(404);
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it("destroys the target's sessions and removes them", async () => {
    findFirst.mockResolvedValue({ id: "u2", merchantId: "m1", role: "MEMBER" });
    deleteUser.mockResolvedValue({});
    const res = await DELETE(undefined as unknown as Request, ctx("u2"));
    expect(res.status).toBe(200);
    expect(destroyAllSessions).toHaveBeenCalledWith(expect.anything(), "u2");
    expect(deleteUser).toHaveBeenCalledWith({ where: { id: "u2" } });
  });
});
