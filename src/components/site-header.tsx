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
      {/* Abaixo de lg a barra tem duas linhas: logo + "Ver loja"/"Sair" em cima e os
          links numa faixa rolável de ponta a ponta embaixo. Numa linha só, os links
          ficavam espremidos ao lado da logo e o "Sair" sumia no fim da rolagem.
          Abaixo de lg o wrapper externo é "contents" (nav e ações viram itens da
          barra e o order-last manda a nav pra segunda linha); no lg ele volta a
          ser a faixa rolável e quem vira "contents" é o grupo de ações, então tudo
          fica numa linha só ao lado da logo, como antes. */}
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-4 px-4 sm:px-6 lg:h-14 lg:flex-nowrap">
        <Link href={me ? "/painel" : "/"} aria-label="ROTA Atacado — início do painel" className="shrink-0 py-2 lg:py-0">
          <BrandLogo size="sm" logoUrl={brand?.logoUrl} markUrl={brand?.markUrl} />
        </Link>
        {me && (
          <div className="contents text-[13px] font-medium lg:flex lg:min-w-0 lg:items-center lg:gap-0.5 lg:overflow-x-auto lg:[scrollbar-width:none]">
            {/* No celular: a faixa vaza até a borda da tela (-mx + largura extra) e o
                pl menor alinha o texto do primeiro link com a logo. O esmaecido na
                borda direita avisa que há mais links rolando (sem ele, em 320px a
                faixa parecia terminar em "Prospecção"); o pr-6 tira o último link
                do esmaecido quando a rolagem chega ao fim. */}
            <nav className="order-last -mx-4 flex w-[calc(100%+2rem)] items-center gap-0.5 overflow-x-auto pb-1 pl-1.5 pr-6 [mask-image:linear-gradient(to_right,#000_calc(100%_-_1.5rem),transparent)] [scrollbar-width:none] sm:-mx-6 sm:w-[calc(100%+3rem)] sm:pl-3.5 lg:order-none lg:mx-0 lg:w-auto lg:shrink-0 lg:overflow-visible lg:px-0 lg:pb-0 lg:[mask-image:none]">
              {LINKS.filter((l) => !l.admin || me.role === "ADMIN").map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  aria-current={ativo(l.href) ? "page" : undefined}
                  className={`shrink-0 rounded-md px-2.5 py-2.5 transition-colors lg:py-1.5 ${
                    ativo(l.href) ? "bg-white/10 text-creme" : "hover:bg-white/5 hover:text-creme"
                  }`}
                >
                  {l.label}
                </Link>
              ))}
            </nav>
            <div className="-mr-2.5 flex shrink-0 items-center gap-0.5 lg:contents">
              <span className="mx-2 hidden h-4 w-px shrink-0 bg-white/10 lg:block" aria-hidden />
              <Link
                href="/"
                target="_blank"
                className="shrink-0 rounded-md px-2.5 py-2.5 text-cobre hover:bg-white/5 lg:py-1.5"
                title="Abrir a loja pública em outra aba"
              >
                Ver loja ↗
              </Link>
              <span className="hidden shrink-0 pl-2 text-nevoa lg:inline">{me.name ?? me.email}</span>
              <span className="hidden shrink-0 pl-2 text-[10px] text-nevoa/70 lg:inline" title="Versão do sistema">
                v{APP_VERSION}
              </span>
              <LogoutButton email={me.email} />
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
