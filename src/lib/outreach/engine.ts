// ==========================================================================
//  Core da prospecção automatizada.
//
//  Tudo passa por aqui: o que está agendado, o que a IA escreve, o que sai
//  pelo canal, como o status anda e quando o humano assume. O worker só chama
//  tick() num laço; a API do painel chama as funções de gestão.
// ==========================================================================
import type { ConversationStatus, Prisma } from "@prisma/client";
import { prisma } from "../db";
import { normalizeBrazilPhone, isMobileBr } from "../phone";
import type { Channel } from "./channel";
import { getAiSettings, withinSendWindow, type AiSettings } from "./settings";
import { nextSalesMessage, type CatalogItem, type TranscriptTurn } from "./salesman";

/**
 * Cadência de follow-up, em horas depois da última mensagem NOSSA.
 * 4 reenvios: 24h, 48h, 72h e 5 dias. Depois do último, uma janela de graça
 * (GRACE_HOURS) e a conversa vira "Sem resposta".
 */
const FOLLOW_UP_GAPS_HOURS = [24, 48, 72, 120];
const GRACE_HOURS = 48;

const HOUR_MS = 60 * 60 * 1000;

function hoursFromNow(h: number): Date {
  return new Date(Date.now() + h * HOUR_MS);
}

// --------------------------------------------------------------------------
//  Leitura de contexto pra IA
// --------------------------------------------------------------------------

async function loadCatalog(): Promise<CatalogItem[]> {
  const products = await prisma.product.findMany({
    where: { active: true },
    orderBy: { createdAt: "desc" },
    take: 40, // teto: o catálogo inteiro no prompt encareceria cada mensagem
    select: {
      id: true,
      name: true,
      categories: true,
      wholesalePriceMin: true,
      wholesalePriceMax: true,
    },
  });
  return products.map((p) => {
    const min = p.wholesalePriceMin;
    const max = p.wholesalePriceMax;
    let price = "preço sob consulta";
    if (min !== null && max !== null && min !== max) price = `R$ ${min} – R$ ${max}`;
    else if (min !== null || max !== null) price = `R$ ${min ?? max}`;
    return { id: p.id, name: p.name, categories: p.categories, price };
  });
}

async function loadTranscript(conversationId: string): Promise<TranscriptTurn[]> {
  const msgs = await prisma.conversationMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    take: 40,
    select: { direction: true, body: true },
  });
  return msgs.map((m) => ({
    from: m.direction === "ENTRADA" ? ("loja" as const) : ("nos" as const),
    body: m.body,
  }));
}

// --------------------------------------------------------------------------
//  Travas de envio (o canal não-oficial pune volume, horário e ritmo robótico)
// --------------------------------------------------------------------------

async function sentToday(): Promise<number> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return prisma.conversationMessage.count({
    where: { direction: "SAIDA", createdAt: { gte: start } },
  });
}

export type GateReason =
  | "ok"
  | "automacao_desligada"
  | "canal_offline"
  | "fora_da_janela"
  | "teto_diario";

/** Pode disparar agora? Vale pra primeiro contato e follow-up. */
export async function sendGate(settings: AiSettings, channel: Channel): Promise<GateReason> {
  if (!settings.enabled) return "automacao_desligada";
  if (!channel.isReady()) return "canal_offline";
  if (!withinSendWindow(settings, new Date())) return "fora_da_janela";
  if ((await sentToday()) >= settings.dailyCap) return "teto_diario";
  return "ok";
}

// --------------------------------------------------------------------------
//  Envio + registro (um lugar só grava mensagem e move status)
// --------------------------------------------------------------------------

async function recordOutbound(opts: {
  conversationId: string;
  body: string;
  viaAi: boolean;
  externalId: string | null;
}): Promise<void> {
  await prisma.conversationMessage.create({
    data: {
      conversationId: opts.conversationId,
      direction: "SAIDA",
      body: opts.body,
      viaAi: opts.viaAi,
      externalId: opts.externalId,
    },
  });
}

/** Espelha o estado da conversa na etapa do funil do lead. */
const FUNNEL_BY_STATUS: Partial<Record<ConversationStatus, string>> = {
  ENVIADO: "MENSAGEM_ENVIADA",
  RESPONDEU: "RESPONDEU",
  EM_NEGOCIACAO: "EM_NEGOCIACAO",
  ASSUMIDO_HUMANO: "EM_NEGOCIACAO",
  SEM_RESPOSTA: "SEM_RESPOSTA",
  ENCERRADO: "RECUSOU",
};

