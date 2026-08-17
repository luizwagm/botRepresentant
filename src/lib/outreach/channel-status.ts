// Estado do canal de WhatsApp compartilhado entre o WORKER (que escreve) e o
// PAINEL (que lê). São processos separados — o banco é o único canal entre eles.
import type { ChannelState } from "@prisma/client";
import { prisma } from "../db";

export const CHANNEL_ID = "wa";

/** Sem sinal por mais que isso, consideramos o worker fora do ar. */
export const HEARTBEAT_STALE_MS = 90_000;

export type ChannelSnapshot = {
  state: ChannelState;
  qr: string | null;
  qrUpdatedAt: Date | null;
  connectedPhone: string | null;
  connectedAt: Date | null;
  lastError: string | null;
  heartbeatAt: Date | null;
  /** worker vivo? (heartbeat recente) */
  workerOnline: boolean;
};

const VAZIO: ChannelSnapshot = {
  state: "DESCONECTADO",
  qr: null,
  qrUpdatedAt: null,
  connectedPhone: null,
  connectedAt: null,
  lastError: null,
  heartbeatAt: null,
  workerOnline: false,
};

export async function readChannelStatus(): Promise<ChannelSnapshot> {
  try {
    const row = await prisma.channelStatus.findUnique({ where: { id: CHANNEL_ID } });
    if (!row) return VAZIO;
    return {
      state: row.state,
      qr: row.qr,
      qrUpdatedAt: row.qrUpdatedAt,
      connectedPhone: row.connectedPhone,
      connectedAt: row.connectedAt,
      lastError: row.lastError,
      heartbeatAt: row.heartbeatAt,
      workerOnline:
        row.heartbeatAt !== null && Date.now() - row.heartbeatAt.getTime() < HEARTBEAT_STALE_MS,
    };
  } catch {
    // Migration ainda não aplicada: o painel mostra "desconhecido" em vez de 500.
    return VAZIO;
  }
}

async function write(data: Prisma_ChannelUpdate): Promise<void> {
  try {
    await prisma.channelStatus.upsert({
      where: { id: CHANNEL_ID },
      create: { id: CHANNEL_ID, ...data },
      update: data,
    });
  } catch (e) {
    console.error("[canal] falha ao gravar status:", e instanceof Error ? e.message : e);
  }
}

// Tipo local pra não vazar o Prisma.* nas assinaturas públicas.
type Prisma_ChannelUpdate = {
  state?: ChannelState;
  qr?: string | null;
  qrUpdatedAt?: Date | null;
  connectedPhone?: string | null;
  connectedAt?: Date | null;
  lastError?: string | null;
  heartbeatAt?: Date | null;
  logoutRequested?: boolean;
};

/** Worker: novo QR disponível pra leitura no painel. */
export async function publishQr(qr: string): Promise<void> {
  await write({ state: "AGUARDANDO_QR", qr, qrUpdatedAt: new Date(), lastError: null });
}

/** Worker: conectou. Some com o QR (já não serve pra nada). */
export async function publishConnected(phone: string | null): Promise<void> {
  await write({
    state: "CONECTADO",
    qr: null,
    qrUpdatedAt: null,
    connectedPhone: phone,
    connectedAt: new Date(),
    lastError: null,
    heartbeatAt: new Date(),
  });
}

/** Worker: caiu / deslogou. */
export async function publishDisconnected(erro: string | null): Promise<void> {
  await write({ state: "DESCONECTADO", qr: null, qrUpdatedAt: null, lastError: erro });
}

/** Worker: sinal de vida (chamado a cada volta do laço). */
export async function heartbeat(): Promise<void> {
  await write({ heartbeatAt: new Date() });
}

/** Painel: pede pro worker desconectar e gerar QR novo. */
export async function requestLogout(): Promise<void> {
  await write({ logoutRequested: true });
}

/** Worker: consome o pedido de logout (retorna true uma vez só). */
export async function consumeLogoutRequest(): Promise<boolean> {
  try {
    const row = await prisma.channelStatus.findUnique({
      where: { id: CHANNEL_ID },
      select: { logoutRequested: true },
    });
    if (!row?.logoutRequested) return false;
    await prisma.channelStatus.update({
      where: { id: CHANNEL_ID },
      data: { logoutRequested: false },
    });
    return true;
  } catch {
    return false;
  }
}
