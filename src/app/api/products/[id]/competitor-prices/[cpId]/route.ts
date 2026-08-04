import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { HttpError, withErrorHandling } from "@/lib/api/errors";
import { parseJsonBody } from "@/lib/api/validation";
import { requireSessionApi } from "@/lib/auth/requireSession";
import { assertProductOwned } from "@/lib/auth/ownership";
import {
  isPositiveInt,
  serializeCompetitorPrice,
  validateCompetitorUrl,
} from "@/lib/competitorPrices/validate";

async function loadOwnedRow(productId: string, cpId: string) {
  const row = await prisma.competitorPrice.findFirst({ where: { id: cpId, productId } });
  if (!row) throw new HttpError(404, "Not found");
  return row;
}

export const PATCH = withErrorHandling(
  async (req: Request, { params }: { params: Promise<{ id: string; cpId: string }> }) => {
    const { merchantId } = await requireSessionApi();
    const { id: productId, cpId } = await params;
    await assertProductOwned(prisma, productId, merchantId);
    await loadOwnedRow(productId, cpId);

    const body = (await parseJsonBody(req)) as {
      competitorName?: unknown;
      priceCents?: unknown;
      url?: unknown;
    };

    const data: { competitorName?: string; priceCents?: number; url?: string | null; capturedAt: Date } = {
      capturedAt: new Date(),
    };

    if (body.competitorName !== undefined) {
      const name = typeof body.competitorName === "string" ? body.competitorName.trim() : "";
      if (name === "") throw new HttpError(400, "Competitor name cannot be empty");
      data.competitorName = name;
    }
    if (body.priceCents !== undefined) {
      if (!isPositiveInt(body.priceCents)) {
        throw new HttpError(400, "Price must be a positive whole number of cents");
      }
      data.priceCents = body.priceCents;
    }
    if (body.url !== undefined) {
      const url = validateCompetitorUrl(body.url);
      if (url === undefined) throw new HttpError(400, "url must be a valid http(s) URL");
      data.url = url;
    }

    const row = await prisma.competitorPrice.update({ where: { id: cpId }, data });
    return NextResponse.json(serializeCompetitorPrice(row));
  },
);

export const DELETE = withErrorHandling(
  async (_req: Request, { params }: { params: Promise<{ id: string; cpId: string }> }) => {
    const { merchantId } = await requireSessionApi();
    const { id: productId, cpId } = await params;
    await assertProductOwned(prisma, productId, merchantId);
    await loadOwnedRow(productId, cpId);

    await prisma.competitorPrice.delete({ where: { id: cpId } });
    return NextResponse.json({ ok: true });
  },
);
