import { beforeEach, describe, expect, it, vi } from "vitest";

const { deleteUser } = vi.hoisted(() => ({ deleteUser: vi.fn() }));
const { destroyAllSessions } = vi.hoisted(() => ({
  destroyAllSessions: vi.fn(async () => undefined),
}));

vi.mock("@/lib/db", () => ({ prisma: { user: { delete: deleteUser } } }));

vi.mock("@/lib/auth/session", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth/session")>()),
  destroyAllSessions,
}));

async function mockSessionRole(role: string) {
  vi.doMock("@/lib/auth/requireSession", () => ({
    requireSessionApi: vi.fn(async () => ({
      merchantId: "m1",
      user: { id: "u2", email: "member@example.com", merchantId: "m1", role },
    })),
  }));
  vi.resetModules();
  return await import("./route");
}

beforeEach(() => {
  deleteUser.mockReset();
  destroyAllSessions.mockClear();
});

describe("POST /api/team/leave", () => {
  it("returns 400 when the Owner tries to leave", async () => {
    const { POST } = await mockSessionRole("OWNER");
    const res = await POST(new Request("http://localhost/"));
    expect(res.status).toBe(400);
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it("destroys the caller's own sessions and removes them", async () => {
    const { POST } = await mockSessionRole("MEMBER");
    deleteUser.mockResolvedValue({});
    const res = await POST(new Request("http://localhost/"));
    expect(res.status).toBe(200);
    expect(destroyAllSessions).toHaveBeenCalledWith(expect.anything(), "u2");
    expect(deleteUser).toHaveBeenCalledWith({ where: { id: "u2" } });
  });
});
