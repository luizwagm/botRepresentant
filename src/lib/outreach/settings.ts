// Configuracao do vendedor de IA e das travas de envio (singleton "ai").
import { prisma } from "../db";
import { env } from "../env";
// Tom e roteiro padrão moram num módulo neutro (o painel importa no navegador).
import { DEFAULT_SCRIPT, DEFAULT_TONE, ehTextoAntigo } from "./textos-padrao";

export { DEFAULT_SCRIPT, DEFAULT_TONE };

export const AI_SETTINGS_ID = "ai";

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
    // Texto salvo antes do rebrand (qualquer "salvar" antigo gravava o padrão da
    // época): a IA usa o padrão ROTA até alguém revisar e salvar de novo.
    tone: ehTextoAntigo(row.tone) ? DEFAULT_TONE : row.tone,
    scriptGuidance: ehTextoAntigo(row.scriptGuidance) ? DEFAULT_SCRIPT : row.scriptGuidance,
    dailyCap: row.dailyCap,
    minGapSeconds: row.minGapSeconds,
    maxGapSeconds: row.maxGapSeconds,
    windowStartHour: row.windowStartHour,
    windowEndHour: row.windowEndHour,
    sendOnWeekends: row.sendOnWeekends,
  };
}

/**
 * O que está GRAVADO ainda é texto da marca antiga? (getAiSettings já devolve o
 * padrão ROTA no lugar; isto é só pro painel avisar e pedir um "Salvar".)
 */
export async function textosAntigosSalvos(): Promise<{ tom: boolean; roteiro: boolean }> {
  const row = await prisma.aiSettings.findUnique({
    where: { id: AI_SETTINGS_ID },
    select: { tone: true, scriptGuidance: true },
  });
  return { tom: !!row && ehTextoAntigo(row.tone), roteiro: !!row && ehTextoAntigo(row.scriptGuidance) };
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

/**
 * O endereço público está configurado de verdade?
 *
 * Em produção, PUBLIC_BASE_URL não definida cai no padrão localhost — e a IA
 * mandaria "http://localhost:3030/loja" pro lojista, um link que
 * não abre pra ninguém. É melhor NÃO enviar do que enviar link quebrado.
 */
export function publicBaseUrlOk(): boolean {
  // Vale SEMPRE: rodar o worker com `npm run outreach:worker` (sem NODE_ENV)
  // fala com o WhatsApp real, e era justamente aí que a guarda não existia.
  // Pra desenvolvimento consciente, use OUTREACH_ALLOW_LOCAL_LINKS=1.
  if (process.env.OUTREACH_ALLOW_LOCAL_LINKS === "1") return true;
  const u = env.publicBaseUrl ?? "";
  if (!/^https?:\/\//i.test(u)) return false;
  return !/localhost|127\.0\.0\.1|0\.0\.0\.0/i.test(u);
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
