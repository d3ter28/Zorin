import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ShopifyClient } from './client';

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

describe('ShopifyClient', () => {
  const shopDomain = 'test-shop.myshopify.com';
  const accessToken = 'shpat_test_token';
  let client: ShopifyClient;

  beforeEach(() => {
    client = new ShopifyClient(shopDomain, accessToken);
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ─── verifyConnection ────────────────────────────────────────────────────

  describe('verifyConnection()', () => {
    it('returns shopName on success', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        mockResponse({ shop: { name: 'Test Shop' } }),
      );

      const result = await client.verifyConnection();

      expect(result).toEqual({ shopName: 'Test Shop' });
      expect(fetch).toHaveBeenCalledWith(
        `https://${shopDomain}/admin/api/2024-01/shop.json`,
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Shopify-Access-Token': accessToken,
          }),
        }),
      );
    });

    it('throws on 401 unauthorised', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        mockResponse(
          { errors: 'Invalid API key or access token' },
          401,
        ),
      );

      await expect(client.verifyConnection()).rejects.toThrow('401');
    });

    it('throws on non-2xx with Shopify error message', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        mockResponse({ errors: 'Not found' }, 404),
      );

      await expect(client.verifyConnection()).rejects.toThrow('Not found');
    });
  });

  // ─── fetchAllProducts ────────────────────────────────────────────────────

  describe('fetchAllProducts()', () => {
    it('yields flattened variants from a single page', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        mockResponse({
          products: [
            {
              id: 1,
              title: 'Widget',
              image: { src: 'https://cdn.shopify.com/widget.jpg' },
              variants: [
                {
                  id: 101,
                  product_id: 1,
                  title: 'Small',
                  sku: 'WID-S',
                  price: '9.99',
                  inventory_quantity: 50,
                },
              ],
            },
          ],
        }),
      );

      const pages: Awaited<ReturnType<typeof client.fetchAllProducts>>[] = [];
      for await (const page of client.fetchAllProducts()) {
        pages.push(page as typeof page);
      }

      expect(pages).toHaveLength(1);
      expect(pages[0]).toEqual([
        {
          id: 101,
          product_id: 1,
          title: 'Small',
          product_title: 'Widget',
          sku: 'WID-S',
          price: '9.99',
          inventory_quantity: 50,
          imageUrl: 'https://cdn.shopify.com/widget.jpg',
        },
      ]);
    });

    it('sets imageUrl to null when the product has no image', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        mockResponse({
          products: [
            {
              id: 2,
              title: 'No Photo Product',
              variants: [
                {
                  id: 201,
                  product_id: 2,
                  title: 'Default Title',
                  sku: 'NP-1',
                  price: '5.00',
                  inventory_quantity: 3,
                },
              ],
            },
          ],
        }),
      );

      const pages: unknown[] = [];
      for await (const page of client.fetchAllProducts()) {
        pages.push(page);
      }

      expect((pages[0] as Array<{ imageUrl: string | null }>)[0].imageUrl).toBeNull();
    });

    it('follows Link header pagination across multiple pages', async () => {
      const nextUrl = `https://${shopDomain}/admin/api/2024-01/products.json?limit=250&page_info=abc123`;

      vi.mocked(fetch)
        .mockResolvedValueOnce(
          mockResponse(
            {
              products: [
                {
                  id: 1,
                  title: 'Product A',
                  variants: [
                    {
                      id: 10,
                      product_id: 1,
                      title: 'Default Title',
                      sku: 'A',
                      price: '1.00',
                      inventory_quantity: 1,
                    },
                  ],
                },
              ],
            },
            200,
            { link: `<${nextUrl}>; rel="next"` },
          ),
        )
        .mockResolvedValueOnce(
          mockResponse({
            products: [
              {
                id: 2,
                title: 'Product B',
                variants: [
                  {
                    id: 20,
                    product_id: 2,
                    title: 'Default Title',
                    sku: 'B',
                    price: '2.00',
                    inventory_quantity: 2,
                  },
                ],
              },
            ],
          }),
        );

      const pages: unknown[] = [];
      for await (const page of client.fetchAllProducts()) {
        pages.push(page);
      }

      expect(pages).toHaveLength(2);
      expect(fetch).toHaveBeenCalledTimes(2);
      // Second call should use the next URL from the Link header
      expect(fetch).toHaveBeenNthCalledWith(2, nextUrl, expect.anything());
    });

    it('uses correct initial URL with limit=250', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        mockResponse({ products: [] }),
      );

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for await (const _ of client.fetchAllProducts()) { /* consume */ }

      expect(fetch).toHaveBeenCalledWith(
        `https://${shopDomain}/admin/api/2024-01/products.json?limit=250`,
        expect.anything(),
      );
    });
  });

  // ─── fetchOrders ─────────────────────────────────────────────────────────

  describe('fetchOrders()', () => {
    it('yields orders from a single page', async () => {
      const sinceDate = new Date('2024-01-01T00:00:00Z');

      vi.mocked(fetch).mockResolvedValueOnce(
        mockResponse({
          orders: [
            {
              id: 5001,
              created_at: '2024-01-15T10:00:00Z',
              line_items: [
                { variant_id: 101, quantity: 2, price: '9.99' },
              ],
            },
          ],
        }),
      );

      const pages: unknown[] = [];
      for await (const page of client.fetchOrders(sinceDate)) {
        pages.push(page);
      }

      expect(pages).toHaveLength(1);
      expect(pages[0]).toEqual([
        {
          id: 5001,
          created_at: '2024-01-15T10:00:00Z',
          line_items: [{ variant_id: 101, quantity: 2, price: '9.99' }],
        },
      ]);
    });

    it('includes sinceDate in query string as ISO string', async () => {
      const sinceDate = new Date('2024-03-15T12:30:00Z');

      vi.mocked(fetch).mockResolvedValueOnce(
        mockResponse({ orders: [] }),
      );

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for await (const _ of client.fetchOrders(sinceDate)) { /* consume */ }

      const calledUrl = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
      expect(calledUrl).toContain('created_at_min=2024-03-15T12%3A30%3A00.000Z');
      expect(calledUrl).toContain('status=any');
      expect(calledUrl).toContain('limit=250');
    });

    it('follows Link header pagination for orders', async () => {
      const nextUrl = `https://${shopDomain}/admin/api/2024-01/orders.json?limit=250&page_info=xyz`;

      vi.mocked(fetch)
        .mockResolvedValueOnce(
          mockResponse(
            { orders: [{ id: 1, created_at: '2024-01-01T00:00:00Z', line_items: [] }] },
            200,
            { link: `<${nextUrl}>; rel="next"` },
          ),
        )
        .mockResolvedValueOnce(
          mockResponse({
            orders: [{ id: 2, created_at: '2024-01-02T00:00:00Z', line_items: [] }],
          }),
        );

      const pages: unknown[] = [];
      for await (const page of client.fetchOrders(new Date('2024-01-01'))) {
        pages.push(page);
      }

      expect(pages).toHaveLength(2);
      expect(fetch).toHaveBeenNthCalledWith(2, nextUrl, expect.anything());
    });
  });

  // ─── Rate limiting (429) ──────────────────────────────────────────────────

  describe('429 rate limiting', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('retries after Retry-After delay on 429', async () => {
      vi.mocked(fetch)
        .mockResolvedValueOnce(
          mockResponse({ errors: 'Too Many Requests' }, 429, {
            'retry-after': '2',
          }),
        )
        .mockResolvedValueOnce(
          mockResponse({ shop: { name: 'Retry Shop' } }),
        );

      const promise = client.verifyConnection();
      // Advance time past the retry window (2s → 2000ms, capped at 10000ms)
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toEqual({ shopName: 'Retry Shop' });
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('caps Retry-After wait at 10 seconds', async () => {
      vi.mocked(fetch)
        .mockResolvedValueOnce(
          mockResponse({ errors: 'Too Many Requests' }, 429, {
            'retry-after': '60', // 60s → should be capped at 10s
          }),
        )
        .mockResolvedValueOnce(
          mockResponse({ shop: { name: 'Capped Shop' } }),
        );

      const promise = client.verifyConnection();

      // After the first fake-timer tick the client schedules a 10s wait (capped from 60s).
      // Advance exactly 10 000 ms — if the cap were absent this would leave a 50-second
      // timer still pending and the promise would never settle.
      await vi.advanceTimersByTimeAsync(10_000);

      const result = await promise;
      expect(result).toEqual({ shopName: 'Capped Shop' });
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('throws after 3 retries on persistent 429', async () => {
      vi.mocked(fetch).mockResolvedValue(
        mockResponse({ errors: 'Too Many Requests' }, 429, {
          'retry-after': '1',
        }),
      );

      // Wrap in expect(...).rejects BEFORE advancing timers so the rejection
      // is always handled before Vitest can flag it as unhandled.
      const assertion = expect(client.verifyConnection()).rejects.toThrow('429');

      // Each retry waits 1 s (1000 ms); 3 retries = 3 000 ms total.
      await vi.advanceTimersByTimeAsync(3_000);

      await assertion;
      // 1 original + 3 retries = 4 total calls
      expect(fetch).toHaveBeenCalledTimes(4);
    });

    it('retries updateVariantPrice after 429', async () => {
      vi.mocked(fetch)
        .mockResolvedValueOnce(
          mockResponse({ errors: 'Too Many Requests' }, 429, { 'retry-after': '1' }),
        )
        .mockResolvedValueOnce(
          mockResponse({ variant: { id: 12345, price: '29.99' } }),
        );

      const promise = client.updateVariantPrice('12345', '29.99');
      await vi.runAllTimersAsync();
      await promise;

      expect(fetch).toHaveBeenCalledTimes(2);
    });
  });

  // ─── updateVariantPrice ──────────────────────────────────────────────────

  describe("updateVariantPrice()", () => {
    it("sends PUT with correct URL and body", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        mockResponse({ variant: { id: 12345, price: "29.99" } }),
      );

      await client.updateVariantPrice("12345", "29.99");

      expect(fetch).toHaveBeenCalledWith(
        `https://${shopDomain}/admin/api/2024-01/variants/12345.json`,
        expect.objectContaining({
          method: "PUT",
          headers: expect.objectContaining({
            "X-Shopify-Access-Token": accessToken,
          }),
          body: JSON.stringify({ variant: { id: 12345, price: "29.99" } }),
        }),
      );
    });

    it("throws on 404 (variant not found in Shopify)", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        mockResponse({ errors: "Not Found" }, 404),
      );

      await expect(client.updateVariantPrice("99999", "10.00")).rejects.toThrow("404");
    });

    it("throws on 422 (validation error)", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        mockResponse({ errors: "Price must be a number" }, 422),
      );

      await expect(client.updateVariantPrice("12345", "abc")).rejects.toThrow("422");
    });
  });

  // ─── Non-429 error handling ───────────────────────────────────────────────

  describe('error handling', () => {
    it('throws with status code and Shopify error string', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        mockResponse({ errors: 'This action requires merchant approval' }, 403),
      );

      await expect(client.verifyConnection()).rejects.toThrow(
        'This action requires merchant approval',
      );
    });

    it('throws with status code when errors is an object', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        mockResponse({ errors: { base: ['invalid'] } }, 422),
      );

      await expect(client.verifyConnection()).rejects.toThrow('422');
    });

    it('includes HTTP status in error message', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        mockResponse({ errors: 'Something went wrong' }, 500),
      );

      await expect(client.verifyConnection()).rejects.toThrow('500');
    });
  });
});
