// Card de produto — o componente mais repetido da loja. Sem JavaScript: a troca
// de foto no hover é CSS puro.
import Link from "next/link";
import { CATEGORY_LABEL } from "@/lib/categories";
import { faixaPreco } from "@/lib/loja/formato";
import type { ProdutoLoja } from "@/lib/loja/tipos";
import { ROTAS } from "@/lib/site";
import { Selo } from "./ui";

export default function CartaoProduto({
  produto: p,
  prioridade = false,
  className = "",
}: {
  produto: ProdutoLoja;
  /** true só nos primeiros cards visíveis (entram no LCP). */
  prioridade?: boolean;
  className?: string;
}) {
  const [capa, verso] = p.imagens;
  const categoria = p.categorias[0] ? CATEGORY_LABEL[p.categorias[0]] : null;
  const preco = faixaPreco(p.precoMin, p.precoMax);

  return (
    <Link
      href={ROTAS.produto(p.id)}
      className={`group block rounded-2xl outline-offset-4 ${className}`}
      aria-label={`${p.nome} — ${preco}`}
    >
      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-grafite ring-1 ring-white/[0.04]">
        {capa ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={capa}
              alt=""
              width={800}
              height={1000}
              loading={prioridade ? "eager" : "lazy"}
              fetchPriority={prioridade ? "high" : "auto"}
              decoding="async"
              className="h-full w-full object-cover transition-transform duration-[900ms] ease-[cubic-bezier(.22,1,.36,1)] group-hover:scale-[1.045]"
            />
            {verso && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={verso}
                alt=""
                width={800}
                height={1000}
                loading="lazy"
                decoding="async"
                className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100"
              />
            )}
          </>
        ) : p.videos[0] ? (
          <video src={p.videos[0]} muted playsInline preload="metadata" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-nevoa">sem foto</div>
        )}

        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {p.novo && <Selo>Novo</Selo>}
          {p.prontaEntrega && <Selo tom="creme">Pronta-entrega</Selo>}
        </div>

        {/* Escurece a base pra "Ver peça" ler bem sobre qualquer foto */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-asfalto/70 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
        <span className="absolute bottom-3 left-3 right-3 translate-y-2 rounded-full bg-creme/95 py-2.5 text-center text-sm font-medium text-asfalto opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100 max-md:hidden">
          Ver peça e montar grade
        </span>
      </div>

      <div className="mt-4 space-y-1.5 px-0.5">
        {categoria && <p className="text-[0.7rem] uppercase tracking-[0.22em] text-nevoa">{categoria}</p>}
        <h3 className="line-clamp-2 text-[1.02rem] font-medium leading-snug text-creme transition-colors group-hover:text-cobre-claro">
          {p.nome}
        </h3>
        <p className="rota-num font-display text-[0.95rem] font-medium text-cobre-claro">{preco}</p>
        <div className="flex items-center gap-3 pt-0.5 text-[0.8rem] text-nevoa">
          <span>mín. {p.minimo} pç</span>
          {p.cores.length > 0 && (
            <span className="flex items-center gap-1" aria-label={`Cores: ${p.cores.map((c) => c.nome).join(", ")}`}>
              {p.cores.slice(0, 5).map((c, i) => (
                <span
                  key={i}
                  className="h-3 w-3 rounded-full ring-1 ring-white/25"
                  style={{ backgroundColor: c.hex }}
                  aria-hidden
                />
              ))}
              {p.cores.length > 5 && <span aria-hidden>+{p.cores.length - 5}</span>}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
