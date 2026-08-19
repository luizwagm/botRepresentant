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

/**
 * Variantes de um celular BR em E.164: COM e SEM o nono dígito.
 *
 * O WhatsApp brasileiro é inconsistente: a linha tem 9 dígitos (55 + DDD + 9 +
 * 8), mas em boa parte do país — sobretudo fora de SP/RJ — a CONTA está
 * registrada sem o 9 (55 + DDD + 8). Mandar pro formato errado não dá erro:
 * o servidor aceita, devolve id de mensagem e nada é entregue.
 *
 * Sempre retorna a forma canônica primeiro (a que foi passada).
 */
export function brPhoneVariants(e164: string | null | undefined): string[] {
  const n = (e164 ?? "").replace(/\D/g, "");
  if (!n.startsWith("55")) return n ? [n] : [];

  const ddd = n.slice(2, 4);
  const resto = n.slice(4);

  if (resto.length === 9 && resto.startsWith("9")) {
    // Com o 9 -> acrescenta a variante sem ele.
    return [n, `55${ddd}${resto.slice(1)}`];
  }
  if (resto.length === 8) {
    // Sem o 9 -> acrescenta a variante com ele.
    return [n, `55${ddd}9${resto}`];
  }
  return [n];
}
