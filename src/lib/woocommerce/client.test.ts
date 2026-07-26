import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { WooCommerceClient } from "./client";

// Helper to build a mock Response
function mockResponse(
  body: unknown,
  status = 200,
  headers: Record<string, string> = {},
): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: (key: string) => headers[key.toLowerCase()] ?? null,
    },
    json: async () => body,
  } as unknown as Response;
}

describe("WooCommerceClient", () => {
  const storeUrl = "https://example.com";
  const consumerKey = "ck_test";
  const consumerSecret = "cs_test";
  const expectedAuth =
    "Basic " +
    Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");

  let client: WooCommerceClient;

  beforeEach(() => {
    client = new WooCommerceClient(storeUrl, consumerKey, consumerSecret);
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ─── Authorization header ─────────────────────────────────────────────────

  describe("Authorization header", () => {
    it("sends correct Authorization: Basic header on every request", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        mockResponse({ environment: { home_url: "https://example.com" } }),
      );

      await client.verifyConnection();

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: expectedAuth,
          }),
        }),
      );
    });
  });

  // ─── verifyConnection ────────────────────────────────────────────────────

  describe("verifyConnection()", () => {
    it("extracts storeName from home_url hostname", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        mockResponse({
          environment: { home_url: "https://mystore.example.com" },
        }),
      );

      const result = await client.verifyConnection();

      expect(result).toEqual({ storeName: "mystore.example.com" });
      expect(fetch).toHaveBeenCalledWith(
        `${storeUrl}/wp-json/wc/v3/system_status`,
        expect.anything(),
      );
    });

    it("falls back to storeUrl hostname when home_url is absent", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        mockResponse({ environment: {} }),
      );

      const result = await client.verifyConnection();

      expect(result).toEqual({ storeName: "example.com" });
    });

    it("throws on non-ok response", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(mockResponse({}, 401));

      await expect(client.verifyConnection()).rejects.toThrow("401");
    });
  });

  // ─── fetchAllProducts ─────────────────────────────────────────────────────

  describe("fetchAllProducts()", () => {
    it("yields simple products directly", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        mockResponse([
          {
            id: 1,
            type: "simple",
            name: "Widget",
            sku: "WID-1",
            regular_price: "9.99",
          },
        ]),
      );

      const pages: unknown[] = [];
      for await (const page of client.fetchAllProducts()) {
        pages.push(page);
      }

      expect(pages).toHaveLength(1);
      expect(pages[0]).toEqual([
        {
          id: 1,
          parentId: null,
          name: "Widget",
          sku: "WID-1",
          regularPriceDollars: "9.99",
        },
      ]);
    });

    it("fetches variations for variable products", async () => {
      vi.mocked(fetch)
        // First call: products page
        .mockResolvedValueOnce(
          mockResponse([
            {
              id: 10,
              type: "variable",
              name: "T-Shirt",
              sku: "",
              regular_price: "",
            },
          ]),
        )
        // Second call: variations for product 10
        .mockResolvedValueOnce(
          mockResponse([
            {
              id: 101,
              sku: "TS-S",
              regular_price: "19.99",
              attributes: [{ name: "Size", option: "Small" }],
            },
            {
              id: 102,
              sku: "TS-L",
              regular_price: "19.99",
              attributes: [{ name: "Size", option: "Large" }],
            },
          ]),
        );

      const pages: unknown[] = [];
      for await (const page of client.fetchAllProducts()) {
        pages.push(page);
      }

      expect(pages).toHaveLength(1);
      expect(pages[0]).toEqual([
        {
          id: 101,
          parentId: 10,
          name: "T-Shirt - Small",
          sku: "TS-S",
          regularPriceDollars: "19.99",
        },
        {
          id: 102,
          parentId: 10,
          name: "T-Shirt - Large",
          sku: "TS-L",
          regularPriceDollars: "19.99",
        },
      ]);

      // Variations URL called
      expect(fetch).toHaveBeenNthCalledWith(
        2,
        `${storeUrl}/wp-json/wc/v3/products/10/variations?per_page=100`,
        expect.anything(),
      );
    });

    it("follows Link header pagination for products", async () => {
      const nextUrl = `${storeUrl}/wp-json/wc/v3/products?per_page=100&page=2`;

      vi.mocked(fetch)
        .mockResolvedValueOnce(
          mockResponse(
            [{ id: 1, type: "simple", name: "A", sku: "A", regular_price: "1.00" }],
            200,
            { link: `<${nextUrl}>; rel="next"` },
          ),
        )
        .mockResolvedValueOnce(
          mockResponse([
            { id: 2, type: "simple", name: "B", sku: "B", regular_price: "2.00" },
          ]),
        );

      const pages: unknown[] = [];
      for await (const page of client.fetchAllProducts()) {
        pages.push(page);
      }

      expect(pages).toHaveLength(2);
      expect(fetch).toHaveBeenCalledTimes(2);
      expect(fetch).toHaveBeenNthCalledWith(2, nextUrl, expect.anything());
    });
  });

  // ─── fetchOrders ──────────────────────────────────────────────────────────

  describe("fetchOrders()", () => {
    it("uses status=any in URL (not comma-separated)", async () => {
      const sinceDate = new Date("2024-01-01T00:00:00Z");

      vi.mocked(fetch).mockResolvedValueOnce(mockResponse([]));

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for await (const _ of client.fetchOrders(sinceDate)) {
        /* consume */
      }

      const calledUrl = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
      expect(calledUrl).toContain("status=any");
      // Must not use comma-separated statuses
      expect(calledUrl).not.toMatch(/status=[^&]*,[^&]*/);
    });

    it("yields order arrays directly (WC response is the array)", async () => {
      const sinceDate = new Date("2024-01-01T00:00:00Z");

      vi.mocked(fetch).mockResolvedValueOnce(
        mockResponse([
          {
            id: 5001,
            date_created: "2024-01-15T10:00:00Z",
            line_items: [
              { product_id: 1, variation_id: 0, quantity: 2, price: "9.99" },
            ],
          },
        ]),
      );

      const pages: unknown[] = [];
      for await (const page of client.fetchOrders(sinceDate)) {
        pages.push(page);
      }

      expect(pages).toHaveLength(1);
      expect(pages[0]).toEqual([
        {
          id: 5001,
          date_created: "2024-01-15T10:00:00Z",
          line_items: [
            { product_id: 1, variation_id: 0, quantity: 2, price: "9.99" },
          ],
        },
      ]);
    });

    it("follows Link header pagination for orders", async () => {
      const nextUrl = `${storeUrl}/wp-json/wc/v3/orders?per_page=100&page=2`;

      vi.mocked(fetch)
        .mockResolvedValueOnce(
          mockResponse(
            [{ id: 1, date_created: "2024-01-01T00:00:00Z", line_items: [] }],
            200,
            { link: `<${nextUrl}>; rel="next"` },
          ),
        )
        .mockResolvedValueOnce(
          mockResponse([
            { id: 2, date_created: "2024-01-02T00:00:00Z", line_items: [] },
          ]),
        );

      const pages: unknown[] = [];
      for await (const page of client.fetchOrders(new Date("2024-01-01"))) {
        pages.push(page);
      }

      expect(pages).toHaveLength(2);
      expect(fetch).toHaveBeenNthCalledWith(2, nextUrl, expect.anything());
    });
  });

  // ─── 429 retry ───────────────────────────────────────────────────────────

  describe("429 rate limiting", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("retries up to 3 times on 429 then throws", async () => {
      vi.mocked(fetch).mockResolvedValue(
        mockResponse({}, 429, { "retry-after": "1" }),
      );

      const assertion = expect(client.verifyConnection()).rejects.toThrow("429");

      // 3 retries × 1s each = 3000ms
      await vi.advanceTimersByTimeAsync(3_000);

      await assertion;
      // 1 original + 3 retries = 4 total calls
      expect(fetch).toHaveBeenCalledTimes(4);
    });

    it("retries and succeeds on transient 429", async () => {
      vi.mocked(fetch)
        .mockResolvedValueOnce(
          mockResponse({}, 429, { "retry-after": "2" }),
        )
        .mockResolvedValueOnce(
          mockResponse({ environment: { home_url: "https://example.com" } }),
        );

      const promise = client.verifyConnection();
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toEqual({ storeName: "example.com" });
      expect(fetch).toHaveBeenCalledTimes(2);
    });
  });

  // ─── updateProductPrice ───────────────────────────────────────────────────

  describe("updateProductPrice()", () => {
    it("calls PUT /products/{id} with regular_price", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        mockResponse({ id: 42, regular_price: "29.99" }),
      );

      await client.updateProductPrice(42, "29.99");

      expect(fetch).toHaveBeenCalledWith(
        `${storeUrl}/wp-json/wc/v3/products/42`,
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({ regular_price: "29.99" }),
          headers: expect.objectContaining({
            Authorization: expectedAuth,
          }),
        }),
      );
    });
  });

  // ─── updateVariationPrice ─────────────────────────────────────────────────

  describe("updateVariationPrice()", () => {
    it("calls PUT /products/{parentId}/variations/{variationId}", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        mockResponse({ id: 77, regular_price: "14.99" }),
      );

      await client.updateVariationPrice(10, 77, "14.99");

      expect(fetch).toHaveBeenCalledWith(
        `${storeUrl}/wp-json/wc/v3/products/10/variations/77`,
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({ regular_price: "14.99" }),
          headers: expect.objectContaining({
            Authorization: expectedAuth,
          }),
        }),
      );
    });
  });
});
