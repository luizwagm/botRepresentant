"use client";

// Topo da loja: faixa de aviso, marca, navegação (com o "mega-menu" de
// categorias), busca e a sacola com o total de peças. No celular vira uma gaveta
// em <dialog> — foco preso, Esc e fundo inerte vêm do próprio navegador.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import BrandLogo from "@/components/brand-logo";
import { useCarrinho } from "@/lib/loja/carrinho";
import { ROTAS, SITE } from "@/lib/site";
import { IconeBusca, IconeFechar, IconeMenu, IconeSacola, IconeSeta } from "./icones";

export type CategoriaMenu = { slug: string; label: string; total: number; capa: string | null };

const LINKS = [
  { href: ROTAS.inicio, rotulo: "Início" },
  { href: ROTAS.loja, rotulo: "Loja" },
  { href: "/#como-comprar", rotulo: "Como comprar" },
  { href: ROTAS.sobre, rotulo: "Sobre" },
];

export default function Cabecalho({
  logoUrl,
  categorias,
}: {
  logoUrl: string | null;
  categorias: CategoriaMenu[];
}) {
  const pathname = usePathname() ?? "/";
  const { pecas } = useCarrinho();
  const gaveta = useRef<HTMLDialogElement>(null);
  // O mega-menu guarda EM QUE página foi aberto: mudou a página, ele se fecha
  // sozinho — sem setState dentro de efeito.
  const [megaEm, setMegaEm] = useState<string | null>(null);
  const megaAberto = megaEm === pathname;
  const setMegaAberto = (v: boolean | ((atual: boolean) => boolean)) =>
    setMegaEm((atual) => {
      const aberto = typeof v === "function" ? v(atual === pathname) : v;
      return aberto ? pathname : null;
    });

  // Trocou de página (inclusive pelo "voltar"): a gaveta do celular fecha.
  useEffect(() => {
    gaveta.current?.close();
  }, [pathname]);

  const ativo = (href: string) =>
    href === "/" ? pathname === "/" : !href.includes("#") && (pathname === href || pathname.startsWith(href + "/"));

  return (
    <>
      {/* Faixa de aviso — só fatos que valem para todo pedido */}
      <div className="border-b border-white/[0.06] bg-carvao text-[0.78rem] text-creme-2">
        <div className="mx-auto flex h-9 max-w-[1320px] items-center justify-center gap-3 px-5 sm:px-8">
          <span className="truncate">
            <span className="text-cobre-claro">Direto do Polo do Agreste</span>
            <span className="hidden sm:inline">
              <span className="mx-2.5 text-nevoa" aria-hidden>
                /
              </span>
              Atacado para lojistas de todo o Brasil
            </span>
            <span className="mx-2.5 text-nevoa" aria-hidden>
              /
            </span>
            Pedido fechado no WhatsApp
          </span>
        </div>
      </div>

      <header className="rota-topo sticky top-0 z-50">
        <div className="mx-auto flex h-[4.25rem] max-w-[1320px] items-center gap-4 px-5 sm:px-8 lg:h-20">
          <Link href={ROTAS.inicio} aria-label={`${SITE.nome} — página inicial`} className="shrink-0 rounded-md">
            <BrandLogo size="sm" logoUrl={logoUrl} priority className="sm:h-9 lg:h-11" />
          </Link>

          {/* Navegação de desktop */}
          <nav aria-label="Principal" className="ml-4 hidden items-center gap-0.5 lg:flex xl:ml-10 xl:gap-1">
            {LINKS.slice(0, 2).map((l) => (
              <LinkTopo key={l.href} href={l.href} ativo={ativo(l.href)}>
                {l.rotulo}
              </LinkTopo>
            ))}

            {categorias.length > 0 && (
              <div
                className="relative"
                onMouseEnter={() => setMegaAberto(true)}
                onMouseLeave={() => setMegaAberto(false)}
                onKeyDown={(e) => e.key === "Escape" && setMegaAberto(false)}
                onBlur={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setMegaAberto(false);
                }}
              >
                <button
                  type="button"
                  aria-expanded={megaAberto}
                  aria-controls="rota-mega"
                  onClick={() => setMegaAberto((v) => !v)}
                  className={`whitespace-nowrap rounded-full px-3 py-2 text-[0.93rem] transition-colors xl:px-4 ${
                    megaAberto || pathname.startsWith("/loja/") ? "text-creme" : "text-creme-2 hover:text-creme"
                  }`}
                >
                  Categorias
                  <span
                    aria-hidden
                    className={`ml-1.5 inline-block text-[0.6rem] text-cobre transition-transform ${megaAberto ? "rotate-180" : ""}`}
                  >
                    ▼
                  </span>
                </button>

                {/* Mega-menu: categorias com a foto da peça mais recente */}
                <div
                  id="rota-mega"
                  hidden={!megaAberto}
                  className="absolute left-1/2 top-full w-[min(760px,80vw)] -translate-x-1/2 pt-4"
                >
                  <div className="rounded-3xl border border-white/[0.07] bg-carvao/95 p-5 shadow-[0_40px_80px_-30px_rgba(0,0,0,.9)] backdrop-blur-xl">
                    <ul className="grid grid-cols-3 gap-2">
                      {categorias.map((c) => (
                        <li key={c.slug}>
                          <Link
                            href={ROTAS.categoria(c.slug)}
                            className="group flex items-center gap-3 rounded-2xl p-2 transition-colors hover:bg-white/[0.04]"
                          >
                            <span className="h-14 w-11 shrink-0 overflow-hidden rounded-lg bg-grafite">
                              {c.capa && (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img src={c.capa} alt="" loading="lazy" className="h-full w-full object-cover" />
                              )}
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate text-[0.95rem] text-creme group-hover:text-cobre-claro">
                                {c.label}
                              </span>
                              <span className="text-[0.75rem] text-nevoa">
                                {c.total} {c.total === 1 ? "modelo" : "modelos"}
                              </span>
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                    <Link
                      href={ROTAS.loja}
                      className="mt-4 flex items-center justify-between rounded-2xl bg-white/[0.03] px-4 py-3 text-sm text-creme-2 hover:text-creme"
                    >
                      Ver todas as peças
                      <IconeSeta className="h-4 w-4 text-cobre" />
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {LINKS.slice(2).map((l) => (
              <LinkTopo key={l.href} href={l.href} ativo={ativo(l.href)}>
                {l.rotulo}
              </LinkTopo>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            {/* Busca: formulário GET comum — funciona até sem JavaScript */}
            <form action={ROTAS.loja} role="search" className="relative hidden md:block">
              <label htmlFor="rota-busca-topo" className="sr-only">
                Buscar peças
              </label>
              <IconeBusca className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-nevoa" />
              <input
                id="rota-busca-topo"
                name="q"
                type="search"
                placeholder="Buscar peças"
                maxLength={80}
                autoComplete="off"
                className="h-10 w-40 rounded-full border border-white/10 bg-white/[0.03] pl-10 pr-4 text-sm text-creme placeholder:text-nevoa transition-[width,border-color] duration-300 focus:w-52 focus:border-cobre/60 focus:outline-none lg:w-40 xl:w-52 xl:focus:w-60"
              />
            </form>

            <Link
              href={ROTAS.carrinho}
              aria-label={pecas > 0 ? `Meu pedido: ${pecas} peças` : "Meu pedido (vazio)"}
              className="relative flex h-11 items-center gap-2 rounded-full px-3 text-creme transition-colors hover:bg-white/[0.05] sm:px-4"
            >
              <IconeSacola className="h-[1.35rem] w-[1.35rem]" />
              <span className="hidden text-sm sm:inline">Pedido</span>
              {pecas > 0 && (
                <span className="rota-num absolute -right-0.5 top-0.5 min-w-[1.35rem] rounded-full bg-cobre px-1.5 text-center text-[0.7rem] font-semibold leading-[1.35rem] text-asfalto sm:static sm:ml-0.5">
                  {pecas > 999 ? "999+" : pecas}
                </span>
              )}
            </Link>

            <button
              type="button"
              onClick={() => gaveta.current?.showModal()}
              aria-label="Abrir menu"
              aria-haspopup="dialog"
              className="flex h-11 w-11 items-center justify-center rounded-full text-creme hover:bg-white/[0.05] lg:hidden"
            >
              <IconeMenu className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* A estrada avança com a rolagem */}
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-px overflow-hidden">
          <div className="rota-progresso h-full w-full bg-gradient-to-r from-cobre-escuro via-cobre to-cobre-claro" />
        </div>
      </header>

      {/* Gaveta do celular */}
      <dialog
        ref={gaveta}
        aria-label="Menu"
        className="rota-gaveta m-0 h-dvh max-h-none w-full max-w-none bg-asfalto p-0 text-creme"
        onClick={(e) => {
          // Clique fora do conteúdo (no próprio <dialog>) fecha.
          if (e.target === e.currentTarget) e.currentTarget.close();
        }}
      >
        <div className="flex h-full flex-col overflow-y-auto px-6 pb-10 pt-5">
          <div className="flex items-center justify-between">
            <BrandLogo size="sm" logoUrl={logoUrl} />
            <button
              type="button"
              onClick={() => gaveta.current?.close()}
              aria-label="Fechar menu"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10"
            >
              <IconeFechar className="h-5 w-5" />
            </button>
          </div>

          <form action={ROTAS.loja} role="search" className="relative mt-8">
            <label htmlFor="rota-busca-gaveta" className="sr-only">
              Buscar peças
            </label>
            <IconeBusca className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-nevoa" />
            <input
              id="rota-busca-gaveta"
              name="q"
              type="search"
              placeholder="O que a sua loja procura?"
              maxLength={80}
              className="h-14 w-full rounded-2xl border border-white/10 bg-white/[0.03] pl-12 pr-4 text-base text-creme placeholder:text-nevoa focus:border-cobre/60 focus:outline-none"
            />
          </form>

          <nav aria-label="Menu do celular" className="mt-8">
            <ul className="divide-y divide-white/[0.06] border-y border-white/[0.06]">
              {LINKS.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    onClick={() => gaveta.current?.close()}
                    aria-current={ativo(l.href) ? "page" : undefined}
                    className="flex items-center justify-between py-4 font-display text-[1.45rem] font-medium tracking-[-0.01em] aria-[current=page]:text-cobre-claro"
                  >
                    {l.rotulo}
                    <IconeSeta className="h-5 w-5 text-cobre" />
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {categorias.length > 0 && (
            <div className="mt-9">
              <p className="rota-kicker">Categorias</p>
              <ul className="mt-4 flex flex-wrap gap-2">
                {categorias.map((c) => (
                  <li key={c.slug}>
                    <Link
                      href={ROTAS.categoria(c.slug)}
                      onClick={() => gaveta.current?.close()}
                      className="inline-flex rounded-full border border-white/10 px-4 py-2.5 text-sm text-creme-2"
                    >
                      {c.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="mt-auto pt-10 text-sm leading-relaxed text-nevoa">
            {SITE.slogan}. Peças das fábricas do {SITE.regiao}, com o pedido montado aqui e fechado no WhatsApp.
          </p>
        </div>
      </dialog>
    </>
  );
}

function LinkTopo({ href, ativo, children }: { href: string; ativo: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={ativo ? "page" : undefined}
      className={`relative whitespace-nowrap rounded-full px-3 py-2 text-[0.93rem] transition-colors xl:px-4 ${
        ativo ? "text-creme" : "text-creme-2 hover:text-creme"
      }`}
    >
      {children}
      {ativo && <span aria-hidden className="absolute inset-x-3 -bottom-0.5 h-px bg-cobre xl:inset-x-4" />}
    </Link>
  );
}
