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
import { existsSync, mkdirSync, rmSync } from "node:fs";
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  type WAMessage,
} from "@whiskeysockets/baileys";
import qrcode from "qrcode-terminal";
import { prisma } from "../src/lib/db";
import type { Channel } from "../src/lib/outreach/channel";
import { handleHumanEcho, handleInbound, tick } from "../src/lib/outreach/engine";
import {
  consumeLogoutRequest,
  heartbeat,
  publishConnected,
  publishDisconnected,
  publishQr,
} from "../src/lib/outreach/channel-status";
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
      console.log("   (WhatsApp > Aparelhos conectados > Conectar aparelho)");
      console.log("   Ou leia pelo painel, em Prospecção > Conexão.\n");
      qrcode.generate(qr, { small: true });
      // Publica pro painel: é assim que o QR aparece na tela sem precisar de
      // acesso ao terminal do servidor.
      void publishQr(qr);
    }

    if (connection === "open") {
      ready = true;
      const eu = s.user?.id ?? null;
      console.log(`✓ WhatsApp conectado como ${eu ?? "?"}`);
      // "5581...:12@s.whatsapp.net" -> "5581..."
      void publishConnected(eu ? (eu.split(/[:@]/)[0] ?? null) : null);
    }

    if (connection === "close") {
      ready = false;
      const status = (lastDisconnect?.error as { output?: { statusCode?: number } })?.output
        ?.statusCode;
      console.warn(`✗ WhatsApp desconectado (status ${status ?? "?"})`);
      void publishDisconnected(`desconectado (status ${status ?? "?"})`);

      if (status === DisconnectReason.loggedOut) {
        console.error(
          `Sessão encerrada. Apagando ${SESSION_DIR} — ao reiniciar, um QR novo é gerado.`,
        );
        // Limpa a sessão morta: sem isso o worker reiniciaria em laço tentando
        // usar credenciais inválidas e nunca mostraria QR novo.
        try {
          rmSync(SESSION_DIR, { recursive: true, force: true });
        } catch {
          /* segue mesmo assim */
        }
        parando = true;
        void publishDisconnected("sessão encerrada no aparelho — leia o QR de novo").finally(() => {
          void prisma.$disconnect().finally(() => process.exit(1));
        });
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
    // "notify" = chegou agora; "append" = backlog entregue na reconexão. Sem
    // aceitar 'append', toda resposta que chegasse com o worker fora do ar
    // seria descartada em silêncio. A deduplicação (Set + UNIQUE no banco)
    // cobre a reentrega.
    if (ev.type !== "notify" && ev.type !== "append") return;

    for (const msg of ev.messages) {
      const jid = msg.key?.remoteJid;
      if (!jid) continue;

      // Só conversa 1-a-1. Grupo/status/broadcast ficam de fora — mas com log,
      // pra perda deixar de ser invisível.
      const ehPessoa = jid.endsWith("@s.whatsapp.net") || jid.endsWith("@lid");
      if (!ehPessoa) continue;

      // Endereçamento LID não carrega o telefone; o número real vem no
      // remoteJidAlt. Sem ele não dá pra achar o lead.
      const jidTelefone = jid.endsWith("@lid") ? (msg.key?.remoteJidAlt ?? null) : jid;
      if (!jidTelefone) {
        console.warn(`[wa] mensagem em LID sem número (${jid}) — descartada.`);
        continue;
      }

      const text = readText(msg);
      if (!text?.trim()) continue;
      const externalId = msg.key?.id ?? null;

      if (msg.key?.fromMe) {
        // Eco de algo que a própria IA mandou: ignora (o Set resolve a corrida;
        // o motor ainda deduplica por externalId como segunda barreira).
        if (externalId && nossos.has(externalId)) continue;
        // Senão, foi o humano digitando no celular — ele assume a conversa.
        enfileirar(() =>
          handleHumanEcho({ toE164: fromJid(jidTelefone), body: text.trim(), externalId }),
        );
        continue;
      }

      bufferizarEntrada(jidTelefone, text.trim(), externalId);
    }
  });
}

