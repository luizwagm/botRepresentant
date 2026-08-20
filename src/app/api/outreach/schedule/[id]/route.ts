import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { writeAudit, getIp } from "@/lib/audit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Cancela um lote agendado.
 *
 * Só mexe no que ainda NÃO saiu: tarefas PENDENTE viram CANCELADO. O que já foi
 * enviado permanece no histórico — não dá pra "descancelar" mensagem entregue, e
 * apagar o registro esconderia conversa real.
 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const batch = await prisma.outreachBatch.findUnique({
    where: { id },
    select: { id: true, note: true, scheduledFor: true },
  });
  if (!batch) return NextResponse.json({ error: "agendamento não encontrado" }, { status: 404 });

  const { count } = await prisma.outreachTask.updateMany({
    where: { batchId: id, status: "PENDENTE" },
    data: { status: "CANCELADO", lastError: "cancelado no painel", claimedAt: null },
  });

  await writeAudit({
    actorId: user.id,
    actorEmail: user.email,
    action: "ATUALIZAR",
    entityType: "OutreachBatch",
    entityId: id,
    summary: `Cancelou ${count} contato(s) pendente(s) do agendamento de ${batch.scheduledFor.toLocaleString("pt-BR")}`,
    ip: getIp(req),
  });

  return NextResponse.json({ ok: true, cancelados: count });
}
