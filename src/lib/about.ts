// Conteudo da pagina "Sobre nos". Tipos + texto-semente + parsers defensivos.
// Sem import de @prisma/client nem "use client" — serve tanto o server component
// publico quanto o editor no painel.

export const ABOUT_ID = "about";

export type AboutHighlight = { title: string; description: string };
export type AboutStat = { value: string; label: string };

export type AboutContent = {
  heroTitle: string;
  heroSubtitle: string;
  storyHtml: string;
  highlights: AboutHighlight[];
  stats: AboutStat[];
  imageUrl: string | null;
};

/**
 * Texto inicial da pagina. Serve de conteudo padrao ate o painel salvar algo —
 * assim /sobre ja nasce preenchida. E o dono deve personalizar: numeros e
 * afirmacoes aqui sao pontos de partida honestos, nao dados verificados.
 */
export const DEFAULT_ABOUT: AboutContent = {
  heroTitle: "Jeans de verdade, direto da fábrica do Agreste",
  heroSubtitle:
    "Fabricamos e vendemos no atacado para lojistas de todo o Brasil — sem atravessador entre a nossa costura e o seu balcão.",
  storyHtml:
    "<p>A <strong>L. Augusto Atacado</strong> nasceu no coração do Agreste Pernambucano, em Riacho das Almas — uma das maiores regiões produtoras de jeans do país. Aqui, costurar faz parte da rotina de gerações, e é essa experiência que a gente coloca em cada peça.</p>" +
    "<p>Somos <strong>fábrica</strong>, não revenda. Cuidamos da produção do início ao fim — da modelagem à lavanderia — e é isso que garante caimento, resistência e um preço que só quem produz consegue oferecer. Quando você compra da gente, compra direto de quem faz.</p>" +
    "<p>Trabalhamos lado a lado com o lojista: ajustamos a grade, tiramos dúvida pelo WhatsApp e enviamos para todo o Brasil, com pronta-entrega no que está no catálogo. Nosso objetivo é simples — que a sua loja venda mais com um jeans que o cliente veste, gosta e volta pra comprar de novo.</p>",
  highlights: [
    {
      title: "Fábrica própria",
      description: "Produção verticalizada no Agreste/PE — da modelagem à lavanderia, tudo sob o nosso controle.",
    },
    {
      title: "Preço de fábrica",
      description: "Sem atravessador no caminho: você compra direto de quem costura.",
    },
    {
      title: "Pronta-entrega",
      description: "O que está no catálogo sai rápido, com envio para todo o Brasil.",
    },
    {
      title: "Atendimento direto",
      description: "Fale com a gente pelo WhatsApp e ajuste a grade do jeito da sua loja.",
    },
  ],
  stats: [
    { value: "Agreste/PE", label: "Fabricado no maior polo de jeans do Nordeste" },
    { value: "Atacado", label: "Preço direto de fábrica para lojistas" },
    { value: "Brasil", label: "Enviamos para todas as regiões" },
  ],
  imageUrl: null,
};

function asString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

/** Le a lista de destaques de um Json arbitrario, descartando entradas invalidas. */
export function readHighlights(value: unknown): AboutHighlight[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((h) => {
      const o = (h ?? {}) as Record<string, unknown>;
      return { title: asString(o.title).trim(), description: asString(o.description).trim() };
    })
    .filter((h) => h.title || h.description);
}

/** Le a barra de stats de um Json arbitrario, descartando entradas invalidas. */
export function readStats(value: unknown): AboutStat[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((s) => {
      const o = (s ?? {}) as Record<string, unknown>;
      return { value: asString(o.value).trim(), label: asString(o.label).trim() };
    })
    .filter((s) => s.value || s.label);
}

/** HTML -> texto puro, pra meta description / OpenGraph. */
export function plainText(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}
