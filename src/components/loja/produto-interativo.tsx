"use client";

// Página de produto — a parte viva: galeria, escolha de cor e a montagem da
// grade (tamanho × quantidade). Todas as cores ficam guardadas enquanto o
// lojista alterna entre elas; "Adicionar" leva tudo de uma vez pro pedido.
//
// O pedido mínimo é por MODELO: conta o que já está no carrinho + a seleção
// atual, somando cores e tamanhos.
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { WhatsAppIcon } from "@/components/whatsapp-icon";
import { MAX_ITENS, useCarrinho } from "@/lib/loja/carrinho";
import { dinheiro, faixaPreco, linkWhatsapp, pecasPorProduto } from "@/lib/loja/formato";
import { TAMANHO_UNICO, type ProdutoLoja } from "@/lib/loja/tipos";
import { ROTAS } from "@/lib/site";
import { IconeCheck, IconeMais, IconeMenos, IconeSacola, IconeSeta } from "./icones";

type Midia = { tipo: "imagem" | "video"; url: string };
const MAX = 9999;

export default function ProdutoInterativo({
  produto: p,
  categoria,
  whatsapp,
  urlProduto,
}: {
  produto: ProdutoLoja;
  categoria: { slug: string; label: string } | null;
  whatsapp: string | null;
  urlProduto: string;
}) {
  const midias = useMemo<Midia[]>(
    () => [
      ...p.imagens.map((url) => ({ tipo: "imagem" as const, url })),
      ...p.videos.map((url) => ({ tipo: "video" as const, url })),
    ],
    [p.imagens, p.videos],
  );
  const tamanhos = p.tamanhos.length ? p.tamanhos : [TAMANHO_UNICO];
  const unico = tamanhos.length === 1 && tamanhos[0] === TAMANHO_UNICO;

  const { itens, adicionar } = useCarrinho();
  const [indice, setIndice] = useState(0);
  const [corAtiva, setCorAtiva] = useState(p.cores[0]?.nome ?? "");
  // cor → tamanho → peças
  const [grade, setGrade] = useState<Record<string, Record<string, number>>>({});
  const [adicionadas, setAdicionadas] = useState<number | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [cheio, setCheio] = useState(false);
  const trilho = useRef<HTMLUListElement>(null);
  const montagem = useRef<HTMLDivElement>(null);

  // ------------------------------------------------------------------ galeria
  const suave = (): ScrollBehavior =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";

  function irPara(i: number) {
    const el = trilho.current;
    if (!el || midias.length === 0) return;
    const alvo = (i + midias.length) % midias.length;
    el.scrollTo({ left: alvo * el.clientWidth, behavior: suave() });
    setIndice(alvo);
  }

  function escolherCor(nome: string) {
    setCorAtiva(nome);
    setAdicionadas(null);
    const img = p.cores.find((c) => c.nome === nome)?.imagem;
    const i = img ? midias.findIndex((m) => m.url === img) : -1;
    if (i >= 0) irPara(i);
  }

  // ------------------------------------------------------------------- grade
  const gradeCor = grade[corAtiva] ?? {};
  function definir(tamanho: string, qtd: number) {
    const n = Math.max(0, Math.min(MAX, Math.floor(qtd) || 0));
    setAdicionadas(null);
    setCheio(false);
    setGrade((g) => {
      const cor = { ...(g[corAtiva] ?? {}) };
      if (n) cor[tamanho] = n;
      else delete cor[tamanho];
      return { ...g, [corAtiva]: cor };
    });
  }
  function umaDeCada() {
    setAdicionadas(null);
    setGrade((g) => {
      const cor = { ...(g[corAtiva] ?? {}) };
      for (const t of tamanhos) cor[t] = Math.min(MAX, (cor[t] ?? 0) + 1);
      return { ...g, [corAtiva]: cor };
    });
  }

  const pecasDaCor = (nome: string) => Object.values(grade[nome] ?? {}).reduce((s, q) => s + q, 0);
  const selecionadas = Object.keys(grade).reduce((s, c) => s + pecasDaCor(c), 0);
  const noPedido = pecasPorProduto(itens).get(p.id) ?? 0;
  const acumulado = noPedido + selecionadas;
  const faltam = Math.max(0, p.minimo - acumulado);
  const progresso = Math.min(1, acumulado / p.minimo);

  function adicionarAoPedido() {
    if (selecionadas === 0) {
      montagem.current?.scrollIntoView({ behavior: suave(), block: "center" });
      return;
    }
    let entraram = 0;
    const sobrou: Record<string, Record<string, number>> = {};
    for (const [nomeCor, g] of Object.entries(grade)) {
      const limpa = Object.fromEntries(Object.entries(g).filter(([, q]) => q > 0));
      if (Object.keys(limpa).length === 0) continue;
      const cor = p.cores.find((c) => c.nome === nomeCor) ?? null;
      const coube = adicionar({
        produtoId: p.id,
        nome: p.nome,
        imagem: cor?.imagem ?? p.imagens[0] ?? null,
        cor: cor ? { nome: cor.nome, hex: cor.hex } : null,
        grade: limpa,
        minimo: p.minimo,
        precoMin: p.precoMin,
        precoMax: p.precoMax,
      });
      if (coube) entraram += Object.values(limpa).reduce((s, q) => s + q, 0);
      else sobrou[nomeCor] = limpa;
    }
    setAdicionadas(entraram);
    // O que não coube continua na tela — nada some sem aviso.
    setGrade(sobrou);
    setCheio(Object.keys(sobrou).length > 0);
  }

  async function compartilhar() {
    const dados = { title: p.nome, text: `${p.nome} — ${faixaPreco(p.precoMin, p.precoMax)} no atacado`, url: urlProduto };
    try {
      if (navigator.share) await navigator.share(dados);
      else {
        await navigator.clipboard.writeText(urlProduto);
        setCopiado(true);
        setTimeout(() => setCopiado(false), 2500);
      }
    } catch {
      /* compartilhamento cancelado */
    }
  }

  const desconto =
    p.precoVarejo && p.precoMin && p.precoVarejo > p.precoMin
      ? Math.round((1 - p.precoMin / p.precoVarejo) * 100)
      : null;
  const estimativaSel =
    p.precoMin !== null || p.precoMax !== null
      ? {
          min: selecionadas * (p.precoMin ?? p.precoMax!),
          max: selecionadas * (p.precoMax ?? p.precoMin!),
        }
      : null;
  const waDuvida = whatsapp
    ? linkWhatsapp(whatsapp, `Olá! Tenho uma dúvida sobre este modelo: ${p.nome}\n${urlProduto}`)
    : null;

  return (
    <>
      <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
        {/* ============================== GALERIA ============================== */}
        <div className="lg:col-span-7">
          <div className="relative">
            <ul
              ref={trilho}
              tabIndex={0}
              aria-label={`Fotos de ${p.nome}`}
              aria-roledescription="carrossel"
              onScroll={(e) => {
                const el = e.currentTarget;
                const i = Math.round(el.scrollLeft / Math.max(1, el.clientWidth));
                if (i !== indice) setIndice(i);
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowRight") {
                  e.preventDefault();
                  irPara(indice + 1);
                }
                if (e.key === "ArrowLeft") {
                  e.preventDefault();
                  irPara(indice - 1);
                }
              }}
              className="rota-sem-barra flex aspect-[4/5] snap-x snap-mandatory overflow-x-auto overscroll-x-contain rounded-[1.75rem] bg-grafite ring-1 ring-white/[0.06] sm:aspect-[5/6]"
            >
              {midias.length === 0 && (
                <li className="flex w-full shrink-0 items-center justify-center text-nevoa">sem foto</li>
              )}
              {midias.map((m, i) => (
                <li
                  key={`${i}-${m.url}`}
                  className="w-full shrink-0 snap-center"
                  aria-roledescription="slide"
                  aria-label={`${i + 1} de ${midias.length}`}
                >
                  {m.tipo === "imagem" ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={m.url}
                      alt={i === 0 ? p.nome : `${p.nome} — foto ${i + 1}`}
                      width={900}
                      height={1080}
                      loading={i === 0 ? "eager" : "lazy"}
                      fetchPriority={i === 0 ? "high" : "auto"}
                      decoding="async"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <video src={m.url} controls playsInline preload="metadata" className="h-full w-full bg-black object-contain" />
                  )}
                </li>
              ))}
            </ul>

            <div className="pointer-events-none absolute left-4 top-4 flex flex-wrap gap-1.5">
              {p.novo && (
                <span className="rounded-full bg-cobre px-3 py-1 text-[0.7rem] font-medium uppercase tracking-[0.14em] text-asfalto">
                  Novo
                </span>
              )}
              {desconto !== null && (
                <span className="rounded-full bg-asfalto/75 px-3 py-1 text-[0.7rem] font-medium text-creme ring-1 ring-white/15 backdrop-blur-md">
                  {desconto}% abaixo do varejo
                </span>
              )}
            </div>

            {midias.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => irPara(indice - 1)}
                  aria-label="Foto anterior"
                  className="absolute left-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 rotate-180 items-center justify-center rounded-full bg-asfalto/70 text-creme ring-1 ring-white/15 backdrop-blur-md transition-colors hover:bg-cobre hover:text-asfalto sm:flex"
                >
                  <IconeSeta className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => irPara(indice + 1)}
                  aria-label="Próxima foto"
                  className="absolute right-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-asfalto/70 text-creme ring-1 ring-white/15 backdrop-blur-md transition-colors hover:bg-cobre hover:text-asfalto sm:flex"
                >
                  <IconeSeta className="h-4 w-4" />
                </button>
                <p className="rota-num absolute bottom-4 right-4 rounded-full bg-asfalto/70 px-3 py-1 text-xs text-creme backdrop-blur-md" aria-hidden>
                  {indice + 1} / {midias.length}
                </p>
              </>
            )}
          </div>

          {/* Miniaturas */}
          {midias.length > 1 && (
            <ul className="rota-sem-barra mt-3 flex gap-2 overflow-x-auto" aria-label="Escolher foto">
              {midias.map((m, i) => (
                <li key={`${i}-${m.url}`} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => irPara(i)}
                    aria-label={`Ver ${m.tipo === "video" ? "vídeo" : "foto"} ${i + 1}`}
                    aria-current={i === indice ? "true" : undefined}
                    className={`relative block h-20 w-16 overflow-hidden rounded-xl ring-1 transition sm:h-24 sm:w-20 ${
                      i === indice ? "ring-2 ring-cobre" : "opacity-60 ring-white/10 hover:opacity-100"
                    }`}
                  >
                    {m.tipo === "imagem" ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={m.url} alt="" loading="lazy" className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center bg-grafite text-[0.65rem] uppercase tracking-widest text-creme-2">
                        vídeo
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* =============================== PAINEL =============================== */}
        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-28">
            {categoria && (
              <Link href={ROTAS.categoria(categoria.slug)} className="rota-kicker hover:text-cobre-claro">
                {categoria.label}
              </Link>
            )}
            <h1 className="mt-3 font-display text-[clamp(1.75rem,3.4vw,2.7rem)] font-medium leading-[1.08] tracking-[-0.03em] text-creme">
              {p.nome}
            </h1>

            {/* Preço */}
            <div className="mt-6 flex flex-wrap items-end gap-x-4 gap-y-1">
              <p className="rota-num font-display text-[clamp(1.6rem,2.6vw,2.1rem)] font-medium leading-none text-cobre-claro">
                {faixaPreco(p.precoMin, p.precoMax)}
              </p>
              {(p.precoMin !== null || p.precoMax !== null) && (
                <p className="pb-0.5 text-sm text-nevoa">por peça, no atacado</p>
              )}
            </div>
            {p.precoVarejo !== null && (
              <p className="mt-2 text-sm text-creme-2">
                Varejo de referência: <span className="rota-num">{dinheiro(p.precoVarejo)}</span>
              </p>
            )}

            <ul className="mt-6 flex flex-wrap gap-2 text-[0.8rem]">
              <li className="rounded-full border border-white/10 px-3 py-1.5 text-creme-2">
                Mínimo <strong className="font-medium text-creme">{p.minimo} peças</strong> por modelo
              </li>
              {p.prontaEntrega && (
                <li className="rounded-full border border-sinal/30 bg-sinal/10 px-3 py-1.5 text-sinal">Pronta-entrega</li>
              )}
            </ul>

            <div ref={montagem} className="mt-8 scroll-mt-32 rounded-3xl border border-white/[0.08] bg-carvao p-5 sm:p-6">
              {/* Cores */}
              {p.cores.length > 0 && (
                <fieldset>
                  <legend className="text-sm text-creme-2">
                    Cor: <span className="text-creme">{corAtiva}</span>
                  </legend>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {p.cores.map((c) => {
                      const qtd = pecasDaCor(c.nome);
                      const ativa = c.nome === corAtiva;
                      return (
                        <label
                          key={c.nome}
                          className={`relative flex cursor-pointer items-center gap-2 rounded-full border py-1.5 pl-1.5 pr-3.5 text-sm transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-cobre ${
                            ativa ? "border-cobre bg-cobre/10 text-creme" : "border-white/10 text-creme-2 hover:border-white/25"
                          }`}
                        >
                          <input
                            type="radio"
                            name="cor"
                            value={c.nome}
                            checked={ativa}
                            onChange={() => escolherCor(c.nome)}
                            className="sr-only"
                          />
                          <span className="h-6 w-6 rounded-full ring-1 ring-white/25" style={{ backgroundColor: c.hex }} aria-hidden />
                          {c.nome}
                          {qtd > 0 && (
                            <span className="rota-num ml-0.5 rounded-full bg-cobre px-1.5 text-[0.7rem] font-semibold leading-5 text-asfalto">
                              {qtd}
                              <span className="sr-only"> peças selecionadas</span>
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              )}

              {/* Grade */}
              <fieldset className={p.cores.length > 0 ? "mt-6" : ""}>
                <legend className="sr-only">
                  {unico ? "Quantidade" : "Grade por tamanho"}
                  {corAtiva && ` da cor ${corAtiva}`}
                </legend>
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                  <p className="min-w-0 text-sm text-creme-2" aria-hidden>
                    {unico ? "Quantidade" : "Monte a grade"}
                    {p.cores.length > 0 && <span className="text-nevoa"> · {corAtiva}</span>}
                  </p>
                  {!unico && (
                    <button
                      type="button"
                      onClick={umaDeCada}
                      aria-label="Somar uma peça em cada tamanho"
                      className="-mr-3 whitespace-nowrap rounded-full px-3 py-1.5 text-[0.8rem] text-cobre-claro hover:bg-white/[0.04]"
                    >
                      <span className="sm:hidden">+1 de cada</span>
                      <span className="hidden sm:inline">+ 1 de cada tamanho</span>
                    </button>
                  )}
                </div>
                {/* Quantas colunas couberem (mín. 11rem cada): 1 no celular, 2–3 onde
                    houver espaço. Coluna fixa estourava o card em telas estreitas. */}
                <div className={`mt-3 grid gap-2 ${unico ? "" : "grid-cols-[repeat(auto-fill,minmax(11rem,1fr))]"}`}>
                  {tamanhos.map((t) => {
                    const q = gradeCor[t] ?? 0;
                    const rotulo = unico ? "Peças" : t;
                    const nomeCampo = `${unico ? "Quantidade" : `Tamanho ${t}`}${corAtiva ? `, cor ${corAtiva}` : ""}`;
                    return (
                      <div
                        key={t}
                        className={`flex items-center justify-between gap-2 rounded-2xl border py-1.5 pl-4 pr-1.5 transition-colors ${
                          q > 0 ? "border-cobre/50 bg-cobre/[0.06]" : "border-white/[0.08]"
                        }`}
                      >
                        <span className="min-w-0 break-words font-display text-[0.95rem] font-medium text-creme">
                          {rotulo}
                        </span>
                        <div className="flex shrink-0 items-center">
                          <button
                            type="button"
                            onClick={() => definir(t, q - 1)}
                            disabled={q === 0}
                            aria-label={`Menos uma — ${nomeCampo}`}
                            className="flex h-9 w-9 items-center justify-center rounded-full text-creme-2 hover:bg-white/[0.06] disabled:opacity-30"
                          >
                            <IconeMenos className="h-4 w-4" />
                          </button>
                          <input
                            type="number"
                            inputMode="numeric"
                            min={0}
                            max={MAX}
                            value={q || ""}
                            placeholder="0"
                            onChange={(e) => definir(t, Number(e.target.value))}
                            onFocus={(e) => e.currentTarget.select()}
                            aria-label={nomeCampo}
                            className="rota-num h-9 w-11 rounded-lg bg-transparent text-center text-base text-creme placeholder:text-nevoa focus:bg-white/[0.04] focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                          />
                          <button
                            type="button"
                            onClick={() => definir(t, q + 1)}
                            aria-label={`Mais uma — ${nomeCampo}`}
                            className="flex h-9 w-9 items-center justify-center rounded-full text-creme hover:bg-cobre hover:text-asfalto"
                          >
                            <IconeMais className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </fieldset>

              {/* Mínimo do modelo */}
              <div className="mt-6">
                <div className="flex items-baseline justify-between gap-3 text-[0.82rem]">
                  <span className="text-creme-2">
                    {faltam > 0 ? (
                      <>
                        Faltam <strong className="rota-num font-medium text-creme">{faltam}</strong> para o mínimo do modelo
                      </>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-sinal">
                        <IconeCheck className="h-4 w-4" /> Mínimo do modelo atingido
                      </span>
                    )}
                  </span>
                  <span className="rota-num text-nevoa">
                    {acumulado}/{p.minimo}
                  </span>
                </div>
                <div
                  className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]"
                  role="progressbar"
                  aria-label="Progresso até o pedido mínimo do modelo"
                  aria-valuemin={0}
                  aria-valuemax={p.minimo}
                  aria-valuenow={Math.min(acumulado, p.minimo)}
                >
                  <div
                    className={`h-full rounded-full transition-[width] duration-500 ${faltam ? "bg-cobre" : "bg-sinal"}`}
                    style={{ width: `${progresso * 100}%` }}
                  />
                </div>
                {noPedido > 0 && (
                  <p className="mt-2 text-[0.78rem] text-nevoa">
                    {noPedido} {noPedido === 1 ? "peça deste modelo já está" : "peças deste modelo já estão"} no seu pedido.
                  </p>
                )}
              </div>

              {/* Ação */}
              <button
                type="button"
                onClick={adicionarAoPedido}
                className="group mt-6 flex w-full items-center justify-center gap-2.5 rounded-full bg-cobre px-6 py-4 text-[1rem] font-medium text-asfalto shadow-[0_14px_36px_-14px_rgba(200,151,117,.7)] transition-colors hover:bg-cobre-claro"
              >
                <IconeSacola className="h-5 w-5" />
                {selecionadas > 0 ? (
                  <span>
                    Adicionar <span className="rota-num">{selecionadas}</span> {selecionadas === 1 ? "peça" : "peças"} ao pedido
                  </span>
                ) : (
                  "Escolha as quantidades"
                )}
              </button>
              {estimativaSel && selecionadas > 0 && (
                <p className="rota-num mt-3 text-center text-[0.82rem] text-nevoa">
                  ≈{" "}
                  {estimativaSel.min === estimativaSel.max
                    ? dinheiro(estimativaSel.min)
                    : `${dinheiro(estimativaSel.min)} – ${dinheiro(estimativaSel.max)}`}{" "}
                  nesta seleção (referência)
                </p>
              )}

              <div role="status" aria-live="polite">
                {cheio && (
                  <p className="mt-4 rounded-2xl border border-cobre/40 bg-cobre/[0.07] p-4 text-sm text-creme">
                    O pedido chegou ao limite de {MAX_ITENS} linhas (modelo + cor). Envie este pedido e comece outro — a
                    seleção que não coube continua aqui.
                  </p>
                )}
                {adicionadas !== null && adicionadas > 0 && (
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-sinal/30 bg-sinal/[0.08] p-4 text-sm">
                    <span className="inline-flex items-center gap-2 text-creme">
                      <IconeCheck className="h-4 w-4 text-sinal" />
                      {adicionadas} {adicionadas === 1 ? "peça adicionada" : "peças adicionadas"} ao pedido.
                    </span>
                    <Link href={ROTAS.carrinho} className="inline-flex items-center gap-1.5 font-medium text-cobre-claro hover:text-creme">
                      Ver meu pedido <IconeSeta className="h-4 w-4" />
                    </Link>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {waDuvida && (
                <a
                  href={waDuvida}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-white/10 px-5 py-3 text-sm text-creme hover:border-cobre"
                >
                  <WhatsAppIcon className="h-4 w-4 text-sinal" />
                  Tirar dúvida
                </a>
              )}
              <button
                type="button"
                onClick={compartilhar}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-white/10 px-5 py-3 text-sm text-creme hover:border-cobre"
              >
                {copiado ? "Link copiado!" : "Compartilhar"}
              </button>
            </div>

            <ul className="mt-7 space-y-2.5 border-t border-white/[0.06] pt-6 text-[0.88rem] text-creme-2">
              {[
                "O pedido é registrado com um código e abre pronto no WhatsApp.",
                "Frete e forma de pagamento são combinados no atendimento.",
                "Nada é cobrado pelo site.",
              ].map((t) => (
                <li key={t} className="flex gap-2.5">
                  <IconeCheck className="mt-0.5 h-4 w-4 shrink-0 text-cobre" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Barra fixa do celular — a ação principal sempre ao alcance do polegar */}
      <div className="h-24 lg:hidden" aria-hidden />
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.08] bg-asfalto/90 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl lg:hidden">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            {/* Na barra estreita, só o menor preço — a faixa inteira não cabe ao lado do botão. */}
            <p className="rota-num truncate font-display text-[0.95rem] text-cobre-claro">
              {p.precoMin !== null && p.precoMax !== null && p.precoMax - p.precoMin > 0.004 ? (
                <>
                  <span className="font-texto text-[0.75rem] font-normal text-nevoa">desde </span>
                  {dinheiro(p.precoMin)}
                </>
              ) : (
                faixaPreco(p.precoMin, p.precoMax)
              )}
            </p>
            <p className="truncate text-[0.75rem] text-nevoa">
              {selecionadas > 0 ? `${selecionadas} na seleção` : `mín. ${p.minimo} pç`}
              {noPedido > 0 && ` · ${noPedido} no pedido`}
            </p>
          </div>
          {adicionadas !== null && selecionadas === 0 ? (
            <Link
              href={ROTAS.carrinho}
              className="flex h-12 shrink-0 items-center gap-2 rounded-full bg-creme px-4 text-sm font-medium text-asfalto min-[360px]:px-5"
            >
              Ver pedido <IconeSeta className="h-4 w-4" />
            </Link>
          ) : (
            <button
              type="button"
              onClick={adicionarAoPedido}
              className="flex h-12 shrink-0 items-center gap-2 rounded-full bg-cobre px-4 text-sm font-medium text-asfalto min-[360px]:px-5"
            >
              <IconeSacola className="h-4 w-4" />
              {selecionadas > 0 ? "Adicionar" : "Montar grade"}
            </button>
          )}
        </div>
      </div>
    </>
  );
}
