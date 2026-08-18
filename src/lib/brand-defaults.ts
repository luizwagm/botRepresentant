// Constantes da marca sem dependência de banco — podem ser importadas tanto no
// servidor quanto em client components. (src/lib/brand.ts importa o Prisma e
// NÃO pode ser usado no cliente.)

/**
 * Logo principal: lockup HORIZONTAL (monograma + nome + "ATACADO"), montado a
 * partir da arte oficial. É o formato que cabe num cabeçalho — a arte quadrada
 * original ficava pequena demais pra se ler.
 */
export const DEFAULT_LOGO = "/logo-horizontal.png";

/** Símbolo quadrado (ícone/avatar): a arte original completa. */
export const DEFAULT_MARK = "/logo.jpeg";
