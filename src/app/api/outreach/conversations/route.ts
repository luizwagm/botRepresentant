import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { CONVERSATION_STATUSES } from "@/lib/outreach/labels";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const status = sp.get("status");

  const where: Prisma.ConversationWhereInput = {};
  if (status) {
    if (!CONVERSATION_STATUSES.includes(status as (typeof CONVERSATION_STATUSES)[number])) {
      return NextResponse.json({ error: "status invalido" }, { status: 400 });
    }
    where.status = status as Prisma.ConversationWhereInput["status"];
  }

  const items = await prisma.conversation.findMany({
    where,
    orderBy: [{ lastInboundAt: { sort: "desc", nulls: "last" } }, { updatedAt: "desc" }],
    take: 100,
    include: {
      lead: { select: { id: true, name: true, city: true, state: true, whatsapp: true } },
      humanOwner: { select: { name: true, email: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1, select: { body: true, direction: true } },
      _count: { select: { messages: true } },
    },
  });

  return NextResponse.json({
    items: items.map((c) => ({
      id: c.id,
      status: c.status,
      aiEnabled: c.aiEnabled,
      followUpStage: c.followUpStage,
      nextActionAt: c.nextActionAt,
      lastInboundAt: c.lastInboundAt,
      lastOutboundAt: c.lastOutboundAt,
      lead: c.lead,
      owner: c.humanOwner?.name ?? c.humanOwner?.email ?? null,
      messageCount: c._count.messages,
      lastMessage: c.messages[0] ?? null,
    })),
  });
}
