import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withErrorHandling, HttpError } from "@/lib/api/errors";
import { parseJsonBody } from "@/lib/api/validation";
import { requireSessionApi } from "@/lib/auth/requireSession";
import { recordObservation } from "@/lib/scrape/recordObservation";

interface CandidateInput {
  url: string;
  competitorName: string;
  priceCents: number;
}

function isValidCandidate(c: unknown): c is CandidateInput {
  if (typeof c !== "object" || c === null) return false;
  const o = c as Record<string, unknown>;
  return (
    typeof o.url === "string" &&
    typeof o.competitorName === "string" &&
    typeof o.priceCents === "number" &&
    o.priceCents >= 0
  );
}

export const POST = withErrorHandling(
  async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { merchantId } = await requireSessionApi();
    const { id } = await params;

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product || product.merchantId !== merchantId) throw new HttpError(404, "Not found");

    const body = await parseJsonBody(req);
    const raw = body.candidates;
    if (!Array.isArray(raw) || raw.length === 0 || !raw.every(isValidCandidate)) {
      throw new HttpError(400, "candidates must be a non-empty array of {url, competitorName, priceCents}");
    }

    for (const c of raw as CandidateInput[]) {
      await recordObservation(prisma, {
        productId: id,
        competitorName: c.competitorName,
        competitorUrl: c.url,
        priceCents: c.priceCents,
        source: "discovery",
      });
    }

    return NextResponse.json({ added: raw.length });
  },
);
