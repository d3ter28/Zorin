import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withErrorHandling } from "@/lib/api/errors";
import { requireOwnerApi } from "@/lib/auth/requireSession";
import { decryptToken } from "@/lib/shopify/crypto";
import { ShopifyClient } from "@/lib/shopify/client";

export const POST = withErrorHandling(async (_req: Request) => {
  const { merchantId } = await requireOwnerApi();

  const connection = await prisma.shopifyConnection.findUnique({ where: { merchantId } });

  if (connection) {
    const accessToken = decryptToken(connection.encryptedToken);
    const client = new ShopifyClient(connection.shopDomain, accessToken);
    const webhookIds = JSON.parse(connection.webhookIds) as string[];
    for (const id of webhookIds) {
      try {
        await client.deleteWebhook(id);
      } catch {
        // Best-effort: credentials may already be revoked. Local cleanup proceeds regardless.
      }
    }
  }

  await prisma.shopifyConnection.delete({
    where: { merchantId },
  });

  return NextResponse.json({ success: true });
});
