// Configuracao do vendedor de IA e das travas de envio (singleton "ai").
import { prisma } from "../db";

export const AI_SETTINGS_ID = "ai";

/**
 * Tom e roteiro PADRAO — ponto de partida editavel no painel. Nao sao mensagens
 * prontas: descrevem COMO o vendedor fala e o que a conversa precisa cobrir; a
 * IA escreve cada mensagem do zero, olhando o historico.
 */
export const DEFAULT_TONE = `Você é um representante comercial da L. Augusto Atacado — fábrica de jeans em Riacho das Almas, no Agreste pernambucano.

Como você fala:
- Primeira pessoa do plural ("nós", "trabalhamos", "temos"). Você faz parte da fábrica.
- Profissional e caloroso, como gente do Nordeste que trabalha com lojista há anos. Nunca robótico, nunca publicitário.
- Português brasileiro coloquial e correto. Nada de gíria forçada, nada de formalidade de escritório.
- Mensagem de WhatsApp de verdade: curta, parágrafos de 1–2 linhas. Máximo 60 palavras por mensagem.
- No máximo 1 emoji, e só quando cair bem. Frequentemente nenhum.
- Nunca usa "Bom dia/Boa tarde" (a mensagem pode chegar em qualquer horário).`;

export const DEFAULT_SCRIPT = `Ideia de roteiro (NÃO é script fixo — adapte ao que a loja responder):

1. Primeiro contato: chame a loja pelo nome, diga em uma linha que somos fábrica de jeans do Agreste e vendemos direto pro lojista, e faça UMA pergunta leve que abra conversa (se ela trabalha com jeans, se quer ver o catálogo).
2. Se responder com interesse: entenda o que ela vende e o público dela antes de empurrar produto. Mande o catálogo quando fizer sentido.
3. Se perguntar de um tipo de peça específico: mande o link daquele produto, não o catálogo inteiro.
4. Se perguntar preço: dê a faixa do produto e lembre que é preço de fábrica, sem atravessador. Pedido mínimo a partir de 10 peças por modelo.
5. Se pedir para não receber mais mensagem: encerre com educação e agradeça. Não insista.
6. Quando falar em fechar pedido, quantidade, grade, frete ou pagamento: PARE e passe pro humano. Não negocie valor, não prometa prazo, não feche venda.

Nunca invente: frete grátis, exclusividade, prazo de entrega, desconto que não foi informado, ou produto que não está no catálogo.`;

export type AiSettings = {
  enabled: boolean;
  tone: string;
  scriptGuidance: string;
  dailyCap: number;
  minGapSeconds: number;
  maxGapSeconds: number;
  windowStartHour: number;
  windowEndHour: number;
  sendOnWeekends: boolean;
};

export const DEFAULT_SETTINGS: AiSettings = {
  // Desligado por padrao de proposito: ninguem dispara mensagem sem ligar a
  // chave conscientemente.
  enabled: false,
  tone: DEFAULT_TONE,
  scriptGuidance: DEFAULT_SCRIPT,
  dailyCap: 30,
  minGapSeconds: 45,
  maxGapSeconds: 180,
  windowStartHour: 9,
  windowEndHour: 18,
  sendOnWeekends: false,
};

/** Le a configuracao; se ainda nao existe linha, devolve os padroes. */
export async function getAiSettings(): Promise<AiSettings> {
  const row = await prisma.aiSettings.findUnique({ where: { id: AI_SETTINGS_ID } });
  if (!row) return DEFAULT_SETTINGS;
  return {
    enabled: row.enabled,
    tone: row.tone,
    scriptGuidance: row.scriptGuidance,
    dailyCap: row.dailyCap,
    minGapSeconds: row.minGapSeconds,
    maxGapSeconds: row.maxGapSeconds,
    windowStartHour: row.windowStartHour,
    windowEndHour: row.windowEndHour,
    sendOnWeekends: row.sendOnWeekends,
  };
}

/** Teto de tamanho do prompt editável — evita inflar o custo de cada mensagem. */
const MAX_PROMPT_CHARS = 4000;

export async function saveAiSettings(patch: Partial<AiSettings>): Promise<AiSettings> {
  const current = await getAiSettings();
  const next: AiSettings = { ...current, ...patch };
  next.tone = next.tone.slice(0, MAX_PROMPT_CHARS);
  next.scriptGuidance = next.scriptGuidance.slice(0, MAX_PROMPT_CHARS);
  // Sanidade: janela e ritmo invertidos travariam o motor pra sempre.
  next.dailyCap = Math.max(1, Math.min(500, next.dailyCap));
  next.minGapSeconds = Math.max(5, next.minGapSeconds);
  next.maxGapSeconds = Math.max(next.minGapSeconds, next.maxGapSeconds);
  next.windowStartHour = Math.max(0, Math.min(23, next.windowStartHour));
  next.windowEndHour = Math.max(next.windowStartHour + 1, Math.min(24, next.windowEndHour));

  await prisma.aiSettings.upsert({
    where: { id: AI_SETTINGS_ID },
    create: { id: AI_SETTINGS_ID, ...next },
    update: next,
  });
  return next;
}

/** Fuso do negocio — nao do servidor (que costuma rodar em UTC). */
export const BUSINESS_TZ = process.env.OUTREACH_TZ ?? "America/Sao_Paulo";

/** Hora e dia da semana no fuso do negocio, independente do fuso do host. */
function localParts(now: Date): { hour: number; weekday: number } {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: BUSINESS_TZ,
    hour: "2-digit",
    hour12: false,
    weekday: "short",
  });
  const parts = fmt.formatToParts(now);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const wd = parts.find((p) => p.type === "weekday")?.value ?? "Mon";
  const dias = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return { hour, weekday: Math.max(0, dias.indexOf(wd)) };
}

/**
 * Janela de envio: fora do horario comercial (ou no fim de semana, se
 * desligado) nao se dispara nada — disparo de madrugada e o jeito mais rapido
 * de queimar o numero e irritar lojista.
 *
 * Usa o fuso do NEGOCIO: com o servidor em UTC, getHours() daria 21h quando no
 * Brasil sao 18h, e o motor mandaria mensagem fora de hora.
 */
export function withinSendWindow(s: AiSettings, now: Date): boolean {
  const { hour, weekday } = localParts(now);
  if (!s.sendOnWeekends && (weekday === 0 || weekday === 6)) return false;
  return hour >= s.windowStartHour && hour < s.windowEndHour;
}

/** Intervalo aleatorio entre envios (ritmo humano, nao metronomo). */
export function nextGapMs(s: AiSettings): number {
  const min = s.minGapSeconds * 1000;
  const max = s.maxGapSeconds * 1000;
  return min + Math.floor(Math.random() * Math.max(1, max - min));
}
