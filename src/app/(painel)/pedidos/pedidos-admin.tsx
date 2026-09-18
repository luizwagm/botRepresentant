"use client";

// Lista de pedidos do painel: abre o detalhe (grade por peça), muda o status e
// chama o lojista no WhatsApp já citando o código do pedido.
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { OrderStatus } from "@prisma/client";
import { WhatsAppIcon } from "@/components/whatsapp-icon";
import { dinheiro, faixaPreco, linkWhatsapp, telefoneVisivel } from "@/lib/loja/formato";
import { TAMANHO_UNICO } from "@/lib/loja/tipos";

export type PedidoPainel = {
  id: string;
  codigo: string;
  status: OrderStatus;
  criadoEm: string;
  loja: string;
  contato: string;
  whatsapp: string | null;
  cidade: string | null;
  uf: string | null;
  cnpj: string | null;
  observacoes: string | null;
  itens: {
    produtoId: string;
    nome: string;
    cor: string | null;
    grade: Record<string, number>;
    pecas: number;
    precoMin: number | null;
    precoMax: number | null;
  }[];
  totalPecas: number;
  estimativaMin: number | null;
  estimativaMax: number | null;
  lead: { id: string; nome: string; local: string } | null;
};

const ROTULO: Record<OrderStatus, string> = {
  NOVO: "Novo",
  EM_ATENDIMENTO: "Em atendimento",
  FECHADO: "Fechado",
  CANCELADO: "Cancelado",
};
const COR: Record<OrderStatus, string> = {
  NOVO: "bg-amber-100 text-amber-800 ring-amber-200",
  EM_ATENDIMENTO: "bg-sky-100 text-sky-800 ring-sky-200",
  FECHADO: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  CANCELADO: "bg-zinc-100 text-zinc-600 ring-zinc-200",
};

const data = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Recife" });

