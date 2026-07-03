import type { PrismaClient } from "@prisma/client";
import { HttpError } from "@/lib/api/errors";

// 404 (never 403) on foreign or missing products — no existence leak.
export async function assertProductOwned(
  prisma: PrismaClient,
  productId: string,
  merchantId: string,
): Promise<void> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { merchantId: true },
  });
  if (!product || product.merchantId !== merchantId) {
    throw new HttpError(404, "Not found");
  }
}

export async function filterOwnedProductIds(
  prisma: PrismaClient,
  productIds: string[],
  merchantId: string,
): Promise<string[]> {
  if (productIds.length === 0) return [];
  const owned = await prisma.product.findMany({
    where: { id: { in: productIds }, merchantId },
    select: { id: true },
  });
  return owned.map((p) => p.id);
}
