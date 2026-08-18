// Constantes da marca sem dependência de banco — podem ser importadas tanto no
// servidor quanto em client components. (src/lib/brand.ts importa o Prisma e
// NÃO pode ser usado no cliente.)

/** Logo oficial embutida no projeto, servida de /public. */
export const DEFAULT_LOGO = "/logo.jpeg";