async function setStatus(
  conversationId: string,
  leadId: string,
  status: ConversationStatus,
  // Unchecked* pra poder setar FK escalar (humanOwnerId) direto.
  extra: Prisma.ConversationUncheckedUpdateInput = {},
): Promise<void> {
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { status, ...extra },
  });
  const stage = FUNNEL_BY_STATUS[status];
  if (stage) {
    await prisma.lead.update({
      where: { id: leadId },
      data: { funnelStage: stage as Prisma.LeadUpdateInput["funnelStage"] },
    });
  }
}

/** Aplica a intenção que a IA devolveu à máquina de estados. */
async function applyIntent(
  conversationId: string,
  leadId: string,
  intent: "continuar" | "passar_humano" | "encerrar",
  fallback: ConversationStatus,
): Promise<void> {
  if (intent === "passar_humano") {
    // Desliga a IA: daqui pra frente quem fala é gente.
    await setStatus(conversationId, leadId, "EM_NEGOCIACAO", {
      aiEnabled: false,
      nextActionAt: null,
    });
    return;
  }
  if (intent === "encerrar") {
    await setStatus(conversationId, leadId, "ENCERRADO", {
      aiEnabled: false,
      nextActionAt: null,
      closedAt: new Date(),
    });
    return;
  }
  await setStatus(conversationId, leadId, fallback);
}

// --------------------------------------------------------------------------
//  1) Primeiro contato (tarefas agendadas)
// --------------------------------------------------------------------------

async function runTask(
  taskId: string,
  settings: AiSettings,
  channel: Channel,
  catalog: CatalogItem[],
): Promise<"enviado" | "falhou" | "pulado"> {
  const task = await prisma.outreachTask.findUnique({
    where: { id: taskId },
    include: { lead: true },
  });
  if (!task || task.status !== "PENDENTE") return "pulado";

  const lead = task.lead;
  const to = normalizeBrazilPhone(lead.whatsapp);

  // Sem celular ou com opt-out não se aborda — nem gasta chamada de IA.
  if (lead.optOut || !isMobileBr(to)) {
    await prisma.outreachTask.update({
      where: { id: task.id },
      data: {
        status: "CANCELADO",
        lastError: lead.optOut ? "lead com opt-out" : "sem WhatsApp válido",
      },
    });
    return "pulado";
  }

  // Uma conversa por lead (a coluna é unique) — reaproveita se já existir.
  const conversation = await prisma.conversation.upsert({
    where: { leadId: lead.id },
    create: { leadId: lead.id, status: "AGENDADO" },
    update: {},
  });

  if (!conversation.aiEnabled || conversation.humanOwnerId) {
    await prisma.outreachTask.update({
      where: { id: task.id },
      data: { status: "CANCELADO", lastError: "conversa assumida por humano" },
    });
    return "pulado";
  }

  try {
    const decision = await nextSalesMessage({
      settings,
      lead: { name: lead.name, city: lead.city, state: lead.state, storeType: lead.storeType },
      catalog,
      turns: [],
      situation: "Primeiro contato: esta loja nunca foi abordada por nós.",
    });

    const sent = await channel.send(to!, decision.message);

    await recordOutbound({
      conversationId: conversation.id,
      body: decision.message,
      viaAi: true,
      externalId: sent.externalId,
    });
    await prisma.outreachTask.update({
      where: { id: task.id },
      data: { status: "ENVIADO", sentAt: new Date(), conversationId: conversation.id },
    });
    await setStatus(conversation.id, lead.id, "ENVIADO", {
      lastOutboundAt: new Date(),
      followUpStage: 0,
      nextActionAt: hoursFromNow(FOLLOW_UP_GAPS_HOURS[0]!),
    });
    return "enviado";
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const attempts = task.attempts + 1;
    await prisma.outreachTask.update({
      where: { id: task.id },
      data: {
        attempts,
        lastError: msg,
        // 3 tentativas e desiste — senão um lead ruim trava a fila pra sempre.
        status: attempts >= 3 ? "FALHOU" : "PENDENTE",
      },
    });
    if (attempts >= 3) {
      await setStatus(conversation.id, lead.id, "FALHOU", { nextActionAt: null });
    }
    return "falhou";
  }
}

