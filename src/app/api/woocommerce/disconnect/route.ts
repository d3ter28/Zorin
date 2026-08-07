import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withErrorHandling } from "@/lib/api/errors";
import { requireOwnerApi } from "@/lib/auth/requireSession";
import { WooCommerceClient } from "@/lib/woocommerce/client";
import { decrypt } from "@/lib/woocommerce/crypto";

export const POST = withErrorHandling(async (_req: Request) => {
  const { merchantId } = await requireOwnerApi();

  const connection = await prisma.wooCommerceConnection.findUnique({ where: { merchantId } });

  if (connection) {
    const consumerKey = decrypt(connection.encryptedKey);
    const consumerSecret = decrypt(connection.encryptedSecret);
    const client = new WooCommerceClient(connection.storeUrl, consumerKey, consumerSecret);
    const webhookIds = JSON.parse(connection.webhookIds) as string[];
    for (const id of webhookIds) {
      try {
        await client.deleteWebhook(id);
      } catch {
        // Best-effort: credentials may already be revoked. Local cleanup proceeds regardless.
      }
    }
  }

  await prisma.wooCommerceConnection.delete({
    where: { merchantId },
  });
  await prisma.product.updateMany({
    where: { merchantId },
    data: { woocommerceVariantId: null, woocommerceParentId: null },
  });
  return NextResponse.json({ ok: true });
});
