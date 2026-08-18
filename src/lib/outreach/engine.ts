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

/** Backoff de falha de envio; depois da última, a conversa vai pra FALHOU. */
const FAILURE_BACKOFF_HOURS = [2, 6, 24];

/**
 * Um "claim" mais velho que isso é considerado abandonado e pode ser pego de
 * novo. Sem essa expiração, uma tarefa reclamada por um worker que morreu antes
 * de liberar ficaria PENDENTE e INVISÍVEL pra sempre — nunca dispararia.
 */
const CLAIM_STALE_MS = 10 * 60 * 1000;

function claimAberto() {
  return [
    { claimedAt: null },
    { claimedAt: { lt: new Date(Date.now() - CLAIM_STALE_MS) } },
  ];
}

/** Estados em que o motor ainda tem o que fazer (agenda follow-up). */
const ACTIVE_STATUSES: ConversationStatus[] = ["ENVIADO", "RESPONDEU"];

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
  // Só conta o que a AUTOMAÇÃO mandou: mensagem digitada pelo humano no
  // celular não pode consumir o teto e travar a prospecção.
  return prisma.conversationMessage.count({
    where: { direction: "SAIDA", viaAi: true, createdAt: { gte: start } },
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

/**
 * Espelha o estado da conversa na etapa do funil do lead — mas SÓ por cima de
 * etapas que a própria automação controla. Sem isso, um lead que já é CLIENTE
 * ou fez PEDIDO seria rebaixado pra "Mensagem enviada" pelo motor.
 */
const FUNNEL_BY_STATUS: Partial<Record<ConversationStatus, string>> = {
  ENVIADO: "MENSAGEM_ENVIADA",
  RESPONDEU: "RESPONDEU",
  EM_NEGOCIACAO: "EM_NEGOCIACAO",
  ASSUMIDO_HUMANO: "EM_NEGOCIACAO",
  SEM_RESPOSTA: "SEM_RESPOSTA",
  ENCERRADO: "RECUSOU",
  FALHOU: "SEM_RESPOSTA",
};

/** Etapas que o motor pode sobrescrever. As demais são decisão humana. */
const AUTO_FUNNEL_STAGES = new Set([
  "NOVO_LEAD",
  "MENSAGEM_ENVIADA",
  "RESPONDEU",
  "SEM_RESPOSTA",
  "SEM_WHATSAPP",
]);

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
  if (!stage) return;
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: { funnelStage: true },
  });
  // Nunca rebaixa etapa conquistada por decisão humana (CLIENTE, PEDIDO_FEITO,
  // CATALOGO_ENVIADO, EM_NEGOCIACAO, PAUSADO, RECUSOU).
  if (!lead || !AUTO_FUNNEL_STAGES.has(lead.funnelStage)) return;
  await prisma.lead.update({
    where: { id: leadId },
    data: { funnelStage: stage as Prisma.LeadUpdateInput["funnelStage"] },
  });
}

