import type { Metadata } from "next";

// Fatos da marca ROTA — uma fonte só para loja, painel, SEO e IA vendedora.
//
// Módulo NEUTRO de propósito: sem Prisma e sem `env`. O `env` exige variáveis de
// servidor no import (DATABASE_URL, chaves...) e estouraria dentro de um client
// component. Dados que dependem de ambiente (WhatsApp da loja, domínio) são lidos
// no servidor e passados como prop.

export const SITE = {
  nome: "ROTA Atacado",
  nomeCurto: "ROTA",
  slogan: "Moda que conecta negócios",
  /** Frase de posicionamento — usada em meta description e no rodapé. */
  descricao:
    "As fábricas do Polo de Confecções do Agreste pernambucano, direto para a sua loja. " +
    "Atacado de moda para lojistas de todo o Brasil, com pedido montado online e fechado no WhatsApp.",
  regiao: "Agreste de Pernambuco",
  /** As paradas da rota: as cidades do polo de onde a mercadoria sai. */
  polo: ["Caruaru", "Toritama", "Santa Cruz do Capibaribe", "Riacho das Almas"],
  estado: "PE",
  pais: "BR",
  locale: "pt_BR",
  corTema: "#070707",
} as const;

/** Caminhos das páginas públicas — usados no menu, no rodapé e no sitemap. */
export const ROTAS = {
  inicio: "/",
  loja: "/loja",
  categoria: (slug: string) => `/loja/${slug}`,
  produto: (id: string) => `/produto/${id}`,
  carrinho: "/carrinho",
  sobre: "/sobre",
  privacidade: "/politica-de-privacidade",
  termos: "/termos",
} as const;

/**
 * Open Graph padrão (preview no WhatsApp e redes). O Next NÃO mescla objetos:
 * página que define `openGraph` próprio perde tudo do layout — por isso cada
 * página espalha este padrão e só troca o que é dela (url, título, foto).
 */
export const OG_PADRAO: NonNullable<Metadata["openGraph"]> = {
  type: "website",
  locale: SITE.locale,
  siteName: SITE.nome,
  images: [{ url: "/rota/og.jpg", width: 1200, height: 630, alt: `${SITE.nome} — ${SITE.slogan}` }],
};
