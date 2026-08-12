import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withErrorHandling } from "@/lib/api/errors";
import { requireSessionApi } from "@/lib/auth/requireSession";
import { assertCampaignOwned } from "@/lib/campaigns/assertions";
import { centsToDollars } from "@/lib/money";

export const GET = withErrorHandling(
  async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { merchantId } = await requireSessionApi();
    const { id } = await params;
    await assertCampaignOwned(prisma, id, merchantId);

    const campaign = await prisma.campaign.findUniqueOrThrow({
      where: { id },
      include: {
        products: {
          include: { product: { select: { title: true, sku: true } } },
          orderBy: { id: "asc" },
        },
      },
    });

    const csvEscape = (s: string) => `"${s.replace(/"/g, '""')}"`;
    const header = "SKU,Title,Original Price,Target Price,Change %,Applied At,Reverted At,Error";
    const rows = campaign.products.map((cp) => {
      const changePct = cp.originalPriceCents > 0
        ? (((cp.targetPriceCents - cp.originalPriceCents) / cp.originalPriceCents) * 100).toFixed(1)
        : "0.0";
      return [
        csvEscape(cp.product.sku),
        csvEscape(cp.product.title),
        centsToDollars(cp.originalPriceCents),
        centsToDollars(cp.targetPriceCents),
        changePct,
        cp.appliedAt?.toISOString() ?? "",
        cp.revertedAt?.toISOString() ?? "",
        cp.error ? csvEscape(cp.error) : "",
      ].join(",");
    });

    const csv = [header, ...rows].join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${campaign.name.replace(/"/g, "")}-export.csv"`,
      },
    });
  },
);
