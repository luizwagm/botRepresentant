// Constantes da marca sem dependência de banco — podem ser importadas tanto no
// servidor quanto em client components. (src/lib/brand.ts importa o Prisma e
// NÃO pode ser usado no cliente.)
//
// Ativos gerados por `node scripts/gerar-marca.mjs` a partir da arte original.

/** Logo horizontal ROTA — creme + cobre, para fundo escuro (loja e barra do painel). */
export const DEFAULT_LOGO = "/rota/rota-clara.webp";

/** Símbolo: o R com a estrada de cobre. */
export const DEFAULT_MARK = "/rota/rota-clara-simbolo.webp";

/** Versões para fundo CLARO (impressão, prévias sobre branco). */
export const LOGO_TINTA = "/rota/rota-tinta.webp";
export const MARK_TINTA = "/rota/rota-tinta-simbolo.webp";

/** Lockup completo, com a frase "Moda que conecta negócios". */
export const LOGO_COMPLETA = "/rota/rota-clara-completa.webp";

/**
 * Caminhos da marca ANTIGA (L. Augusto). Se o painel tiver salvo um deles como
 * "logo escolhida", ele não é uma personalização de verdade — é o padrão velho.
 * Tratamos como vazio pra marca nova aparecer sem ninguém precisar ir lá.
 */
export const LEGACY_LOGOS = new Set([
  "/logo.jpeg",
  "/logo-horizontal.png",
  "/logo-horizontal.svg",
  "/logo-mark.svg",
]);
