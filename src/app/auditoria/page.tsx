import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import AuditTable from "./audit-table";

export const dynamic = "force-dynamic";

export default async function AuditoriaPage() {
  const me = await getCurrentUser();
  if (!me || me.role !== "ADMIN") redirect("/");

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Auditoria</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Registro de todas as ações no sistema — quem fez, o quê e quando.
        </p>
      </div>
      <AuditTable />
    </div>
  );
}
