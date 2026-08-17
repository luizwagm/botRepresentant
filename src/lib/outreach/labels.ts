// Rotulos das conversas — duplicados aqui (como em labels.ts) pra nao puxar
// @prisma/client dentro de Client Components.

export const CONVERSATION_STATUSES = [
  "AGENDADO",
  "ENVIADO",
  "RESPONDEU",
  "EM_NEGOCIACAO",
  "ASSUMIDO_HUMANO",
  "SEM_RESPOSTA",
  "ENCERRADO",
  "FALHOU",
] as const;

export type ConversationStatusValue = (typeof CONVERSATION_STATUSES)[number];

export const CONVERSATION_STATUS_LABEL: Record<ConversationStatusValue, string> = {
  AGENDADO: "Agendado",
  ENVIADO: "Enviou mensagem",
  RESPONDEU: "Foi respondido",
  EM_NEGOCIACAO: "Em negociação",
  ASSUMIDO_HUMANO: "Humano assumiu",
  SEM_RESPOSTA: "Sem resposta",
  ENCERRADO: "Encerrado",
  FALHOU: "Falhou",
};

export const CONVERSATION_STATUS_COLOR: Record<ConversationStatusValue, string> = {
  AGENDADO: "bg-zinc-100 text-zinc-700 ring-zinc-200",
  ENVIADO: "bg-blue-50 text-blue-700 ring-blue-200",
  RESPONDEU: "bg-amber-50 text-amber-800 ring-amber-200",
  EM_NEGOCIACAO: "bg-violet-50 text-violet-700 ring-violet-200",
  ASSUMIDO_HUMANO: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  SEM_RESPOSTA: "bg-zinc-50 text-zinc-500 ring-zinc-200",
  ENCERRADO: "bg-rose-50 text-rose-700 ring-rose-200",
  FALHOU: "bg-red-50 text-red-700 ring-red-200",
};