export default function PedidosAdmin({ pedidos }: { pedidos: PedidoPainel[] }) {
  const router = useRouter();
  const [aberto, setAberto] = useState<string | null>(pedidos[0]?.status === "NOVO" ? pedidos[0].id : null);
  const [salvando, setSalvando] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function mudarStatus(id: string, status: OrderStatus) {
    setSalvando(id);
    setErro(null);
    try {
      const r = await fetch(`/api/pedidos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!r.ok) {
        const j = (await r.json().catch(() => ({}))) as { error?: string };
        setErro(j.error ?? "Não foi possível mudar o status.");
        return;
      }
      router.refresh();
    } finally {
      setSalvando(null);
    }
  }

  if (pedidos.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-10 text-center text-sm text-zinc-500">
        Nenhum pedido aqui ainda. Quando um lojista enviar o carrinho da loja, ele aparece nesta lista.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {erro && <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{erro}</p>}
      {pedidos.map((p) => {
        const expandido = aberto === p.id;
        const saudacao = `Olá, ${p.contato.split(" ")[0]}! Aqui é da ROTA Atacado — recebemos o seu pedido ${p.codigo}. `;
        return (
          <article key={p.id} className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
            <button
              type="button"
              onClick={() => setAberto(expandido ? null : p.id)}
              aria-expanded={expandido}
              className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 px-5 py-4 text-left hover:bg-zinc-50"
            >
              <span className="font-mono text-sm font-semibold text-zinc-900">{p.codigo}</span>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${COR[p.status]}`}>{ROTULO[p.status]}</span>
              <span className="min-w-0 flex-1 truncate font-medium text-zinc-800">
                {p.loja}
                <span className="font-normal text-zinc-500">
                  {" "}
                  · {p.contato}
                  {p.cidade && ` · ${p.cidade}${p.uf ? `/${p.uf}` : ""}`}
                </span>
              </span>
              <span className="text-sm text-zinc-600">
                {p.totalPecas} pç
                {p.estimativaMax !== null && (
                  <span className="text-zinc-400"> · {faixaPreco(p.estimativaMin, p.estimativaMax)}</span>
                )}
              </span>
              <span className="text-xs text-zinc-400">{data.format(new Date(p.criadoEm))}</span>
            </button>

            {expandido && (
              <div className="border-t border-zinc-100 px-5 py-5">
                <div className="grid gap-6 lg:grid-cols-3">
                  <div className="lg:col-span-2">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-zinc-200 text-left text-xs uppercase tracking-wide text-zinc-500">
                          <th className="py-2 pr-3 font-medium">Peça</th>
                          <th className="py-2 pr-3 font-medium">Grade</th>
                          <th className="py-2 pr-3 text-right font-medium">Peças</th>
                          <th className="py-2 text-right font-medium">Preço/pç</th>
                        </tr>
                      </thead>
                      <tbody>
                        {p.itens.map((i, n) => (
                          <tr key={n} className="border-b border-zinc-100 align-top">
                            <td className="py-2.5 pr-3">
                              {i.produtoId ? (
                                <a href={`/produto/${i.produtoId}`} target="_blank" className="font-medium text-zinc-900 hover:underline">
                                  {i.nome}
                                </a>
                              ) : (
                                <span className="font-medium">{i.nome}</span>
                              )}
                              {i.cor && <div className="text-xs text-zinc-500">{i.cor}</div>}
                            </td>
                            <td className="py-2.5 pr-3 text-zinc-700">
                              {Object.entries(i.grade)
                                .map(([t, q]) => (t === TAMANHO_UNICO ? `${q}` : `${t}: ${q}`))
                                .join(" · ")}
                            </td>
                            <td className="py-2.5 pr-3 text-right tabular-nums">{i.pecas}</td>
                            <td className="py-2.5 text-right tabular-nums text-zinc-600">{faixaPreco(i.precoMin, i.precoMax)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td className="pt-3 font-medium" colSpan={2}>
                            Total
                          </td>
                          <td className="pt-3 text-right font-semibold tabular-nums">{p.totalPecas}</td>
                          <td className="pt-3 text-right tabular-nums text-zinc-700">
                            {p.estimativaMax !== null && p.estimativaMin !== null
                              ? p.estimativaMin === p.estimativaMax
                                ? dinheiro(p.estimativaMin)
                                : `${dinheiro(p.estimativaMin)} – ${dinheiro(p.estimativaMax)}`
                              : "—"}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                    {p.observacoes && (
                      <p className="mt-4 whitespace-pre-line rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
                        <span className="font-medium">Obs.: </span>
                        {p.observacoes}
                      </p>
                    )}
                  </div>

                  <aside className="space-y-4 text-sm">
                    <dl className="space-y-1.5">
                      <div>
                        <dt className="inline text-zinc-500">Loja: </dt>
                        <dd className="inline font-medium">{p.loja}</dd>
                      </div>
                      <div>
                        <dt className="inline text-zinc-500">Contato: </dt>
                        <dd className="inline">{p.contato}</dd>
                      </div>
                      {p.whatsapp && (
                        <div>
                          <dt className="inline text-zinc-500">WhatsApp: </dt>
                          <dd className="inline tabular-nums">{telefoneVisivel(p.whatsapp)}</dd>
                        </div>
                      )}
                      {p.cnpj && (
                        <div>
                          <dt className="inline text-zinc-500">CNPJ: </dt>
                          <dd className="inline tabular-nums">{p.cnpj}</dd>
                        </div>
                      )}
                      {p.lead && (
                        <div>
                          <dt className="inline text-zinc-500">Lead: </dt>
                          <dd className="inline">
                            {p.lead.nome} <span className="text-zinc-400">({p.lead.local})</span>
                            <span className="mt-0.5 block text-xs text-zinc-400">
                              Mesmo WhatsApp do pedido — confira se é a mesma loja.
                            </span>
                          </dd>
                        </div>
                      )}
                    </dl>

                    {p.whatsapp && (
                      <a
                        href={linkWhatsapp(p.whatsapp, saudacao)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 font-medium text-white hover:bg-emerald-700"
                      >
                        <WhatsAppIcon className="h-4 w-4" /> Chamar no WhatsApp
                      </a>
                    )}

                    <label className="block">
                      <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">Status</span>
                      <select
                        value={p.status}
                        disabled={salvando === p.id}
                        onChange={(e) => mudarStatus(p.id, e.target.value as OrderStatus)}
                        className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2"
                      >
                        {(Object.keys(ROTULO) as OrderStatus[]).map((s) => (
                          <option key={s} value={s}>
                            {ROTULO[s]}
                          </option>
                        ))}
                      </select>
                      <span className="mt-1 block text-xs text-zinc-400">
                        {p.lead
                          ? "“Em atendimento” move o lead para Pedido feito e desliga a IA dessa conversa; “Fechado” marca como Cliente."
                          : "Sem lead vinculado a este WhatsApp."}
                      </span>
                    </label>
                  </aside>
                </div>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
