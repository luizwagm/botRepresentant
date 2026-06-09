import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { writeAudit, getIp, diffFields } from "@/lib/audit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TRACKED = [
  "name",
  "description",
  "images",
  "videos",
  "sizes",
  "tags",
  "wholesalePriceMin",
  "wholesalePriceMax",
  "retailPrice",
  "active",
  "minOrderQty",
  "readyToShip",
] as const;

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) return NextResponse.json({ error: "produto nao encontrado" }, { status: 404 });
  return NextResponse.json(product);
}

type PatchBody = {
  name?: string;
  description?: string | null;
  images?: string[];
  videos?: string[];
  sizes?: string[];
  wholesalePriceMin?: number | null;
  wholesalePriceMax?: number | null;
  retailPrice?: number | null;
  tags?: string[];
  active?: boolean;
  minOrderQty?: number | null;
  readyToShip?: boolean;
};

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await req.json()) as PatchBody;

  const sessionUser = await getCurrentUser();
  if (!sessionUser) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const before = await prisma.product.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "produto nao encontrado" }, { status: 404 });

  const data: Prisma.ProductUpdateInput = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.description !== undefined) data.description = body.description ?? null;
  if (body.images !== undefined) data.images = { set: body.images };
  if (body.videos !== undefined) data.videos = { set: body.videos };
  if (body.sizes !== undefined) data.sizes = { set: body.sizes };
  if (body.tags !== undefined) data.tags = { set: body.tags };
  if (body.wholesalePriceMin !== undefined) data.wholesalePriceMin = body.wholesalePriceMin;
  if (body.wholesalePriceMax !== undefined) data.wholesalePriceMax = body.wholesalePriceMax;
  if (body.retailPrice !== undefined) data.retailPrice = body.retailPrice;
  if (body.active !== undefined) data.active = body.active;
  if (body.minOrderQty !== undefined) data.minOrderQty = body.minOrderQty ?? 10;
  if (body.readyToShip !== undefined) data.readyToShip = body.readyToShip;

  try {
    const updated = await prisma.product.update({ where: { id }, data });

    const b = before as unknown as Record<string, unknown>;
    const a = updated as unknown as Record<string, unknown>;
    const beforeSubset: Record<string, unknown> = {};
    const afterSubset: Record<string, unknown> = {};
    for (const k of TRACKED) {
      beforeSubset[k] = b[k];
      afterSubset[k] = a[k];
    }
    const changes = diffFields(beforeSubset, afterSubset);
    if (Object.keys(changes).length > 0) {
      const actor = await getCurrentUser();
      await writeAudit({
        actorId: actor?.id ?? null,
        actorEmail: actor?.email ?? null,
        action: "ATUALIZAR",
        entityType: "Product",
        entityId: id,
        summary: `Atualizou produto "${updated.name}"`,
        changes,
        ip: getIp(req),
      });
    }

    return NextResponse.json(updated);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "falha" },
      { status: 400 },
    );
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sessionUser = await getCurrentUser();
  if (!sessionUser) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const before = await prisma.product.findUnique({ where: { id }, select: { id: true, name: true } });
  await prisma.product.delete({ where: { id } });

  const actor = await getCurrentUser();
  await writeAudit({
    actorId: actor?.id ?? null,
    actorEmail: actor?.email ?? null,
    action: "EXCLUIR",
    entityType: "Product",
    entityId: id,
    summary: `Excluiu produto "${before?.name ?? id}"`,
    ip: getIp(req),
  });

  return NextResponse.json({ ok: true });
}
