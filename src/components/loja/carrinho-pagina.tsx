"use client";

// Página "Meu pedido": revisa a grade, coleta os dados da loja, registra o
// pedido no servidor e entrega o botão pro WhatsApp com tudo escrito.
//
// Ordem de segurança: 1) grava no servidor (o pedido existe mesmo se o lojista
// desistir do WhatsApp), 2) só então limpa o carrinho. Se o servidor falhar, o
// lojista ainda consegue mandar o texto montado aqui mesmo — nada se perde.
import Link from "next/link";
import { cloneElement, useEffect, useId, useState, useSyncExternalStore } from "react";
import { WhatsAppIcon } from "@/components/whatsapp-icon";
import {
  LOJISTA_VAZIO,
  esquecerLojista,
  lembrarLojista,
  lerLojista,
  useCarrinho,
} from "@/lib/loja/carrinho";
import {
  abaixoDoMinimo,
  dinheiro,
  estimativa,
  faixaPreco,
  linkWhatsapp,
  pecasDoItem,
  pecasPorProduto,
  textoDoPedido,
} from "@/lib/loja/formato";
import {
  TAMANHO_UNICO,
  type AjusteCarrinho,
  type DadosLojista,
  type ItemCarrinho,
  type PecaConferida,
} from "@/lib/loja/tipos";
import { ROTAS } from "@/lib/site";
import { IconeCheck, IconeLixeira, IconeSacola, IconeSeta } from "./icones";
import { BotaoLink } from "./ui";

const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA",
  "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

// Hidratado? (false no servidor e no 1º render; true depois) — sem setState em efeito.
const nada = () => () => {};
function useHidratado() {
  return useSyncExternalStore(nada, () => true, () => false);
}

type Enviado = { codigo: string | null; link: string | null };

