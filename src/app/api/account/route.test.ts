import { NextRequest } from "next/server";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { HttpError } from "@/lib/api/errors";
import { PATCH } from "./route";

const mockRequireSessionApi = vi.fn();
const mockUserUpdate = vi.fn();

vi.mock("@/lib/auth/requireSession", () => ({
  requireSessionApi: () => mockRequireSessionApi(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      update: (...args: unknown[]) => mockUserUpdate(...args),
    },
  },
}));

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/account", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  mockRequireSessionApi.mockResolvedValue({
    user: { id: "user_1", email: "a@example.com", merchantId: "merchant_1", role: "OWNER" },
    merchantId: "merchant_1",
  });
});

describe("PATCH /api/account", () => {
  it("returns 401 when there is no session", async () => {
    mockRequireSessionApi.mockRejectedValueOnce(new HttpError(401, "unauthorized"));
    const res = await PATCH(makeRequest({ name: "Dexter" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when name is missing", async () => {
    const res = await PATCH(makeRequest({}));
    expect(res.status).toBe(400);
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it("returns 400 when name is empty after trimming", async () => {
    const res = await PATCH(makeRequest({ name: "   " }));
    expect(res.status).toBe(400);
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it("returns 400 when name exceeds 100 characters", async () => {
    const res = await PATCH(makeRequest({ name: "a".repeat(101) }));
    expect(res.status).toBe(400);
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it("trims and saves a valid name, returning it", async () => {
    mockUserUpdate.mockResolvedValueOnce({ id: "user_1", name: "Dexter" });
    const res = await PATCH(makeRequest({ name: "  Dexter  " }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({ ok: true, name: "Dexter" });
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: "user_1" },
      data: { name: "Dexter" },
    });
  });
});
