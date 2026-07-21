import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { BUSINESS_KINDS, FUNNEL_STAGES, STORE_TYPES } from "@/lib/labels";
import { getCurrentUser } from "@/lib/auth";
import { writeAudit, getIp, diffFields } from "@/lib/audit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type PatchBody = {
  responsibleName?: string | null;
  foundedAt?: string | null; // ISO date string ou YYYY
  notes?: string | null;
  funnelStage?: string;
  storeType?: string;
  businessKind?: string;
  optOut?: boolean;
  instagram?: string | null;
  whatsapp?: string | null;
};

const TRACKED = [
  "responsibleName",
  "notes",
  "foundedAt",
  "instagram",
  "whatsapp",
  "funnelStage",
  "storeType",
  "businessKind",
  "optOut",
] as const;

function parseDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  if (/^\d{4}$/.test(s)) return new Date(`${s}-01-01T00:00:00Z`);
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lead = await prisma.lead.findUnique({
    where: { id },
    include: { messages: { orderBy: { sentAt: "desc" } } },
  });
  if (!lead) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(lead);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await req.json()) as PatchBody;

  const sessionUser = await getCurrentUser();
  if (!sessionUser) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const before = await prisma.lead.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "lead não encontrado" }, { status: 404 });

  const data: Prisma.LeadUpdateInput = {};
  if (body.responsibleName !== undefined) data.responsibleName = body.responsibleName || null;
  if (body.notes !== undefined) data.notes = body.notes || null;
  if (body.foundedAt !== undefined) data.foundedAt = parseDate(body.foundedAt);
  if (body.instagram !== undefined) data.instagram = body.instagram || null;
  if (body.whatsapp !== undefined) data.whatsapp = body.whatsapp || null;
  if (body.funnelStage !== undefined) {
    if (!FUNNEL_STAGES.includes(body.funnelStage as (typeof FUNNEL_STAGES)[number])) {
      return NextResponse.json({ error: "funnelStage invalido" }, { status: 400 });
    }
    data.funnelStage = body.funnelStage as Prisma.LeadUpdateInput["funnelStage"];
  }
  if (body.storeType !== undefined) {
    if (!STORE_TYPES.includes(body.storeType as (typeof STORE_TYPES)[number])) {
      return NextResponse.json({ error: "storeType invalido" }, { status: 400 });
    }
    data.storeType = body.storeType as Prisma.LeadUpdateInput["storeType"];
  }
  if (body.businessKind !== undefined) {
    if (!BUSINESS_KINDS.includes(body.businessKind as (typeof BUSINESS_KINDS)[number])) {
      return NextResponse.json({ error: "businessKind invalido" }, { status: 400 });
    }
    data.businessKind = body.businessKind as Prisma.LeadUpdateInput["businessKind"];
  }
  if (body.optOut !== undefined) {
    data.optOut = body.optOut;
    data.optOutAt = body.optOut ? new Date() : null;
  }

  // Espelha no painel a regra do intake: se o lead estava em "Não tem Zap"
  // justamente por nao ter zap e o usuario acabou de preencher um, ele volta
  // pra fila de abordagem. So quando o usuario nao escolheu etapa
  // explicitamente — o modal reenvia a etapa atual junto com o resto do form.
  if (
    before.funnelStage === "SEM_WHATSAPP" &&
    !before.whatsapp &&
    body.whatsapp &&
    (body.funnelStage === undefined || body.funnelStage === before.funnelStage)
  ) {
    data.funnelStage = "NOVO_LEAD";
  }

  try {
    const updated = await prisma.lead.update({ where: { id }, data });

    // Auditoria — diff campo a campo
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
      const onlyFunnel = Object.keys(changes).length === 1 && "funnelStage" in changes;
      const summary = onlyFunnel
        ? `Moveu "${updated.name}" no funil: ${changes.funnelStage!.from} → ${changes.funnelStage!.to}`
        : `Atualizou lead "${updated.name}"`;
      await writeAudit({
        actorId: actor?.id ?? null,
        actorEmail: actor?.email ?? null,
        action: onlyFunnel ? "FUNIL" : "ATUALIZAR",
        entityType: "Lead",
        entityId: id,
        summary,
        changes,
        ip: getIp(req),
      });
    }

    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "update falhou" },
      { status: 400 },
    );
  }
}
