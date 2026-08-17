// ==========================================================================
//  Worker da prospecção automatizada.
//
//  Roda FORA do Next.js (processo pm2 próprio): mantém a sessão do WhatsApp
//  aberta, entrega ao motor as mensagens que chegam e chama tick() num laço
//  com intervalo aleatório.
//
//  Uso:  npm run outreach:worker
//  Primeira execução pede leitura de QR code; depois a sessão fica salva em
//  OUTREACH_SESSION_DIR (padrão .wa-session/) e reconecta sozinha.
//
//  ⚠️  Canal NÃO-OFICIAL (Baileys). Isso viola os termos do WhatsApp e há risco
//      real de banimento do número — use um número SECUNDÁRIO, nunca a linha
//      principal da fábrica. As travas de ritmo/horário/teto do painel existem
//      pra reduzir (não eliminar) esse risco.
//
//  Estrutura: a CONEXÃO se reconecta sozinha quantas vezes precisar, mas o
//  LAÇO DE ENVIO roda uma vez só. Reconectar não pode multiplicar laços — dois
//  laços concorrentes furariam o intervalo entre mensagens e virariam rajada.
// ==========================================================================
import { existsSync, mkdirSync } from "node:fs";
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  type WAMessage,
} from "@whiskeysockets/baileys";
import qrcode from "qrcode-terminal";
import { prisma } from "../src/lib/db";
import type { Channel } from "../src/lib/outreach/channel";
import { handleHumanEcho, handleInbound, tick } from "../src/lib/outreach/engine";
import { getAiSettings, nextGapMs } from "../src/lib/outreach/settings";

const SESSION_DIR = process.env.OUTREACH_SESSION_DIR ?? ".wa-session";
const IDLE_MS = 60_000; // nada pra fazer: espera 1 min antes de olhar de novo

// O tipo ILogger não é reexportado no index do pacote — declaramos a mesma
// forma aqui (a checagem é estrutural, então serve igual).
type WaLogger = {
  level: string;
  child(obj: Record<string, unknown>): WaLogger;
  trace(obj: unknown, msg?: string): void;
  debug(obj: unknown, msg?: string): void;
  info(obj: unknown, msg?: string): void;
  warn(obj: unknown, msg?: string): void;
  error(obj: unknown, msg?: string): void;
};

// Baileys fala demais no nível debug; só deixamos passar warn/error.
const silentLogger: WaLogger = {
  level: "warn",
  child: () => silentLogger,
  trace: () => {},
  debug: () => {},
  info: () => {},
  warn: (o: unknown, m?: string) => console.warn("[wa]", m ?? o),
  error: (o: unknown, m?: string) => console.error("[wa]", m ?? o),
};

type Sock = ReturnType<typeof makeWASocket>;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Texto de uma mensagem recebida (só nos interessa texto puro). */
function readText(msg: WAMessage): string | null {
  const m = msg.message;
  if (!m) return null;
  return m.conversation ?? m.extendedTextMessage?.text ?? null;
}

/** 5581999998888 -> 5581999998888@s.whatsapp.net */
function toJid(phone: string): string {
  return `${phone}@s.whatsapp.net`;
}

/** 5581999998888@s.whatsapp.net -> 5581999998888 */
function fromJid(jid: string): string {
  return jid.split("@")[0]!.split(":")[0]!;
}

// --------------------------------------------------------------------------
//  Estado do processo (um só, compartilhado entre reconexões)
// --------------------------------------------------------------------------
let sock: Sock | null = null;
let ready = false;
let parando = false;

/**
 * Ids das mensagens que NÓS mandamos. O WhatsApp ecoa toda mensagem enviada de
 * volta como `fromMe`, e o eco pode chegar antes de o motor terminar de gravar
 * o externalId no banco. Sem esta trava, a corrida faria o sistema concluir que
 * "o humano digitou" e desligar a IA logo na 1ª mensagem.
 */
const nossos = new Set<string>();

function lembrarNosso(id: string): void {
  nossos.add(id);
  // Teto simples pra memória não crescer sem fim num processo longo.
  if (nossos.size > 5000) {
    for (const k of nossos) {
      nossos.delete(k);
      if (nossos.size <= 2500) break;
    }
  }
}

/** Canal estável: aponta sempre pro socket atual, mesmo depois de reconectar. */
const channel: Channel = {
  name: "whatsapp",
  isReady: () => ready && sock !== null,
  async send(to, text) {
    if (!sock) throw new Error("WhatsApp desconectado");
    const sent = await sock.sendMessage(toJid(to), { text });
    const id = sent?.key?.id ?? null;
    if (id) lembrarNosso(id);
    return { externalId: id };
  },
};

