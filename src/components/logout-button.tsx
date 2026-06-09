"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton({ email }: { email: string }) {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={logout}
      title={`Logado como ${email}`}
      className="rounded-md px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
    >
      Sair
    </button>
  );
}
