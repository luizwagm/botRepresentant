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
      className="shrink-0 rounded-md px-2.5 py-2.5 text-[13px] font-medium text-creme-2 hover:bg-white/5 hover:text-creme lg:py-1.5"
    >
      Sair
    </button>
  );
}
