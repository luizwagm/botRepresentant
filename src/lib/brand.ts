// Identidade visual editável pelo painel. Sem logo enviada, o sistema usa a
// marca ROTA embutida (public/rota) — nunca fica sem marca.
import { prisma } from "./db";
import { DEFAULT_LOGO, DEFAULT_MARK, LEGACY_LOGOS } from "./brand-defaults";

export const BRAND_ID = "brand";

export type Brand = {
  /** Logo horizontal (cabeçalhos). Null = usa o monograma SVG. */
  logoUrl: string | null;
  /** Símbolo quadrado (ícone/avatar). Null = usa o monograma SVG. */
  markUrl: string | null;
};

export { DEFAULT_LOGO, DEFAULT_MARK };

export const DEFAULT_BRAND: Brand = { logoUrl: DEFAULT_LOGO, markUrl: DEFAULT_MARK };

/**
 * Lê a marca. Nunca lança: se a migration ainda não rodou, cai no padrão em
 * vez de derrubar o layout raiz (que envolve o site inteiro).
 */
export async function getBrand(): Promise<Brand> {
  try {
    const row = await prisma.brandSettings.findUnique({ where: { id: BRAND_ID } });
    if (!row) return DEFAULT_BRAND;
    // Só upload de verdade (/uploads/...) conta como personalização. Um caminho
    // da marca antiga salvo no banco NÃO pode segurar o rebrand — cai no padrão.
    const proprio = (u: string | null) => (u && !LEGACY_LOGOS.has(u) ? u : null);
    const logo = proprio(row.logoUrl);
    return {
      logoUrl: logo ?? DEFAULT_LOGO,
      markUrl: proprio(row.markUrl) ?? DEFAULT_MARK,
    };
  } catch {
    return DEFAULT_BRAND;
  }
}

/** Só aceita caminho local de upload — nada de URL externa no logo do site. */
export function sanitizeLogoUrl(v: string | null | undefined): string | null {
  const t = (v ?? "").trim();
  if (!t) return null;
  // Só upload nosso é personalização. Padrão (novo ou antigo) e URL externa
  // viram null — e null cai na marca embutida.
  return t.startsWith("/uploads/") ? t : null;
}
