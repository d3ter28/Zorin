import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withErrorHandling } from "@/lib/api/errors";
import { requireSessionApi } from "@/lib/auth/requireSession";

interface MonthBucket {
  month: string;
  totalPriceCents: number;
  totalUnits: number;
  count: number;
}

export const GET = withErrorHandling(async () => {
  const { merchantId } = await requireSessionApi();

  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - 24);

  const records = await prisma.salesRecord.findMany({
    where: {
      merchantId,
      date: { gte: cutoff },
      promotionFlag: false,
    },
    select: { date: true, priceCents: true, unitsSold: true },
    orderBy: { date: "asc" },
  });

  const buckets = new Map<string, MonthBucket>();

  for (const r of records) {
    const d = new Date(r.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const existing = buckets.get(key) ?? { month: key, totalPriceCents: 0, totalUnits: 0, count: 0 };
    existing.totalPriceCents += r.priceCents;
    existing.totalUnits += r.unitsSold;
    existing.count += 1;
    buckets.set(key, existing);
  }

  const result = Array.from(buckets.values())
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((b) => ({
      month: b.month,
      avgPriceCents: Math.round(b.totalPriceCents / b.count),
      totalUnits: b.totalUnits,
      dataPoints: b.count,
    }));

  return NextResponse.json(result);
});
