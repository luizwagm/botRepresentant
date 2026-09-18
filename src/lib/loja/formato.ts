// Formatação da loja: dinheiro, faixa de preço, peças e o texto do pedido que
// vai pro WhatsApp. Módulo NEUTRO — o mesmo texto é montado no navegador (pra
// abrir o WhatsApp mesmo se o servidor falhar) e no servidor (registro).
import type { DadosLojista, ItemCarrinho } from "./tipos";
import { TAMANHO_UNICO } from "./tipos";

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function dinheiro(n: number): string {
  return BRL.format(n);
}

/** "R$ 49,90 – R$ 59,90", "R$ 49,90" ou "Sob consulta". */
export function faixaPreco(min: number | null, max: number | null): string {
  if (min === null && max === null) return "Sob consulta";
  if (min !== null && max !== null && Math.abs(max - min) > 0.004) return `${dinheiro(min)} – ${dinheiro(max)}`;
  return dinheiro((min ?? max)!);
}

export function pecasDoItem(i: Pick<ItemCarrinho, "grade">): number {
  return Object.values(i.grade).reduce((s, q) => s + (Number.isFinite(q) && q > 0 ? Math.floor(q) : 0), 0);
}

/** Peças por MODELO (soma das cores) — é assim que o pedido mínimo é contado. */
export function pecasPorProduto(itens: ItemCarrinho[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const i of itens) m.set(i.produtoId, (m.get(i.produtoId) ?? 0) + pecasDoItem(i));
  return m;
}

/** Modelos abaixo do mínimo: [{produtoId, nome, faltam}]. */
export function abaixoDoMinimo(itens: ItemCarrinho[]) {
  const porProduto = pecasPorProduto(itens);
  const vistos = new Set<string>();
  const faltando: { produtoId: string; nome: string; minimo: number; faltam: number }[] = [];
  for (const i of itens) {
    if (vistos.has(i.produtoId)) continue;
    vistos.add(i.produtoId);
    const tem = porProduto.get(i.produtoId) ?? 0;
    if (tem < i.minimo) faltando.push({ produtoId: i.produtoId, nome: i.nome, minimo: i.minimo, faltam: i.minimo - tem });
  }
  return faltando;
}

/** Estimativa do pedido. Itens sem preço entram como "sob consulta". */
export function estimativa(itens: ItemCarrinho[]) {
  let min = 0, max = 0, semPreco = 0;
  for (const i of itens) {
    const p = pecasDoItem(i);
    if (i.precoMin === null && i.precoMax === null) { semPreco += p; continue; }
    min += p * (i.precoMin ?? i.precoMax!);
    max += p * (i.precoMax ?? i.precoMin!);
  }
  return { min, max, semPreco };
}

function gradeEmTexto(grade: Record<string, number>): string {
  const partes = Object.entries(grade).filter(([, q]) => q > 0);
  if (partes.length === 1 && partes[0]![0] === TAMANHO_UNICO) return `${partes[0]![1]} pç`;
  return partes.map(([t, q]) => `${t}: ${q}`).join(" · ");
}

/** WhatsApp pré-preenchido fica instável acima disso — encurta. */
const LIMITE = 1800;

/**
 * Texto do pedido pro WhatsApp. Usa *negrito* do WhatsApp. Se ficar longo
 * demais, cai para um formato compacto e, no limite, lista os primeiros itens
 * e remete ao código — o pedido completo está salvo no painel.
 */
export function textoDoPedido(opts: {
  itens: ItemCarrinho[];
  lojista: DadosLojista;
  codigo?: string | null;
  site?: string;
}): string {
  const { itens, lojista, codigo } = opts;
  const total = itens.reduce((s, i) => s + pecasDoItem(i), 0);
  const est = estimativa(itens);
  const modelos = new Set(itens.map((i) => i.produtoId)).size;
  const local = [lojista.cidade, lojista.uf].filter(Boolean).join("/");

  const cabeca = [
    `*Pedido ROTA Atacado*${codigo ? ` — ${codigo}` : ""}`,
    "",
    `*Loja:* ${lojista.loja}${local ? ` — ${local}` : ""}`,
    `*Contato:* ${lojista.contato}${lojista.whatsapp ? ` · ${lojista.whatsapp}` : ""}`,
    ...(lojista.cnpj ? [`*CNPJ:* ${lojista.cnpj}`] : []),
  ];

  const rodape = [
    "",
    `*Total:* ${total} peças · ${modelos} ${modelos === 1 ? "modelo" : "modelos"}`,
    ...(est.max > 0
      ? [`*Estimativa:* ${est.min === est.max ? dinheiro(est.min) : `${dinheiro(est.min)} – ${dinheiro(est.max)}`} (referência)`]
      : []),
    ...(est.semPreco > 0 ? [`${est.semPreco} peça(s) com preço sob consulta.`] : []),
    ...(lojista.observacoes ? ["", `*Obs.:* ${lojista.observacoes}`] : []),
    "",
    "Pode confirmar disponibilidade, frete e forma de pagamento?",
  ];

  const detalhado = itens.map((i, n) => {
    const cor = i.cor ? ` — ${i.cor.nome}` : "";
    return `${n + 1}) *${i.nome}*${cor}\n   ${gradeEmTexto(i.grade)} → ${pecasDoItem(i)} pç`;
  });
  let texto = [...cabeca, "", ...detalhado, ...rodape].join("\n");
  if (texto.length <= LIMITE) return texto;

  const compacto = itens.map((i, n) => `${n + 1}) ${i.nome}${i.cor ? ` (${i.cor.nome})` : ""} — ${pecasDoItem(i)} pç`);
  texto = [...cabeca, "", ...compacto, ...rodape].join("\n");
  if (texto.length <= LIMITE) return texto;

  const cabem = Math.max(3, Math.floor(compacto.length / 2));
  const resto = compacto.length - cabem;
  return [
    ...cabeca,
    "",
    ...compacto.slice(0, cabem),
    `…e mais ${resto} ${resto === 1 ? "item" : "itens"}${codigo ? ` — pedido completo registrado com o código ${codigo}` : ""}.`,
    ...rodape,
  ].join("\n");
}

/** Link do WhatsApp com texto. `numero` em E.164 sem "+". */
export function linkWhatsapp(numero: string, texto: string): string {
  return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
}

/** "5581999070323" → "(81) 99907-0323" — só pra exibir. */
export function telefoneVisivel(e164: string | null | undefined): string {
  const d = (e164 ?? "").replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return e164 ?? "";
}
