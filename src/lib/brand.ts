// Identidade visual editável pelo painel. Sem logo enviada, o sistema usa o
// monograma SVG embutido (BrandLogo) — nunca fica sem marca.
import { prisma } from "./db";
import { DEFAULT_LOGO } from "./brand-defaults";

export const BRAND_ID = "brand";

export type Brand = {
  /** Logo horizontal (cabeçalhos). Null = usa o monograma SVG. */
  logoUrl: string | null;
  /** Símbolo quadrado (ícone/avatar). Null = usa o monograma SVG. */
  markUrl: string | null;
};

export { DEFAULT_LOGO };

export const DEFAULT_BRAND: Brand = { logoUrl: DEFAULT_LOGO, markUrl: DEFAULT_LOGO };

/**
 * Lê a marca. Nunca lança: se a migration ainda não rodou, cai no padrão em
 * vez de derrubar o layout raiz (que envolve o site inteiro).
 */
export async function getBrand(): Promise<Brand> {
  try {
    const row = await prisma.brandSettings.findUnique({ where: { id: BRAND_ID } });
    if (!row) return DEFAULT_BRAND;
    // Campo vazio cai na logo oficial do projeto (nunca volta pro monograma
    // desenhado, que agora é só a última rede de segurança).
    return {
      logoUrl: row.logoUrl ?? DEFAULT_LOGO,
      markUrl: row.markUrl ?? row.logoUrl ?? DEFAULT_LOGO,
    };
  } catch {
    return DEFAULT_BRAND;
  }
}

/** Só aceita caminho local de upload — nada de URL externa no logo do site. */
export function sanitizeLogoUrl(v: string | null | undefined): string | null {
  const t = (v ?? "").trim();
  if (!t) return null;
  // Aceita upload nosso ou a logo oficial do projeto. Qualquer outra coisa
  // (inclusive URL externa) vira null e cai no padrão.
  if (t === DEFAULT_LOGO) return t;
  return t.startsWith("/uploads/") ? t : null;
}
