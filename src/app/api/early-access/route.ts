import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { HttpError, withErrorHandling } from "@/lib/api/errors";
import { checkRateLimit } from "@/lib/auth/rateLimit";

export const POST = withErrorHandling(async (req: Request) => {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  const { allowed } = await checkRateLimit(`early-access:${ip}`);
  if (!allowed) throw new HttpError(429, "Too many requests. Please try again later.");

  const body = await req.json();
  const { name, email, storeUrl, message } = body as {
    name?: string;
    email?: string;
    storeUrl?: string;
    message?: string;
  };

  if (!name || name.trim().length === 0) throw new HttpError(400, "Name is required");
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, "Valid email is required");

  await prisma.earlyAccessInterest.create({
    data: {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      storeUrl: storeUrl?.trim() || null,
      message: message?.trim() || null,
    },
  });

  return NextResponse.json({ ok: true }, { status: 201 });
});
