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
  heroTitle: "A rota entre as fábricas do Agreste e a sua loja",
  heroSubtitle:
    "A ROTA reúne peças das fábricas do Polo de Confecções de Pernambuco numa vitrine só — pra você montar o pedido com a grade da sua loja e fechar no WhatsApp.",
  storyHtml:
    "<p>O <strong>Polo de Confecções do Agreste</strong> — Toritama, Santa Cruz do Capibaribe, Caruaru e cidades vizinhas como Riacho das Almas — é um dos maiores produtores de moda do país. Só que comprar aqui de longe sempre deu trabalho: muita fábrica, muito contato, pouca informação organizada.</p>" +
    "<p>A <strong>ROTA Atacado</strong> nasceu pra encurtar esse caminho. A gente seleciona peças das fábricas da região, organiza tudo numa vitrine com preço de atacado, cores, tamanhos e pedido mínimo, e atende você do primeiro contato até a mercadoria sair.</p>" +
    "<p>Você compra de várias fábricas e fala com uma equipe só. Monta a grade do jeito da sua loja, envia o pedido pelo WhatsApp e combina frete e pagamento com quem conhece a peça. <strong>Moda que conecta negócios</strong> — é isso que a gente faz.</p>",
  highlights: [
    {
      title: "Direto do polo",
      description: "Peças das fábricas do Agreste pernambucano, sem intermediário entre a produção e a sua loja.",
    },
    {
      title: "Várias fábricas, um atendimento",
      description: "Jeans, moda feminina, masculina e infantil num pedido só, com uma equipe acompanhando tudo.",
    },
    {
      title: "A grade é sua",
      description: "Você escolhe tamanho por tamanho e cor por cor, respeitando só o mínimo de cada modelo.",
    },
    {
      title: "Conversa de verdade",
      description: "Disponibilidade, frete e pagamento combinados no WhatsApp, com quem conhece a peça.",
    },
  ],
  stats: [
    { value: "Agreste/PE", label: "Peças do maior polo de confecções do Nordeste" },
    { value: "Atacado", label: "Preço de atacado para lojistas e revendedores" },
    { value: "Brasil", label: "Atendimento a lojas de todas as regiões" },
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
