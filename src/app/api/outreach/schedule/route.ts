import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { writeAudit, getIp } from "@/lib/audit";
import { scheduleBatch } from "@/lib/outreach/engine";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Lotes agendados, com o andamento de cada um. */
export async function GET() {
  const batches = await prisma.outreachBatch.findMany({
    orderBy: { scheduledFor: "desc" },
    take: 50,
    include: {
      createdBy: { select: { name: true, email: true } },
      tasks: { select: { status: true } },
    },
  });

  return NextResponse.json({
    items: batches.map((b) => {
      const counts = { PENDENTE: 0, ENVIADO: 0, FALHOU: 0, CANCELADO: 0 };
      for (const t of b.tasks) counts[t.status]++;
      return {
        id: b.id,
        scheduledFor: b.scheduledFor,
        note: b.note,
        createdBy: b.createdBy?.name ?? b.createdBy?.email ?? null,
        total: b.tasks.length,
        counts,
      };
    }),
  });
}

type Body = { leadIds?: string[]; scheduledFor?: string; note?: string | null };

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const body = (await req.json()) as Body;
  if (!Array.isArray(body.leadIds) || body.leadIds.length === 0) {
    return NextResponse.json({ error: "Selecione ao menos uma loja." }, { status: 400 });
  }
  if (body.leadIds.length > 200) {
    return NextResponse.json({ error: "Máximo de 200 lojas por agendamento." }, { status: 400 });
  }

  const when = body.scheduledFor ? new Date(body.scheduledFor) : null;
  if (!when || Number.isNaN(when.getTime())) {
    return NextResponse.json({ error: "Data/hora inválida." }, { status: 400 });
  }

  const result = await scheduleBatch({
    leadIds: body.leadIds,
    scheduledFor: when,
    note: body.note ?? null,
    createdById: user.id,
  });

  await writeAudit({
    actorId: user.id,
    actorEmail: user.email,
    action: "CRIAR",
    entityType: "OutreachBatch",
    entityId: result.batchId,
    summary: `Agendou ${result.created} contato(s) para ${when.toLocaleString("pt-BR")}`,
    ip: getIp(req),
  });

  return NextResponse.json(result, { status: 201 });
}
