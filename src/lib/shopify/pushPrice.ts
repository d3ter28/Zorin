import { prisma } from "@/lib/db";
import { decryptToken } from "@/lib/shopify/crypto";
import { ShopifyClient } from "@/lib/shopify/client";
import { centsToDollars } from "@/lib/money";

export async function pushPriceToShopify(
  merchantId: string,
  shopifyVariantId: string,
  newPriceCents: number,
): Promise<void> {
  const connection = await prisma.shopifyConnection.findUnique({
    where: { merchantId },
  });
  if (!connection) return;

  const accessToken = decryptToken(connection.encryptedToken);
  const client = new ShopifyClient(connection.shopDomain, accessToken);
  await client.updateVariantPrice(shopifyVariantId, centsToDollars(newPriceCents));
}
