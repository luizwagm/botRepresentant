import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

async function getStats() {
  const [total, comWa, comIg, novos] = await Promise.all([
    prisma.lead.count(),
    prisma.lead.count({ where: { whatsapp: { not: null } } }),
    prisma.lead.count({ where: { instagram: { not: null } } }),
    prisma.lead.count({ where: { funnelStage: "NOVO_LEAD" } }),
  ]);
  return { total, comWa, comIg, novos };
}

export default async function Home() {
  const stats = await getStats();

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-zinc-500">Visão geral da prospecção.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Leads totais" value={stats.total} />
        <StatCard label="Com WhatsApp" value={stats.comWa} hint={stats.total > 0 ? `${Math.round((stats.comWa / stats.total) * 100)}%` : undefined} />
        <StatCard label="Com Instagram" value={stats.comIg} hint={stats.total > 0 ? `${Math.round((stats.comIg / stats.total) * 100)}%` : undefined} />
        <StatCard label="Novos (não contatados)" value={stats.novos} />
      </div>

      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
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
      className="group rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-indigo-300 hover:shadow-md"
    >
      <div className="text-base font-semibold text-zinc-900 group-hover:text-indigo-700">{title}</div>
      <div className="mt-1 text-sm text-zinc-500">{description}</div>
    </Link>
  );
}
