// Vitrine (lista de produtos) — usada por /loja e /loja/[categoria].
// Filtros são links e formulários GET: a URL descreve a vitrine inteira, então
// dá pra compartilhar uma busca no WhatsApp e o Google entende cada categoria.
import Link from "next/link";
import { WhatsAppIcon } from "@/components/whatsapp-icon";
import { ORDENS, type Ordem } from "@/lib/loja/catalogo";
import { linkWhatsapp } from "@/lib/loja/formato";
import type { ProdutoLoja } from "@/lib/loja/tipos";
import { ROTAS, SITE } from "@/lib/site";
import CartaoProduto from "./cartao-produto";
import Estrada from "./estrada";
import { IconeBusca, IconeCheck } from "./icones";
import Ordenacao from "./ordenacao";
import { BotaoLink, Container } from "./ui";

export type FiltrosVitrine = { q: string; ordem: Ordem; pronta: boolean };

/** Lê os filtros da URL com segurança (qualquer lixo vira o padrão). */
export function lerFiltros(sp: Record<string, string | string[] | undefined>): FiltrosVitrine {
  const um = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  const ordem = um(sp.ordem);
  return {
    q: um(sp.q).trim().slice(0, 80),
    ordem: (ORDENS.some((o) => o.valor === ordem) ? ordem : "novidades") as Ordem,
    pronta: um(sp.pronta) === "1",
  };
}

/** Monta a URL da vitrine mantendo os filtros (valores padrão ficam fora da URL). */
function urlVitrine(caminho: string, f: Partial<FiltrosVitrine>): string {
  const qs = new URLSearchParams();
  if (f.q) qs.set("q", f.q);
  if (f.ordem && f.ordem !== "novidades") qs.set("ordem", f.ordem);
  if (f.pronta) qs.set("pronta", "1");
  const s = qs.toString();
  return s ? `${caminho}?${s}` : caminho;
}

