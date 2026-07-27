import { beforeEach, describe, expect, it, vi } from "vitest";

const { findUnique } = vi.hoisted(() => ({ findUnique: vi.fn() }));

vi.mock("@/lib/db", () => ({
  prisma: { merchant: { findUnique } },
}));

const { billingPortalSessionsCreate } = vi.hoisted(() => ({
  billingPortalSessionsCreate: vi.fn(),
}));

vi.mock("@/lib/stripe/client", () => ({
  stripe: { billingPortal: { sessions: { create: billingPortalSessionsCreate } } },
}));

vi.mock("@/lib/auth/requireSession", () => ({
  requireSessionApi: vi.fn(async () => ({
    merchantId: "m1",
    user: { id: "u1", email: "merchant@example.com", merchantId: "m1" },
  })),
}));

import { POST } from "./route";
import { requireSessionApi } from "@/lib/auth/requireSession";
import { HttpError } from "@/lib/api/errors";

function req(): Request {
  return { url: "http://localhost:3000/api/billing/portal" } as unknown as Request;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireSessionApi).mockResolvedValue({
    merchantId: "m1",
    user: { id: "u1", email: "merchant@example.com", merchantId: "m1" },
  });
});

describe("POST /api/billing/portal", () => {
  it("returns 401 when there's no session", async () => {
    vi.mocked(requireSessionApi).mockRejectedValue(new HttpError(401, "unauthorized"));

    const res = await POST(req());

    expect(res.status).toBe(401);
    expect(billingPortalSessionsCreate).not.toHaveBeenCalled();
  });

  it("returns 400 when the merchant has no Stripe customer yet", async () => {
    findUnique.mockResolvedValue({ id: "m1", stripeCustomerId: null });
    const res = await POST(req());
    expect(res.status).toBe(400);
    expect(billingPortalSessionsCreate).not.toHaveBeenCalled();
  });

  it("creates a portal session and returns its url", async () => {
    findUnique.mockResolvedValue({ id: "m1", stripeCustomerId: "cus_123" });
    billingPortalSessionsCreate.mockResolvedValue({ url: "https://billing.stripe.com/session1" });

    const res = await POST(req());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ url: "https://billing.stripe.com/session1" });
    expect(billingPortalSessionsCreate).toHaveBeenCalledWith({
      customer: "cus_123",
      return_url: "http://localhost:3000/settings",
    });
  });
});
