import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { writeAudit, getIp } from "@/lib/audit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const q = sp.get("q");
  const activeOnly = sp.get("active") === "1";

  const where: Prisma.SupplierWhereInput = {};
  if (activeOnly) where.active = true;
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { productLine: { contains: q, mode: "insensitive" } },
      { city: { contains: q, mode: "insensitive" } },
    ];
  }

  const items = await prisma.supplier.findMany({
    where,
    orderBy: [{ active: "desc" }, { name: "asc" }],
    include: { _count: { select: { products: true } } },
  });
  return NextResponse.json({ items });
}

type CreateBody = {
  name?: string;
  contactName?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  city?: string | null;
  state?: string | null;
  productLine?: string | null;
  notes?: string | null;
  active?: boolean;
};

function clean(v: string | null | undefined): string | null {
  const t = (v ?? "").trim();
  return t || null;
}

export async function POST(req: NextRequest) {
  const sessionUser = await getCurrentUser();
  if (!sessionUser) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const body = (await req.json()) as CreateBody;
  if (!body.name?.trim()) {
    return NextResponse.json({ error: "Nome é obrigatório." }, { status: 400 });
  }

  const supplier = await prisma.supplier.create({
    data: {
      name: body.name.trim(),
      contactName: clean(body.contactName),
      phone: clean(body.phone),
      whatsapp: clean(body.whatsapp),
      email: clean(body.email),
      city: clean(body.city),
      state: clean(body.state)?.toUpperCase().slice(0, 2) ?? null,
      productLine: clean(body.productLine),
      notes: clean(body.notes),
      active: body.active ?? true,
    },
  });

  await writeAudit({
    actorId: sessionUser.id,
    actorEmail: sessionUser.email,
    action: "CRIAR",
    entityType: "Supplier",
    entityId: supplier.id,
    summary: `Criou fornecedor "${supplier.name}"`,
    ip: getIp(req),
  });

  return NextResponse.json(supplier, { status: 201 });
}