// --------------------------------------------------------------------------
//  Conexão (se reconecta sozinha; NÃO inicia laço de envio)
// --------------------------------------------------------------------------
async function connect(): Promise<void> {
  if (parando) return;

  if (!existsSync(SESSION_DIR)) mkdirSync(SESSION_DIR, { recursive: true });
  // Não é hook de React — é função do Baileys que por acaso começa com "use".
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);

  const s = makeWASocket({
    auth: state,
    logger: silentLogger,
    browser: ["L. Augusto Atacado", "Chrome", "1.0.0"],
    // Não sincroniza o histórico inteiro do aparelho — só o que chega agora.
    syncFullHistory: false,
  });
  sock = s;

  s.ev.on("creds.update", saveCreds);

  s.ev.on("connection.update", (u) => {
    const { connection, lastDisconnect, qr } = u;

    if (qr) {
      console.log("\n=== Leia este QR code no WhatsApp do número secundário ===");
      console.log("   (WhatsApp > Aparelhos conectados > Conectar aparelho)\n");
      qrcode.generate(qr, { small: true });
    }

    if (connection === "open") {
      ready = true;
      console.log(`✓ WhatsApp conectado como ${s.user?.id ?? "?"}`);
    }

    if (connection === "close") {
      ready = false;
      const status = (lastDisconnect?.error as { output?: { statusCode?: number } })?.output
        ?.statusCode;
      console.warn(`✗ WhatsApp desconectado (status ${status ?? "?"})`);

      if (status === DisconnectReason.loggedOut) {
        console.error(
          `A sessão foi encerrada no aparelho. Apague ${SESSION_DIR} e rode de novo pra ler o QR.`,
        );
        parando = true;
        return;
      }
      if (!parando) {
        console.log("Reconectando em 5s...");
        // Reconecta só a CONEXÃO — o laço de envio segue rodando lá no main().
        setTimeout(() => {
          void connect().catch((e) => console.error("[wa] falha ao reconectar:", e));
        }, 5_000);
      }
    }
  });

  s.ev.on("messages.upsert", (ev) => {
    if (ev.type !== "notify") return;
    for (const msg of ev.messages) {
      const jid = msg.key?.remoteJid;
      // Só conversa 1-a-1: ignora grupo, status e broadcast.
      if (!jid || !jid.endsWith("@s.whatsapp.net")) continue;
      const text = readText(msg);
      if (!text?.trim()) continue;
      const externalId = msg.key?.id ?? null;

      if (msg.key?.fromMe) {
        // Eco de algo que a própria IA mandou: ignora (o Set resolve a corrida;
        // o motor ainda deduplica por externalId como segunda barreira).
        if (externalId && nossos.has(externalId)) continue;
        // Senão, foi o humano digitando no celular — ele assume a conversa.
        void handleHumanEcho({ toE164: fromJid(jid), body: text.trim(), externalId }).catch((e) =>
          console.error("[outreach] erro no eco humano:", e),
        );
        continue;
      }

      void handleInbound({
        fromE164: fromJid(jid),
        body: text.trim(),
        externalId,
        channel,
      }).catch((e) => console.error("[outreach] erro no inbound:", e));
    }
  });
}

// --------------------------------------------------------------------------
//  Laço de envio (roda UMA vez pelo processo inteiro)
// --------------------------------------------------------------------------
async function loop(): Promise<void> {
  while (!parando) {
    try {
      const r = await tick(channel);
      const fez = r.primeiroContato + r.followUps + r.encerrados;
      if (fez > 0) {
        console.log(
          `[tick] contatos=${r.primeiroContato} followups=${r.followUps} encerrados=${r.encerrados}`,
        );
      }
      const settings = await getAiSettings();
      // Enviou algo: espera o intervalo humano. Ocioso: espera 1 min.
      await sleep(r.primeiroContato + r.followUps > 0 ? nextGapMs(settings) : IDLE_MS);
    } catch (e) {
      console.error("[tick] erro:", e instanceof Error ? e.message : e);
      await sleep(30_000);
    }
  }
}

async function shutdown(): Promise<void> {
  parando = true;
  console.log("Encerrando worker...");
  await prisma.$disconnect();
  process.exit(0);
}
process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());

async function main(): Promise<void> {
  console.log("Motor de prospecção iniciando...");
  await connect();
  await loop();
}

main().catch(async (e) => {
  console.error("Falha fatal no worker:", e);
  await prisma.$disconnect();
  process.exit(1);
});
