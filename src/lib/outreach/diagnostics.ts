// Por que nada está sendo enviado?
//
// O motor tem várias travas (chave geral, canal, horário, teto) e o painel
// ficava mudo quando uma delas segurava a fila — o agendamento simplesmente
// "não acontecia". Este diagnóstico responde a pergunta na tela.
import { prisma } from "../db";
import { getAiSettings, withinSendWindow, BUSINESS_TZ } from "./settings";
import { readChannelStatus } from "./channel-status";

export type Impedimento =
  | "automacao_desligada"
  | "worker_offline"
  | "whatsapp_desconectado"
  | "fora_da_janela"
  | "teto_diario";

export type Diagnostico = {
  /** Vazio = está tudo pronto pra enviar. */
  impedimentos: Impedimento[];
  pronto: boolean;
  automacaoLigada: boolean;
  workerOnline: boolean;
  whatsappConectado: boolean;
  dentroDaJanela: boolean;
  janela: { inicio: number; fim: number; fimDeSemana: boolean; fuso: string };
  enviadosHoje: number;
  tetoDiario: number;
  /** Tarefas esperando na fila. */
  naFila: number;
  /** Tarefas cujo horário já passou e continuam paradas. */
  atrasadas: number;
  proximaTarefa: Date | null;
  /** Follow-ups vencidos esperando. */
  followUpsVencidos: number;
};

export async function diagnosticar(): Promise<Diagnostico> {
  const agora = new Date();
  const settings = await getAiSettings();
  const canal = await readChannelStatus();

  const inicioDoDia = new Date();
  inicioDoDia.setHours(0, 0, 0, 0);

  const [enviadosHoje, naFila, atrasadas, proxima, followUpsVencidos] = await Promise.all([
    prisma.conversationMessage.count({
      where: { direction: "SAIDA", viaAi: true, createdAt: { gte: inicioDoDia } },
    }),
    prisma.outreachTask.count({ where: { status: "PENDENTE" } }),
    prisma.outreachTask.count({
      where: { status: "PENDENTE", scheduledFor: { lte: agora } },
    }),
    prisma.outreachTask.findFirst({
      where: { status: "PENDENTE" },
      orderBy: { scheduledFor: "asc" },
      select: { scheduledFor: true },
    }),
    prisma.conversation.count({
      where: {
        status: { in: ["ENVIADO", "RESPONDEU"] },
        aiEnabled: true,
        humanOwnerId: null,
        nextActionAt: { lte: agora },
      },
    }),
  ]);

  const dentroDaJanela = withinSendWindow(settings, agora);
  const whatsappConectado = canal.state === "CONECTADO";

  const impedimentos: Impedimento[] = [];
  if (!settings.enabled) impedimentos.push("automacao_desligada");
  if (!canal.workerOnline) impedimentos.push("worker_offline");
  else if (!whatsappConectado) impedimentos.push("whatsapp_desconectado");
  if (!dentroDaJanela) impedimentos.push("fora_da_janela");
  if (enviadosHoje >= settings.dailyCap) impedimentos.push("teto_diario");

  return {
    impedimentos,
    pronto: impedimentos.length === 0,
    automacaoLigada: settings.enabled,
    workerOnline: canal.workerOnline,
    whatsappConectado,
    dentroDaJanela,
    janela: {
      inicio: settings.windowStartHour,
      fim: settings.windowEndHour,
      fimDeSemana: settings.sendOnWeekends,
      fuso: BUSINESS_TZ,
    },
    enviadosHoje,
    tetoDiario: settings.dailyCap,
    naFila,
    atrasadas,
    proximaTarefa: proxima?.scheduledFor ?? null,
    followUpsVencidos,
  };
}
