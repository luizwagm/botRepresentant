// A IA que assume o papel de vendedor: redige o primeiro contato, responde no
// fio da conversa e decide quando passar pro humano.
//
// Duas travas de projeto que importam:
//  1. A IA NUNCA escreve URL. Ela põe o marcador [LINK] no texto e diz, num
//     campo separado, QUAL link quer (vitrine ou um produto). Quem monta a URL
//     de verdade é este módulo — assim não existe link alucinado.
//  2. A saída é estruturada (output_config.format), então intenção e link vêm
//     em campos tipados em vez de serem adivinhados do texto.
import Anthropic from "@anthropic-ai/sdk";
import { env } from "../env";
import type { AiSettings } from "./settings";

const client = new Anthropic({ apiKey: env.anthropicApiKey });

export type SalesLead = {
  name: string;
  city: string;
  state: string;
  storeType: string;
};

export type CatalogItem = {
  id: string;
  name: string;
  categories: string[];
  price: string;
};

export type TranscriptTurn = {
  from: "loja" | "nos";
  body: string;
};

export type SalesDecision = {
  /** Texto pronto pro WhatsApp, com o link já substituído. */
  message: string;
  /** O que a IA quer que aconteça com a conversa depois desta mensagem. */
  intent: "continuar" | "passar_humano" | "encerrar";
  /** Por que ela decidiu assim — vai pro log, ajuda a auditar a automação. */
  reason: string;
  /** Link efetivamente anexado (null = nenhum). */
  linkUsed: string | null;
};

const DECISION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["mensagem", "link", "produtoId", "intencao", "motivo"],
  properties: {
    mensagem: {
      type: "string",
      description:
        "O texto da mensagem de WhatsApp, pronto pra enviar. Use o marcador [LINK] no ponto onde o link deve aparecer (só se link != nenhum). NUNCA escreva uma URL você mesmo.",
    },
    link: {
      type: "string",
      enum: ["nenhum", "vitrine", "produto"],
      description:
        "Que link anexar. 'vitrine' = catálogo inteiro. 'produto' = uma peça específica (preencha produtoId). 'nenhum' = sem link.",
    },
    produtoId: {
      type: "string",
      description:
        "O id EXATO de um produto da lista fornecida, quando link=produto. Caso contrário, string vazia.",
    },
    intencao: {
      type: "string",
      enum: ["continuar", "passar_humano", "encerrar"],
      description:
        "'continuar' = segue a conversa normalmente. 'passar_humano' = a loja falou em fechar pedido/quantidade/frete/pagamento, ou pediu algo que você não pode prometer. 'encerrar' = a loja recusou ou pediu pra não receber mais mensagem.",
    },
    motivo: {
      type: "string",
      description: "Uma frase curta explicando a intenção escolhida.",
    },
  },
} as const;

type RawDecision = {
  mensagem: string;
  link: "nenhum" | "vitrine" | "produto";
  produtoId: string;
  intencao: "continuar" | "passar_humano" | "encerrar";
  motivo: string;
};

function systemPrompt(s: AiSettings, catalog: CatalogItem[]): string {
  const catalogo =
    catalog.length > 0
      ? catalog.map((p) => `- id=${p.id} | ${p.name} | ${p.categories.join(", ") || "sem categoria"} | ${p.price}`).join("\n")
      : "(catálogo vazio no momento — não ofereça produto específico)";

  return `${s.tone}

${s.scriptGuidance}

CATÁLOGO DISPONÍVEL (use o id EXATO ao escolher link=produto; nunca invente id nem produto que não esteja aqui):
${catalogo}

REGRAS DO LINK (obrigatórias):
- Você NUNCA escreve uma URL. Escreva o marcador [LINK] no ponto da mensagem onde o link deve entrar.
- Se quiser mandar o catálogo inteiro: link="vitrine".
- Se a loja demonstrou interesse por um tipo de peça específico: link="produto" e produtoId = o id exato da lista acima.
- Se a mensagem não precisa de link: link="nenhum" e não use o marcador [LINK].

QUANDO PASSAR PRO HUMANO (intencao="passar_humano"):
- A loja falou em fechar pedido, quantidade, grade, prazo, frete, forma de pagamento ou negociação de preço.
- Pediu nota fiscal, contrato, visita ou qualquer compromisso.
- Fez uma reclamação ou pergunta que você não pode responder com honestidade.
Nesses casos escreva uma mensagem curta e cordial dizendo que já vai chamar o responsável — e NÃO negocie nada.

Responda SEMPRE no formato estruturado pedido.`;
}

