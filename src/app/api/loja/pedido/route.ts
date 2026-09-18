// POST /api/loja/pedido — registra o pedido do carrinho ANTES de abrir o
// WhatsApp. Assim nada se perde: se o lojista fechar a aba sem enviar, o pedido
// já está no painel (Pedidos) com código, itens e contato.
//
// Rota pública (sem login). Defesas:
//   - honeypot + limite por IP (12 tentativas / 10 min);
//   - corpo limitado a 100 KB (lido com teto, nunca inteiro na memória);
//   - preço, nome, tamanhos e cores vêm do BANCO — o navegador só diz
//     "qual produto, qual cor, quantas de cada tamanho";
//   - pedido mínimo por modelo conferido aqui também.
import { NextRequest, NextResponse } from "next/server";
import { randomInt } from "node:crypto";
import { Prisma } from "@prisma/client";
import { writeAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { abaixoDoMinimo, estimativa, pecasDoItem, telefoneVisivel, textoDoPedido } from "@/lib/loja/formato";
import { TAMANHO_UNICO, type DadosLojista, type ItemCarrinho } from "@/lib/loja/tipos";
import { brPhoneVariants, normalizeBrazilPhone } from "@/lib/phone";
import { readColors } from "@/lib/product-colors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// ---------------------------------------------------------------------------
//  Limite por IP (memória do processo — o app roda num processo só no PM2)
// ---------------------------------------------------------------------------
const JANELA_MS = 10 * 60_000;
const MAX_NA_JANELA = 12; // conta toda tentativa (inclusive erro de preenchimento)
const tentativas = new Map<string, number[]>();

function estourouLimite(ip: string): boolean {
  const agora = Date.now();
  const recentes = (tentativas.get(ip) ?? []).filter((t) => agora - t < JANELA_MS);
  const estourou = recentes.length >= MAX_NA_JANELA;
  if (!estourou) recentes.push(agora);
  tentativas.set(ip, recentes);
  // Faxina: não deixa o mapa crescer sem fim.
  if (tentativas.size > 5000) {
    for (const [k, v] of tentativas) if (!v.some((t) => agora - t < JANELA_MS)) tentativas.delete(k);
  }
  return estourou;
}

/**
 * IP do cliente pro limite. x-real-ip (o nginx grava o $remote_addr) primeiro;
 * senão o ÚLTIMO item do x-forwarded-for — o primeiro é o que o próprio
 * cliente mandou e pode ser inventado pra driblar o limite.
 */
function ipDoCliente(req: NextRequest): string {
  const real = req.headers.get("x-real-ip")?.trim();
  if (real) return real;
  const xff = req.headers.get("x-forwarded-for");
  const ultimo = xff?.split(",").map((s) => s.trim()).filter(Boolean).pop();
  return ultimo || "anonimo";
}

// ---------------------------------------------------------------------------
//  Utilidades
// ---------------------------------------------------------------------------
const ALFABETO = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // sem 0/O e 1/I: ninguém confunde ao ditar
function gerarCodigo(): string {
  let s = "RT-";
  for (let i = 0; i < 5; i++) s += ALFABETO[randomInt(ALFABETO.length)];
  return s;
}

/** Texto de uma linha, sem caracteres de controle. */
function linha(v: unknown, max: number): string {
  return typeof v === "string" ? v.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max) : "";
}
/** Texto livre (observações): mantém quebra de linha. */
function paragrafo(v: unknown, max: number): string {
  return typeof v === "string"
    ? v.replace(/\r\n?/g, "\n").replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, " ").replace(/\n{3,}/g, "\n\n").trim().slice(0, max)
    : "";
}

const LIMITE_CORPO = 100_000; // bytes — um pedido de 60 linhas tem ~10 KB

/**
 * Lê o corpo parando no teto. `req.text()` carregaria tudo na memória antes de
 * medir — e o nginx aceita corpos grandes por causa do upload de vídeo.
 */
async function lerComTeto(req: NextRequest, teto: number): Promise<string | null> {
  const declarado = Number(req.headers.get("content-length") ?? "0");
  if (declarado > teto) return null;
  if (!req.body) return "";
  const leitor = req.body.getReader();
  const partes: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await leitor.read();
    if (done) break;
    total += value.byteLength;
    if (total > teto) {
      await leitor.cancel().catch(() => {});
      return null;
    }
    partes.push(value);
  }
  return Buffer.concat(partes).toString("utf8");
}

function erro(status: number, mensagem: string, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ error: mensagem, ...extra }, { status });
}

