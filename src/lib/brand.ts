// Identidade visual editável pelo painel. Sem logo enviada, o sistema usa o
// monograma SVG embutido (BrandLogo) — nunca fica sem marca.
import { prisma } from "./db";

export const BRAND_ID = "brand";

export type Brand = {
  /** Logo horizontal (cabeçalhos). Null = usa o monograma SVG. */
  logoUrl: string | null;
  /** Símbolo quadrado (ícone/avatar). Null = usa o monograma SVG. */
  markUrl: string | null;
};

export const DEFAULT_BRAND: Brand = { logoUrl: null, markUrl: null };

/**
 * Lê a marca. Nunca lança: se a migration ainda não rodou, cai no padrão em
 * vez de derrubar o layout raiz (que envolve o site inteiro).
 */
export async function getBrand(): Promise<Brand> {
  try {
    const row = await prisma.brandSettings.findUnique({ where: { id: BRAND_ID } });
    if (!row) return DEFAULT_BRAND;
    return { logoUrl: row.logoUrl, markUrl: row.markUrl };
  } catch {
    return DEFAULT_BRAND;
  }
}

/** Só aceita caminho local de upload — nada de URL externa no logo do site. */
export function sanitizeLogoUrl(v: string | null | undefined): string | null {
  const t = (v ?? "").trim();
  if (!t) return null;
  return t.startsWith("/uploads/") ? t : null;
}
