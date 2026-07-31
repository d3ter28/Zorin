import type { PrismaClient } from "@prisma/client";

type PrismaSurface = Pick<PrismaClient, "processedWebhook">;

function isUniqueConstraintError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: unknown }).code === "P2002"
  );
}

/**
 * Records a webhook delivery ID and reports whether it was already seen.
 * Relies on ProcessedWebhook.deliveryId's unique constraint so two
 * near-simultaneous redeliveries can't both slip through a read-then-write race.
 */
export async function wasAlreadyProcessed(
  prisma: PrismaSurface,
  deliveryId: string,
): Promise<boolean> {
  try {
    await prisma.processedWebhook.create({ data: { deliveryId } });
    return false;
  } catch (err) {
    if (isUniqueConstraintError(err)) return true;
    throw err;
  }
}
