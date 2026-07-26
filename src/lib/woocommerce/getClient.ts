import { prisma } from "@/lib/db";
import { decrypt } from "@/lib/woocommerce/crypto";
import { WooCommerceClient } from "@/lib/woocommerce/client";

export async function getWooClient(merchantId: string): Promise<WooCommerceClient | null> {
  const connection = await prisma.wooCommerceConnection.findUnique({ where: { merchantId } });
  if (!connection) return null;
  const consumerKey = decrypt(connection.encryptedKey);
  const consumerSecret = decrypt(connection.encryptedSecret);
  return new WooCommerceClient(connection.storeUrl, consumerKey, consumerSecret);
}
