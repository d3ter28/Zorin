import { prisma } from "@/lib/db";
import { decideForProduct } from "@/lib/recommendation";

export interface ApplyResult {
  /** Whether the product exists. */
  found: boolean;
  /** Whether a price change was actually written. */
  applied: boolean;
  /** The decision action, or "" when not found. */
  action: string;
  /** The suggested/new price in cents, or 0 when not found. */
  currentPrice: number;
}

/**
 * Recompute a product's recommended price server-side. If it differs from the
 * current price, write it and clear the stale stored recommendation. Returns a
 * summary the caller maps to an HTTP response (single apply) or counts (bulk).
 */
export async function applyDecision(productId: string): Promise<ApplyResult> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { competitors: true },
  });
  if (!product) {
    return { found: false, applied: false, action: "", currentPrice: 0 };
  }

  const decision = decideForProduct(product);
  const applied = decision.suggestedPrice !== product.currentPrice;
  if (applied) {
    await prisma.product.update({
      where: { id: productId },
      data: { currentPrice: decision.suggestedPrice },
    });
    await prisma.recommendation.deleteMany({ where: { productId } });
  }

  return {
    found: true,
    applied,
    action: decision.action,
    currentPrice: decision.suggestedPrice,
  };
}
