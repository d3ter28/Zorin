import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  default: {
    competitorDomain: {
      findMany: vi.fn(),
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth/requireSessionApi", () => ({
  requireSessionApi: vi.fn(),
}));

import prisma from "@/lib/prisma";
import { requireSessionApi } from "@/lib/auth/requireSessionApi";
import { GET, PUT } from "./route";
import { NextRequest } from "next/server";

const MERCHANT_ID = "merch_1";

function session() {
  (requireSessionApi as ReturnType<typeof vi.fn>).mockResolvedValue({
    merchant: { id: MERCHANT_ID },
  });
}

function makeRequest(method: string, body?: unknown): NextRequest {
  return new NextRequest("http://localhost/api/settings/competitors", {
    method,
    headers: { "content-type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

describe("GET /api/settings/competitors", () => {
  it("returns sorted domain list", async () => {
    session();
    (prisma.competitorDomain.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { domain: "walmart.com" },
      { domain: "amazon.com" },
    ]);
    const res = await GET(makeRequest("GET"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.domains).toEqual(["amazon.com", "walmart.com"]);
  });

  it("returns 401 when not authenticated", async () => {
    (requireSessionApi as ReturnType<typeof vi.fn>).mockResolvedValue(
      Response.json({ error: "unauthorized" }, { status: 401 })
    );
    const res = await GET(makeRequest("GET"));
    expect(res.status).toBe(401);
  });
});

describe("PUT /api/settings/competitors", () => {
  it("normalizes, deduplicates, and saves valid domains", async () => {
    session();
    (prisma.competitorDomain.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({});
    (prisma.competitorDomain.createMany as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const res = await PUT(
      makeRequest("PUT", {
        domains: ["HTTP://WWW.Walmart.com/path", "amazon.com", "amazon.com"],
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.saved).toEqual(["walmart.com", "amazon.com"]);
    expect(body.rejected).toEqual([]);
    expect(prisma.competitorDomain.deleteMany).toHaveBeenCalledWith({
      where: { merchantId: MERCHANT_ID },
    });
    expect(prisma.competitorDomain.createMany).toHaveBeenCalledWith({
      data: [
        { merchantId: MERCHANT_ID, domain: "walmart.com" },
        { merchantId: MERCHANT_ID, domain: "amazon.com" },
      ],
    });
  });

  it("rejects invalid entries with reasons, saves valid ones", async () => {
    session();
    (prisma.competitorDomain.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({});
    (prisma.competitorDomain.createMany as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const res = await PUT(
      makeRequest("PUT", { domains: ["good.com", "not a domain", ""] })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.saved).toEqual(["good.com"]);
    expect(body.rejected).toEqual([
      { input: "not a domain", reason: "invalid" },
      { input: "", reason: "invalid" },
    ]);
  });

  it("returns 400 when domains is not an array", async () => {
    session();
    const res = await PUT(makeRequest("PUT", { domains: "walmart.com" }));
    expect(res.status).toBe(400);
  });

  it("returns 401 when not authenticated", async () => {
    (requireSessionApi as ReturnType<typeof vi.fn>).mockResolvedValue(
      Response.json({ error: "unauthorized" }, { status: 401 })
    );
    const res = await PUT(makeRequest("PUT", { domains: [] }));
    expect(res.status).toBe(401);
  });
});
