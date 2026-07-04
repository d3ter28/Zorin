import { beforeEach, describe, expect, it, vi } from "vitest";
import { importSalesHistory } from "./importSalesHistory";
import type { ParsedSalesRow } from "./parseSalesHistoryCsv";

function mockPrisma(existing: { id: string; sku: string }[]) {
  return {
    product: {
      findMany: vi.fn().mockResolvedValue(existing),
    },
    salesRecord: {
      upsert: vi.fn().mockResolvedValue({}),
    },
  };
}

const row = (over: Partial<ParsedSalesRow> = {}): ParsedSalesRow => ({
  line: 1,
  sku: "TEE-100",
  date: new Date("2026-01-01"),
  unitsSold: 5,
  priceCents: 4999,
  ...over,
});

describe("importSalesHistory", () => {
  beforeEach(() => vi.clearAllMocks());

  it("imports rows matching known SKUs", async () => {
    const prisma = mockPrisma([{ id: "p1", sku: "TEE-100" }]);
    const result = await importSalesHistory(prisma as never, "m1", [row()]);

    expect(prisma.salesRecord.upsert).toHaveBeenCalledWith({
      where: { productId_date: { productId: "p1", date: row().date } },
      create: {
        productId: "p1",
        merchantId: "m1",
        date: row().date,
        unitsSold: 5,
        priceCents: 4999,
      },
      update: {
        unitsSold: 5,
        priceCents: 4999,
      },
    });
    expect(result.imported).toBe(1);
    expect(result.unknownSkus).toEqual([]);
  });

  it("collects unknown SKUs without throwing", async () => {
    const prisma = mockPrisma([]);
    const result = await importSalesHistory(prisma as never, "m1", [
      row({ sku: "UNKNOWN-1" }),
    ]);

    expect(result.imported).toBe(0);
    expect(result.unknownSkus).toEqual(["UNKNOWN-1"]);
    expect(prisma.salesRecord.upsert).not.toHaveBeenCalled();
  });

  it("deduplicates repeated unknown SKUs", async () => {
    const prisma = mockPrisma([]);
    const result = await importSalesHistory(prisma as never, "m1", [
      row({ sku: "UNKNOWN-1", date: new Date("2026-01-01") }),
      row({ sku: "UNKNOWN-1", date: new Date("2026-01-02") }),
    ]);

    expect(result.unknownSkus).toEqual(["UNKNOWN-1"]);
  });

  it("upserts on duplicate (productId, date) by calling upsert once per row", async () => {
    const prisma = mockPrisma([{ id: "p1", sku: "TEE-100" }]);
    const sameDate = new Date("2026-01-01");

    await importSalesHistory(prisma as never, "m1", [
      row({ date: sameDate, unitsSold: 3 }),
    ]);
    await importSalesHistory(prisma as never, "m1", [
      row({ date: sameDate, unitsSold: 7 }),
    ]);

    expect(prisma.salesRecord.upsert).toHaveBeenCalledTimes(2);
    expect(prisma.salesRecord.upsert).toHaveBeenNthCalledWith(2, {
      where: { productId_date: { productId: "p1", date: sameDate } },
      create: expect.objectContaining({ unitsSold: 7 }),
      update: { unitsSold: 7, priceCents: 4999 },
    });
  });

  it("returns imported 0 and empty unknownSkus for an empty row list", async () => {
    const prisma = mockPrisma([]);
    const result = await importSalesHistory(prisma as never, "m1", []);
    expect(result.imported).toBe(0);
    expect(result.unknownSkus).toEqual([]);
    expect(prisma.product.findMany).toHaveBeenCalledWith({
      where: { merchantId: "m1" },
      select: { id: true, sku: true },
    });
  });
});
