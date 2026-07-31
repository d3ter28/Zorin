import { describe, it, expect, vi, beforeEach } from "vitest";
import { wasAlreadyProcessed } from "./dedupe";

function makePrisma() {
  const store = new Set<string>();
  return {
    processedWebhook: {
      create: vi.fn(async ({ data }: { data: { deliveryId: string } }) => {
        if (store.has(data.deliveryId)) {
          const err = new Error("Unique constraint failed") as Error & { code?: string };
          err.code = "P2002";
          throw err;
        }
        store.add(data.deliveryId);
        return { id: "x", deliveryId: data.deliveryId, createdAt: new Date() };
      }),
    },
  };
}

describe("wasAlreadyProcessed", () => {
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
  });

  it("returns false and records the delivery on first call", async () => {
    const result = await wasAlreadyProcessed(prisma as never, "delivery-1");
    expect(result).toBe(false);
    expect(prisma.processedWebhook.create).toHaveBeenCalledWith({
      data: { deliveryId: "delivery-1" },
    });
  });

  it("returns true on a repeat call with the same delivery ID", async () => {
    await wasAlreadyProcessed(prisma as never, "delivery-1");
    const result = await wasAlreadyProcessed(prisma as never, "delivery-1");
    expect(result).toBe(true);
  });

  it("treats different delivery IDs independently", async () => {
    await wasAlreadyProcessed(prisma as never, "delivery-1");
    const result = await wasAlreadyProcessed(prisma as never, "delivery-2");
    expect(result).toBe(false);
  });

  it("propagates non-unique-constraint errors", async () => {
    prisma.processedWebhook.create = vi.fn(async () => {
      throw new Error("connection refused");
    });
    await expect(wasAlreadyProcessed(prisma as never, "delivery-1")).rejects.toThrow(
      "connection refused",
    );
  });
});
