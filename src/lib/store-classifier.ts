import type { BusinessKind, StoreType } from "@prisma/client";

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
 * Pistas de que a loja PRODUZ a propria mercadoria (nao so revende).
 * Obs.: "fabrica"/"confeccao"/"industria" ja caem no BLACKLIST_KEYWORDS e nem
 * entram como lead; ficam aqui pra cobrir leads antigos e cadastros manuais.
 * As demais (malharia, atelie, faccao...) NAO sao barradas na entrada — sao
 * justamente as que a tag precisa pegar.
 */
const MANUFACTURER_KEYWORDS = [
  "fabrica",
  "fabricacao",
  "confeccao",
  "confeccoes",
  "industria",
  "industrial",
  "malharia",
  "atelie",
  "faccao",
  "tecelagem",
  "costura",
];

/**
 * Marca se a loja fabrica a propria mercadoria (FABRICANTE) ou so revende
 * (VAREJISTA). So da pra inferir pelo nome do place — o usuario pode corrigir
 * manualmente no painel.
 */
export function classifyBusinessKind(name: string): BusinessKind {
  const n = normalize(name);
  if (MANUFACTURER_KEYWORDS.some((kw) => n.includes(kw))) return "FABRICANTE";
  return "VAREJISTA";
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
