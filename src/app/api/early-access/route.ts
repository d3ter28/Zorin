import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { HttpError, withErrorHandling } from "@/lib/api/errors";

export const POST = withErrorHandling(async (req) => {
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
