import { NextResponse } from "next/server";
import { HttpError, withErrorHandling } from "@/lib/api/errors";
import { applyDecision } from "@/lib/apply";

export const POST = withErrorHandling(
  async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const result = await applyDecision(id);
    if (!result.found) {
      throw new HttpError(404, "Not found");
    }
    return NextResponse.json({
      currentPrice: result.currentPrice,
      action: result.action,
      applied: result.applied,
    });
  },
);
