import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    priceSurvey: { findUnique: vi.fn() },
  },
}));

import { GET } from "./route";
import { prisma } from "@/lib/db";

function req(): Request {
  return {} as unknown as Request;
}

function ctx(token: string) {
  return { params: Promise.resolve({ token }) };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/survey/[token]", () => {
  it("returns 404 for an unknown token", async () => {
    (prisma.priceSurvey.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await GET(req(), ctx("bad-token"));
    expect(res.status).toBe(404);
  });

  it("returns the product title/image for a valid token", async () => {
    (prisma.priceSurvey.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "s1",
      product: { title: "Widget", imageUrl: "https://cdn.example.com/w.jpg" },
    });
    const res = await GET(req(), ctx("good-token"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ productTitle: "Widget", productImageUrl: "https://cdn.example.com/w.jpg" });
    expect(prisma.priceSurvey.findUnique).toHaveBeenCalledWith({
      where: { token: "good-token" },
      select: { id: true, product: { select: { title: true, imageUrl: true } } },
    });
  });
});