export default function Vitrine({
  titulo,
  kicker,
  descricao,
  caminho,
  categoriaAtual,
  categorias,
  produtos,
  filtros,
  whatsapp,
}: {
  titulo: string;
  kicker: string;
  descricao: string;
  caminho: string;
  categoriaAtual: string | null;
  categorias: { slug: string; label: string; total: number }[];
  produtos: ProdutoLoja[];
  filtros: FiltrosVitrine;
  whatsapp: string | null;
}) {
  const manter: Record<string, string> = {};
  if (filtros.q) manter.q = filtros.q;
  if (filtros.pronta) manter.pronta = "1";

  return (
    <>
      {/* Cabeça da vitrine */}
      <section className="relative isolate overflow-hidden border-b border-white/[0.06]">
        <Estrada className="absolute inset-x-0 bottom-0 -z-10 h-full w-full opacity-25" intensidade={0.6} />
        <Container className="pb-12 pt-10 sm:pb-16 sm:pt-16">
          <nav aria-label="Você está em" className="text-[0.8rem] text-nevoa">
            <ol className="flex flex-wrap items-center gap-2">
              <li>
                <Link href={ROTAS.inicio} className="hover:text-creme">
                  Início
                </Link>
              </li>
              <li aria-hidden>/</li>
              {categoriaAtual ? (
                <>
                  <li>
                    <Link href={ROTAS.loja} className="hover:text-creme">
                      Loja
                    </Link>
                  </li>
                  <li aria-hidden>/</li>
                  <li aria-current="page" className="text-creme-2">
                    {titulo}
                  </li>
                </>
              ) : (
                <li aria-current="page" className="text-creme-2">
                  Loja
                </li>
              )}
            </ol>
          </nav>
          <p className="rota-kicker mt-8">{kicker}</p>
          <h1 className="mt-4 font-display text-[clamp(2.2rem,5.4vw,4.4rem)] font-semibold leading-[1] tracking-[-0.04em] text-creme">
            {titulo}
          </h1>
          <p className="mt-5 max-w-2xl text-[1.0625rem] leading-relaxed text-creme-2">{descricao}</p>

          {/* Busca dentro da vitrine */}
          <form action={caminho} method="get" role="search" className="relative mt-9 max-w-xl">
            {filtros.ordem !== "novidades" && <input type="hidden" name="ordem" value={filtros.ordem} />}
            {filtros.pronta && <input type="hidden" name="pronta" value="1" />}
            <label htmlFor="rota-busca-vitrine" className="sr-only">
              Buscar {categoriaAtual ? `em ${titulo}` : "peças"}
            </label>
            <IconeBusca className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-nevoa" />
            <input
              id="rota-busca-vitrine"
              name="q"
              type="search"
              defaultValue={filtros.q}
              maxLength={80}
              placeholder={categoriaAtual ? `Buscar em ${titulo}` : "Buscar por nome: calça, short, vestido…"}
              className="h-14 w-full rounded-full border border-white/10 bg-asfalto/60 pl-14 pr-32 text-base text-creme backdrop-blur-md placeholder:text-nevoa focus:border-cobre/60 focus:outline-none"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 h-11 -translate-y-1/2 rounded-full bg-cobre px-5 text-sm font-medium text-asfalto hover:bg-cobre-claro"
            >
              Buscar
            </button>
          </form>
        </Container>
      </section>

      {/* Filtros: categorias + pronta-entrega + ordem */}
      <div className="sticky top-[4.25rem] z-30 border-b border-white/[0.06] bg-asfalto/85 backdrop-blur-xl lg:top-20">
        <Container className="flex flex-col gap-3 py-3 md:flex-row md:items-center md:justify-between">
          <nav aria-label="Categorias" className="-mx-5 overflow-x-auto px-5 rota-sem-barra sm:-mx-8 sm:px-8 md:mx-0 md:px-0">
            <ul className="flex w-max items-center gap-2">
              <li>
                <Chip href={urlVitrine(ROTAS.loja, filtros)} ativo={!categoriaAtual}>
                  Tudo
                </Chip>
              </li>
              {categorias.map((c) => (
                <li key={c.slug}>
                  <Chip href={urlVitrine(ROTAS.categoria(c.slug), filtros)} ativo={categoriaAtual === c.slug}>
                    {c.label}
                  </Chip>
                </li>
              ))}
            </ul>
          </nav>
          <div className="flex items-center justify-between gap-4 md:justify-end">
            <Link
              href={urlVitrine(caminho, { ...filtros, pronta: !filtros.pronta })}
              aria-pressed={filtros.pronta}
              className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-sm transition-colors ${
                filtros.pronta
                  ? "border-cobre bg-cobre/10 text-cobre-claro"
                  : "border-white/10 text-creme-2 hover:border-white/25 hover:text-creme"
              }`}
            >
              <span
                aria-hidden
                className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                  filtros.pronta ? "border-cobre bg-cobre text-asfalto" : "border-white/30"
                }`}
              >
                {filtros.pronta && <IconeCheck className="h-3 w-3" />}
              </span>
              Pronta-entrega
            </Link>
            <Ordenacao acao={caminho} atual={filtros.ordem} opcoes={ORDENS} manter={manter} />
          </div>
        </Container>
      </div>

      <Container className="pt-10 sm:pt-14">
        <p className="text-sm text-nevoa" aria-live="polite">
          {produtos.length} {produtos.length === 1 ? "modelo" : "modelos"}
          {filtros.q && (
            <>
              {" "}
              para <span className="text-creme">“{filtros.q}”</span> ·{" "}
              <Link href={urlVitrine(caminho, { ...filtros, q: "" })} className="text-cobre-claro underline underline-offset-4">
                limpar busca
              </Link>
            </>
          )}
        </p>

        {produtos.length > 0 ? (
          <ul className="mt-8 grid grid-cols-2 gap-x-4 gap-y-12 sm:gap-x-6 md:grid-cols-3 xl:grid-cols-4">
            {produtos.map((p, i) => (
              <li key={p.id}>
                <CartaoProduto produto={p} prioridade={i < 4} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-8 rounded-3xl border border-dashed border-white/10 px-6 py-16 text-center sm:py-24">
            <p className="font-display text-[1.5rem] font-medium text-creme">Nada por aqui ainda.</p>
            <p className="mx-auto mt-3 max-w-md text-creme-2">
              {filtros.q
                ? "Tente outra palavra ou veja todas as peças. Se procura algo específico, pergunte — as fábricas do polo produzem muito mais do que cabe na vitrine."
                : "Essa seção está sendo abastecida. Enquanto isso, veja o que já chegou."}
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <BotaoLink href={ROTAS.loja} seta>
                Ver todas as peças
              </BotaoLink>
              {whatsapp && (
                <a
                  href={linkWhatsapp(
                    whatsapp,
                    `Olá! Estou procurando ${filtros.q ? `"${filtros.q}"` : "uma peça"} no site da ${SITE.nome}. Vocês têm?`,
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-creme/20 px-6 py-3.5 text-[0.95rem] font-medium text-creme hover:border-cobre"
                >
                  <WhatsAppIcon className="h-4 w-4" />
                  Perguntar no WhatsApp
                </a>
              )}
            </div>
          </div>
        )}
      </Container>
    </>
  );
}

function Chip({ href, ativo, children }: { href: string; ativo: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={ativo ? "page" : undefined}
      className={`inline-flex h-10 items-center rounded-full px-4 text-sm transition-colors ${
        ativo ? "bg-creme text-asfalto" : "border border-white/10 text-creme-2 hover:border-white/25 hover:text-creme"
      }`}
    >
      {children}
    </Link>
  );
}