// --------------------------------------------------------------------------
//  Fila de processamento
//
//  Duas garantias que faltavam e faziam a IA responder em rajada:
//   1. DEBOUNCE por contato — lojista manda "oi", "trabalha com jeans?",
//      "qual o mínimo?" em 3 mensagens picadas. Sem juntar, saíam 3 respostas
//      simultâneas, cada uma lendo o histórico antes de a irmã gravar.
//   2. FILA única — nada é processado em paralelo, então dois envios nunca
//      saem no mesmo segundo e o teto diário não é furado por leitura suja.
// --------------------------------------------------------------------------
const DEBOUNCE_MS = 6_000;

type Buffer = { textos: string[]; externalId: string | null; timer: NodeJS.Timeout };
const buffers = new Map<string, Buffer>();

let cadeia: Promise<unknown> = Promise.resolve();

function enfileirar(tarefa: () => Promise<void>): void {
  cadeia = cadeia
    .then(tarefa)
    .catch((e) => console.error("[outreach] erro na fila:", e instanceof Error ? e.message : e));
}

function bufferizarEntrada(jid: string, texto: string, externalId: string | null): void {
  const atual = buffers.get(jid);
  if (atual) {
    clearTimeout(atual.timer);
    atual.textos.push(texto);
    atual.timer = setTimeout(() => despachar(jid), DEBOUNCE_MS);
    return;
  }
  buffers.set(jid, {
    textos: [texto],
    externalId, // o id da 1ª mensagem serve de chave de deduplicação
    timer: setTimeout(() => despachar(jid), DEBOUNCE_MS),
  });
}

function despachar(jid: string): void {
  const buf = buffers.get(jid);
  if (!buf) return;
  buffers.delete(jid);
  enfileirar(() =>
    handleInbound({
      fromE164: fromJid(jid),
      body: buf.textos.join("\n"),
      externalId: buf.externalId,
      channel,
    }),
  );
}

// --------------------------------------------------------------------------
//  Laço de envio (roda UMA vez pelo processo inteiro)
// --------------------------------------------------------------------------
async function loop(): Promise<void> {
  while (!parando) {
    try {
      // Sinal de vida pro painel: sem isto, "conectado" poderia ser o estado
      // congelado de um processo que já morreu.
      await heartbeat();

      // O painel pediu pra desconectar (trocar de número): desloga, apaga a
      // sessão e reconecta — o QR novo aparece na tela.
      if (await consumeLogoutRequest()) {
        console.log("[canal] desconexão pedida pelo painel.");
        ready = false;
        try {
          await sock?.logout();
        } catch {
          /* já pode estar fora */
        }
        try {
          rmSync(SESSION_DIR, { recursive: true, force: true });
        } catch {
          /* segue */
        }
        sock = null;
        await publishDisconnected("desconectado pelo painel — leia o QR pra reconectar");
        void connect().catch((e) => console.error("[wa] falha ao reconectar:", e));
        await sleep(5_000);
        continue;
      }

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

let lacoAtivo: Promise<void> | null = null;

/** Encerra drenando o que está em andamento — não corta mensagem no meio. */
async function shutdown(): Promise<void> {
  if (parando) return;
  parando = true;
  console.log("Encerrando worker (aguardando envio em andamento)...");
  const limite = new Promise<void>((r) => setTimeout(r, 15_000));
  await Promise.race([Promise.allSettled([lacoAtivo, cadeia]).then(() => undefined), limite]);
  try {
    await sock?.end(undefined);
  } catch {
    /* já caiu */
  }
  await prisma.$disconnect();
  process.exit(0);
}
process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());

async function main(): Promise<void> {
  console.log("Motor de prospecção iniciando...");
  await connect();
  lacoAtivo = loop();
  await lacoAtivo;
}

main().catch(async (e) => {
  console.error("Falha fatal no worker:", e);
  await prisma.$disconnect();
  process.exit(1);
});