// --------------------------------------------------------------------------
//  2) Follow-up (conversa enviada e sem resposta)
// --------------------------------------------------------------------------

async function runFollowUp(
  conversationId: string,
  settings: AiSettings,
  channel: Channel,
  catalog: CatalogItem[],
): Promise<"enviado" | "encerrado" | "pulado"> {
  const conv = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { lead: true },
  });
  if (!conv || !conv.aiEnabled || conv.status !== "ENVIADO") return "pulado";

  // Esgotou a cadência: vira "Sem resposta".
  if (conv.followUpStage >= FOLLOW_UP_GAPS_HOURS.length) {
    await setStatus(conv.id, conv.leadId, "SEM_RESPOSTA", { nextActionAt: null });
    return "encerrado";
  }

  const lead = conv.lead;
  const to = normalizeBrazilPhone(lead.whatsapp);
  if (lead.optOut || !isMobileBr(to)) {
    await setStatus(conv.id, conv.leadId, "ENCERRADO", { nextActionAt: null, closedAt: new Date() });
    return "encerrado";
  }

  const stage = conv.followUpStage; // 0 = 1º follow-up
  const horas = FOLLOW_UP_GAPS_HOURS[stage]!;
  const turns = await loadTranscript(conv.id);

  try {
    const decision = await nextSalesMessage({
      settings,
      lead: { name: lead.name, city: lead.city, state: lead.state, storeType: lead.storeType },
      catalog,
      turns,
      situation:
        `Follow-up ${stage + 1} de ${FOLLOW_UP_GAPS_HOURS.length}: a loja não respondeu há ~${horas}h. ` +
        `Retome com leveza, sem cobrança e sem repetir o que já foi dito. ` +
        (stage >= 2 ? "Este é um dos últimos contatos — seja breve e deixe a porta aberta." : ""),
    });

    const sent = await channel.send(to!, decision.message);
    await recordOutbound({
      conversationId: conv.id,
      body: decision.message,
      viaAi: true,
      externalId: sent.externalId,
    });

    const nextStage = stage + 1;
    const gap =
      nextStage < FOLLOW_UP_GAPS_HOURS.length ? FOLLOW_UP_GAPS_HOURS[nextStage]! : GRACE_HOURS;

    if (decision.intent === "continuar") {
      await setStatus(conv.id, conv.leadId, "ENVIADO", {
        followUpStage: nextStage,
        lastOutboundAt: new Date(),
        nextActionAt: hoursFromNow(gap),
      });
    } else {
      await applyIntent(conv.id, conv.leadId, decision.intent, "ENVIADO");
    }
    return "enviado";
  } catch {
    // Falha de envio não queima a etapa: tenta de novo na próxima janela.
    await prisma.conversation.update({
      where: { id: conv.id },
      data: { nextActionAt: hoursFromNow(2) },
    });
    return "pulado";
  }
}

// --------------------------------------------------------------------------
//  3) Resposta da loja (chamado pelo canal quando chega mensagem)
// --------------------------------------------------------------------------

