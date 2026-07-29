import { beforeEach, describe, expect, it, vi } from "vitest";

const { updateMany } = vi.hoisted(() => ({ updateMany: vi.fn() }));

vi.mock("@/lib/db", () => ({
  prisma: { merchant: { updateMany } },
}));

const { constructEvent } = vi.hoisted(() => ({ constructEvent: vi.fn() }));

vi.mock("@/lib/stripe/client", () => ({
  stripe: { webhooks: { constructEvent } },
}));

process.env.STRIPE_WEBHOOK_SECRET = "whsec_test123";

import { POST } from "./route";

function req(rawBody: string, signature = "sig_valid"): Request {
  return {
    text: async () => rawBody,
    headers: new Headers({ "stripe-signature": signature }),
  } as unknown as Request;
}

beforeEach(() => {
  vi.clearAllMocks();
  updateMany.mockResolvedValue({ count: 1 });
});

describe("POST /api/webhooks/stripe", () => {
  it("returns 400 when the signature header is missing", async () => {
    const badReq = { text: async () => "{}", headers: new Headers() } as unknown as Request;
    const res = await POST(badReq);
    expect(res.status).toBe(400);
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("returns 400 when signature verification throws", async () => {
    constructEvent.mockImplementation(() => {
      throw new Error("invalid signature");
    });
    const res = await POST(req("{}"));
    expect(res.status).toBe(400);
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("checkout.session.completed sets the subscription id and plan tier from session metadata", async () => {
    constructEvent.mockReturnValue({
      type: "checkout.session.completed",
      data: {
        object: {
          customer: "cus_123",
          subscription: "sub_123",
          metadata: { planTier: "growth" },
        },
      },
    });

    const res = await POST(req("{}"));
    expect(res.status).toBe(200);
    expect(updateMany).toHaveBeenCalledWith({
      where: { stripeCustomerId: "cus_123" },
      data: { stripeSubscriptionId: "sub_123", planTier: "growth" },
    });
  });

  it("checkout.session.completed omits planTier when session metadata has no valid tier, and never writes subscriptionStatus", async () => {
    constructEvent.mockReturnValue({
      type: "checkout.session.completed",
      data: {
        object: {
          customer: "cus_123",
          subscription: "sub_123",
          metadata: {},
        },
      },
    });

    const res = await POST(req("{}"));
    expect(res.status).toBe(200);
    const data = updateMany.mock.calls[0][0].data;
    expect(data.planTier).toBeUndefined();
    expect(data.subscriptionStatus).toBeUndefined();
    expect(data.trialEndsAt).toBeUndefined();
  });

  it("customer.subscription.updated syncs status and plan tier from the price id", async () => {
    constructEvent.mockReturnValue({
      type: "customer.subscription.updated",
      data: {
        object: {
          customer: "cus_123",
          id: "sub_123",
          status: "active",
          items: { data: [{ price: { id: "price_growth_123" } }] },
        },
      },
    });
    process.env.STRIPE_PRICE_STARTER = "price_starter_123";
    process.env.STRIPE_PRICE_GROWTH = "price_growth_123";
    process.env.STRIPE_PRICE_SCALE = "price_scale_123";

    const res = await POST(req("{}"));
    expect(res.status).toBe(200);
    expect(updateMany).toHaveBeenCalledWith({
      where: { stripeCustomerId: "cus_123" },
      data: { subscriptionStatus: "active", planTier: "growth" },
    });
  });

  it("customer.subscription.deleted marks the merchant canceled", async () => {
    constructEvent.mockReturnValue({
      type: "customer.subscription.deleted",
      data: { object: { customer: "cus_123", id: "sub_123" } },
    });

    const res = await POST(req("{}"));
    expect(res.status).toBe(200);
    expect(updateMany).toHaveBeenCalledWith({
      where: { stripeCustomerId: "cus_123" },
      data: { subscriptionStatus: "canceled" },
    });
  });

  it("ignores unrecognized event types without touching the database", async () => {
    constructEvent.mockReturnValue({ type: "invoice.paid", data: { object: {} } });
    const res = await POST(req("{}"));
    expect(res.status).toBe(200);
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("is idempotent — processing the same event twice yields identical writes", async () => {
    constructEvent.mockReturnValue({
      type: "customer.subscription.deleted",
      data: { object: { customer: "cus_123", id: "sub_123" } },
    });

    await POST(req("{}"));
    await POST(req("{}"));

    expect(updateMany).toHaveBeenCalledTimes(2);
    expect(updateMany.mock.calls[0]).toEqual(updateMany.mock.calls[1]);
  });
});
