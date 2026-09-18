// Home da loja. Roteiro da página (cada seção responde uma dúvida do lojista):
//   1. Herói ........... "o que é isto?"         → moda do polo, direto pra loja
//   2. Faixa ........... "de onde vem?"           → as cidades do polo
//   3. Categorias ...... "tem o que eu vendo?"    → portas de entrada
//   4. Novidades ....... "o que tem agora?"       → produto na cara
//   5. Como comprar .... "como funciona?"         → 4 passos, sem surpresa
//   6. Por que ROTA .... "por que aqui?"          → diferenciais verdadeiros
//   7. Perguntas ....... "e o frete, o mínimo…?"  → objeções respondidas
// Nada de número inventado ou depoimento fabricado: os números que aparecem
// vêm do banco (modelos e categorias no ar).
import type { Metadata } from "next";
import Link from "next/link";
import BrandLogo from "@/components/brand-logo";
import CartaoProduto from "@/components/loja/cartao-produto";
import Estrada, { Faixas } from "@/components/loja/estrada";
import {
  IconeCaminhao,
  IconeCheck,
  IconeConversa,
  IconeFabrica,
  IconeGrade,
  IconeMais,
  IconeSacola,
  IconeSeta,
} from "@/components/loja/icones";
import JsonLd from "@/components/loja/json-ld";
import { BotaoLink, CabecaSecao, Container } from "@/components/loja/ui";
import { getBrand } from "@/lib/brand";
import { env } from "@/lib/env";
import { categoriasComProduto, contarProdutos, listarProdutos } from "@/lib/loja/catalogo";
import { faixaPreco } from "@/lib/loja/formato";
import type { ProdutoLoja } from "@/lib/loja/tipos";
import { baseUrl, urlAbsoluta } from "@/lib/loja/url";
import { normalizeBrazilPhone } from "@/lib/phone";
import { OG_PADRAO, ROTAS, SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: `${SITE.nome} — Atacado de moda direto do Polo do Agreste` },
  description: SITE.descricao,
  alternates: { canonical: "/" },
  openGraph: { ...OG_PADRAO, url: "/", title: `${SITE.nome} — ${SITE.slogan}`, description: SITE.descricao },
};

// ---------------------------------------------------------------------------
//  Conteúdo fixo (fatos, não promessas)
// ---------------------------------------------------------------------------
const PASSOS = [
  {
    titulo: "Escolha as peças",
    texto: "Navegue pelas categorias ou busque pelo nome. Cada peça mostra preço de atacado, cores e o pedido mínimo.",
    Icone: IconeSacola,
  },
  {
    titulo: "Monte a sua grade",
    texto: "Diga quantas peças quer de cada tamanho e cor. O mínimo vale por modelo, somando cores e tamanhos.",
    Icone: IconeGrade,
  },
  {
    titulo: "Envie pelo WhatsApp",
    texto: "O pedido fica registrado com um código e abre pronto no WhatsApp — sem digitar nada de novo.",
    Icone: IconeConversa,
  },
  {
    titulo: "Confirme e receba",
    texto: "A equipe confirma disponibilidade, frete e pagamento com você. Aprovado, a mercadoria pega a estrada.",
    Icone: IconeCaminhao,
  },
];

const PILARES = [
  {
    titulo: "Várias fábricas, uma rota só",
    texto: "Jeans de Toritama, moda de Santa Cruz e Caruaru, peças de Riacho das Almas — tudo num pedido e num atendimento.",
    Icone: IconeFabrica,
  },
  {
    titulo: "Preço de atacado, sem rodeio",
    texto: "O preço de cada peça está na vitrine. Você monta o pedido já sabendo quanto vai investir.",
    Icone: IconeCheck,
  },
  {
    titulo: "A grade é da sua loja",
    texto: "Tamanho por tamanho, cor por cor. Você compra o que o seu cliente veste — não um pacote fechado.",
    Icone: IconeGrade,
  },
  {
    titulo: "Gente de verdade no WhatsApp",
    texto: "Dúvida de tecido, prazo ou frete? Quem responde conhece a peça e acompanha o pedido até a entrega.",
    Icone: IconeConversa,
  },
];

