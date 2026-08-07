import { beforeEach, describe, expect, it, vi } from "vitest";

const { findUnique, update } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  update: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: { merchant: { findUnique, update } },
}));

const { customersCreate, checkoutSessionsCreate } = vi.hoisted(() => ({
  customersCreate: vi.fn(),
  checkoutSessionsCreate: vi.fn(),
}));

vi.mock("@/lib/stripe/client", () => ({
  stripe: {
    customers: { create: customersCreate },
    checkout: { sessions: { create: checkoutSessionsCreate } },
  },
}));

vi.mock("@/lib/auth/requireSession", () => ({
  requireOwnerApi: vi.fn(async () => ({
    merchantId: "m1",
    user: { id: "u1", email: "merchant@example.com", merchantId: "m1", role: "OWNER" },
  })),
}));

process.env.STRIPE_PRICE_STARTER = "price_starter_123";
process.env.STRIPE_PRICE_GROWTH = "price_growth_123";
process.env.STRIPE_PRICE_SCALE = "price_scale_123";

import { POST } from "./route";
import { requireOwnerApi } from "@/lib/auth/requireSession";
import { HttpError } from "@/lib/api/errors";

function req(body: unknown): Request {
  return {
    json: async () => body,
    url: "http://localhost:3000/api/billing/checkout",
  } as unknown as Request;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireOwnerApi).mockResolvedValue({
    merchantId: "m1",
    user: { id: "u1", email: "merchant@example.com", merchantId: "m1", role: "OWNER" },
  });
});

describe("POST /api/billing/checkout", () => {
  it("returns 401 when there's no session", async () => {
    vi.mocked(requireOwnerApi).mockRejectedValue(new HttpError(401, "unauthorized"));

    const res = await POST(req({ plan: "growth" }));

    expect(res.status).toBe(401);
    expect(checkoutSessionsCreate).not.toHaveBeenCalled();
  });

  it("returns 403 when the caller is a Member, not the Owner", async () => {
    vi.mocked(requireOwnerApi).mockRejectedValue(new HttpError(403, "Owner access required"));

    const res = await POST(req({ plan: "growth" }));

    expect(res.status).toBe(403);
    expect(checkoutSessionsCreate).not.toHaveBeenCalled();
  });

  it("returns 400 when plan is missing", async () => {
    const res = await POST(req({}));
    expect(res.status).toBe(400);
  });

  it("returns 400 when plan is invalid", async () => {
    const res = await POST(req({ plan: "enterprise" }));
    expect(res.status).toBe(400);
  });

  it("creates a Stripe customer when the merchant has none, and saves it", async () => {
    findUnique.mockResolvedValue({ id: "m1", stripeCustomerId: null });
    customersCreate.mockResolvedValue({ id: "cus_new123" });
    checkoutSessionsCreate.mockResolvedValue({ url: "https://checkout.stripe.com/session1" });

    const res = await POST(req({ plan: "growth" }));

    expect(res.status).toBe(200);
    expect(customersCreate).toHaveBeenCalledWith({ email: "merchant@example.com" });
    expect(update).toHaveBeenCalledWith({
      where: { id: "m1" },
      data: { stripeCustomerId: "cus_new123" },
    });
  });

  it("reuses an existing Stripe customer instead of creating a new one", async () => {
    findUnique.mockResolvedValue({ id: "m1", stripeCustomerId: "cus_existing" });
    checkoutSessionsCreate.mockResolvedValue({ url: "https://checkout.stripe.com/session2" });

    await POST(req({ plan: "growth" }));

    expect(customersCreate).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it("creates a subscription checkout session with card required and no additional trial", async () => {
    findUnique.mockResolvedValue({ id: "m1", stripeCustomerId: "cus_existing" });
    checkoutSessionsCreate.mockResolvedValue({ url: "https://checkout.stripe.com/session3" });

    const res = await POST(req({ plan: "scale" }));
    const body = await res.json();

    expect(body).toEqual({ url: "https://checkout.stripe.com/session3" });
    expect(checkoutSessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: "cus_existing",
        mode: "subscription",
        payment_method_collection: "always",
        line_items: [{ price: "price_scale_123", quantity: 1 }],
        metadata: { planTier: "scale" },
        success_url: expect.stringContaining("/dashboard"),
        cancel_url: expect.stringContaining("/billing/reactivate"),
      }),
    );
    expect(checkoutSessionsCreate.mock.calls[0][0].subscription_data).toBeUndefined();
  });
});
