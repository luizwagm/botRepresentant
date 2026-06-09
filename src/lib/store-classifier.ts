import type { StoreType } from "@prisma/client";

function normalize(s: string): string {
  // Remove combining diacritical marks (U+0300..U+036F) — converte "fábrica" -> "fabrica".
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/**
 * Lojas que NAO sao clientes — atacado, fabrica, confeccao, concorrencia direta.
 * Aplicado ao NOME do place (do Google Maps).
 */
const BLACKLIST_KEYWORDS = [
  "atacado",
  "atacadista",
  "atacadao",
  "fabrica",
  "confeccao",
  "confeccoes",
  "sulanca",
  "distribuidora",
  "distribuidor",
  "industria",
  "industrial",
  "fornecedor",
  "outlet fabrica",
];

export function isBlacklisted(name: string): boolean {
  const n = normalize(name);
  return BLACKLIST_KEYWORDS.some((kw) => n.includes(kw));
}

/**
 * Classifica o tipo de loja com base no nome e na keyword que a trouxe.
 * Prioriza pistas no nome (mais especifico) sobre a keyword da busca.
 */
export function classifyStoreType(name: string, keywordMatched: string): StoreType {
  const n = normalize(name);
  const kw = normalize(keywordMatched);

  // Pistas no nome
  if (n.includes("jeans")) return "JEANS";
  if (n.includes("multimarca") || n.includes("multi-marca")) return "MULTIMARCA";
  if (n.includes("feminin")) return "FEMININA";
  if (n.includes("masculin")) return "MASCULINA";

  // Fallback pela keyword usada
  if (kw.includes("jeans")) return "JEANS";
  if (kw.includes("feminin")) return "FEMININA";
  if (kw.includes("masculin")) return "MASCULINA";
  if (kw.includes("multimarca")) return "MULTIMARCA";
  if (kw.includes("loja de roupas") || kw.includes("boutique")) return "MODA";

  return "OUTROS";
}
