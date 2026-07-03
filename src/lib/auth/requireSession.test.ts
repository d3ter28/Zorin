import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCookie } = vi.hoisted(() => ({ getCookie: vi.fn() }));
const { getSessionUser } = vi.hoisted(() => ({ getSessionUser: vi.fn() }));
const { redirect } = vi.hoisted(() => ({
  redirect: vi.fn((url: string) => {
    // Match next/navigation semantics: redirect throws.
    throw new Error(`REDIRECT:${url}`);
  }),
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: getCookie }),
}));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/lib/db", () => ({ prisma: {} }));
vi.mock("./session", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./session")>()),
  getSessionUser,
}));

import { HttpError } from "@/lib/api/errors";
import { getSession, requireSessionApi, requireSessionPage } from "./requireSession";

const user = { id: "u1", email: "d@e.f", merchantId: "m1" };

beforeEach(() => {
  getCookie.mockReset();
  getSessionUser.mockReset();
  redirect.mockClear();
});

describe("getSession", () => {
  it("returns user + merchantId for a valid cookie", async () => {
    getCookie.mockReturnValue({ value: "tok" });
    getSessionUser.mockResolvedValue(user);
    await expect(getSession()).resolves.toEqual({ user, merchantId: "m1" });
    expect(getSessionUser.mock.calls[0][1]).toBe("tok");
  });

  it("returns null when the cookie is absent", async () => {
    getCookie.mockReturnValue(undefined);
    await expect(getSession()).resolves.toBeNull();
    expect(getSessionUser).not.toHaveBeenCalled();
  });

  it("returns null when the token is invalid/expired", async () => {
    getCookie.mockReturnValue({ value: "bad" });
    getSessionUser.mockResolvedValue(null);
    await expect(getSession()).resolves.toBeNull();
  });
});

describe("requireSessionApi", () => {
  it("returns the session when authenticated", async () => {
    getCookie.mockReturnValue({ value: "tok" });
    getSessionUser.mockResolvedValue(user);
    await expect(requireSessionApi()).resolves.toEqual({ user, merchantId: "m1" });
  });

  it("throws HttpError 401 when unauthenticated", async () => {
    getCookie.mockReturnValue(undefined);
    await expect(requireSessionApi()).rejects.toMatchObject(
      new HttpError(401, "unauthorized"),
    );
  });
});

describe("requireSessionPage", () => {
  it("redirects to /login when unauthenticated", async () => {
    getCookie.mockReturnValue(undefined);
    await expect(requireSessionPage()).rejects.toThrow("REDIRECT:/login");
    expect(redirect).toHaveBeenCalledWith("/login");
  });
});
