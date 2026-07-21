// Listas e labels usados em filtros, selects e badges — duplicados aqui pra
// nao puxar @prisma/client em Client Components.

export const STORE_TYPES = [
  "MODA",
  "FEMININA",
  "MASCULINA",
  "JEANS",
  "MULTIMARCA",
  "MISTA",
  "OUTROS",
] as const;

export type StoreTypeValue = (typeof STORE_TYPES)[number];

export const STORE_TYPE_LABEL: Record<StoreTypeValue, string> = {
  MODA: "Moda",
  FEMININA: "Feminina",
  MASCULINA: "Masculina",
  JEANS: "Jeans",
  MULTIMARCA: "Multimarca",
  MISTA: "Mista",
  OUTROS: "Outros",
};

// A ordem aqui manda na ordem das colunas do Kanban e dos selects.
export const FUNNEL_STAGES = [
  "NOVO_LEAD",
  // Logo apos NOVO_LEAD de proposito: e balde de ENTRADA (o hunter joga lead
  // sem zap aqui automaticamente), nao estado terminal — precisa estar visivel
  // sem rolar o Kanban ate o fim.
  "SEM_WHATSAPP",
  "MENSAGEM_ENVIADA",
  "RESPONDEU",
  "EM_NEGOCIACAO",
  "CATALOGO_ENVIADO",
  "PEDIDO_FEITO",
  "CLIENTE",
  "SEM_RESPOSTA",
  "RECUSOU",
  "PAUSADO",
] as const;

export type FunnelStageValue = (typeof FUNNEL_STAGES)[number];

export const FUNNEL_STAGE_LABEL: Record<FunnelStageValue, string> = {
  NOVO_LEAD: "Novo lead",
  MENSAGEM_ENVIADA: "Mensagem enviada",
  RESPONDEU: "Respondeu",
  EM_NEGOCIACAO: "Em negociação",
  CATALOGO_ENVIADO: "Catálogo enviado",
  PEDIDO_FEITO: "Pedido feito",
  CLIENTE: "Cliente",
  SEM_RESPOSTA: "Sem resposta",
  RECUSOU: "Recusou",
  PAUSADO: "Pausado",
  SEM_WHATSAPP: "Não tem Zap",
};

// Cor de badge por etapa (Tailwind classes) — usadas em listagem e Kanban.
export const FUNNEL_STAGE_COLOR: Record<FunnelStageValue, string> = {
  NOVO_LEAD: "bg-zinc-100 text-zinc-700 ring-zinc-200",
  MENSAGEM_ENVIADA: "bg-blue-50 text-blue-700 ring-blue-200",
  RESPONDEU: "bg-amber-50 text-amber-800 ring-amber-200",
  EM_NEGOCIACAO: "bg-violet-50 text-violet-700 ring-violet-200",
  CATALOGO_ENVIADO: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  PEDIDO_FEITO: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  CLIENTE: "bg-emerald-600 text-white ring-emerald-700",
  SEM_RESPOSTA: "bg-zinc-50 text-zinc-500 ring-zinc-200",
  RECUSOU: "bg-rose-50 text-rose-700 ring-rose-200",
  PAUSADO: "bg-yellow-50 text-yellow-800 ring-yellow-200",
  SEM_WHATSAPP: "bg-orange-50 text-orange-700 ring-orange-200",
};

// Fabricante x varejista — separa quem produz a propria mercadoria (menos
// propenso a comprar) de quem so revende (cliente-alvo).
export const BUSINESS_KINDS = ["FABRICANTE", "VAREJISTA", "INDEFINIDO"] as const;

export type BusinessKindValue = (typeof BUSINESS_KINDS)[number];

export const BUSINESS_KIND_LABEL: Record<BusinessKindValue, string> = {
  FABRICANTE: "Fabricante",
  VAREJISTA: "Varejista",
  INDEFINIDO: "Indefinido",
};

export const BUSINESS_KIND_COLOR: Record<BusinessKindValue, string> = {
  FABRICANTE: "bg-purple-50 text-purple-700 ring-purple-200",
  VAREJISTA: "bg-teal-50 text-teal-700 ring-teal-200",
  INDEFINIDO: "bg-zinc-50 text-zinc-500 ring-zinc-200",
};

export const BR_STATES = [
  "AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA",
  "MG", "MS", "MT", "PA", "PB", "PE", "PI", "PR", "RJ", "RN",
  "RO", "RR", "RS", "SC", "SE", "SP", "TO",
] as const;
