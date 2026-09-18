// PATCH /api/pedidos/[id] — muda o status de um pedido da loja (painel).
// "Em atendimento" move o lead vinculado para Pedido feito e tira a IA da
// conversa; "Fechado" promove o lead a Cliente.
import { NextRequest, NextResponse } from "next/server";
import type { OrderStatus } from "@prisma/client";
import { getIp, writeAudit } from "@/lib/audit";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const STATUS: OrderStatus[] = ["NOVO", "EM_ATENDIMENTO", "FECHADO", "CANCELADO"];

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const eu = await getCurrentUser();
  if (!eu) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const { id } = await params;
  const corpo = (await req.json().catch(() => ({}))) as { status?: string };
  const status = STATUS.find((s) => s === corpo.status);
  if (!status) return NextResponse.json({ error: "status inválido" }, { status: 400 });

  const antes = await prisma.orderRequest.findUnique({ where: { id }, select: { id: true, code: true, status: true, leadId: true } });
  if (!antes) return NextResponse.json({ error: "pedido não encontrado" }, { status: 404 });
  if (antes.status === status) return NextResponse.json({ ok: true, status });

  await prisma.orderRequest.update({ where: { id }, data: { status } });

  // A equipe confirmou o pedido: AGORA mexe no lead vinculado. (No envio pelo
  // site isso não acontece — o WhatsApp digitado lá não é verificado.)
  if ((status === "EM_ATENDIMENTO" || status === "FECHADO") && antes.leadId) {
    try {
      await prisma.lead.updateMany({
        where:
          status === "FECHADO"
            ? { id: antes.leadId, funnelStage: { not: "CLIENTE" } }
            : { id: antes.leadId, funnelStage: { notIn: ["PEDIDO_FEITO", "CLIENTE"] } },
        data: { funnelStage: status === "FECHADO" ? "CLIENTE" : "PEDIDO_FEITO" },
      });
      // Virou negociação de verdade: a IA sai de cena e os follow-ups param.
      // Se alguém do time já tinha assumido, o status da conversa continua dele.
      await prisma.conversation.updateMany({
        where: { leadId: antes.leadId },
        data: { aiEnabled: false, nextActionAt: null },
      });
      await prisma.conversation.updateMany({
        where: { leadId: antes.leadId, status: { not: "ASSUMIDO_HUMANO" } },
        data: { status: "EM_NEGOCIACAO" },
      });
    } catch (e) {
      console.error("pedido: falha ao atualizar lead/conversa:", e instanceof Error ? e.message : e);
    }
  }

  await writeAudit({
    actorId: eu.id,
    actorEmail: eu.email,
    action: "pedido.status",
    entityType: "OrderRequest",
    entityId: id,
    summary: `Pedido ${antes.code}: ${antes.status} → ${status}`,
    changes: { status: { from: antes.status, to: status } },
    ip: getIp(req),
  });

  return NextResponse.json({ ok: true, status });
}
