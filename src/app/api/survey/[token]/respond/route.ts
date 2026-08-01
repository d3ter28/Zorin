import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { HttpError, withErrorHandling } from "@/lib/api/errors";
import { checkWebhookRateLimit } from "@/lib/auth/rateLimit";

function cookieName(surveyId: string): string {
  return `zorin_survey_resp_${surveyId}`;
}

function getCookie(req: Request, name: string): string | null {
  const header = req.headers.get("cookie");
  if (!header) return null;
  const match = header
    .split(";")
    .map((s) => s.trim())
    .find((s) => s.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

function isPositiveInt(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n) && Number.isInteger(n) && n > 0;
}

export const POST = withErrorHandling(
  async (req: Request, { params }: { params: Promise<{ token: string }> }) => {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
      req.headers.get("x-real-ip") ??
      "unknown";
    const { allowed } = await checkWebhookRateLimit(ip);
    if (!allowed) throw new HttpError(429, "Too many submissions — try again shortly");

    const { token } = await params;
    const survey = await prisma.priceSurvey.findUnique({
      where: { token },
      select: { id: true },
    });
    if (!survey) throw new HttpError(404, "Survey not found");

    if (getCookie(req, cookieName(survey.id)) !== null) {
      throw new HttpError(409, "You've already responded to this survey");
    }

    const body = (await req.json()) as {
      tooCheapCents?: unknown;
      goodValueCents?: unknown;
      gettingExpensiveCents?: unknown;
      tooExpensiveCents?: unknown;
    };

    const { tooCheapCents, goodValueCents, gettingExpensiveCents, tooExpensiveCents } = body;
    if (
      !isPositiveInt(tooCheapCents) ||
      !isPositiveInt(goodValueCents) ||
      !isPositiveInt(gettingExpensiveCents) ||
      !isPositiveInt(tooExpensiveCents)
    ) {
      throw new HttpError(400, "All four prices are required and must be positive whole numbers of cents");
    }
    if (tooCheapCents > tooExpensiveCents) {
      throw new HttpError(400, "The 'too cheap' price can't be higher than the 'too expensive' price");
    }

    await prisma.priceSurveyResponse.create({
      data: {
        surveyId: survey.id,
        tooCheapCents,
        goodValueCents,
        gettingExpensiveCents,
        tooExpensiveCents,
      },
    });

    const res = NextResponse.json({ ok: true });
    res.cookies.set(cookieName(survey.id), "1", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      secure: process.env.NODE_ENV === "production",
    });
    return res;
  },
);
