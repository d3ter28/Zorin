import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  productFindUnique,
  domainFindMany,
  competitorFindMany,
  getSearchProvider,
  discoverCompetitors,
} = vi.hoisted(() => ({
  productFindUnique: vi.fn(),
  domainFindMany: vi.fn(),
  competitorFindMany: vi.fn(),
  getSearchProvider: vi.fn(),
  discoverCompetitors: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    product: { findUnique: productFindUnique },
    competitorDomain: { findMany: domainFindMany },
    competitorPrice: { findMany: competitorFindMany },
  },
}));
vi.mock("@/lib/auth/requireSession", () => ({
  requireSessionApi: vi.fn(async () => ({ user: { id: "u1" }, merchantId: "m1" })),
}));

vi.mock("@/lib/discovery/searchProvider", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getSearchProvider: (...a: unknown[]) => getSearchProvider(...a),
}));

vi.mock("@/lib/discovery/discoverCompetitors", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  discoverCompetitors: (...a: unknown[]) => discoverCompetitors(...a),
}));

import { POST } from "./route";

function post(body: unknown): Request {
  return new Request("http://t/api/products/p1/discover", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}
const ctx = { params: Promise.resolve({ id: "p1" }) };

beforeEach(() => {
  vi.clearAllMocks();
  productFindUnique.mockResolvedValue({
    id: "p1",
    merchantId: "m1",
    title: "Ceramic Mug",
    currentPrice: 1500,
    merchant: { storeUrl: "https://mystore.example" },
  });
  domainFindMany.mockResolvedValue([{ domain: "walmart.com" }]);
  competitorFindMany.mockResolvedValue([{ competitorUrl: "https://tracked.com/x" }]);
  getSearchProvider.mockReturnValue({ name: "test", search: vi.fn() });
  discoverCompetitors.mockResolvedValue({ candidates: [], skipped: [] });
});

describe("POST /api/products/[id]/discover", () => {
  it("runs discovery with data assembled from the DB", async () => {
    const res = await POST(post({ mode: "both" }), ctx);
    expect(res.status).toBe(200);
    expect(discoverCompetitors).toHaveBeenCalledWith(
      {
        productTitle: "Ceramic Mug",
        currentPriceCents: 1500,
        ownDomain: "mystore.example",
        savedDomains: ["walmart.com"],
        existingCompetitorDomains: ["tracked.com"],
        mode: "both",
      },
      expect.objectContaining({ provider: expect.anything() }),
    );
  });

  it("503s with no_provider when no provider is configured", async () => {
    getSearchProvider.mockReturnValue(null);
    const res = await POST(post({ mode: "open" }), ctx);
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ reason: "no_provider" });
  });

  it("400s on saved/both modes with an empty saved list", async () => {
    domainFindMany.mockResolvedValue([]);
    expect((await POST(post({ mode: "saved" }), ctx)).status).toBe(400);
    expect((await POST(post({ mode: "both" }), ctx)).status).toBe(400);
    expect((await POST(post({ mode: "open" }), ctx)).status).toBe(200);
  });

  it("400s on an invalid mode", async () => {
    expect((await POST(post({ mode: "nope" }), ctx)).status).toBe(400);
    expect((await POST(post({}), ctx)).status).toBe(400);
  });

  it("404s on a foreign product", async () => {
    productFindUnique.mockResolvedValue({ id: "p1", merchantId: "OTHER", title: "x", currentPrice: 1, merchant: { storeUrl: "" } });
    expect((await POST(post({ mode: "open" }), ctx)).status).toBe(404);
  });

  it("passes providerError through as 200-with-data", async () => {
    discoverCompetitors.mockResolvedValue({ candidates: [], skipped: [], providerError: "rate_limited" });
    const res = await POST(post({ mode: "open" }), ctx);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ candidates: [], skipped: [], providerError: "rate_limited" });
  });
});
