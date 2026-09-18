// URL absoluta do site (SERVIDOR). Dados estruturados, sitemap e o link que vai
// no WhatsApp precisam do domínio completo — e ele vem do PUBLIC_BASE_URL, pra
// trocar de domínio sem mexer em código.
import "server-only";
import { env } from "../env";

export function baseUrl(): string {
  const bruto = env.publicBaseUrl.trim().replace(/\/+$/, "");
  return /^https?:\/\//i.test(bruto) ? bruto : `https://${bruto}`;
}

export function urlAbsoluta(caminho: string): string {
  if (/^https?:\/\//i.test(caminho)) return caminho;
  return `${baseUrl()}${caminho.startsWith("/") ? "" : "/"}${caminho}`;
}