export default function CarrinhoPagina({ whatsappLoja }: { whatsappLoja: string | null }) {
  const hidratado = useHidratado();
  const { itens, pecas, modelos, definirQuantidade, remover, limpar, atualizarModelos } = useCarrinho();
  // Dados do lojista: lidos do aparelho só no 1º uso do formulário (inicializador preguiçoso).
  const [lojista, setLojista] = useState<DadosLojista>(() =>
    typeof window === "undefined" ? LOJISTA_VAZIO : lerLojista(),
  );
  const [lembrar, setLembrar] = useState(true);
  const [site, setSite] = useState(""); // honeypot
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<{ texto: string; detalhes?: string[]; fallback: string | null } | null>(null);
  const [enviado, setEnviado] = useState<Enviado | null>(null);
  // Como as peças estão AGORA na vitrine (o carrinho pode ter dias).
  const [vitrine, setVitrine] = useState<Record<string, PecaConferida> | null>(null);

  const idsDoPedido = [...new Set(itens.map((i) => i.produtoId))].sort().join(",");
  useEffect(() => {
    if (!idsDoPedido) return;
    let vivo = true;
    fetch(`/api/loja/conferir?ids=${encodeURIComponent(idsDoPedido)}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { produtos?: Record<string, PecaConferida> } | null) => {
        if (!vivo || !j?.produtos) return;
        atualizarModelos(j.produtos); // preço, nome e mínimo atuais
        setVitrine(j.produtos);
      })
      .catch(() => {
        /* sem conferência: o servidor confere de novo no envio */
      });
    return () => {
      vivo = false;
    };
  }, [idsDoPedido, atualizarModelos]);

  /** O que impede esta linha de ir no pedido (peça, cor ou tamanho que saiu). */
  function problemaDe(i: ItemCarrinho): string | null {
    if (!vitrine) return null;
    const v = vitrine[i.produtoId];
    if (!v) return "Esta peça saiu da vitrine — remova para enviar o pedido.";
    if (v.cores.length > 0 && !(i.cor && v.cores.includes(i.cor.nome))) {
      return `A cor ${i.cor ? `“${i.cor.nome}” ` : ""}não está mais disponível — remova esta linha e escolha outra na página da peça.`;
    }
    const sumiram = Object.keys(i.grade).filter((t) => !v.tamanhos.includes(t));
    if (sumiram.length > 0) {
      return `Tamanho ${sumiram.join(", ")} não existe mais nesta peça — zere ${sumiram.length > 1 ? "esses campos" : "esse campo"} ou remova a linha.`;
    }
    return null;
  }
  const comProblema = itens.filter((i) => problemaDe(i) !== null).length;

  const faltando = abaixoDoMinimo(itens);
  const est = estimativa(itens);
  const porModelo = pecasPorProduto(itens);

  const campo =
    (k: keyof DadosLojista) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setLojista((d) => ({ ...d, [k]: e.target.value }));

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (faltando.length > 0) {
      setErro({ texto: "Alguns modelos ainda não chegaram ao pedido mínimo (veja os avisos acima).", fallback: null });
      return;
    }
    if (comProblema > 0) {
      setErro({ texto: "Algumas peças mudaram na vitrine — veja os avisos em vermelho nas peças.", fallback: null });
      return;
    }
    // Plano B: o mesmo texto, montado aqui, se o servidor não responder.
    const planoB = whatsappLoja ? linkWhatsapp(whatsappLoja, textoDoPedido({ itens, lojista })) : null;

    setEnviando(true);
    try {
      const r = await fetch("/api/loja/pedido", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itens: itens.map((i) => ({ produtoId: i.produtoId, cor: i.cor, grade: i.grade })),
          lojista,
          site,
        }),
      });
      const j = (await r.json().catch(() => ({}))) as {
        codigo?: string;
        mensagem?: string;
        whatsapp?: string | null;
        error?: string;
        ajustes?: AjusteCarrinho[];
        faltando?: { produtoId: string; nome: string; minimo: number; faltam: number }[];
      };

      if (r.status === 409 && j.ajustes?.length) {
        // Mudou na vitrine: aplica SÓ o ajuste de cada linha (a linha toda, ou só
        // os tamanhos que sumiram) e mostra o que mudou.
        for (const a of j.ajustes) {
          if (a.remover === "tudo") remover(a.chave);
          else for (const t of a.remover) definirQuantidade(a.chave, t, 0);
        }
        setErro({
          texto: j.error ?? "Algumas peças mudaram na vitrine.",
          detalhes: j.ajustes.map((a) => `${a.nome}: ${a.motivo}.`),
          fallback: null,
        });
        return;
      }
      if (r.status === 422 && j.faltando?.length) {
        // O mínimo mudou desde que a peça entrou no carrinho: atualiza e mostra quanto falta.
        atualizarModelos(Object.fromEntries(j.faltando.map((f) => [f.produtoId, { minimo: f.minimo }])));
        setErro({
          texto: j.error ?? "Alguns modelos ainda não chegaram ao pedido mínimo.",
          detalhes: j.faltando.map((f) => `${f.nome}: faltam ${f.faltam} de ${f.minimo} peças.`),
          fallback: null,
        });
        return;
      }
      if (!r.ok || !j.codigo) {
        setErro({
          texto: j.error ?? "Não conseguimos registrar o pedido agora.",
          fallback: r.status >= 500 || r.status === 429 ? planoB : null,
        });
        return;
      }

      if (lembrar) lembrarLojista(lojista);
      else esquecerLojista();
      const numero = j.whatsapp ?? whatsappLoja;
      setEnviado({ codigo: j.codigo, link: numero && j.mensagem ? linkWhatsapp(numero, j.mensagem) : null });
      limpar();
      window.scrollTo({ top: 0 });
    } catch {
      setErro({ texto: "Sem conexão com o site agora.", fallback: planoB });
    } finally {
      setEnviando(false);
    }
  }

  // --------------------------------------------------------------- estados
  if (enviado) return <Sucesso enviado={enviado} />;

  if (!hidratado) {
    return (
      <div className="mt-10 space-y-4" aria-busy="true" aria-label="Carregando o seu pedido">
        {[0, 1].map((i) => (
          <div key={i} className="h-36 animate-pulse rounded-3xl bg-white/[0.03]" />
        ))}
      </div>
    );
  }

  if (itens.length === 0) {
    return (
      <div className="mt-10 rounded-3xl border border-dashed border-white/10 px-6 py-20 text-center">
        <IconeSacola className="mx-auto h-10 w-10 text-cobre" />
        <p className="mt-6 font-display text-[1.6rem] font-medium text-creme">Seu pedido está vazio.</p>
        <p className="mx-auto mt-3 max-w-md text-creme-2">
          Escolha as peças na vitrine, monte a grade de cada uma e volte aqui pra enviar tudo de uma vez.
        </p>
        <div className="mt-8 flex justify-center">
          <BotaoLink href={ROTAS.loja} seta>
            Ir para a vitrine
          </BotaoLink>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={enviar} className="mt-10 grid gap-10 lg:grid-cols-12 lg:gap-12">
      {/* ============================ ITENS ============================ */}
      <section aria-labelledby="itens-titulo" className="lg:col-span-7">
        <div className="flex items-baseline justify-between gap-4">
          <h2 id="itens-titulo" className="font-display text-[1.25rem] font-medium text-creme">
            <span className="text-cobre">01</span> · Revise as peças
          </h2>
          <button
            type="button"
            onClick={() => {
              if (window.confirm("Tirar todas as peças do pedido?")) limpar();
            }}
            className="text-sm text-nevoa underline-offset-4 hover:text-creme hover:underline"
          >
            Esvaziar
          </button>
        </div>

        {faltando.length > 0 && (
          <div className="mt-5 rounded-2xl border border-cobre/40 bg-cobre/[0.07] p-4 text-sm text-creme" role="alert">
            <p className="font-medium">Falta pouco pro pedido mínimo:</p>
            <ul className="mt-2 space-y-1 text-creme-2">
              {faltando.map((f) => (
                <li key={f.produtoId}>
                  <Link href={ROTAS.produto(f.produtoId)} className="text-cobre-claro underline underline-offset-4">
                    {f.nome}
                  </Link>{" "}
                  — faltam {f.faltam} de {f.minimo} peças
                </li>
              ))}
            </ul>
          </div>
        )}

        <ul className="mt-6 space-y-4">
          {itens.map((i) => {
            const tamanhos = Object.keys(i.grade);
            const doModelo = porModelo.get(i.produtoId) ?? 0;
            const ok = doModelo >= i.minimo;
            const problema = problemaDe(i);
            return (
              <li
                key={i.chave}
                className={`rounded-3xl border bg-carvao p-4 sm:p-5 ${problema ? "border-red-400/40" : "border-white/[0.07]"}`}
              >
                {problema && (
                  <p role="alert" className="mb-4 rounded-2xl bg-red-400/[0.08] px-4 py-3 text-sm text-red-200">
                    {problema}
                  </p>
                )}
                <div className="flex gap-4">
                  <Link
                    href={ROTAS.produto(i.produtoId)}
                    className="h-28 w-[5.5rem] shrink-0 overflow-hidden rounded-2xl bg-grafite sm:h-32 sm:w-24"
                    tabIndex={-1}
                    aria-hidden
                  >
                    {i.imagem && (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={i.imagem} alt="" loading="lazy" className="h-full w-full object-cover" />
                    )}
                  </Link>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link
                          href={ROTAS.produto(i.produtoId)}
                          className="line-clamp-2 font-medium leading-snug text-creme hover:text-cobre-claro"
                        >
                          {i.nome}
                        </Link>
                        {i.cor && (
                          <p className="mt-1 flex items-center gap-1.5 text-sm text-creme-2">
                            <span className="h-3 w-3 rounded-full ring-1 ring-white/25" style={{ backgroundColor: i.cor.hex }} aria-hidden />
                            {i.cor.nome}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => remover(i.chave)}
                        aria-label={`Remover ${i.nome}${i.cor ? ` (${i.cor.nome})` : ""} do pedido`}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-nevoa hover:bg-white/[0.05] hover:text-creme"
                      >
                        <IconeLixeira className="h-4 w-4" />
                      </button>
                    </div>

                    <p className="rota-num mt-2 text-sm text-cobre-claro">
                      {faixaPreco(i.precoMin, i.precoMax)} <span className="text-nevoa">/ peça</span>
                    </p>
                    <p className={`mt-1 text-[0.78rem] ${ok ? "text-sinal" : "text-cobre-claro"}`}>
                      Modelo: {doModelo}/{i.minimo} peças {ok ? "· mínimo ok" : "· abaixo do mínimo"}
                    </p>
                  </div>
                </div>

                {/* Grade editável */}
                <fieldset className="mt-4">
                  <legend className="sr-only">Quantidades por tamanho — {i.nome}</legend>
                  <div className="flex flex-wrap gap-2">
                    {tamanhos.map((t) => (
                      <label
                        key={t}
                        className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-asfalto py-1 pl-3 pr-1"
                      >
                        <span className="text-sm text-creme-2">{t === TAMANHO_UNICO ? "Peças" : t}</span>
                        <Quantidade
                          key={`${t}:${i.grade[t] ?? 0}`}
                          valor={i.grade[t] ?? 0}
                          aoConfirmar={(n) => definirQuantidade(i.chave, t, n)}
                          rotulo={`${t === TAMANHO_UNICO ? "Quantidade" : `Tamanho ${t}`} — ${i.nome}${i.cor ? `, ${i.cor.nome}` : ""}`}
                        />
                      </label>
                    ))}
                  </div>
                  <p className="mt-3 flex flex-wrap justify-between gap-2 text-[0.8rem] text-nevoa">
                    <span>
                      {pecasDoItem(i)} {pecasDoItem(i) === 1 ? "peça" : "peças"} nesta cor
                    </span>
                    <Link href={ROTAS.produto(i.produtoId)} className="hover:text-creme">
                      Mudar tamanhos e cores →
                    </Link>
                  </p>
                </fieldset>
              </li>
            );
          })}
        </ul>

        <Link href={ROTAS.loja} className="mt-6 inline-flex items-center gap-2 text-sm text-cobre-claro hover:text-creme">
          <IconeSeta className="h-4 w-4 rotate-180" /> Continuar escolhendo
        </Link>
      </section>

      {/* ======================= DADOS + RESUMO ======================= */}
      <div className="lg:col-span-5">
        <div className="space-y-6 lg:sticky lg:top-28">
          <section aria-labelledby="dados-titulo" className="rounded-3xl border border-white/[0.07] bg-carvao p-5 sm:p-6">
            <h2 id="dados-titulo" className="font-display text-[1.25rem] font-medium text-creme">
              <span className="text-cobre">02</span> · Sua loja
            </h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Campo rotulo="Nome da loja" obrigatorio className="sm:col-span-2">
                <input required maxLength={120} autoComplete="organization" value={lojista.loja} onChange={campo("loja")} />
              </Campo>
              <Campo rotulo="Seu nome" obrigatorio>
                <input required maxLength={80} autoComplete="name" value={lojista.contato} onChange={campo("contato")} />
              </Campo>
              <Campo rotulo="WhatsApp (com DDD)" obrigatorio>
                <input
                  required
                  type="tel"
                  inputMode="tel"
                  maxLength={20}
                  autoComplete="tel-national"
                  placeholder="(81) 99999-9999"
                  value={lojista.whatsapp}
                  onChange={campo("whatsapp")}
                />
              </Campo>
              <Campo rotulo="Cidade">
                <input maxLength={80} autoComplete="address-level2" value={lojista.cidade} onChange={campo("cidade")} />
              </Campo>
              <Campo rotulo="Estado">
                <select value={lojista.uf} onChange={campo("uf")} autoComplete="address-level1">
                  <option value="">—</option>
                  {UFS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </Campo>
              <Campo rotulo="CNPJ (opcional)" className="sm:col-span-2">
                <input maxLength={20} inputMode="numeric" value={lojista.cnpj} onChange={campo("cnpj")} />
              </Campo>
              <Campo rotulo="Observações (opcional)" className="sm:col-span-2">
                <textarea
                  rows={3}
                  maxLength={600}
                  placeholder="Prazo, forma de envio, dúvidas…"
                  value={lojista.observacoes}
                  onChange={campo("observacoes")}
                />
              </Campo>
              {/* Honeypot — invisível e fora da ordem do Tab */}
              <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
                <label>
                  Site da empresa
                  <input tabIndex={-1} autoComplete="off" value={site} onChange={(e) => setSite(e.target.value)} />
                </label>
              </div>
            </div>
            <label htmlFor="rota-lembrar" className="mt-5 flex items-start gap-3 text-sm text-creme-2">
              <input
                id="rota-lembrar"
                type="checkbox"
                checked={lembrar}
                onChange={(e) => setLembrar(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[var(--color-cobre)]"
              />
              Lembrar os dados da loja neste aparelho para o próximo pedido.
            </label>
          </section>

          <section aria-labelledby="resumo-titulo" className="rounded-3xl border border-cobre/25 bg-gradient-to-b from-cobre/[0.07] to-transparent p-5 sm:p-6">
            <h2 id="resumo-titulo" className="font-display text-[1.25rem] font-medium text-creme">
              <span className="text-cobre">03</span> · Resumo
            </h2>
            <dl className="mt-5 space-y-3 text-[0.95rem]">
              <Linha rotulo="Modelos" valor={String(modelos)} />
              <Linha rotulo="Peças" valor={String(pecas)} />
              {est.max > 0 && (
                <Linha
                  rotulo="Estimativa"
                  valor={est.min === est.max ? dinheiro(est.min) : `${dinheiro(est.min)} – ${dinheiro(est.max)}`}
                  destaque
                />
              )}
            </dl>
            {est.semPreco > 0 && (
              <p className="mt-3 text-[0.8rem] text-nevoa">{est.semPreco} peça(s) com preço sob consulta.</p>
            )}
            <p className="mt-4 text-[0.8rem] leading-relaxed text-nevoa">
              Valores de referência. Disponibilidade, frete e pagamento são confirmados no WhatsApp — nada é cobrado
              pelo site.
            </p>

            <button
              type="submit"
              disabled={enviando || faltando.length > 0 || comProblema > 0}
              className="mt-6 flex w-full items-center justify-center gap-2.5 rounded-full bg-cobre px-6 py-4 font-medium text-asfalto shadow-[0_14px_36px_-14px_rgba(200,151,117,.7)] transition-colors hover:bg-cobre-claro disabled:cursor-not-allowed disabled:opacity-45"
            >
              <WhatsAppIcon className="h-5 w-5" />
              {enviando ? "Registrando o pedido…" : "Enviar pedido pelo WhatsApp"}
            </button>

            <div role="alert" aria-live="assertive">
              {erro && (
                <div className="mt-4 rounded-2xl border border-red-400/30 bg-red-400/[0.07] p-4 text-sm text-creme">
                  <p>{erro.texto}</p>
                  {erro.detalhes && erro.detalhes.length > 0 && (
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-creme-2">
                      {erro.detalhes.map((d) => (
                        <li key={d}>{d}</li>
                      ))}
                    </ul>
                  )}
                  {erro.fallback && (
                    <a
                      href={erro.fallback}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-2 font-medium text-cobre-claro underline underline-offset-4"
                    >
                      Enviar mesmo assim pelo WhatsApp
                    </a>
                  )}
                </div>
              )}
            </div>

            <p className="mt-5 text-[0.75rem] leading-relaxed text-nevoa">
              Ao enviar, você concorda que a ROTA use estes dados só para atender este pedido.{" "}
              <Link href={ROTAS.privacidade} className="underline underline-offset-4 hover:text-creme-2">
                Política de privacidade
              </Link>
              .
            </p>
          </section>
        </div>
      </div>
    </form>
  );
}

function Campo({
  rotulo,
  obrigatorio = false,
  className = "",
  children,
}: {
  rotulo: string;
  obrigatorio?: boolean;
  className?: string;
  children: React.ReactElement<{ id?: string }>;
}) {
  // Rótulo ligado ao campo por id/htmlFor (explícito): leitor de tela e
  // preenchimento automático acertam o campo em qualquer navegador.
  const id = useId();
  return (
    <label
      htmlFor={id}
      className={`block text-sm text-creme-2 [&_input]:mt-1.5 [&_input]:h-12 [&_input]:w-full [&_input]:rounded-xl [&_input]:border [&_input]:border-white/10 [&_input]:bg-asfalto [&_input]:px-4 [&_input]:text-base [&_input]:text-creme [&_input]:placeholder:text-nevoa/70 [&_input:focus]:border-cobre/70 [&_input:focus]:outline-none [&_select]:mt-1.5 [&_select]:h-12 [&_select]:w-full [&_select]:rounded-xl [&_select]:border [&_select]:border-white/10 [&_select]:bg-asfalto [&_select]:px-4 [&_select]:text-base [&_select]:text-creme [&_textarea]:mt-1.5 [&_textarea]:w-full [&_textarea]:rounded-xl [&_textarea]:border [&_textarea]:border-white/10 [&_textarea]:bg-asfalto [&_textarea]:px-4 [&_textarea]:py-3 [&_textarea]:text-base [&_textarea]:text-creme [&_textarea:focus]:border-cobre/70 [&_textarea:focus]:outline-none ${className}`}
    >
      {rotulo}
      {obrigatorio && (
        <span className="text-cobre" aria-hidden>
          {" "}
          *
        </span>
      )}
      {cloneElement(children, { id })}
    </label>
  );
}

/**
 * Campo de quantidade que só confirma ao sair do campo (ou Enter). Confirmar a
 * cada tecla apagaria o tamanho no instante em que o campo fica vazio — e o
 * campo sumiria da tela no meio da digitação.
 */
function Quantidade({ valor, aoConfirmar, rotulo }: { valor: number; aoConfirmar: (n: number) => void; rotulo: string }) {
  const [texto, setTexto] = useState(String(valor));
  const confirmar = () => {
    const n = Math.max(0, Math.min(9999, Math.floor(Number(texto)) || 0));
    if (n === valor) setTexto(String(valor));
    else if (n === 0 && !window.confirm("Zerar este tamanho? Ele sai do pedido.")) setTexto(String(valor));
    else aoConfirmar(n);
  };
  return (
    <input
      type="number"
      inputMode="numeric"
      min={0}
      max={9999}
      value={texto}
      onChange={(e) => setTexto(e.target.value)}
      onBlur={confirmar}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          confirmar();
        }
      }}
      onFocus={(e) => e.currentTarget.select()}
      aria-label={rotulo}
      className="rota-num h-9 w-16 rounded-lg bg-white/[0.04] text-center text-creme focus:outline-none focus:ring-1 focus:ring-cobre"
    />
  );
}

function Linha({ rotulo, valor, destaque = false }: { rotulo: string; valor: string; destaque?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-creme-2">{rotulo}</dt>
      <dd className={`rota-num ${destaque ? "font-display text-[1.1rem] text-cobre-claro" : "text-creme"}`}>{valor}</dd>
    </div>
  );
}

function Sucesso({ enviado }: { enviado: Enviado }) {
  return (
    <div className="mx-auto mt-10 max-w-2xl rounded-[2rem] border border-sinal/25 bg-gradient-to-b from-sinal/[0.08] to-transparent p-8 text-center sm:p-12">
      <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-sinal/15 text-sinal">
        <IconeCheck className="h-8 w-8" />
      </span>
      <p className="rota-kicker mt-8">Pedido registrado</p>
      {enviado.codigo && (
        <p className="rota-num mt-3 font-display text-[clamp(2rem,6vw,3rem)] font-semibold tracking-[0.04em] text-creme">
          {enviado.codigo}
        </p>
      )}
      {enviado.link ? (
        <>
          <p className="mx-auto mt-4 max-w-md text-creme-2">
            Falta só um toque: abra o WhatsApp e envie a mensagem — ela já está escrita com todas as peças e o código.
          </p>
          <a
            href={enviado.link}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 inline-flex items-center gap-3 rounded-full bg-[#1a7f47] px-8 py-4 text-[1.05rem] font-medium text-white shadow-[0_18px_40px_-12px_rgba(26,127,71,.7)] transition-transform hover:-translate-y-0.5"
          >
            <WhatsAppIcon className="h-6 w-6" />
            Abrir WhatsApp e enviar
          </a>
        </>
      ) : (
        <p className="mx-auto mt-4 max-w-md text-creme-2">
          Recebemos o seu pedido. A nossa equipe vai chamar você no WhatsApp informado para confirmar disponibilidade,
          frete e pagamento.
        </p>
      )}
      <div className="mt-8">
        <Link href={ROTAS.loja} className="text-sm text-cobre-claro underline-offset-4 hover:underline">
          Voltar para a vitrine
        </Link>
      </div>
    </div>
  );
}
