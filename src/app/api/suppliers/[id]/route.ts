import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { writeAudit, getIp, diffFields } from "@/lib/audit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TRACKED = [
  "name",
  "contactName",
  "phone",
  "whatsapp",
  "email",
  "city",
  "state",
  "productLine",
  "notes",
  "active",
] as const;

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supplier = await prisma.supplier.findUnique({
    where: { id },
    include: { products: { select: { id: true, name: true, active: true }, orderBy: { name: "asc" } } },
  });
  if (!supplier) return NextResponse.json({ error: "fornecedor não encontrado" }, { status: 404 });
  return NextResponse.json(supplier);
}

type PatchBody = {
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

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sessionUser = await getCurrentUser();
  if (!sessionUser) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const before = await prisma.supplier.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "fornecedor não encontrado" }, { status: 404 });

  const body = (await req.json()) as PatchBody;
  const data: Prisma.SupplierUpdateInput = {};
  if (body.name !== undefined) {
    if (!body.name.trim()) return NextResponse.json({ error: "Nome é obrigatório." }, { status: 400 });
    data.name = body.name.trim();
  }
  if (body.contactName !== undefined) data.contactName = clean(body.contactName);
  if (body.phone !== undefined) data.phone = clean(body.phone);
  if (body.whatsapp !== undefined) data.whatsapp = clean(body.whatsapp);
  if (body.email !== undefined) data.email = clean(body.email);
  if (body.city !== undefined) data.city = clean(body.city);
  if (body.state !== undefined) data.state = clean(body.state)?.toUpperCase().slice(0, 2) ?? null;
  if (body.productLine !== undefined) data.productLine = clean(body.productLine);
  if (body.notes !== undefined) data.notes = clean(body.notes);
  if (body.active !== undefined) data.active = body.active;

  const updated = await prisma.supplier.update({ where: { id }, data });

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
    await writeAudit({
      actorId: sessionUser.id,
      actorEmail: sessionUser.email,
      action: "ATUALIZAR",
      entityType: "Supplier",
      entityId: id,
      summary: `Atualizou fornecedor "${updated.name}"`,
      changes,
      ip: getIp(req),
    });
  }

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sessionUser = await getCurrentUser();
  if (!sessionUser) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const before = await prisma.supplier.findUnique({ where: { id }, select: { id: true, name: true } });
  if (!before) return NextResponse.json({ error: "fornecedor não encontrado" }, { status: 404 });

  // onDelete: SetNull no schema — os produtos ficam sem fornecedor, nao sao apagados.
  await prisma.supplier.delete({ where: { id } });

  await writeAudit({
    actorId: sessionUser.id,
    actorEmail: sessionUser.email,
    action: "EXCLUIR",
    entityType: "Supplier",
    entityId: id,
    summary: `Excluiu fornecedor "${before.name}"`,
    ip: getIp(req),
  });

  return NextResponse.json({ ok: true });
}
