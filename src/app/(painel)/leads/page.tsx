import LeadsTable from "./leads-table";

export const dynamic = "force-dynamic";

export default function LeadsPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Leads</h1>
          <p className="mt-1 text-sm text-zinc-500">Lojas prospectadas. Clique em uma para editar.</p>
        </div>
      </div>
      <LeadsTable />
    </div>
  );
}
