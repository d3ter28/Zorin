import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withErrorHandling, HttpError } from "@/lib/api/errors";
import { parseJsonBody } from "@/lib/api/validation";
import { requireSessionApi } from "@/lib/auth/requireSession";
import { normalizeDomain } from "@/lib/discovery/domain";
import { getSearchProvider } from "@/lib/discovery/searchProvider";
import {
  discoverCompetitors,
  type DiscoveryMode,
} from "@/lib/discovery/discoverCompetitors";

const MODES: DiscoveryMode[] = ["saved", "open", "both"];

export const POST = withErrorHandling(
  async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { merchantId } = await requireSessionApi();
    const { id } = await params;

    const body = await parseJsonBody(req);
    const mode = body.mode as DiscoveryMode;
    if (!MODES.includes(mode)) throw new HttpError(400, "mode must be saved | open | both");

    const product = await prisma.product.findUnique({
      where: { id },
      include: { merchant: { select: { storeUrl: true } } },
    });
    if (!product || product.merchantId !== merchantId) throw new HttpError(404, "Not found");

    const provider = getSearchProvider();
    if (provider === null) {
      return NextResponse.json({ reason: "no_provider" }, { status: 503 });
    }

    const savedRows = await prisma.competitorDomain.findMany({
      where: { merchantId },
      select: { domain: true },
    });
    const savedDomains = savedRows.map((r) => r.domain);
    if (mode !== "open" && savedDomains.length === 0) {
      throw new HttpError(400, "No saved competitors — add some in Settings or use web search");
    }

    const tracked = await prisma.competitorPrice.findMany({
      where: { productId: id },
      select: { competitorUrl: true },
    });
    const existingCompetitorDomains = tracked
      .map((t) => (t.competitorUrl ? normalizeDomain(t.competitorUrl) : null))
      .filter((d): d is string => d !== null);

    const out = await discoverCompetitors(
      {
        productTitle: product.title,
        currentPriceCents: product.currentPrice,
        ownDomain: normalizeDomain(product.merchant.storeUrl),
        savedDomains,
        existingCompetitorDomains,
        mode,
      },
      { provider },
    );
    return NextResponse.json(out);
  },
);
