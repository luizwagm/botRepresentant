import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { writeAudit, getIp } from "@/lib/audit";
import { setConversationAi, takeOver } from "@/lib/outreach/engine";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Conversa completa, com o fio das mensagens. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const conv = await prisma.conversation.findUnique({
    where: { id },
    include: {
      lead: true,
      humanOwner: { select: { name: true, email: true } },
      messages: { orderBy: { createdAt: "asc" }, take: 200 },
    },
  });
  if (!conv) return NextResponse.json({ error: "conversa não encontrada" }, { status: 404 });
  return NextResponse.json(conv);
}

type PatchBody = { action?: "assumir" | "ligar_ia" | "desligar_ia" };

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const conv = await prisma.conversation.findUnique({
    where: { id },
    select: { id: true, lead: { select: { name: true } } },
  });
  if (!conv) return NextResponse.json({ error: "conversa não encontrada" }, { status: 404 });

  const body = (await req.json()) as PatchBody;
  let summary: string;

  switch (body.action) {
    case "assumir":
      await takeOver(id, user.id);
      summary = `Assumiu a conversa com "${conv.lead.name}" (IA desligada)`;
      break;
    case "ligar_ia":
      await setConversationAi(id, true);
      summary = `Religou a IA na conversa com "${conv.lead.name}"`;
      break;
    case "desligar_ia":
      await setConversationAi(id, false);
      summary = `Desligou a IA na conversa com "${conv.lead.name}"`;
      break;
    default:
      return NextResponse.json({ error: "ação inválida" }, { status: 400 });
  }

  await writeAudit({
    actorId: user.id,
    actorEmail: user.email,
    action: "ATUALIZAR",
    entityType: "Conversation",
    entityId: id,
    summary,
    ip: getIp(req),
  });

  const updated = await prisma.conversation.findUnique({ where: { id } });
  return NextResponse.json(updated);
}
