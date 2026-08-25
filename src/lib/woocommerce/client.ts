export interface WooNormalizedProduct {
  id: number;
  parentId: number | null;
  name: string;
  sku: string;
  regularPriceDollars: string;
  imageUrl: string | null;
  category: string | null;
}

export interface WooOrder {
  id: number;
  date_created: string; // ISO 8601
  line_items: WooLineItem[];
}

export interface WooLineItem {
  product_id: number;
  variation_id: number; // 0 for simple products
  quantity: number;
  price: string;
}

// Internal raw shapes from the API
interface RawProduct {
  id: number;
  type: "simple" | "variable";
  name: string;
  sku: string;
  regular_price: string;
  images?: Array<{ src: string }>;
  categories?: Array<{ id: number; name: string; slug: string }>;
}

interface RawVariation {
  id: number;
  sku: string;
  regular_price: string;
  attributes: Array<{ name: string; option: string }>;
  images?: Array<{ src: string }>;
}

function resolveCategory(
  categories: Array<{ name: string }> | undefined,
): string | null {
  const name = categories?.[0]?.name?.trim();
  return name ? name : null;
}

const MAX_RETRIES = 3;
const MAX_RETRY_DELAY_MS = 10_000;

export class WooCommerceClient {
  private readonly baseUrl: string;
  private readonly authHeader: string;

  constructor(storeUrl: string, consumerKey: string, consumerSecret: string) {
    this.baseUrl = storeUrl.replace(/\/$/, "") + "/wp-json/wc/v3";
    this.authHeader =
      "Basic " +
      Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");
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
        headers: {
          Authorization: this.authHeader,
          "Content-Type": "application/json",
        },
        ...(options?.body !== undefined && { body: JSON.stringify(options.body) }),
      });

      if (res.status === 429) {
        if (attempt === MAX_RETRIES) {
          throw new Error(`WooCommerce API error 429: Too Many Requests`);
        }

        const retryAfterStr = res.headers.get("Retry-After") ?? "1";
        const retryAfterSec = parseFloat(retryAfterStr);
        const delayMs = Math.min(retryAfterSec * 1000, MAX_RETRY_DELAY_MS);

        await new Promise<void>((r) => setTimeout(r, delayMs));
        lastError = new Error(`429`);
        continue;
      }

      if (!res.ok) {
        let errorMessage: string;
        try {
          const body = (await res.json()) as { message?: string; code?: string };
          errorMessage = body.message || `WooCommerce API error ${res.status}`;
        } catch {
          errorMessage = `WooCommerce API error ${res.status}`;
        }
        throw new Error(`${res.status}: ${errorMessage}`);
      }

      const data = await res.json();
      const linkHeader = res.headers.get("Link");
      return { data, linkHeader };
    }

    throw lastError ?? new Error("Unknown error after retries");
  }

  // ─── Parse Link header ────────────────────────────────────────────────────

  private parseNextLink(linkHeader: string | null): string | null {
    if (!linkHeader) return null;
    const match = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
    return match ? match[1] : null;
  }

  // ─── verifyConnection ─────────────────────────────────────────────────────

  async verifyConnection(): Promise<{ storeName: string }> {
    const url = `${this.baseUrl}/system_status`;
    const { data } = await this.request(url);
    const body = data as { environment?: { home_url?: string } };
    const homeUrl = body.environment?.home_url;
    let storeName: string;
    if (homeUrl) {
      try {
        storeName = new URL(homeUrl).hostname;
      } catch {
        storeName = new URL(this.baseUrl).hostname;
      }
    } else {
      storeName = new URL(this.baseUrl).hostname;
    }
    return { storeName };
  }

  // ─── fetchAllProducts ─────────────────────────────────────────────────────

  async *fetchAllProducts(): AsyncGenerator<WooNormalizedProduct[]> {
    let url: string | null = `${this.baseUrl}/products?per_page=100`;

    while (url) {
      const { data, linkHeader } = await this.request(url);
      const products = data as RawProduct[];
      const page: WooNormalizedProduct[] = [];

      for (const product of products) {
        if (product.type === "simple") {
          page.push({
            id: product.id,
            parentId: null,
            name: product.name,
            sku: product.sku,
            regularPriceDollars: product.regular_price,
            imageUrl: product.images?.[0]?.src ?? null,
            category: resolveCategory(product.categories),
          });
        } else if (product.type === "variable") {
          const parentImageUrl = product.images?.[0]?.src ?? null;
          const parentCategory = resolveCategory(product.categories);

          // Fetch all variation pages for this variable product
          let varUrl: string | null =
            `${this.baseUrl}/products/${product.id}/variations?per_page=100`;

          while (varUrl) {
            const { data: varData, linkHeader: varLink } =
              await this.request(varUrl);
            const variations = varData as RawVariation[];

            for (const variation of variations) {
              const attrLabel = variation.attributes
                .map((a) => a.option)
                .join(" / ");
              page.push({
                id: variation.id,
                parentId: product.id,
                name: attrLabel
                  ? `${product.name} - ${attrLabel}`
                  : product.name,
                sku: variation.sku,
                regularPriceDollars: variation.regular_price,
                imageUrl: variation.images?.[0]?.src ?? parentImageUrl,
                category: parentCategory,
              });
            }

            varUrl = this.parseNextLink(varLink);
          }
        }
      }

      yield page;
      url = this.parseNextLink(linkHeader);
    }
  }

  // ─── fetchOrders ──────────────────────────────────────────────────────────

  async *fetchOrders(sinceDate: Date): AsyncGenerator<WooOrder[]> {
    const iso = encodeURIComponent(sinceDate.toISOString());
    let url: string | null =
      `${this.baseUrl}/orders?after=${iso}&status=any&per_page=100`;

    while (url) {
      const { data, linkHeader } = await this.request(url);
      const orders = data as WooOrder[];

      yield orders;
      url = this.parseNextLink(linkHeader);
    }
  }

  // ─── updateProductPrice ───────────────────────────────────────────────────

  async updateProductPrice(
    productId: number,
    priceDollars: string,
  ): Promise<void> {
    await this.request(`${this.baseUrl}/products/${productId}`, {
      method: "PUT",
      body: { regular_price: priceDollars },
    });
  }

  // ─── updateVariationPrice ─────────────────────────────────────────────────

  async updateVariationPrice(
    parentId: number,
    variationId: number,
    priceDollars: string,
  ): Promise<void> {
    await this.request(
      `${this.baseUrl}/products/${parentId}/variations/${variationId}`,
      {
        method: "PUT",
        body: { regular_price: priceDollars },
      },
    );
  }

  // ─── createWebhook ─────────────────────────────────────────────────────────

  async createWebhook(topic: string, deliveryUrl: string, secret: string): Promise<string> {
    const { data } = await this.request(`${this.baseUrl}/webhooks`, {
      method: "POST",
      body: { name: `Zorin ${topic}`, topic, delivery_url: deliveryUrl, secret },
    });
    const body = data as { id: number };
    return String(body.id);
  }

  // ─── deleteWebhook ─────────────────────────────────────────────────────────

  async deleteWebhook(webhookId: string): Promise<void> {
    await this.request(`${this.baseUrl}/webhooks/${webhookId}?force=true`, {
      method: "DELETE",
    });
  }
}
