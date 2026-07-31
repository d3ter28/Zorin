import { beforeEach, describe, expect, it, vi } from "vitest";

const { checkWebhookRateLimit } = vi.hoisted(() => ({
  checkWebhookRateLimit: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    priceSurvey: { findUnique: vi.fn() },
    priceSurveyResponse: { create: vi.fn() },
  },
}));
vi.mock("@/lib/auth/rateLimit", () => ({ checkWebhookRateLimit }));

import { POST } from "./route";
import { prisma } from "@/lib/db";

function req(body: unknown, headers: Record<string, string> = {}): Request {
  return {
    json: async () => body,
    headers: { get: (key: string) => headers[key] ?? null },
  } as unknown as Request;
}

function ctx(token: string) {
  return { params: Promise.resolve({ token }) };
}

const VALID_BODY = {
  tooCheapCents: 500,
  goodValueCents: 1000,
  gettingExpensiveCents: 1500,
  tooExpensiveCents: 2000,
};

beforeEach(() => {
  vi.clearAllMocks();
  checkWebhookRateLimit.mockResolvedValue({ allowed: true, retryAfterMs: 0 });
  (prisma.priceSurvey.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "s1" });
  (prisma.priceSurveyResponse.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "r1" });
});

describe("POST /api/survey/[token]/respond", () => {
  it("returns 404 for an unknown token", async () => {
    (prisma.priceSurvey.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await POST(req(VALID_BODY), ctx("bad-token"));
    expect(res.status).toBe(404);
    expect(prisma.priceSurveyResponse.create).not.toHaveBeenCalled();
  });

  it("returns 429 when rate limited", async () => {
    checkWebhookRateLimit.mockResolvedValue({ allowed: false, retryAfterMs: 5000 });
    const res = await POST(req(VALID_BODY, { "x-forwarded-for": "1.2.3.4" }), ctx("good-token"));
    expect(res.status).toBe(429);
    expect(prisma.priceSurveyResponse.create).not.toHaveBeenCalled();
  });

  it("returns 400 for a non-positive price", async () => {
    const res = await POST(req({ ...VALID_BODY, tooCheapCents: 0 }), ctx("good-token"));
    expect(res.status).toBe(400);
    expect(prisma.priceSurveyResponse.create).not.toHaveBeenCalled();
  });

  it("returns 400 when tooCheap exceeds tooExpensive", async () => {
    const res = await POST(
      req({ ...VALID_BODY, tooCheapCents: 3000, tooExpensiveCents: 2000 }),
      ctx("good-token"),
    );
    expect(res.status).toBe(400);
    expect(prisma.priceSurveyResponse.create).not.toHaveBeenCalled();
  });

  it("returns 409 when the anti-resubmit cookie for this survey is already present", async () => {
    const res = await POST(
      req(VALID_BODY, { cookie: "zorin_survey_resp_s1=1" }),
      ctx("good-token"),
    );
    expect(res.status).toBe(409);
    expect(prisma.priceSurveyResponse.create).not.toHaveBeenCalled();
  });

  it("creates the response and sets the anti-resubmit cookie on success", async () => {
    const res = await POST(req(VALID_BODY), ctx("good-token"));
    expect(res.status).toBe(200);
    expect(prisma.priceSurveyResponse.create).toHaveBeenCalledWith({
      data: {
        surveyId: "s1",
        tooCheapCents: 500,
        goodValueCents: 1000,
        gettingExpensiveCents: 1500,
        tooExpensiveCents: 2000,
      },
    });
    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("zorin_survey_resp_s1=1");
  });
});
