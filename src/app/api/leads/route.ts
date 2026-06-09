import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;

  const city = sp.get("city");
  const state = sp.get("state");
  const storeType = sp.get("store_type");
  const funnelStage = sp.get("funnel_stage");
  const hasWhatsapp = sp.get("has_whatsapp") === "1";
  const hasInstagram = sp.get("has_instagram") === "1";
  const q = sp.get("q");
  const optOut = sp.get("opt_out");

  const page = Math.max(1, parseInt(sp.get("page") ?? "1", 10) || 1);
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(sp.get("limit") ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT));
  const skip = (page - 1) * limit;

  const where: Prisma.LeadWhereInput = {};
  if (city) where.city = { contains: city, mode: "insensitive" };
  if (state) where.state = state.toUpperCase();
  if (storeType) where.storeType = storeType as Prisma.LeadWhereInput["storeType"];
  if (funnelStage) where.funnelStage = funnelStage as Prisma.LeadWhereInput["funnelStage"];
  if (hasWhatsapp) where.whatsapp = { not: null };
  if (hasInstagram) where.instagram = { not: null };
  if (optOut === "1") where.optOut = true;
  else if (optOut === "0") where.optOut = false;
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { address: { contains: q, mode: "insensitive" } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      orderBy: [{ reviewCount: { sort: "desc", nulls: "last" } }, { rating: "desc" }, { createdAt: "desc" }],
      skip,
      take: limit,
    }),
    prisma.lead.count({ where }),
  ]);

  return NextResponse.json({
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}
