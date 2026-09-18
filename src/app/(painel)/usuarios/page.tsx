import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import UsersAdmin from "./users-admin";

export const dynamic = "force-dynamic";

export default async function UsuariosPage() {
  const me = await getCurrentUser();
  if (!me || me.role !== "ADMIN") redirect("/painel");

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Usuários</h1>
        <p className="mt-1 text-sm text-zinc-500">Quem tem acesso ao painel e com qual papel.</p>
      </div>
      <UsersAdmin currentUserId={me.id} />
    </div>
  );
}
