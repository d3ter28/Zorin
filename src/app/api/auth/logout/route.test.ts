import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCookie } = vi.hoisted(() => ({ getCookie: vi.fn() }));
const { destroySession } = vi.hoisted(() => ({ destroySession: vi.fn() }));

vi.mock("next/headers", () => ({ cookies: async () => ({ get: getCookie }) }));
vi.mock("@/lib/db", () => ({ prisma: {} }));
vi.mock("@/lib/auth/session", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth/session")>()),
  destroySession,
}));

import { POST } from "./route";

beforeEach(() => {
  getCookie.mockReset();
  destroySession.mockReset();
});

describe("POST /api/auth/logout", () => {
  it("destroys the session and clears the cookie", async () => {
    getCookie.mockReturnValue({ value: "tok" });
    destroySession.mockResolvedValue(undefined);

    const res = await POST();

    expect(res.status).toBe(200);
    expect(destroySession.mock.calls[0][1]).toBe("tok");
    expect(res.headers.get("set-cookie")).toContain("priceiq_session=;");
  });

  it("succeeds even with no cookie", async () => {
    getCookie.mockReturnValue(undefined);
    const res = await POST();
    expect(res.status).toBe(200);
    expect(destroySession).not.toHaveBeenCalled();
  });
});
