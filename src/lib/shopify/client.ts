export interface ShopifyVariant {
  id: number;
  product_id: number;
  title: string;           // variant title ("Small", or "Default Title" for single-variant)
  product_title: string;   // parent product title
  sku: string;
  price: string;           // "29.99"
  inventory_quantity: number;
}

export interface ShopifyOrder {
  id: number;
  created_at: string;      // ISO 8601
  line_items: ShopifyLineItem[];
}

export interface ShopifyLineItem {
  variant_id: number;
  quantity: number;
  price: string;
}

// Internal raw shapes from the API
interface RawVariant {
  id: number;
  product_id: number;
  title: string;
  sku: string;
  price: string;
  inventory_quantity: number;
}

interface RawProduct {
  id: number;
  title: string;
  variants: RawVariant[];
}

const API_VERSION = '2024-01';
const MAX_RETRIES = 3;
const MAX_RETRY_DELAY_MS = 10_000;

export class ShopifyClient {
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;

  constructor(shopDomain: string, accessToken: string) {
    this.baseUrl = `https://${shopDomain}/admin/api/${API_VERSION}`;
    this.headers = {
      'X-Shopify-Access-Token': accessToken,
      'Content-Type': 'application/json',
    };
  }

  // ─── Core request helper ──────────────────────────────────────────────────

  private async request(
    url: string,
    options?: { method?: string; body?: unknown },
  ): Promise<{ data: unknown; linkHeader: string | null }> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const res = await fetch(url, {
        method: options?.method ?? "GET",
        headers: this.headers,
        ...(options?.body !== undefined && { body: JSON.stringify(options.body) }),
      });

      if (res.status === 429) {
        if (attempt === MAX_RETRIES) {
          throw new Error(`Shopify API error 429: Too Many Requests`);
        }

        const retryAfterStr = res.headers.get('Retry-After') ?? '1';
        const retryAfterSec = parseFloat(retryAfterStr);
        const delayMs = Math.min(retryAfterSec * 1000, MAX_RETRY_DELAY_MS);

        await new Promise<void>((r) => setTimeout(r, delayMs));
        lastError = new Error(`429`);
        continue;
      }

      if (!res.ok) {
        let errorMessage: string;
        try {
          const body = (await res.json()) as { errors?: unknown };
          const errors = body.errors;
          if (typeof errors === 'string') {
            errorMessage = errors;
          } else {
            errorMessage = `Shopify API error ${res.status}`;
          }
        } catch {
          errorMessage = `Shopify API error ${res.status}`;
        }
        throw new Error(`${res.status}: ${errorMessage}`);
      }

      const data = await res.json();
      const linkHeader = res.headers.get('Link');
      return { data, linkHeader };
    }

    // This is only reached if all retries were 429s (loop exits naturally)
    throw lastError ?? new Error('Unknown error after retries');
  }

  // ─── Parse Link header ────────────────────────────────────────────────────

  private parseNextLink(linkHeader: string | null): string | null {
    if (!linkHeader) return null;
    const match = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
    return match ? match[1] : null;
  }

  // ─── verifyConnection ─────────────────────────────────────────────────────

  async verifyConnection(): Promise<{ shopName: string }> {
    const url = `${this.baseUrl}/shop.json`;
    const { data } = await this.request(url);
    const body = data as { shop: { name: string } };
    return { shopName: body.shop.name };
  }

  // ─── fetchAllProducts ─────────────────────────────────────────────────────

  async *fetchAllProducts(): AsyncGenerator<ShopifyVariant[]> {
    let url: string | null = `${this.baseUrl}/products.json?limit=250`;

    while (url) {
      const { data, linkHeader } = await this.request(url);
      const body = data as { products: RawProduct[] };

      const variants: ShopifyVariant[] = body.products.flatMap((product) =>
        product.variants.map((v) => ({
          id: v.id,
          product_id: v.product_id,
          title: v.title,
          product_title: product.title,
          sku: v.sku,
          price: v.price,
          inventory_quantity: v.inventory_quantity,
        })),
      );

      yield variants;
      url = this.parseNextLink(linkHeader);
    }
  }

  // ─── updateVariantPrice ─────────────────────────────────────────────────

  async updateVariantPrice(variantId: string, priceDollars: string): Promise<void> {
    await this.request(`${this.baseUrl}/variants/${variantId}.json`, {
      method: "PUT",
      body: { variant: { id: Number(variantId), price: priceDollars } },
    });
  }

  // ─── fetchOrders ──────────────────────────────────────────────────────────

  async *fetchOrders(sinceDate: Date): AsyncGenerator<ShopifyOrder[]> {
    const isoDate = encodeURIComponent(sinceDate.toISOString());
    let url: string | null =
      `${this.baseUrl}/orders.json?status=any&created_at_min=${isoDate}&limit=250`;

    while (url) {
      const { data, linkHeader } = await this.request(url);
      const body = data as { orders: ShopifyOrder[] };

      yield body.orders;
      url = this.parseNextLink(linkHeader);
    }
  }
}