export async function POST(req: NextRequest) {
  const ip = ipDoCliente(req);
  if (estourouLimite(ip)) {
    return erro(429, "Muitos pedidos em pouco tempo. Aguarde alguns minutos ou fale com a gente no WhatsApp.");
  }

  const bruto = await lerComTeto(req, LIMITE_CORPO);
  if (bruto === null) return erro(413, "Pedido grande demais para o site. Fale com a gente no WhatsApp.");
  let corpo: Record<string, unknown>;
  try {
    corpo = JSON.parse(bruto) as Record<string, unknown>;
  } catch {
    return erro(400, "Pedido inválido.");
  }
  if (!corpo || typeof corpo !== "object") return erro(400, "Pedido inválido.");

  // Honeypot: campo invisível pra gente, irresistível pra robô.
  if (linha(corpo.site, 200)) return erro(400, "Pedido inválido.");

  // ------------------------------------------------------------- lojista
  const l = (corpo.lojista && typeof corpo.lojista === "object" ? corpo.lojista : {}) as Record<string, unknown>;
  const lojista: DadosLojista = {
    loja: linha(l.loja, 120),
    contato: linha(l.contato, 80),
    whatsapp: linha(l.whatsapp, 25),
    cidade: linha(l.cidade, 80),
    uf: linha(l.uf, 2).toUpperCase(),
    cnpj: linha(l.cnpj, 20),
    observacoes: paragrafo(l.observacoes, 600),
  };
  if (!lojista.loja || !lojista.contato) return erro(400, "Informe o nome da loja e o seu nome.");
  const zap = normalizeBrazilPhone(lojista.whatsapp);
  if (!zap) return erro(400, "Informe um WhatsApp válido, com DDD.");
  if (!/^[A-Z]{2}$/.test(lojista.uf)) lojista.uf = "";

  // --------------------------------------------------------------- itens
  if (!Array.isArray(corpo.itens) || corpo.itens.length === 0) return erro(400, "O pedido está vazio.");
  if (corpo.itens.length > 60) return erro(400, "Pedido com itens demais. Divida em dois ou fale com a gente.");

  type Bruto = { produtoId: string; cor: string | null; grade: Record<string, unknown> };
  const pedidos: Bruto[] = [];
  for (const x of corpo.itens) {
    if (!x || typeof x !== "object") continue;
    const o = x as Record<string, unknown>;
    if (typeof o.produtoId !== "string" || !/^[a-z0-9]{8,40}$/i.test(o.produtoId)) continue;
    const cor =
      o.cor && typeof o.cor === "object" && typeof (o.cor as { nome?: unknown }).nome === "string"
        ? String((o.cor as { nome: string }).nome)
        : null;
    const grade = o.grade && typeof o.grade === "object" ? (o.grade as Record<string, unknown>) : {};
    pedidos.push({ produtoId: o.produtoId, cor, grade });
  }
  if (pedidos.length === 0) return erro(400, "O pedido está vazio.");

  const ids = [...new Set(pedidos.map((p) => p.produtoId))];
  const produtos = await prisma.product.findMany({ where: { id: { in: ids }, active: true } });
  const porId = new Map(produtos.map((p) => [p.id, p]));

  // Tudo que mudou na vitrine desde que o lojista montou o carrinho vira um
  // AJUSTE por linha (produto+cor, a mesma chave do carrinho): a linha toda saiu
  // ou só alguns tamanhos. Nada é descartado em silêncio — o carrinho aplica os
  // ajustes, mostra o que mudou e o lojista confere antes de enviar de novo.
  type Ajuste = { chave: string; nome: string; remover: "tudo" | string[]; motivo: string };
  const ajustes: Ajuste[] = [];
  const itensPorChave = new Map<string, ItemCarrinho>();
  for (const b of pedidos) {
    const chaveCliente = `${b.produtoId}::${b.cor ?? ""}`;
    const prod = porId.get(b.produtoId);
    if (!prod) {
      ajustes.push({ chave: chaveCliente, nome: "Peça", remover: "tudo", motivo: "saiu da vitrine" });
      continue;
    }
    const cores = readColors(prod.colors);
    let cor: ItemCarrinho["cor"] = null;
    if (cores.length > 0) {
      const achada = cores.find((c) => c.name === b.cor);
      if (!achada) {
        ajustes.push({
          chave: chaveCliente,
          nome: prod.name,
          remover: "tudo",
          motivo: b.cor ? `a cor "${b.cor}" não está mais disponível` : "escolha uma cor",
        });
        continue;
      }
      cor = { nome: achada.name, hex: achada.hex };
    }
    const validos = prod.sizes.length ? prod.sizes : [TAMANHO_UNICO];
    const invalidos = Object.keys(b.grade).filter((t) => !validos.includes(t));
    if (invalidos.length > 0) {
      ajustes.push({
        chave: chaveCliente,
        nome: prod.name,
        remover: invalidos,
        motivo: `tamanho ${invalidos.join(", ")} não existe mais nesta peça`,
      });
      continue;
    }
    const chave = `${prod.id}::${cor?.nome ?? ""}`;
    const item: ItemCarrinho = itensPorChave.get(chave) ?? {
      chave,
      produtoId: prod.id,
      nome: prod.name,
      imagem: prod.images[0] ?? null,
      cor,
      grade: {},
      minimo: Math.max(1, prod.minOrderQty),
      precoMin: prod.wholesalePriceMin,
      precoMax: prod.wholesalePriceMax,
    };
    for (const [t, q] of Object.entries(b.grade)) {
      const n = Math.floor(Number(q));
      if (!Number.isFinite(n) || n <= 0) continue;
      item.grade[t] = Math.min(9999, (item.grade[t] ?? 0) + n);
    }
    if (Object.keys(item.grade).length > 0) itensPorChave.set(chave, item);
  }

  if (ajustes.length > 0) {
    return erro(409, "Algumas peças mudaram na vitrine desde que você montou o pedido. Ajustamos o seu carrinho — confira e envie de novo.", {
      ajustes,
    });
  }
  const itens = [...itensPorChave.values()];
  if (itens.length === 0) return erro(400, "O pedido está vazio.");

  const faltando = abaixoDoMinimo(itens);
  if (faltando.length > 0) {
    return erro(422, "Alguns modelos ainda não chegaram ao pedido mínimo.", { faltando });
  }

  const totalPecas = itens.reduce((s, i) => s + pecasDoItem(i), 0);
  const est = estimativa(itens);

  // ------------------------------------------- lead já captado? vincula
  // SÓ vincula. O número digitado aqui não é verificado — qualquer um poderia
  // digitar o WhatsApp (público) de um lead. Mexer no funil ou desligar a IA a
  // partir disso deixaria um estranho pausar a prospecção de qualquer loja.
  // Isso acontece quando a equipe confirma o pedido no painel (PATCH /api/pedidos).
  let leadId: string | null = null;
  try {
    const lead = await prisma.lead.findFirst({
      where: { whatsapp: { in: brPhoneVariants(zap) } },
      select: { id: true },
    });
    leadId = lead?.id ?? null;
  } catch (e) {
    console.error("pedido: falha ao procurar lead:", e instanceof Error ? e.message : e);
  }

  // --------------------------------------------------------------- grava
  const dados = {
    status: "NOVO" as const,
    storeName: lojista.loja,
    contactName: lojista.contato,
    whatsapp: zap,
    city: lojista.cidade || null,
    state: lojista.uf || null,
    cnpj: lojista.cnpj || null,
    notes: lojista.observacoes || null,
    items: itens.map((i) => ({
      productId: i.produtoId,
      name: i.nome,
      color: i.cor?.nome ?? null,
      sizes: i.grade,
      pieces: pecasDoItem(i),
      priceMin: i.precoMin,
      priceMax: i.precoMax,
    })) as Prisma.InputJsonValue,
    totalPieces: totalPecas,
    estimateMin: est.max > 0 ? est.min : null,
    estimateMax: est.max > 0 ? est.max : null,
    leadId,
    ip: ip === "anonimo" ? null : ip,
  };

  let codigo = "";
  let pedidoId = "";
  for (let tentativa = 0; tentativa < 6 && !pedidoId; tentativa++) {
    codigo = gerarCodigo();
    try {
      const criado = await prisma.orderRequest.create({ data: { ...dados, code: codigo }, select: { id: true } });
      pedidoId = criado.id;
    } catch (e) {
      // Código repetido (raro): sorteia outro. Qualquer outro erro sobe.
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") continue;
      throw e;
    }
  }
  if (!pedidoId) return erro(503, "Não conseguimos registrar agora. Envie pelo WhatsApp mesmo assim.");

  await writeAudit({
    action: "pedido.criado",
    entityType: "OrderRequest",
    entityId: pedidoId,
    summary: `Pedido ${codigo} — ${lojista.loja} (${totalPecas} peças)${leadId ? " · lead vinculado" : ""}`,
    ip: dados.ip,
  });

  const mensagem = textoDoPedido({
    itens,
    lojista: { ...lojista, whatsapp: telefoneVisivel(zap) },
    codigo,
  });

  return NextResponse.json({
    codigo,
    mensagem,
    whatsapp: normalizeBrazilPhone(env.luizWhatsapp),
  });
}
