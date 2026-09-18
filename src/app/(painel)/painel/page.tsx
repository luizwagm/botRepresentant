import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Início" };

async function getStats() {
  const inicioDoMes = new Date();
  inicioDoMes.setDate(1);
  inicioDoMes.setHours(0, 0, 0, 0);
  const [total, comWa, comIg, novos, pedidosNovos, pedidosMes] = await Promise.all([
    prisma.lead.count(),
    prisma.lead.count({ where: { whatsapp: { not: null } } }),
    prisma.lead.count({ where: { instagram: { not: null } } }),
    prisma.lead.count({ where: { funnelStage: "NOVO_LEAD" } }),
    // Tabela nova: se a migration ainda não rodou, o painel abre mesmo assim.
    prisma.orderRequest.count({ where: { status: "NOVO" } }).catch(() => 0),
    prisma.orderRequest.count({ where: { createdAt: { gte: inicioDoMes } } }).catch(() => 0),
  ]);
  return { total, comWa, comIg, novos, pedidosNovos, pedidosMes };
}

export default async function Home() {
  const stats = await getStats();

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Painel ROTA</h1>
        <p className="mt-1 text-sm text-zinc-500">Pedidos da loja e visão geral da prospecção.</p>
      </div>

      {stats.pedidosNovos > 0 && (
        <Link
          href="/pedidos?status=NOVO"
          className="mb-6 flex items-center justify-between gap-4 rounded-xl bg-zinc-900 px-5 py-4 text-white shadow-sm hover:bg-zinc-800"
        >
          <span>
            <span className="font-semibold text-[#e2bb98]">
              {stats.pedidosNovos} {stats.pedidosNovos === 1 ? "pedido novo" : "pedidos novos"}
            </span>{" "}
            chegaram pela loja e esperam atendimento.
          </span>
          <span aria-hidden>→</span>
        </Link>
      )}

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard label="Pedidos novos (a atender)" value={stats.pedidosNovos} />
        <StatCard label="Pedidos neste mês" value={stats.pedidosMes} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Leads totais" value={stats.total} />
        <StatCard label="Com WhatsApp" value={stats.comWa} hint={stats.total > 0 ? `${Math.round((stats.comWa / stats.total) * 100)}%` : undefined} />
        <StatCard label="Com Instagram" value={stats.comIg} hint={stats.total > 0 ? `${Math.round((stats.comIg / stats.total) * 100)}%` : undefined} />
        <StatCard label="Novos (não contatados)" value={stats.novos} />
      </div>

      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <NavCard href="/pedidos" title="Pedidos" description="Pedidos montados pelos lojistas na loja." />
        <NavCard href="/prospeccao" title="Prospecção" description="Agendamentos e conversas no WhatsApp." />
        <NavCard href="/" title="Loja pública ↗" description="Ver a vitrine como o lojista vê." />
        <NavCard href="/leads" title="Leads" description="Lista completa com filtros e edição." />
        <NavCard href="/funil" title="Funil" description="Funil de vendas em Kanban." />
        <NavCard href="/catalogo" title="Catálogo" description="Cadastro de mercadorias." />
      </div>
    </div>
  );
}

function StatCard({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="text-sm text-zinc-500">{label}</div>
      <div className="mt-2 flex items-baseline gap-2">
        <div className="text-3xl font-semibold tracking-tight">{value.toLocaleString("pt-BR")}</div>
        {hint && <div className="text-sm text-zinc-400">{hint}</div>}
      </div>
    </div>
  );
}

function NavCard({ href, title, description }: { href: string; title: string; description: string }) {
  return (
    <Link
      href={href}
      className="group rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-[#c89775] hover:shadow-md"
    >
      <div className="text-base font-semibold text-zinc-900 group-hover:text-[#9a6c4e]">{title}</div>
      <div className="mt-1 text-sm text-zinc-500">{description}</div>
    </Link>
  );
}
