import type { PrismaClient } from "@prisma/client";
import type { WooCommerceClient } from "./client";

type PrismaSurface = Pick<PrismaClient, "product">;

export async function pushPriceToWooCommerce(
  prisma: PrismaSurface,
  client: WooCommerceClient,
  productId: string,
  priceDollars: string,
): Promise<{ ok: boolean; error?: string }> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { woocommerceVariantId: true, woocommerceParentId: true },
  });

  if (!product?.woocommerceVariantId) {
    return { ok: false, error: "not linked to WooCommerce" };
  }

  try {
    if (product.woocommerceParentId) {
      await client.updateVariationPrice(
        Number(product.woocommerceParentId),
        Number(product.woocommerceVariantId),
        priceDollars,
      );
    } else {
      await client.updateProductPrice(Number(product.woocommerceVariantId), priceDollars);
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
