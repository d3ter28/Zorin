import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireSessionApi } from "@/lib/auth/requireSessionApi";
import { normalizeDomain } from "@/lib/discovery/domain";

export async function GET(req: NextRequest) {
  const session = await requireSessionApi(req);
  if (session instanceof Response) return session;

  const rows = await prisma.competitorDomain.findMany({
    where: { merchantId: session.merchant.id },
    select: { domain: true },
    orderBy: { domain: "asc" },
  });

  return NextResponse.json({ domains: rows.map((r) => r.domain).sort() });
}

export async function PUT(req: NextRequest) {
  const session = await requireSessionApi(req);
  if (session instanceof Response) return session;

  const body = await req.json();
  if (!Array.isArray(body.domains)) {
    return NextResponse.json({ error: "domains must be an array" }, { status: 400 });
  }

  const saved: string[] = [];
  const rejected: { input: string; reason: string }[] = [];
  const seen = new Set<string>();

  for (const raw of body.domains as unknown[]) {
    const input = typeof raw === "string" ? raw : String(raw);
    const normalized = normalizeDomain(input);
    if (normalized === null) {
      rejected.push({ input, reason: "invalid" });
      continue;
    }
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    saved.push(normalized);
  }

  await prisma.competitorDomain.deleteMany({ where: { merchantId: session.merchant.id } });
  await prisma.competitorDomain.createMany({
    data: saved.map((domain) => ({ merchantId: session.merchant.id, domain })),
  });

  return NextResponse.json({ saved, rejected });
}
