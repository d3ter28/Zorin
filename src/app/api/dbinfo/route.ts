import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withErrorHandling } from "@/lib/api/errors";
import { requireSessionApi } from "@/lib/auth/requireSession";

// TEMPORARY diagnostic route — remove after debugging the survey 500 error.
// Reports which database host the *running app* is actually connected to
// (hostname only, never the password) plus row counts. Authenticated only.
export const GET = withErrorHandling(async () => {
  await requireSessionApi();

  const rawUrl = process.env.DATABASE_URL ?? "";
  let host = "unknown";
  try {
    host = new URL(rawUrl.replace(/^postgres(ql)?:/, "http:")).hostname;
  } catch {
    host = rawUrl ? "unparseable" : "unset";
  }

  const [merchantCount, productCount, surveyCount] = await Promise.all([
    prisma.merchant.count(),
    prisma.product.count(),
    prisma.priceSurvey.count(),
  ]);

  return NextResponse.json({ host, merchantCount, productCount, surveyCount });
});