export async function handleInbound(opts: {
  fromE164: string;
  body: string;
  externalId?: string | null;
  channel: Channel;
}): Promise<void> {
  const phone = normalizeBrazilPhone(opts.fromE164);
  if (!phone) return;

  const lead = await prisma.lead.findFirst({ where: { whatsapp: phone } });
  if (!lead) return; // mensagem de quem não é lead — ignora

  const conv = await prisma.conversation.upsert({
    where: { leadId: lead.id },
    create: { leadId: lead.id, status: "RESPONDEU" },
    update: {},
  });

  // Deduplica: o canal pode reentregar o mesmo evento.
  if (opts.externalId) {
    const dup = await prisma.conversationMessage.findUnique({
      where: { externalId: opts.externalId },
      select: { id: true },
    });
    if (dup) return;
  }

  await prisma.conversationMessage.create({
    data: {
      conversationId: conv.id,
      direction: "ENTRADA",
      body: opts.body,
      externalId: opts.externalId ?? null,
    },
  });
  await prisma.conversation.update({
    where: { id: conv.id },
    data: { lastInboundAt: new Date(), nextActionAt: null },
  });

  // Respondeu: sai da fila de follow-up de qualquer jeito.
  if (conv.status === "AGENDADO" || conv.status === "ENVIADO" || conv.status === "SEM_RESPOSTA") {
    await setStatus(conv.id, lead.id, "RESPONDEU", { followUpStage: 0 });
  }

  // IA desligada nesta conversa (humano assumiu): só registra e para.
  if (!conv.aiEnabled || conv.humanOwnerId) return;

  const settings = await getAiSettings();
  const gate = await sendGate(settings, opts.channel);
  if (gate !== "ok") {
    console.warn(`[outreach] resposta de ${lead.name} não respondida agora: ${gate}`);
    return;
  }

  const catalog = await loadCatalog();
  const turns = await loadTranscript(conv.id);

  try {
    const decision = await nextSalesMessage({
      settings,
      lead: { name: lead.name, city: lead.city, state: lead.state, storeType: lead.storeType },
      catalog,
      turns,
      situation: "A loja acabou de responder. Continue a conversa a partir do que ela disse.",
    });

    const sent = await opts.channel.send(phone, decision.message);
    await recordOutbound({
      conversationId: conv.id,
      body: decision.message,
      viaAi: true,
      externalId: sent.externalId,
    });
    await prisma.conversation.update({
      where: { id: conv.id },
      data: { lastOutboundAt: new Date() },
    });
    await applyIntent(conv.id, lead.id, decision.intent, "RESPONDEU");
    if (decision.intent === "passar_humano") {
      console.warn(`[outreach] ${lead.name}: IA passou pro humano — ${decision.reason}`);
    }
  } catch (e) {
    console.error(`[outreach] falha ao responder ${lead.name}:`, e instanceof Error ? e.message : e);
  }
}

// --------------------------------------------------------------------------
//  4) O tick — o batimento do motor
// --------------------------------------------------------------------------

export type TickResult = {
  gate: GateReason;
  primeiroContato: number;
  followUps: number;
  encerrados: number;
};

/**
 * Uma passada do motor. Faz UM envio por vez de propósito: quem espaça os
 * disparos é o worker (com jitter), pra não sair rajada de mensagem — que é o
 * comportamento que mais queima número.
 */
export async function tick(channel: Channel): Promise<TickResult> {
  const settings = await getAiSettings();
  const result: TickResult = { gate: "ok", primeiroContato: 0, followUps: 0, encerrados: 0 };

  // Conversas que esgotaram a cadência viram "Sem resposta" mesmo com a
  // automação desligada — é só mudança de status, não envia nada.
  const expiradas = await prisma.conversation.findMany({
    where: {
      status: "ENVIADO",
      aiEnabled: true,
      nextActionAt: { lte: new Date() },
      followUpStage: { gte: FOLLOW_UP_GAPS_HOURS.length },
    },
    select: { id: true, leadId: true },
    take: 20,
  });
  for (const c of expiradas) {
    await setStatus(c.id, c.leadId, "SEM_RESPOSTA", { nextActionAt: null });
    result.encerrados++;
  }

  const gate = await sendGate(settings, channel);
  result.gate = gate;
  if (gate !== "ok") return result;

  const catalog = await loadCatalog();

  // Follow-up tem prioridade sobre primeiro contato: conversa começada vale
  // mais que lead novo.
  const dueFollowUp = await prisma.conversation.findFirst({
    where: { status: "ENVIADO", aiEnabled: true, humanOwnerId: null, nextActionAt: { lte: new Date() } },
    orderBy: { nextActionAt: "asc" },
    select: { id: true },
  });
  if (dueFollowUp) {
    const r = await runFollowUp(dueFollowUp.id, settings, channel, catalog);
    if (r === "enviado") result.followUps++;
    if (r === "encerrado") result.encerrados++;
    return result;
  }

  const dueTask = await prisma.outreachTask.findFirst({
    where: { status: "PENDENTE", scheduledFor: { lte: new Date() } },
    orderBy: { scheduledFor: "asc" },
    select: { id: true },
  });
  if (dueTask) {
    const r = await runTask(dueTask.id, settings, channel, catalog);
    if (r === "enviado") result.primeiroContato++;
    return result;
  }

  return result;
}

// --------------------------------------------------------------------------
//  5) Gestão (chamada pelo painel)
// --------------------------------------------------------------------------

