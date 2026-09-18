import ProspeccaoAdmin from "./prospeccao-admin";

export const dynamic = "force-dynamic";

export default function ProspeccaoPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Prospecção automática</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Agende contatos, acompanhe as conversas e controle o vendedor de IA.
        </p>
      </div>
      <ProspeccaoAdmin />
    </div>
  );
}
