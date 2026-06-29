import { NextResponse } from "next/server";
import { HttpError, withErrorHandling } from "@/lib/api/errors";
import { applyDecision, applyManualPrice } from "@/lib/apply";

/**
 * Read an optional manual price (integer cents) from the request body. Returns
 * null when there is no body or no `price` field, in which case the caller
 * falls back to the algorithm's recommendation. Throws 400 on an invalid value.
 */
async function readOptionalPrice(req: Request): Promise<number | null> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return null; // no/invalid body -> algorithm path
  }
  if (body === null || typeof body !== "object") return null;
  const raw = (body as Record<string, unknown>).price;
  if (raw === undefined) return null;
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) {
    throw new HttpError(400, "price must be a positive integer (cents)");
  }
  return n;
}

export const POST = withErrorHandling(
  async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const price = await readOptionalPrice(req);
    const result =
      price === null ? await applyDecision(id) : await applyManualPrice(id, price);
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