const PERGUNTAS: { p: string; r: string; link?: { href: string; rotulo: string } }[] = [
  {
    p: "Quem pode comprar na ROTA?",
    r: "Lojistas, revendedores e boutiques de todo o Brasil. Se a sua loja tiver CNPJ, informe no pedido — ajuda na nota e no envio.",
  },
  {
    p: "Qual é o pedido mínimo?",
    r: "Cada modelo mostra o seu mínimo de peças na página do produto. O mínimo é contado por modelo, somando todas as cores e tamanhos que você escolher.",
  },
  {
    p: "Os preços do site são os preços finais?",
    r: "São preços de atacado e servem de base para montar o pedido. O valor final é confirmado pela equipe no WhatsApp, junto com a disponibilidade e o frete.",
  },
  {
    p: "Como funcionam o frete e o pagamento?",
    r: "Depois que você envia o pedido, a equipe calcula o frete para a sua cidade e combina com você a forma de envio e de pagamento. Nada é cobrado pelo site.",
  },
  {
    p: "Posso juntar peças de fábricas diferentes?",
    r: "Pode. A ROTA reúne peças de várias fábricas do polo e o seu pedido é atendido de uma vez só, num único atendimento.",
  },
  {
    p: "O que acontece com os meus dados?",
    r: "Usamos o nome da loja, o contato e a cidade só para atender o seu pedido. Os detalhes estão na política de privacidade.",
    link: { href: ROTAS.privacidade, rotulo: "Ler a política" },
  },
];

const CIDADES = [...SITE.polo, "Pernambuco", SITE.slogan];