/** Aplica a intenção que a IA devolveu à máquina de estados. */
async function applyIntent(
  conversationId: string,
  leadId: string,
  intent: "continuar" | "passar_humano" | "encerrar",
  fallback: ConversationStatus,
  fallbackExtra: Prisma.ConversationUncheckedUpdateInput = {},
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
    // A loja pediu pra parar: marca opt-out no lead pra NENHUM outro caminho
    // do sistema (nem uma busca futura, nem outro agendamento) abordar de novo.
    await prisma.lead.update({
      where: { id: leadId },
      data: { optOut: true, optOutAt: new Date() },
    });
    return;
  }
  await setStatus(conversationId, leadId, fallback, fallbackExtra);
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
  // CLAIM ATÔMICO: só um executor leva a tarefa. Sem isto, dois ticks (ou duas
  // instâncias do worker) passariam pelo mesmo `if` e mandariam a mensagem duas
  // vezes pra mesma loja.
  const claim = await prisma.outreachTask.updateMany({
    where: { id: taskId, status: "PENDENTE", OR: claimAberto() },
    data: { claimedAt: new Date(), attempts: { increment: 1 } },
  });
  if (claim.count === 0) return "pulado";

  const task = await prisma.outreachTask.findUnique({
    where: { id: taskId },
    include: { lead: true },
  });
  if (!task) return "pulado";

  const lead = task.lead;
  const to = normalizeBrazilPhone(lead.whatsapp);

  /** Devolve a tarefa pra fila (falha ANTES de qualquer mensagem sair). */
  const soltar = async (erro: string) => {
    const desiste = task.attempts >= 3;
    await prisma.outreachTask.update({
      where: { id: task.id },
      data: {
        lastError: erro,
        status: desiste ? "FALHOU" : "PENDENTE",
        claimedAt: null,
      },
    });
  };

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

  // "Primeiro contato" só roda em conversa virgem: se já saiu mensagem nossa,
  // um segundo agendamento não pode reapresentar a fábrica do zero.
  const jaFalamos = await prisma.conversationMessage.count({
    where: { conversationId: conversation.id, direction: "SAIDA" },
  });
  if (jaFalamos > 0) {
    await prisma.outreachTask.update({
      where: { id: task.id },
      data: { status: "CANCELADO", lastError: "conversa já iniciada" },
    });
    return "pulado";
  }

  let decision;
  try {
    decision = await nextSalesMessage({
      settings,
      lead: { name: lead.name, city: lead.city, state: lead.state, storeType: lead.storeType },
      catalog,
      turns: [],
      situation: "Primeiro contato: esta loja nunca foi abordada por nós.",
    });
  } catch (e) {
    // Falhou ANTES de enviar: nada saiu, pode voltar pra fila.
    await soltar(e instanceof Error ? e.message : String(e));
    return "falhou";
  }

  let externalId: string | null = null;
  try {
    const sent = await channel.send(to!, decision.message);
    externalId = sent.externalId;
  } catch (e) {
    await soltar(e instanceof Error ? e.message : String(e));
    return "falhou";
  }

  // A MENSAGEM JÁ SAIU. Daqui pra frente nada pode devolver a tarefa pra fila —
  // seria reenviar o mesmo primeiro contato pra loja.
  try {
    await recordOutbound({
      conversationId: conversation.id,
      body: decision.message,
      viaAi: true,
      externalId,
    });
    await prisma.outreachTask.update({
      where: { id: task.id },
      data: { status: "ENVIADO", sentAt: new Date(), conversationId: conversation.id },
    });
    await setStatus(conversation.id, lead.id, "ENVIADO", {
      lastOutboundAt: new Date(),
      followUpStage: 0,
      followUpFailures: 0,
      nextActionAt: hoursFromNow(FOLLOW_UP_GAPS_HOURS[0]!),
    });
  } catch (e) {
    console.error(
      `[outreach] mensagem ENVIADA para ${lead.name} mas falhou ao gravar:`,
      e instanceof Error ? e.message : e,
    );
    await prisma.outreachTask
      .update({ where: { id: task.id }, data: { status: "ENVIADO", sentAt: new Date() } })
      .catch(() => {});
  }
  return "enviado";
}