/** Agenda N lojas pra um horário. Um lote, uma tarefa por loja. */
export async function scheduleBatch(opts: {
  leadIds: string[];
  scheduledFor: Date;
  note?: string | null;
  createdById?: string | null;
}): Promise<{ batchId: string; created: number; skipped: number }> {
  const leads = await prisma.lead.findMany({
    where: { id: { in: opts.leadIds } },
    select: { id: true, whatsapp: true, optOut: true },
  });

  // Só entra quem dá pra abordar de fato.
  const elegiveis = leads.filter((l) => !l.optOut && isMobileBr(normalizeBrazilPhone(l.whatsapp)));

  // Nem quem já tem tarefa pendente ou conversa em andamento.
  const jaNaFila = await prisma.outreachTask.findMany({
    where: { leadId: { in: elegiveis.map((l) => l.id) }, status: "PENDENTE" },
    select: { leadId: true },
  });
  const bloqueados = new Set(jaNaFila.map((t) => t.leadId));

  const finais = elegiveis.filter((l) => !bloqueados.has(l.id));

  const batch = await prisma.outreachBatch.create({
    data: {
      scheduledFor: opts.scheduledFor,
      note: opts.note?.trim() || null,
      createdById: opts.createdById ?? null,
      tasks: {
        create: finais.map((l) => ({ leadId: l.id, scheduledFor: opts.scheduledFor })),
      },
    },
    select: { id: true },
  });

  return {
    batchId: batch.id,
    created: finais.length,
    skipped: opts.leadIds.length - finais.length,
  };
}

/** Humano assume a conversa (desliga a IA e para os follow-ups). */
export async function takeOver(conversationId: string, userId: string): Promise<void> {
  const conv = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { leadId: true },
  });
  if (!conv) return;
  await setStatus(conversationId, conv.leadId, "ASSUMIDO_HUMANO", {
    aiEnabled: false,
    humanOwnerId: userId,
    nextActionAt: null,
  });
}

/** Liga/desliga a IA numa conversa específica (kill-switch por conversa). */
export async function setConversationAi(conversationId: string, enabled: boolean): Promise<void> {
  const conv = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { id: true, status: true, lastOutboundAt: true },
  });
  if (!conv) return;
  const data: Prisma.ConversationUncheckedUpdateInput = {
    aiEnabled: enabled,
    humanOwnerId: enabled ? null : undefined,
    // Religou numa conversa que estava aguardando resposta: volta pra fila.
    nextActionAt:
      enabled && conv.status === "ENVIADO" ? hoursFromNow(FOLLOW_UP_GAPS_HOURS[0]!) : null,
  };
  await prisma.conversation.update({ where: { id: conversationId }, data });
}

/**
 * Mensagem que SAIU do nosso número mas não foi a IA que mandou — ou seja, o
 * humano respondeu direto pelo WhatsApp do celular. O worker detecta isso e
 * chama aqui: registramos a mensagem e a conversa passa pro humano
 * automaticamente (a IA cala a boca sem ninguém precisar clicar em nada).
 */
export async function handleHumanEcho(opts: {
  toE164: string;
  body: string;
  externalId?: string | null;
}): Promise<void> {
  const phone = normalizeBrazilPhone(opts.toE164);
  if (!phone) return;

  const lead = await prisma.lead.findFirst({ where: { whatsapp: phone } });
  if (!lead) return;

  const conv = await prisma.conversation.findUnique({ where: { leadId: lead.id } });
  if (!conv) return; // não é conversa da automação — ignora

  if (opts.externalId) {
    const dup = await prisma.conversationMessage.findUnique({
      where: { externalId: opts.externalId },
      select: { id: true },
    });
    if (dup) return; // é o eco de uma mensagem que a IA já mandou
  }

  await prisma.conversationMessage.create({
    data: {
      conversationId: conv.id,
      direction: "SAIDA",
      body: opts.body,
      viaAi: false,
      externalId: opts.externalId ?? null,
    },
  });

  // Humano entrou na conversa: desliga a IA e para os follow-ups.
  if (conv.aiEnabled) {
    await setStatus(conv.id, lead.id, "ASSUMIDO_HUMANO", {
      aiEnabled: false,
      nextActionAt: null,
      lastOutboundAt: new Date(),
    });
    console.warn(`[outreach] ${lead.name}: humano respondeu pelo celular — IA desligada.`);
  } else {
    await prisma.conversation.update({
      where: { id: conv.id },
      data: { lastOutboundAt: new Date() },
    });
  }
}
