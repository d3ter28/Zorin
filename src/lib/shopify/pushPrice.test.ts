import { beforeEach, describe, expect, it, vi } from "vitest";

const { findUnique } = vi.hoisted(() => ({
  findUnique: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    shopifyConnection: { findUnique },
  },
}));

const mockDecryptToken = vi.hoisted(() => vi.fn());
vi.mock("@/lib/shopify/crypto", () => ({
  decryptToken: mockDecryptToken,
}));

const mockUpdateVariantPrice = vi.hoisted(() => vi.fn());

vi.mock("@/lib/shopify/client", () => {
  class MockShopifyClient {
    constructor(shopDomain: string, accessToken: string) {
      this.shopDomain = shopDomain;
      this.accessToken = accessToken;
    }
    shopDomain: string;
    accessToken: string;
    updateVariantPrice = mockUpdateVariantPrice;
  }
  return { ShopifyClient: vi.fn(MockShopifyClient as any) };
});

import { pushPriceToShopify } from "./pushPrice";
import { ShopifyClient } from "./client";

beforeEach(() => {
  findUnique.mockReset();
  mockDecryptToken.mockReset();
  mockUpdateVariantPrice.mockReset();
  vi.mocked(ShopifyClient).mockClear();
});

describe("pushPriceToShopify", () => {
  it("decrypts token, creates client, and calls updateVariantPrice", async () => {
    findUnique.mockResolvedValue({
      shopDomain: "test.myshopify.com",
      encryptedToken: "encrypted:data:here",
    });
    mockDecryptToken.mockReturnValue("shpat_real_token");
    mockUpdateVariantPrice.mockResolvedValue(undefined);

    await pushPriceToShopify("m1", "12345", 2999);

    expect(findUnique).toHaveBeenCalledWith({ where: { merchantId: "m1" } });
    expect(mockDecryptToken).toHaveBeenCalledWith("encrypted:data:here");
    expect(vi.mocked(ShopifyClient)).toHaveBeenCalledWith("test.myshopify.com", "shpat_real_token");
    expect(mockUpdateVariantPrice).toHaveBeenCalledWith("12345", "29.99");
  });

  it("returns silently when merchant has no Shopify connection", async () => {
    findUnique.mockResolvedValue(null);

    await expect(pushPriceToShopify("m1", "12345", 2999)).resolves.toBeUndefined();

    expect(mockDecryptToken).not.toHaveBeenCalled();
    expect(mockUpdateVariantPrice).not.toHaveBeenCalled();
  });

  it("propagates Shopify API errors", async () => {
    findUnique.mockResolvedValue({
      shopDomain: "test.myshopify.com",
      encryptedToken: "encrypted:data:here",
    });
    mockDecryptToken.mockReturnValue("shpat_real_token");
    mockUpdateVariantPrice.mockRejectedValue(new Error("404: Not Found"));

    await expect(pushPriceToShopify("m1", "99999", 2999)).rejects.toThrow("404: Not Found");
  });
});