// --------------------------------------------------------------------------
//  2) Follow-up (conversa parada, com ou sem resposta anterior)
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
  if (!conv || !conv.aiEnabled || !ACTIVE_STATUSES.includes(conv.status)) return "pulado";

  // Esgotou a cadência: vira "Sem resposta".
  if (conv.followUpStage >= FOLLOW_UP_GAPS_HOURS.length) {
    await setStatus(conv.id, conv.leadId, "SEM_RESPOSTA", { nextActionAt: null });
    return "encerrado";
  }

  const lead = conv.lead;
  const to = normalizeBrazilPhone(lead.whatsapp);
  if (lead.optOut) {
    await setStatus(conv.id, conv.leadId, "ENCERRADO", { nextActionAt: null, closedAt: new Date() });
    return "encerrado";
  }
  if (!isMobileBr(to)) {
    // Não é recusa — é falta de canal. Não pode virar "RECUSOU" no funil.
    await setStatus(conv.id, conv.leadId, "FALHOU", { nextActionAt: null });
    return "encerrado";
  }

  const stage = conv.followUpStage; // 0 = 1º follow-up
  const horas = FOLLOW_UP_GAPS_HOURS[stage]!;
  const turns = await loadTranscript(conv.id);
  const respondeuAntes = conv.lastInboundAt !== null;

  /** Falha de envio: backoff crescente e, no fim, FALHOU (nada de loop eterno). */
  const falhar = async (erro: string) => {
    const falhas = conv.followUpFailures + 1;
    if (falhas >= FAILURE_BACKOFF_HOURS.length) {
      console.error(`[outreach] ${lead.name}: ${falhas} falhas seguidas — desistindo. ${erro}`);
      await setStatus(conv.id, conv.leadId, "FALHOU", {
        nextActionAt: null,
        followUpFailures: falhas,
      });
      return;
    }
    await prisma.conversation.update({
      where: { id: conv.id },
      data: {
        followUpFailures: falhas,
        nextActionAt: hoursFromNow(FAILURE_BACKOFF_HOURS[falhas - 1]!),
      },
    });
  };

  let decision;
  try {
    decision = await nextSalesMessage({
      settings,
      lead: { name: lead.name, city: lead.city, state: lead.state, storeType: lead.storeType },
      catalog,
      turns,
      situation: respondeuAntes
        ? `A loja chegou a responder antes, mas parou de responder há ~${horas}h. ` +
          `Retome de onde a conversa parou, com leveza e sem cobrar.`
        : `Follow-up ${stage + 1} de ${FOLLOW_UP_GAPS_HOURS.length}: a loja nunca respondeu, ` +
          `última tentativa há ~${horas}h. Retome com leveza, sem cobrança e sem repetir o que já foi dito. ` +
          (stage >= 2 ? "Este é um dos últimos contatos — seja breve e deixe a porta aberta." : ""),
    });
  } catch (e) {
    await falhar(e instanceof Error ? e.message : String(e));
    return "pulado";
  }

  // A IA demora alguns segundos. Se a loja respondeu NESSE meio-tempo, mandar o
  // follow-up agora seria dizer "você não respondeu" logo depois de ela
  // responder. Relê e aborta ANTES de enviar.
  const agora = await prisma.conversation.findUnique({
    where: { id: conv.id },
    select: { status: true, aiEnabled: true, lastInboundAt: true, followUpStage: true },
  });
  if (
    !agora ||
    !agora.aiEnabled ||
    agora.followUpStage !== stage ||
    agora.lastInboundAt?.getTime() !== conv.lastInboundAt?.getTime()
  ) {
    return "pulado"; // outro caminho mexeu na conversa: abandona este follow-up
  }

  let externalId: string | null = null;
  try {
    const sent = await channel.send(to!, decision.message);
    externalId = sent.externalId;
  } catch (e) {
    await falhar(e instanceof Error ? e.message : String(e));
    return "pulado";
  }

  await recordOutbound({
    conversationId: conv.id,
    body: decision.message,
    viaAi: true,
    externalId,
  });

  const nextStage = stage + 1;
  const gap =
    nextStage < FOLLOW_UP_GAPS_HOURS.length ? FOLLOW_UP_GAPS_HOURS[nextStage]! : GRACE_HOURS;

  if (decision.intent === "continuar") {
    // Escrita CONDICIONAL: se a loja respondeu entre o send e agora, não
    // sobrescreve o estado dela.
    const upd = await prisma.conversation.updateMany({
      where: { id: conv.id, followUpStage: stage, status: { in: ACTIVE_STATUSES } },
      data: {
        status: "ENVIADO",
        followUpStage: nextStage,
        followUpFailures: 0,
        lastOutboundAt: new Date(),
        nextActionAt: hoursFromNow(gap),
      },
    });
    if (upd.count === 0) {
      await prisma.conversation.update({
        where: { id: conv.id },
        data: { lastOutboundAt: new Date() },
      });
    }
  } else {
    await applyIntent(conv.id, conv.leadId, decision.intent, "ENVIADO");
  }
  return "enviado";
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
  if (!lead) {
    console.warn(`[outreach] mensagem de ${phone} sem lead correspondente — ignorada.`);
    return;
  }

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

  // Grava o que a loja disse SEMPRE — mesmo com opt-out, o rastro importa.
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

  // Respondeu: sai da fila de follow-up e zera a contagem.
  if (conv.status === "AGENDADO" || conv.status === "ENVIADO" || conv.status === "SEM_RESPOSTA") {
    await setStatus(conv.id, lead.id, "RESPONDEU", { followUpStage: 0, followUpFailures: 0 });
  }

  // Lead pediu pra não ser contatado: registramos e paramos por aqui (LGPD).
  if (lead.optOut) {
    console.warn(`[outreach] ${lead.name} tem opt-out — mensagem registrada, sem resposta da IA.`);
    return;
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

    // Conversa engajada TAMBÉM entra na cadência: sem isto, quem responde e
    // some some do radar pra sempre (nunca vira "Sem resposta").
    await applyIntent(conv.id, lead.id, decision.intent, "RESPONDEU", {
      lastOutboundAt: new Date(),
      followUpStage: 0,
      followUpFailures: 0,
      nextActionAt: hoursFromNow(FOLLOW_UP_GAPS_HOURS[0]!),
    });

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
      status: { in: ACTIVE_STATUSES },
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
    where: {
      status: { in: ACTIVE_STATUSES },
      aiEnabled: true,
      humanOwnerId: null,
      nextActionAt: { lte: new Date() },
    },
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
    where: { status: "PENDENTE", scheduledFor: { lte: new Date() }, OR: claimAberto() },
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
  const ids = elegiveis.map((l) => l.id);

  const bloqueados = new Set<string>();

  // Já tem tarefa esperando na fila.
  const jaNaFila = await prisma.outreachTask.findMany({
    where: { leadId: { in: ids }, status: "PENDENTE" },
    select: { leadId: true },
  });
  for (const t of jaNaFila) bloqueados.add(t.leadId);

  // Já tem conversa em andamento — reagendar mandaria "primeiro contato" pra
  // quem já está conversando com a gente.
  const emConversa = await prisma.conversation.findMany({
    where: {
      leadId: { in: ids },
      status: { in: ["AGENDADO", "ENVIADO", "RESPONDEU", "EM_NEGOCIACAO", "ASSUMIDO_HUMANO"] },
    },
    select: { leadId: true },
  });
  for (const c of emConversa) bloqueados.add(c.leadId);

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
    select: {
      id: true,
      leadId: true,
      status: true,
      followUpStage: true,
      lastInboundAt: true,
      lastOutboundAt: true,
    },
  });
  if (!conv) return;

  if (!enabled) {
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { aiEnabled: false, nextActionAt: null },
    });
    return;
  }

  // Religando: devolve a conversa a um estado que o motor sabe processar —
  // inclusive quando ela estava em ASSUMIDO_HUMANO ou ENCERRADO, de onde antes
  // não havia volta.
  const respondeuPorUltimo =
    conv.lastInboundAt !== null &&
    (conv.lastOutboundAt === null || conv.lastInboundAt > conv.lastOutboundAt);

  const gap = FOLLOW_UP_GAPS_HOURS[Math.min(conv.followUpStage, FOLLOW_UP_GAPS_HOURS.length - 1)]!;
  const base = conv.lastOutboundAt ?? new Date();
  const agendado = respondeuPorUltimo
    ? new Date() // a bola está com a gente: responde já
    : new Date(base.getTime() + gap * HOUR_MS);

  await setStatus(conversationId, conv.leadId, respondeuPorUltimo ? "RESPONDEU" : "ENVIADO", {
    aiEnabled: true,
    humanOwnerId: null,
    followUpFailures: 0,
    nextActionAt: agendado,
  });
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
