export type ProductColor = { name: string; hex: string; image: string | null };

const HEX = /^#[0-9a-fA-F]{6}$/;

/**
 * Valida/normaliza a lista de cores.
 * - Cor sem nome é descartada.
 * - hex inválido cai pra um padrão.
 * - `image` só é aceita se estiver em `allowedImages` (mecânica 2: cor vinculada a
 *   uma foto do produto). Caso contrário vira null (mecânica 1: cor sem foto).
 */
export function normalizeColors(input: unknown, allowedImages: string[]): ProductColor[] {
  if (!Array.isArray(input)) return [];
  const out: ProductColor[] = [];
  for (const raw of input) {
    if (!raw || typeof raw !== "object") continue;
    const c = raw as Record<string, unknown>;
    const name = typeof c.name === "string" ? c.name.trim() : "";
    if (!name) continue;
    let hex = typeof c.hex === "string" ? c.hex.trim() : "";
    if (!HEX.test(hex)) hex = "#1B2A4A";
    const image = typeof c.image === "string" && allowedImages.includes(c.image) ? c.image : null;
    out.push({ name, hex, image });
  }
  return out;
}

/** Leitura defensiva das cores vindas do banco (campo Json, pode ser null). */
export function readColors(value: unknown): ProductColor[] {
  if (!Array.isArray(value)) return [];
  const out: ProductColor[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const c = raw as Record<string, unknown>;
    if (typeof c.name !== "string" || typeof c.hex !== "string") continue;
    out.push({
      name: c.name,
      hex: c.hex,
      image: typeof c.image === "string" ? c.image : null,
    });
  }
  return out;
}
