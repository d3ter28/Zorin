import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { HttpError, withErrorHandling } from "@/lib/api/errors";
import { parseJsonBody } from "@/lib/api/validation";
import { requireSessionApi } from "@/lib/auth/requireSession";
import { assertProductOwned } from "@/lib/auth/ownership";

interface CompetitorPriceRow {
  id: string;
  competitorName: string;
  priceCents: number;
  url: string | null;
  capturedAt: Date;
}

function serialize(row: CompetitorPriceRow) {
  return {
    id: row.id,
    competitorName: row.competitorName,
    priceCents: row.priceCents,
    url: row.url,
    capturedAt: row.capturedAt.toISOString(),
  };
}

/** Absolute http(s) URL only — competitor product pages live on arbitrary external domains. */
function validateUrl(value: unknown): string | null | undefined {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") return undefined;
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return undefined;
    return value;
  } catch {
    return undefined;
  }
}

function isPositiveInt(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n) && Number.isInteger(n) && n > 0;
}

export const GET = withErrorHandling(
  async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { merchantId } = await requireSessionApi();
    const { id: productId } = await params;
    await assertProductOwned(prisma, productId, merchantId);

    const rows = await prisma.competitorPrice.findMany({
      where: { productId },
      orderBy: { priceCents: "asc" },
    });

    return NextResponse.json(rows.map(serialize));
  },
);

export const POST = withErrorHandling(
  async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { merchantId } = await requireSessionApi();
    const { id: productId } = await params;
    await assertProductOwned(prisma, productId, merchantId);

    const body = (await parseJsonBody(req)) as {
      competitorName?: unknown;
      priceCents?: unknown;
      url?: unknown;
    };

    const competitorName = typeof body.competitorName === "string" ? body.competitorName.trim() : "";
    if (competitorName === "") {
      throw new HttpError(400, "Competitor name is required");
    }
    if (!isPositiveInt(body.priceCents)) {
      throw new HttpError(400, "Price must be a positive whole number of cents");
    }
    const url = validateUrl(body.url);
    if (url === undefined) {
      throw new HttpError(400, "url must be a valid http(s) URL");
    }

    const row = await prisma.competitorPrice.create({
      data: { productId, merchantId, competitorName, priceCents: body.priceCents, url },
    });

    return NextResponse.json(serialize(row));
  },
);
