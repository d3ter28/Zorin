import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { HttpError, withErrorHandling } from "@/lib/api/errors";
import { requireSessionApi } from "@/lib/auth/requireSession";
import { assertProductOwned } from "@/lib/auth/ownership";

function serialize(row: {
  id: string;
  competitorName: string;
  priceCents: number;
  url: string | null;
  capturedAt: Date;
}) {
  return {
    id: row.id,
    competitorName: row.competitorName,
    priceCents: row.priceCents,
    url: row.url,
    capturedAt: row.capturedAt.toISOString(),
  };
}

function validateUrl(value: unknown): string | null | undefined {
  if (value === undefined) return null;
  if (value === null || value === "") return null;
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

    const body = (await req.json()) as {
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
      const url = validateUrl(body.url);
      if (url === undefined) throw new HttpError(400, "url must be a valid http(s) URL");
      data.url = url;
    }

    const row = await prisma.competitorPrice.update({ where: { id: cpId }, data });
    return NextResponse.json(serialize(row));
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
