"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import BrandLogo from "@/components/brand-logo";
import LogoutButton from "@/components/logout-button";
import { APP_VERSION } from "@/lib/version";

type Me = { email: string; role: string; name: string | null };
type Brand = { logoUrl: string | null; markUrl: string | null };

const LINKS: { href: string; label: string; admin?: boolean }[] = [
  { href: "/painel", label: "Início" },
  { href: "/pedidos", label: "Pedidos" },
  { href: "/leads", label: "Leads" },
  { href: "/funil", label: "Funil" },
  { href: "/prospeccao", label: "Prospecção" },
  { href: "/catalogo", label: "Catálogo" },
  { href: "/fornecedores", label: "Fornecedores" },
  { href: "/conteudo", label: "Sobre" },
  { href: "/usuarios", label: "Usuários", admin: true },
  { href: "/auditoria", label: "Auditoria", admin: true },
];

// Barra do painel em asfalto: a mesma logo creme+cobre da loja, sem precisar de
// uma segunda versão da marca para fundo claro. O conteúdo abaixo segue claro
// (tabelas e formulários leem melhor assim).
export default function SiteHeader({ me, brand }: { me: Me | null; brand?: Brand }) {
  const pathname = usePathname() ?? "";
  const ativo = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-asfalto text-creme-2">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href={me ? "/painel" : "/"} aria-label="ROTA Atacado — início do painel" className="shrink-0">
          <BrandLogo size="sm" logoUrl={brand?.logoUrl} markUrl={brand?.markUrl} />
        </Link>
        {me && (
          <nav className="flex min-w-0 items-center gap-0.5 overflow-x-auto text-[13px] font-medium [scrollbar-width:none]">
            {LINKS.filter((l) => !l.admin || me.role === "ADMIN").map((l) => (
              <Link
                key={l.href}
                href={l.href}
                aria-current={ativo(l.href) ? "page" : undefined}
                className={`shrink-0 rounded-md px-2.5 py-1.5 transition-colors ${
                  ativo(l.href) ? "bg-white/10 text-creme" : "hover:bg-white/5 hover:text-creme"
                }`}
              >
                {l.label}
              </Link>
            ))}
            <span className="mx-2 h-4 w-px shrink-0 bg-white/10" aria-hidden />
            <Link
              href="/"
              target="_blank"
              className="shrink-0 rounded-md px-2.5 py-1.5 text-cobre hover:bg-white/5"
              title="Abrir a loja pública em outra aba"
            >
              Ver loja ↗
            </Link>
            <span className="hidden shrink-0 pl-2 text-nevoa lg:inline">{me.name ?? me.email}</span>
            <span className="hidden shrink-0 pl-2 text-[10px] text-nevoa/70 lg:inline" title="Versão do sistema">
              v{APP_VERSION}
            </span>
            <LogoutButton email={me.email} />
          </nav>
        )}
      </div>
    </header>
  );
}
