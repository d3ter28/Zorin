import { beforeEach, describe, expect, it, vi } from "vitest";
import { pushPriceToWooCommerce } from "./pushPrice";

const makeClient = () => ({
  updateProductPrice: vi.fn<(productId: number, priceDollars: string) => Promise<void>>(),
  updateVariationPrice: vi.fn<(parentId: number, variationId: number, priceDollars: string) => Promise<void>>(),
});

const makePrisma = (product: { woocommerceVariantId: string | null; woocommerceParentId: string | null } | null) => ({
  product: {
    findUnique: vi.fn().mockResolvedValue(product),
  },
});

describe("pushPriceToWooCommerce", () => {
  let client: ReturnType<typeof makeClient>;

  beforeEach(() => {
    client = makeClient();
  });

  it("returns { ok: false, error: 'not linked to WooCommerce' } when woocommerceVariantId is null", async () => {
    const prisma = makePrisma({ woocommerceVariantId: null, woocommerceParentId: null });

    const result = await pushPriceToWooCommerce(
      prisma as any,
      client as any,
      "product-1",
      "29.99",
    );

    expect(result).toEqual({ ok: false, error: "not linked to WooCommerce" });
    expect(client.updateProductPrice).not.toHaveBeenCalled();
    expect(client.updateVariationPrice).not.toHaveBeenCalled();
  });

  it("returns { ok: false, error: 'not linked to WooCommerce' } when product is not found", async () => {
    const prisma = makePrisma(null);

    const result = await pushPriceToWooCommerce(
      prisma as any,
      client as any,
      "product-1",
      "29.99",
    );

    expect(result).toEqual({ ok: false, error: "not linked to WooCommerce" });
  });

  it("calls updateProductPrice for simple products (woocommerceParentId is null)", async () => {
    const prisma = makePrisma({ woocommerceVariantId: "42", woocommerceParentId: null });
    client.updateProductPrice.mockResolvedValue(undefined);

    const result = await pushPriceToWooCommerce(
      prisma as any,
      client as any,
      "product-1",
      "29.99",
    );

    expect(result).toEqual({ ok: true });
    expect(client.updateProductPrice).toHaveBeenCalledWith(42, "29.99");
    expect(client.updateVariationPrice).not.toHaveBeenCalled();
  });

  it("calls updateVariationPrice for variations (woocommerceParentId is set)", async () => {
    const prisma = makePrisma({ woocommerceVariantId: "99", woocommerceParentId: "10" });
    client.updateVariationPrice.mockResolvedValue(undefined);

    const result = await pushPriceToWooCommerce(
      prisma as any,
      client as any,
      "product-1",
      "49.00",
    );

    expect(result).toEqual({ ok: true });
    expect(client.updateVariationPrice).toHaveBeenCalledWith(10, 99, "49.00");
    expect(client.updateProductPrice).not.toHaveBeenCalled();
  });

  it("returns { ok: true } on success", async () => {
    const prisma = makePrisma({ woocommerceVariantId: "7", woocommerceParentId: null });
    client.updateProductPrice.mockResolvedValue(undefined);

    const result = await pushPriceToWooCommerce(
      prisma as any,
      client as any,
      "product-1",
      "9.99",
    );

    expect(result).toEqual({ ok: true });
  });

  it("returns { ok: false, error } without throwing when API call fails", async () => {
    const prisma = makePrisma({ woocommerceVariantId: "42", woocommerceParentId: null });
    client.updateProductPrice.mockRejectedValue(new Error("404: Not Found"));

    const result = await pushPriceToWooCommerce(
      prisma as any,
      client as any,
      "product-1",
      "29.99",
    );

    expect(result).toEqual({ ok: false, error: "404: Not Found" });
  });

  it("handles non-Error thrown values", async () => {
    const prisma = makePrisma({ woocommerceVariantId: "42", woocommerceParentId: null });
    client.updateProductPrice.mockRejectedValue("string error");

    const result = await pushPriceToWooCommerce(
      prisma as any,
      client as any,
      "product-1",
      "29.99",
    );

    expect(result).toEqual({ ok: false, error: "string error" });
  });
});
