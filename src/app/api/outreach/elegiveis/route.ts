import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { BUSINESS_KINDS, FUNNEL_STAGES, STORE_TYPES } from "@/lib/labels";
import { isMobileBr, normalizeBrazilPhone } from "@/lib/phone";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_LIMIT = 300;

/**
 * Lojas JÁ CAPTADAS que podem entrar num agendamento, com a informação que a
 * tela de agendar precisa e a /api/leads não dá: se a loja já tem conversa e se
 * já está numa fila. Sem isso o usuário selecionaria lojas que seriam
 * silenciosamente ignoradas na hora de agendar.
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const state = sp.get("state");
  const city = sp.get("city");
  const storeType = sp.get("store_type");
  const businessKind = sp.get("business_kind");
  const funnelStage = sp.get("funnel_stage");
  const q = sp.get("q");
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(sp.get("limit") ?? "100", 10) || 100));

  const where: Prisma.LeadWhereInput = {
    optOut: false,
    whatsapp: { not: null }, // sem zap não há o que agendar
  };
  if (state) where.state = state.toUpperCase();
  if (city) where.city = { contains: city, mode: "insensitive" };
  if (q) where.name = { contains: q, mode: "insensitive" };

  if (storeType) {
    if (!STORE_TYPES.includes(storeType as (typeof STORE_TYPES)[number])) {
      return NextResponse.json({ error: "store_type invalido" }, { status: 400 });
    }
    where.storeType = storeType as Prisma.LeadWhereInput["storeType"];
  }
  if (businessKind) {
    if (!BUSINESS_KINDS.includes(businessKind as (typeof BUSINESS_KINDS)[number])) {
      return NextResponse.json({ error: "business_kind invalido" }, { status: 400 });
    }
    where.businessKind = businessKind as Prisma.LeadWhereInput["businessKind"];
  }
  if (funnelStage) {
    if (!FUNNEL_STAGES.includes(funnelStage as (typeof FUNNEL_STAGES)[number])) {
      return NextResponse.json({ error: "funnel_stage invalido" }, { status: 400 });
    }
    where.funnelStage = funnelStage as Prisma.LeadWhereInput["funnelStage"];
  }

  const leads = await prisma.lead.findMany({
    where,
    orderBy: [{ reviewCount: { sort: "desc", nulls: "last" } }, { name: "asc" }],
    take: limit,
    select: {
      id: true,
      name: true,
      city: true,
      state: true,
      whatsapp: true,
      storeType: true,
      businessKind: true,
      funnelStage: true,
      rating: true,
      conversation: { select: { status: true } },
    },
  });

  const ids = leads.map((l) => l.id);
  const naFila = await prisma.outreachTask.findMany({
    where: { leadId: { in: ids }, status: "PENDENTE" },
    select: { leadId: true, scheduledFor: true },
  });
  const filaPorLead = new Map(naFila.map((t) => [t.leadId, t.scheduledFor]));

  const items = leads.map((l) => {
    const celular = isMobileBr(normalizeBrazilPhone(l.whatsapp));
    const conversaStatus = l.conversation?.status ?? null;
    const agendadoPara = filaPorLead.get(l.id) ?? null;
    // Mesma regra do motor (scheduleBatch): quem já conversa ou já está na fila
    // não pode receber "primeiro contato" de novo.
    const bloqueio = !celular
      ? "sem celular"
      : agendadoPara
        ? "já agendado"
        : conversaStatus
          ? "já em conversa"
          : null;
    return {
      id: l.id,
      name: l.name,
      city: l.city,
      state: l.state,
      whatsapp: l.whatsapp,
      storeType: l.storeType,
      businessKind: l.businessKind,
      funnelStage: l.funnelStage,
      rating: l.rating,
      conversaStatus,
      agendadoPara,
      bloqueio,
    };
  });

  return NextResponse.json({
    items,
    total: items.length,
    disponiveis: items.filter((i) => !i.bloqueio).length,
  });
}
