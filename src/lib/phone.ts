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

export function whatsappLink(phoneE164: string | null | undefined, message: string): string | null {
  if (!phoneE164) return null;
  const normalized = phoneE164.startsWith("55") ? phoneE164 : normalizeBrazilPhone(phoneE164);
  if (!normalized) return null;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}