export default async function Inicio() {
  // Banco fora do ar: a home ainda abre (marca, como comprar, perguntas), só sem vitrine.
  const [novidades, prontas, categorias, total, brand] = await Promise.all([
    listarProdutos({ ordem: "novidades", limite: 8 }).catch(() => [] as ProdutoLoja[]),
    listarProdutos({ ordem: "novidades", limite: 4, prontaEntrega: true }).catch(() => [] as ProdutoLoja[]),
    categoriasComProduto().catch(() => []),
    contarProdutos().catch(() => 0),
    getBrand(),
  ]);
  const vitrine = novidades.filter((p) => p.imagens[0]).slice(0, 3);
  const whatsapp = normalizeBrazilPhone(env.luizWhatsapp);

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": `${baseUrl()}/#organizacao`,
      name: SITE.nome,
      url: baseUrl(),
      logo: urlAbsoluta("/rota/icone-512.png"),
      image: urlAbsoluta("/rota/og.jpg"),
      slogan: SITE.slogan,
      description: SITE.descricao,
      areaServed: { "@type": "Country", name: "Brasil" },
      address: { "@type": "PostalAddress", addressRegion: SITE.estado, addressCountry: SITE.pais },
      ...(whatsapp
        ? {
            contactPoint: {
              "@type": "ContactPoint",
              telephone: `+${whatsapp}`,
              contactType: "sales",
              availableLanguage: "Portuguese",
            },
          }
        : {}),
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": `${baseUrl()}/#site`,
      name: SITE.nome,
      url: baseUrl(),
      inLanguage: "pt-BR",
      publisher: { "@id": `${baseUrl()}/#organizacao` },
      potentialAction: {
        "@type": "SearchAction",
        target: { "@type": "EntryPoint", urlTemplate: `${urlAbsoluta(ROTAS.loja)}?q={search_term_string}` },
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: PERGUNTAS.map((f) => ({
        "@type": "Question",
        name: f.p,
        acceptedAnswer: { "@type": "Answer", text: f.r },
      })),
    },
  ];

  return (
    <>
      <JsonLd dados={jsonLd} />

      {/* ============================ 1. HERÓI ============================ */}
      <section aria-labelledby="heroi-titulo" className="relative isolate overflow-hidden">
        {/* Luz de cobre vindo do ponto de fuga */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-40 -top-56 -z-10 h-[720px] w-[720px] rounded-full bg-[radial-gradient(closest-side,rgba(200,151,117,.20),transparent)]"
        />
        <Estrada animar className="absolute inset-x-0 bottom-0 -z-10 h-[62%] w-full opacity-50 sm:h-[72%]" />
        <div aria-hidden className="absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-t from-asfalto to-transparent" />

        <Container className="grid items-center gap-14 pb-20 pt-10 sm:pt-14 lg:grid-cols-12 lg:gap-10 lg:pb-32 lg:pt-20">
          <div className="lg:col-span-7 xl:col-span-6">
            <p className="rota-entra rota-kicker rota-filete">Polo de Confecções do Agreste · PE</p>
            <h1
              id="heroi-titulo"
              className="rota-entra mt-7 font-display text-[clamp(2.55rem,6.6vw,5.4rem)] font-semibold leading-[0.98] tracking-[-0.04em] text-creme [--atraso:.08s]"
            >
              A moda do Agreste, <span className="text-cobre">direto</span> pra sua loja.
            </h1>
            <p className="rota-entra mt-7 max-w-xl text-[clamp(1.05rem,1.35vw,1.2rem)] leading-relaxed text-creme-2 [--atraso:.18s]">
              As fábricas de {SITE.polo.slice(0, 3).join(", ")} e {SITE.polo[3]} numa vitrine só. Escolha as peças,
              monte a grade da sua loja e feche o pedido no WhatsApp.
            </p>
            <div className="rota-entra mt-10 flex flex-wrap gap-3 [--atraso:.28s]">
              <BotaoLink href={ROTAS.loja} seta>
                Montar meu pedido
              </BotaoLink>
              <BotaoLink href="#como-comprar" variante="contorno">
                Como funciona
              </BotaoLink>
            </div>

            {total > 0 && (
              <dl className="rota-entra mt-14 grid max-w-md grid-cols-3 gap-5 border-t border-white/[0.08] pt-7 [--atraso:.4s]">
                <Numero valor={total} rotulo={total === 1 ? "modelo no ar" : "modelos no ar"} />
                <Numero valor={categorias.length} rotulo={categorias.length === 1 ? "categoria" : "categorias"} />
                <Numero valor={SITE.polo.length} rotulo="cidades do polo" />
              </dl>
            )}
          </div>

          <div className="relative lg:col-span-5 xl:col-span-6">
            {vitrine.length > 0 ? <Colagem produtos={vitrine} /> : <SeloMarca logoUrl={brand.markUrl} />}
          </div>
        </Container>
      </section>

      {/* ======================= 2. FAIXA DAS CIDADES ====================== */}
      <section aria-label="Cidades do polo" className="overflow-hidden border-y border-white/[0.06] bg-carvao py-6 sm:py-8">
        <p className="sr-only">{CIDADES.join(", ")}</p>
        <div className="rota-esteira flex w-max items-center" aria-hidden>
          {[0, 1].map((volta) => (
            <div key={volta} className="flex shrink-0 items-center">
              {CIDADES.map((c, i) => (
                <span key={c} className="flex items-center">
                  <span
                    className={`whitespace-nowrap px-6 font-display text-[clamp(1.4rem,3vw,2.5rem)] font-medium uppercase tracking-[-0.01em] sm:px-10 ${
                      i % 2 ? "rota-vazado" : "text-creme"
                    }`}
                  >
                    {c}
                  </span>
                  <Faixas className="h-4 w-8 text-cobre sm:h-5 sm:w-10" />
                </span>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* ========================== 3. CATEGORIAS ========================== */}
      {categorias.length > 0 && (
        <section aria-labelledby="cat-titulo" className="py-20 sm:py-28">
          <Container>
            <CabecaSecao
              id="cat-titulo"
              kicker="Escolha a sua rota"
              titulo={
                <>
                  Tudo o que o polo produz,
                  <br className="hidden sm:block" /> organizado pra você comprar.
                </>
              }
              acao={
                <BotaoLink href={ROTAS.loja} variante="texto" seta>
                  Ver todas as peças
                </BotaoLink>
              }
            />
            <ul className="mt-12 grid auto-rows-[minmax(180px,1fr)] grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 md:auto-rows-[220px]">
              {categorias.slice(0, 7).map((c, i) => (
                <li key={c.slug} className={`rota-revela ${bento(i, Math.min(categorias.length, 7))}`}>
                  <Link
                    href={ROTAS.categoria(c.slug)}
                    className="group relative flex h-full min-h-[180px] overflow-hidden rounded-3xl bg-grafite ring-1 ring-white/[0.05]"
                  >
                    {c.capa && (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={c.capa}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="absolute inset-0 h-full w-full object-cover opacity-80 transition-[transform,opacity] duration-[900ms] ease-[cubic-bezier(.22,1,.36,1)] group-hover:scale-105 group-hover:opacity-100"
                      />
                    )}
                    <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-asfalto/90 via-asfalto/20 to-transparent" />
                    <span className="relative mt-auto flex w-full items-end justify-between gap-3 p-5 sm:p-6">
                      <span>
                        <span
                          className={`block font-display font-medium tracking-[-0.02em] text-creme ${
                            i === 0 ? "text-[clamp(1.6rem,3vw,2.6rem)]" : "text-[1.15rem] sm:text-[1.35rem]"
                          }`}
                        >
                          {c.label}
                        </span>
                        <span className="mt-1 block text-[0.8rem] text-creme-2">
                          {c.total} {c.total === 1 ? "modelo" : "modelos"}
                        </span>
                      </span>
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-creme/10 text-creme backdrop-blur-md transition-colors group-hover:bg-cobre group-hover:text-asfalto">
                        <IconeSeta className="h-4 w-4" />
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Container>
        </section>
      )}

      {/* =========================== 4. NOVIDADES ========================== */}
      {novidades.length > 0 && (
        <section aria-labelledby="novo-titulo" className="pb-20 sm:pb-28">
          <Container>
            <CabecaSecao
              id="novo-titulo"
              kicker="Acabou de chegar"
              titulo="Novidades da semana na vitrine."
              acao={
                <BotaoLink href={`${ROTAS.loja}?ordem=novidades`} variante="contorno" seta>
                  Ver lançamentos
                </BotaoLink>
              }
            />
            <Prateleira produtos={novidades} />
          </Container>
        </section>
      )}

      {/* ========================= 5. COMO COMPRAR ========================= */}
      <section
        id="como-comprar"
        aria-labelledby="como-titulo"
        className="relative scroll-mt-28 overflow-hidden border-y border-white/[0.06] bg-carvao py-20 sm:py-28"
      >
        <Container>
          <CabecaSecao
            id="como-titulo"
            kicker="A rota do pedido"
            alinhar="centro"
            titulo="Do clique ao caminhão em quatro paradas."
            apoio="Sem cadastro, sem senha e sem pagamento no site. Você monta o pedido com calma e fecha conversando com a gente."
          />
          <div className="relative mt-16">
            {/* A estrada que liga as paradas (tracejado como faixa de rodovia) */}
            <div
              aria-hidden
              className="pointer-events-none absolute left-[12.5%] right-[12.5%] top-7 hidden h-px bg-[repeating-linear-gradient(90deg,var(--color-cobre)_0_22px,transparent_22px_40px)] opacity-60 lg:block"
            />
            <ol className="grid gap-10 md:grid-cols-2 lg:grid-cols-4 lg:gap-6">
            {PASSOS.map((p, i) => (
              <li key={p.titulo} className="rota-revela relative flex flex-col items-center text-center">
                <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-asfalto ring-1 ring-cobre/50">
                  <p.Icone className="h-6 w-6 text-cobre-claro" />
                  <span className="rota-num absolute -right-2 -top-2 rounded-full bg-cobre px-2 py-0.5 font-display text-[0.65rem] font-semibold text-asfalto">
                    0{i + 1}
                  </span>
                </span>
                <h3 className="mt-6 font-display text-[1.15rem] font-medium tracking-[-0.01em] text-creme">{p.titulo}</h3>
                <p className="mt-3 max-w-xs text-[0.97rem] leading-relaxed text-creme-2">{p.texto}</p>
              </li>
            ))}
            </ol>
          </div>
          <div className="mt-14 flex justify-center">
            <BotaoLink href={ROTAS.loja} seta>
              Começar pela vitrine
            </BotaoLink>
          </div>
        </Container>
      </section>

      {/* ======================== 6. POR QUE A ROTA ======================== */}
      <section aria-labelledby="porque-titulo" className="py-20 sm:py-28">
        <Container className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <div className="lg:sticky lg:top-32">
              <p className="rota-kicker">Por que a ROTA</p>
              <h2
                id="porque-titulo"
                className="mt-4 font-display text-[clamp(2rem,4.2vw,3.4rem)] font-medium leading-[1.04] tracking-[-0.03em] text-creme"
              >
                Várias fábricas.
                <br />
                <span className="text-cobre">Uma rota só.</span>
              </h2>
              <p className="mt-6 max-w-md text-[1.0625rem] leading-relaxed text-creme-2">
                O {SITE.regiao} é um dos maiores polos de confecção do país. A ROTA junta o que as fábricas da região
                fazem de melhor e leva até a sua loja — você compra de muitas, fala com uma.
              </p>
              {prontas.length > 0 && (
                <Link
                  href={`${ROTAS.loja}?pronta=1`}
                  className="group mt-8 inline-flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-3 pr-5 transition-colors hover:border-cobre/50"
                >
                  <span className="flex -space-x-3">
                    {prontas.slice(0, 3).map((p) =>
                      p.imagens[0] ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          key={p.id}
                          src={p.imagens[0]}
                          alt=""
                          loading="lazy"
                          className="h-11 w-11 rounded-full object-cover ring-2 ring-asfalto"
                        />
                      ) : null,
                    )}
                  </span>
                  <span className="text-sm">
                    <span className="block text-creme">Pronta-entrega</span>
                    <span className="text-nevoa">Peças prontas pra sair</span>
                  </span>
                  <IconeSeta className="h-4 w-4 text-cobre transition-transform group-hover:translate-x-1" />
                </Link>
              )}
            </div>
          </div>

          <ul className="grid gap-4 sm:grid-cols-2 lg:col-span-7">
            {PILARES.map((p, i) => (
              <li
                key={p.titulo}
                className={`rota-revela group rounded-3xl border border-white/[0.07] bg-gradient-to-b from-white/[0.035] to-transparent p-7 transition-colors hover:border-cobre/40 sm:p-8 ${
                  i % 2 ? "sm:translate-y-10" : ""
                }`}
              >
                <p.Icone className="h-8 w-8 text-cobre" />
                <h3 className="mt-8 font-display text-[1.2rem] font-medium leading-snug tracking-[-0.01em] text-creme">
                  {p.titulo}
                </h3>
                <p className="mt-3 text-[0.97rem] leading-relaxed text-creme-2">{p.texto}</p>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* ========================== 7. PERGUNTAS =========================== */}
      <section id="perguntas" aria-labelledby="faq-titulo" className="scroll-mt-28 pb-4 pt-12 sm:pt-20">
        <Container className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <p className="rota-kicker">Perguntas frequentes</p>
            <h2
              id="faq-titulo"
              className="mt-4 font-display text-[clamp(1.75rem,3.2vw,2.6rem)] font-medium leading-[1.08] tracking-[-0.02em] text-creme"
            >
              Antes de pegar a estrada.
            </h2>
            <p className="mt-5 text-[1.0625rem] leading-relaxed text-creme-2">
              Não achou a sua dúvida? Chame no WhatsApp — a resposta vem de gente.
            </p>
          </div>
          <div className="divide-y divide-white/[0.07] border-y border-white/[0.07] lg:col-span-8">
            {PERGUNTAS.map((f) => (
              <details key={f.p} className="rota-faq group">
                <summary className="flex cursor-pointer items-center justify-between gap-6 py-6 text-left font-display text-[1.02rem] font-medium text-creme transition-colors hover:text-cobre-claro sm:text-[1.12rem]">
                  {f.p}
                  <span className="rota-faq-sinal flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 text-cobre transition-transform duration-300">
                    <IconeMais className="h-4 w-4" />
                  </span>
                </summary>
                <p className="-mt-1 max-w-2xl pb-7 pr-14 text-[1rem] leading-relaxed text-creme-2">
                  {f.r}
                  {f.link && (
                    <>
                      {" "}
                      <Link href={f.link.href} className="text-cobre-claro underline underline-offset-4">
                        {f.link.rotulo}
                      </Link>
                      .
                    </>
                  )}
                </p>
              </details>
            ))}
          </div>
        </Container>
      </section>
    </>
  );
}

// ---------------------------------------------------------------------------
//  Peças da home
// ---------------------------------------------------------------------------

/**
 * Bento de categorias sem buraco: a 1ª ocupa 2×2 e o resto se ajusta pra fechar
 * a grade — 2 colunas no celular, 4 no desktop — com qualquer quantidade (até 7).
 */
function bento(i: number, n: number): string {
  if (i === 0) return "col-span-2 row-span-2";
  const ultimo = i === n - 1;
  const cls: string[] = [];
  // Celular: sobrou uma sozinha na última linha → ocupa a linha inteira.
  if (ultimo && (n - 1) % 2 === 1) cls.push("col-span-2");
  // Desktop: o bloco 2×2 à direita da primeira recebe as 4 seguintes.
  if (n === 2) cls.push("md:col-span-2 md:row-span-2");
  else if (n === 3) cls.push("md:col-span-2");
  else if (n === 4 && i === 3) cls.push("md:col-span-2");
  else if (n > 5 && ultimo) {
    const naLinha = (n - 5) % 4; // itens na última linha, abaixo do bloco
    // Classe escrita por extenso: o Tailwind só gera o que encontra literal no código.
    const SPAN: Record<number, string> = { 2: "md:col-span-2", 3: "md:col-span-3", 4: "md:col-span-4" };
    if (naLinha) cls.push(SPAN[4 - naLinha + 1] ?? "");
  }
  return cls.join(" ");
}
function Numero({ valor, rotulo }: { valor: number; rotulo: string }) {
  return (
    <div className="flex flex-col-reverse gap-1">
      <dt className="text-[0.72rem] uppercase leading-snug tracking-[0.16em] text-nevoa">{rotulo}</dt>
      <dd className="rota-num font-display text-[clamp(1.6rem,2.6vw,2.2rem)] font-medium leading-none text-creme">
        {valor}
      </dd>
    </div>
  );
}

/** Três peças reais em colagem: a vitrine já é o herói. */
function Colagem({ produtos }: { produtos: ProdutoLoja[] }) {
  const [a, b, c] = produtos;
  return (
    <div className="relative mx-auto aspect-[5/6] w-full max-w-[560px]">
      {a && (
        <Link
          href={ROTAS.produto(a.id)}
          className="rota-entra group absolute right-[4%] top-0 w-[64%] [--atraso:.2s]"
          aria-label={`${a.nome} — ${faixaPreco(a.precoMin, a.precoMax)}`}
        >
          <Foto src={a.imagens[0]!} prioridade className="rotate-[2.5deg]" />
        </Link>
      )}
      {b && (
        <Link
          href={ROTAS.produto(b.id)}
          className="rota-entra absolute bottom-0 left-0 w-[44%] [--atraso:.38s]"
          aria-label={b.nome}
        >
          <Foto src={b.imagens[0]!} className="-rotate-[4deg]" />
        </Link>
      )}
      {c && (
        <Link
          href={ROTAS.produto(c.id)}
          className="rota-entra absolute bottom-[6%] right-0 w-[30%] [--atraso:.52s]"
          aria-label={c.nome}
        >
          <Foto src={c.imagens[0]!} className="rotate-[5deg]" />
        </Link>
      )}
      {/* Etiqueta da peça principal — por último no DOM pra ficar por cima das fotos
          (cada foto anima com transform e vira uma camada própria). */}
      {a && (
        <Link
          href={ROTAS.produto(a.id)}
          tabIndex={-1}
          aria-hidden
          className="rota-entra absolute left-[6%] top-[9%] max-w-[15rem] rounded-2xl border border-white/10 bg-asfalto/80 p-4 shadow-2xl backdrop-blur-xl transition-colors hover:border-cobre/50 sm:left-[10%] [--atraso:.7s]"
        >
          <span className="rota-kicker block text-[0.6rem]!">Na vitrine</span>
          <span className="mt-1.5 line-clamp-1 block text-sm text-creme">{a.nome}</span>
          <span className="rota-num mt-1 block font-display text-[0.95rem] text-cobre-claro">
            {faixaPreco(a.precoMin, a.precoMax)}
          </span>
        </Link>
      )}
    </div>
  );
}

function Foto({ src, prioridade = false, className = "" }: { src: string; prioridade?: boolean; className?: string }) {
  return (
    <span
      className={`block aspect-[4/5] overflow-hidden rounded-[1.75rem] bg-grafite shadow-[0_50px_90px_-40px_rgba(0,0,0,.95)] ring-1 ring-white/10 transition-transform duration-700 ease-[cubic-bezier(.22,1,.36,1)] hover:rotate-0 hover:scale-[1.02] ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        width={640}
        height={800}
        loading={prioridade ? "eager" : "lazy"}
        fetchPriority={prioridade ? "high" : "auto"}
        decoding="async"
        className="h-full w-full object-cover"
      />
    </span>
  );
}

/** Loja ainda sem foto: a própria marca segura o herói. */
function SeloMarca({ logoUrl }: { logoUrl: string | null }) {
  return (
    <div className="relative mx-auto flex aspect-square w-full max-w-[460px] items-center justify-center rounded-full border border-white/[0.06] bg-[radial-gradient(closest-side,rgba(200,151,117,.14),transparent)]">
      <div className="absolute inset-8 rounded-full border border-dashed border-cobre/25" />
      <BrandLogo variant="mark" size="2xl" markUrl={logoUrl} className="rota-entra" priority />
    </div>
  );
}

/** Prateleira: carrossel com o dedo no celular, grade no desktop. */
function Prateleira({ produtos }: { produtos: ProdutoLoja[] }) {
  return (
    <ul className="rota-sem-barra -mx-5 mt-12 flex snap-x snap-mandatory scroll-px-5 gap-4 overflow-x-auto px-5 pb-2 sm:-mx-8 sm:scroll-px-8 sm:px-8 lg:mx-0 lg:grid lg:grid-cols-4 lg:gap-x-6 lg:gap-y-14 lg:overflow-visible lg:px-0">
      {produtos.map((p, i) => (
        <li key={p.id} className="w-[72%] shrink-0 snap-start sm:w-[44%] lg:w-auto">
          <CartaoProduto produto={p} prioridade={i < 2} />
        </li>
      ))}
    </ul>
  );
}
