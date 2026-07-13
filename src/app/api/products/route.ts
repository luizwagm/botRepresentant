import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { writeAudit, getIp } from "@/lib/audit";
import { CATEGORY_SLUGS } from "@/lib/categories";
import { normalizeColors } from "@/lib/product-colors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const activeOnly = sp.get("active") === "1";
  const q = sp.get("q");

  const where: Prisma.ProductWhereInput = {};
  if (activeOnly) where.active = true;
  if (q) where.name = { contains: q, mode: "insensitive" };

  const items = await prisma.product.findMany({
    where,
    orderBy: [{ active: "desc" }, { createdAt: "desc" }],
  });
  return NextResponse.json({ items });
}

type CreateBody = {
  name: string;
  description?: string | null;
  images?: string[];
  videos?: string[];
  sizes?: string[];
  wholesalePriceMin?: number | null;
  wholesalePriceMax?: number | null;
  retailPrice?: number | null;
  tags?: string[];
  categories?: string[];
  colors?: unknown;
  active?: boolean;
  minOrderQty?: number | null;
  readyToShip?: boolean;
};

export async function POST(req: NextRequest) {
  const sessionUser = await getCurrentUser();
  if (!sessionUser) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const body = (await req.json()) as CreateBody;
  if (!body.name?.trim()) {
    return NextResponse.json({ error: "name e obrigatorio" }, { status: 400 });
  }
  const product = await prisma.product.create({
    data: {
      name: body.name.trim(),
      description: body.description ?? null,
      images: body.images ?? [],
      videos: body.videos ?? [],
      sizes: body.sizes ?? [],
      wholesalePriceMin: body.wholesalePriceMin ?? null,
      wholesalePriceMax: body.wholesalePriceMax ?? null,
      retailPrice: body.retailPrice ?? null,
      tags: body.tags ?? [],
      categories: (body.categories ?? []).filter((c) => CATEGORY_SLUGS.includes(c)),
      colors: normalizeColors(body.colors, body.images ?? []) as Prisma.InputJsonValue,
      active: body.active ?? true,
      minOrderQty: body.minOrderQty ?? 10,
      readyToShip: body.readyToShip ?? true,
    },
  });

  const actor = await getCurrentUser();
  await writeAudit({
    actorId: actor?.id ?? null,
    actorEmail: actor?.email ?? null,
    action: "CRIAR",
    entityType: "Product",
    entityId: product.id,
    summary: `Criou produto "${product.name}"`,
    ip: getIp(req),
  });

  return NextResponse.json(product, { status: 201 });
}
