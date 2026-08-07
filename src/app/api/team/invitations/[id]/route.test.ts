import { beforeEach, describe, expect, it, vi } from "vitest";
import { HttpError } from "@/lib/api/errors";

const { revokeInvitation } = vi.hoisted(() => ({ revokeInvitation: vi.fn() }));

vi.mock("@/lib/db", () => ({ prisma: {} }));
vi.mock("@/lib/auth/requireSession", () => ({
  requireOwnerApi: vi.fn(async () => ({
    merchantId: "m1",
    user: { id: "u1", email: "owner@example.com", merchantId: "m1", role: "OWNER" },
  })),
}));
vi.mock("@/lib/team/invitation", () => ({ revokeInvitation }));

import { DELETE } from "./route";

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  revokeInvitation.mockReset();
});

describe("DELETE /api/team/invitations/[id]", () => {
  it("revokes the invitation, scoped to the caller's merchant", async () => {
    revokeInvitation.mockResolvedValue(undefined);
    const res = await DELETE(undefined as unknown as Request, ctx("inv1"));
    expect(res.status).toBe(200);
    expect(revokeInvitation).toHaveBeenCalledWith(expect.anything(), "inv1", "m1");
  });

  it("propagates a 404 when the invitation doesn't belong to this merchant", async () => {
    revokeInvitation.mockRejectedValue(new HttpError(404, "Not found"));
    const res = await DELETE(undefined as unknown as Request, ctx("inv1"));
    expect(res.status).toBe(404);
  });
});
