import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const action = sp.get("action");
  const entityType = sp.get("entity_type");
  const actor = sp.get("actor");
  const q = sp.get("q");
  const page = Math.max(1, parseInt(sp.get("page") ?? "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(sp.get("limit") ?? "50", 10) || 50));
  const skip = (page - 1) * limit;

  const where: Prisma.AuditLogWhereInput = {};
  if (action) where.action = action;
  if (entityType) where.entityType = entityType;
  if (actor) where.actorEmail = { contains: actor, mode: "insensitive" };
  if (q) where.summary = { contains: q, mode: "insensitive" };

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip, take: limit }),
    prisma.auditLog.count({ where }),
  ]);

  return NextResponse.json({
    items,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}
