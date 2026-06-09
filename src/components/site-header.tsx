"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import BrandLogo from "@/components/brand-logo";
import LogoutButton from "@/components/logout-button";

type Me = { email: string; role: string; name: string | null };

export default function SiteHeader({ me }: { me: Me | null }) {
  const pathname = usePathname();
  // A página pública do catálogo tem o próprio cabeçalho (gallery.tsx) — não
  // duplicar a chrome administrativa aqui.
  if (pathname?.startsWith("/catalogo/publico")) return null;

  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link href="/" aria-label="L. Augusto Atacado — início">
          <BrandLogo variant="full" size="sm" />
        </Link>
        {me && (
          <nav className="flex items-center gap-1 text-sm font-medium text-zinc-600">
            <Link href="/leads" className="rounded-md px-3 py-1.5 hover:bg-zinc-100 hover:text-zinc-900">Leads</Link>
            <Link href="/funil" className="rounded-md px-3 py-1.5 hover:bg-zinc-100 hover:text-zinc-900">Funil</Link>
            <Link href="/catalogo" className="rounded-md px-3 py-1.5 hover:bg-zinc-100 hover:text-zinc-900">Catálogo</Link>
            {me.role === "ADMIN" && (
              <>
                <Link href="/usuarios" className="rounded-md px-3 py-1.5 hover:bg-zinc-100 hover:text-zinc-900">Usuários</Link>
                <Link href="/auditoria" className="rounded-md px-3 py-1.5 hover:bg-zinc-100 hover:text-zinc-900">Auditoria</Link>
              </>
            )}
            <span className="mx-2 h-4 w-px bg-zinc-200" />
            <span className="hidden text-zinc-400 sm:inline">{me.name ?? me.email}</span>
            <LogoutButton email={me.email} />
          </nav>
        )}
      </div>
    </header>
  );
}
