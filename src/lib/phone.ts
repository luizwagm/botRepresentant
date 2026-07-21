/**
 * Normalizacao de telefone brasileiro pra links wa.me.
 *
 * Exemplos:
 *   "(81) 99907-0323"   -> "5581999070323"  (mobile com DDD, prepend 55)
 *   "(81) 3045-8151"    -> "558130458151"   (fixo com DDD, prepend 55)
 *   "+55 81 99999-9999" -> "5581999999999"
 *   "0xx81 99999-9999"  -> "5581999999999"  (remove 0xx)
 */

export function normalizeBrazilPhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let digits = raw.replace(/\D/g, "");
  if (digits.length === 0) return null;

  if (digits.startsWith("0")) {
    digits = digits.replace(/^0+/, "");
  }

  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
    return digits;
  }

  if (digits.length === 10 || digits.length === 11) {
    return "55" + digits;
  }

  return null;
}

/**
 * Celular BR em E.164 = 55 + DDD(2) + 9 digitos comecando com 9 => 13 chars.
 * Fixo da 12 chars. Serve pra NAO tratar telefone fixo como WhatsApp — o
 * normalizeBrazilPhone aceita fixo de proposito (pra guardar o numero), mas
 * mandar zap pra fixo nao funciona.
 */
export function isMobileBr(e164: string | null | undefined): boolean {
  return !!e164 && e164.length === 13 && e164.startsWith("55") && e164[4] === "9";
}

export function whatsappLink(phoneRaw: string | null | undefined, message: string): string | null {
  // Sempre normaliza (nao confiar em startsWith("55") — DDD 55/Santa Maria-RS
  // tambem comeca com 55 e geraria numero sem codigo de pais).
  const normalized = normalizeBrazilPhone(phoneRaw);
  if (!normalized) return null;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}
