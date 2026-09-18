// Painel → Pedidos: tudo o que chegou pelo carrinho da loja, com código, grade
// e contato. Os pedidos são gravados ANTES do WhatsApp abrir — então aparecem
// aqui mesmo que o lojista desista de enviar a mensagem.
import type { Metadata } from "next";
import Link from "next/link";
import type { OrderStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import PedidosAdmin, { type PedidoPainel } from "./pedidos-admin";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Pedidos" };

const FILTROS: { valor: OrderStatus | "TODOS"; rotulo: string }[] = [
  { valor: "TODOS", rotulo: "Todos" },
  { valor: "NOVO", rotulo: "Novos" },
  { valor: "EM_ATENDIMENTO", rotulo: "Em atendimento" },
  { valor: "FECHADO", rotulo: "Fechados" },
  { valor: "CANCELADO", rotulo: "Cancelados" },
];

type Props = { searchParams: Promise<{ status?: string }> };

export default async function PedidosPage({ searchParams }: Props) {
  const sp = await searchParams;
  const filtro = FILTROS.find((f) => f.valor === sp.status)?.valor ?? "TODOS";
  const where: Prisma.OrderRequestWhereInput = filtro === "TODOS" ? {} : { status: filtro };

  const [pedidos, contagem] = await Promise.all([
    prisma.orderRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { lead: { select: { id: true, name: true, city: true, state: true } } },
    }),
    prisma.orderRequest.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  const porStatus = Object.fromEntries(contagem.map((c) => [c.status, c._count._all])) as Partial<Record<OrderStatus, number>>;
  const total = contagem.reduce((s, c) => s + c._count._all, 0);

  const lista: PedidoPainel[] = pedidos.map((p) => ({
    id: p.id,
    codigo: p.code,
    status: p.status,
    criadoEm: p.createdAt.toISOString(),
    loja: p.storeName,
    contato: p.contactName,
    whatsapp: p.whatsapp,
    cidade: p.city,
    uf: p.state,
    cnpj: p.cnpj,
    observacoes: p.notes,
    itens: lerItens(p.items),
    totalPecas: p.totalPieces,
    estimativaMin: p.estimateMin,
    estimativaMax: p.estimateMax,
    lead: p.lead ? { id: p.lead.id, nome: p.lead.name, local: `${p.lead.city}/${p.lead.state}` } : null,
  }));

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pedidos da loja</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Montados pelos lojistas no site. Cada pedido tem um código (RT-…) que aparece na mensagem do WhatsApp.
          </p>
        </div>
        <Link href="/loja" target="_blank" className="text-sm font-medium text-[#9a6c4e] hover:underline">
          Abrir a loja ↗
        </Link>
      </div>

      <nav aria-label="Filtrar por status" className="mb-6 flex flex-wrap gap-2">
        {FILTROS.map((f) => {
          const n = f.valor === "TODOS" ? total : (porStatus[f.valor] ?? 0);
          const ativo = f.valor === filtro;
          return (
            <Link
              key={f.valor}
              href={f.valor === "TODOS" ? "/pedidos" : `/pedidos?status=${f.valor}`}
              aria-current={ativo ? "page" : undefined}
              className={`rounded-full border px-3.5 py-2.5 text-sm sm:py-1.5 ${
                ativo ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400"
              }`}
            >
              {f.rotulo} <span className={ativo ? "text-zinc-300" : "text-zinc-400"}>{n}</span>
            </Link>
          );
        })}
      </nav>

      <PedidosAdmin pedidos={lista} />
    </div>
  );
}

/** items (Json) → lista tipada; entrada estranha é descartada, nunca derruba a página. */
function lerItens(v: Prisma.JsonValue): PedidoPainel["itens"] {
  if (!Array.isArray(v)) return [];
  const out: PedidoPainel["itens"] = [];
  for (const x of v) {
    if (!x || typeof x !== "object" || Array.isArray(x)) continue;
    const o = x as Record<string, unknown>;
    const grade: Record<string, number> = {};
    if (o.sizes && typeof o.sizes === "object") {
      for (const [t, q] of Object.entries(o.sizes as Record<string, unknown>)) {
        const n = Number(q);
        if (Number.isFinite(n) && n > 0) grade[t] = n;
      }
    }
    out.push({
      produtoId: typeof o.productId === "string" ? o.productId : "",
      nome: typeof o.name === "string" ? o.name : "(peça)",
      cor: typeof o.color === "string" ? o.color : null,
      grade,
      pecas: typeof o.pieces === "number" ? o.pieces : Object.values(grade).reduce((s, q) => s + q, 0),
      precoMin: typeof o.priceMin === "number" ? o.priceMin : null,
      precoMax: typeof o.priceMax === "number" ? o.priceMax : null,
    });
  }
  return out;
}
