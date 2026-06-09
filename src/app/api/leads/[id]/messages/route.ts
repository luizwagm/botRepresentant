import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { writeAudit, getIp } from "@/lib/audit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type PostBody = {
  channel: string;
  message: string;
  advanceStage?: boolean; // se true, move funnelStage pra MENSAGEM_ENVIADA
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await req.json()) as PostBody;

  if (!body.channel || !body.message) {
    return NextResponse.json({ error: "channel e message sao obrigatorios" }, { status: 400 });
  }

  const sessionUser = await getCurrentUser();
  if (!sessionUser) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const lead = await prisma.lead.findUnique({ where: { id }, select: { id: true, name: true, optOut: true } });
  if (!lead) return NextResponse.json({ error: "lead nao encontrado" }, { status: 404 });
  if (lead.optOut) {
    return NextResponse.json({ error: "lead com opt-out — nao pode receber mensagem" }, { status: 400 });
  }

  const [, updated] = await prisma.$transaction([
    prisma.messageLog.create({
      data: { leadId: id, channel: body.channel, message: body.message },
    }),
    prisma.lead.update({
      where: { id },
      data: body.advanceStage ? { funnelStage: "MENSAGEM_ENVIADA" } : {},
    }),
  ]);

  const actor = await getCurrentUser();
  await writeAudit({
    actorId: actor?.id ?? null,
    actorEmail: actor?.email ?? null,
    action: "MENSAGEM",
    entityType: "Lead",
    entityId: id,
    summary: `Enviou mensagem (${body.channel}) para "${lead.name}"`,
    changes: { channel: body.channel, advanceStage: !!body.advanceStage, message: body.message },
    ip: getIp(req),
  });

  return NextResponse.json({ lead: updated });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const messages = await prisma.messageLog.findMany({
    where: { leadId: id },
    orderBy: { sentAt: "desc" },
  });
  return NextResponse.json({ messages });
}