function transcriptBlock(turns: TranscriptTurn[]): string {
  if (turns.length === 0) return "(ainda não houve nenhuma mensagem — esta é a primeira)";
  return turns
    .map((t) => `${t.from === "loja" ? "LOJA" : "NÓS"}: ${t.body}`)
    .join("\n");
}

function resolveLink(raw: RawDecision, catalog: CatalogItem[]): string | null {
  const base = env.publicBaseUrl.replace(/\/+$/, "");
  if (raw.link === "vitrine") return `${base}/catalogo/publico`;
  if (raw.link === "produto") {
    // Só aceita id que existe de fato — id inventado vira link da vitrine.
    const found = catalog.find((p) => p.id === raw.produtoId.trim());
    if (found) return `${base}/catalogo/publico/${found.id}`;
    return catalog.length > 0 ? `${base}/catalogo/publico` : null;
  }
  return null;
}

function applyLink(message: string, link: string | null): string {
  if (!link) {
    // Sem link: limpa o marcador se a IA tiver colocado por engano.
    return message.replace(/\s*\[LINK\]\s*/g, " ").replace(/\s+/g, " ").trim();
  }
  if (message.includes("[LINK]")) return message.replace(/\[LINK\]/g, link).trim();
  // Quis mandar link mas esqueceu o marcador: anexa no fim.
  return `${message.trim()}\n\n${link}`;
}

/**
 * Pede a próxima mensagem à IA. `turns` é a conversa inteira até agora (vazia
 * no primeiro contato). Devolve o texto pronto e o que fazer em seguida.
 */
export async function nextSalesMessage(opts: {
  settings: AiSettings;
  lead: SalesLead;
  catalog: CatalogItem[];
  turns: TranscriptTurn[];
  /** Contexto extra do motor (ex.: "este é o 2º follow-up, sem resposta há 48h"). */
  situation: string;
}): Promise<SalesDecision> {
  const { settings, lead, catalog, turns, situation } = opts;

  const res = await client.messages.create({
    model: env.claudeModel,
    max_tokens: 4000,
    system: systemPrompt(settings, catalog),
    output_config: {
      effort: "medium",
      format: { type: "json_schema", schema: DECISION_SCHEMA },
    },
    messages: [
      {
        role: "user",
        content: `LOJA-ALVO
- Nome: ${lead.name}
- Cidade: ${lead.city}/${lead.state}
- Tipo: ${lead.storeType}

SITUAÇÃO
${situation}

CONVERSA ATÉ AGORA
${transcriptBlock(turns)}

Escreva a PRÓXIMA mensagem que nós enviaremos.`,
      },
    ],
  });

  const block = res.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") {
    throw new Error("Resposta não-textual do Claude");
  }

  let raw: RawDecision;
  try {
    raw = JSON.parse(block.text) as RawDecision;
  } catch {
    throw new Error("Claude não devolveu JSON válido");
  }
  if (!raw.mensagem?.trim()) throw new Error("Claude devolveu mensagem vazia");

  const linkUsed = resolveLink(raw, catalog);
  return {
    message: applyLink(raw.mensagem, linkUsed),
    intent: raw.intencao,
    reason: raw.motivo ?? "",
    linkUsed,
  };
}
