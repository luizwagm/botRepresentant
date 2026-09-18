// /produto/[id] — página do produto. O servidor entrega tudo que o Google e o
// preview do WhatsApp precisam (título, foto, preço, dados estruturados); a
// parte interativa (galeria + grade) é o ProdutoInterativo.
import type { Metadata } from "next";
import { cache } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import RichContent from "@/components/rich-content";
import CartaoProduto from "@/components/loja/cartao-produto";
import JsonLd from "@/components/loja/json-ld";
import ProdutoInterativo from "@/components/loja/produto-interativo";
import { CabecaSecao, Container } from "@/components/loja/ui";
import { plainText } from "@/lib/about";
import { CATEGORY_LABEL } from "@/lib/categories";
import { env } from "@/lib/env";
import { buscarProduto, relacionados } from "@/lib/loja/catalogo";
import { faixaPreco } from "@/lib/loja/formato";
import { TAMANHO_UNICO } from "@/lib/loja/tipos";
import { baseUrl, urlAbsoluta } from "@/lib/loja/url";
import { normalizeBrazilPhone } from "@/lib/phone";
import { OG_PADRAO, ROTAS, SITE } from "@/lib/site";

type Props = { params: Promise<{ id: string }> };

// generateMetadata e a página pedem o mesmo produto: uma query só por request.
const produtoDoRequest = cache(buscarProduto);

function resumo(p: NonNullable<Awaited<ReturnType<typeof buscarProduto>>>): string {
  const texto = p.descricao ? plainText(p.descricao) : "";
  const base = `${p.nome} no atacado: ${faixaPreco(p.precoMin, p.precoMax)} por peça, mínimo de ${p.minimo} peças por modelo.`;
  return (texto ? `${base} ${texto}` : `${base} Direto das fábricas do Polo do Agreste, com a ${SITE.nome}.`).slice(0, 180);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const p = await produtoDoRequest(id);
  if (!p) return { title: "Peça não encontrada", robots: { index: false } };
  const imagem = p.imagens[0];
  return {
    title: p.nome,
    description: resumo(p),
    alternates: { canonical: ROTAS.produto(p.id) },
    openGraph: {
      ...OG_PADRAO,
      url: ROTAS.produto(p.id),
      title: `${p.nome} — ${faixaPreco(p.precoMin, p.precoMax)}`,
      description: resumo(p),
      // Foto do produto no preview do WhatsApp; sem foto, fica a imagem da marca (OG_PADRAO).
      ...(imagem ? { images: [{ url: urlAbsoluta(imagem), alt: p.nome }] } : {}),
    },
  };
}

export default async function ProdutoPage({ params }: Props) {
  const { id } = await params;
  const p = await produtoDoRequest(id);
  if (!p) notFound();

  const outros = await relacionados(p, 8).catch(() => []);
  const whatsapp = normalizeBrazilPhone(env.luizWhatsapp);
  const slug = p.categorias[0] ?? null;
  const categoria = slug ? { slug, label: CATEGORY_LABEL[slug] ?? slug } : null;
  const url = urlAbsoluta(ROTAS.produto(p.id));
  const temPreco = p.precoMin !== null || p.precoMax !== null;

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Product",
      "@id": `${url}#produto`,
      name: p.nome,
      url,
      sku: p.id,
      image: p.imagens.slice(0, 6).map(urlAbsoluta),
      description: resumo(p),
      ...(categoria ? { category: categoria.label } : {}),
      ...(p.cores.length ? { color: p.cores.map((c) => c.nome).join(", ") } : {}),
      ...(p.tamanhos.length ? { size: p.tamanhos.join(", ") } : {}),
      ...(temPreco
        ? {
            offers: {
              "@type": "AggregateOffer",
              priceCurrency: "BRL",
              lowPrice: (p.precoMin ?? p.precoMax)!.toFixed(2),
              highPrice: (p.precoMax ?? p.precoMin)!.toFixed(2),
              offerCount: 1,
              url,
              businessFunction: "http://purl.org/goodrelations/v1#Sell",
              eligibleCustomerType: "http://purl.org/goodrelations/v1#Reseller",
              eligibleQuantity: { "@type": "QuantitativeValue", minValue: p.minimo, unitText: "peças" },
              ...(p.prontaEntrega ? { availability: "https://schema.org/InStock" } : {}),
              seller: { "@type": "Organization", "@id": `${baseUrl()}/#organizacao`, name: SITE.nome },
            },
          }
        : {}),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Início", item: urlAbsoluta("/") },
        { "@type": "ListItem", position: 2, name: "Loja", item: urlAbsoluta(ROTAS.loja) },
        ...(categoria
          ? [{ "@type": "ListItem", position: 3, name: categoria.label, item: urlAbsoluta(ROTAS.categoria(categoria.slug)) }]
          : []),
        { "@type": "ListItem", position: categoria ? 4 : 3, name: p.nome, item: url },
      ],
    },
  ];

  const ficha: [string, string][] = [
    ...(p.tamanhos.length && !(p.tamanhos.length === 1 && p.tamanhos[0] === TAMANHO_UNICO)
      ? ([["Tamanhos", p.tamanhos.join(" · ")]] as [string, string][])
      : []),
    ...(p.cores.length ? ([["Cores", p.cores.map((c) => c.nome).join(" · ")]] as [string, string][]) : []),
    ["Pedido mínimo", `${p.minimo} peças por modelo (somando cores e tamanhos)`],
    ...(p.categorias.length
      ? ([["Categorias", p.categorias.map((c) => CATEGORY_LABEL[c] ?? c).join(" · ")]] as [string, string][])
      : []),
    ...(p.prontaEntrega ? ([["Disponibilidade", "Pronta-entrega"]] as [string, string][]) : []),
  ];

  return (
    <>
      <JsonLd dados={jsonLd} />
      <Container className="pt-6 sm:pt-10">
        <nav aria-label="Você está em" className="mb-6 text-[0.8rem] text-nevoa sm:mb-8">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link href={ROTAS.inicio} className="hover:text-creme">
                Início
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li>
              <Link href={ROTAS.loja} className="hover:text-creme">
                Loja
              </Link>
            </li>
            {categoria && (
              <>
                <li aria-hidden>/</li>
                <li>
                  <Link href={ROTAS.categoria(categoria.slug)} className="hover:text-creme">
                    {categoria.label}
                  </Link>
                </li>
              </>
            )}
            <li aria-hidden>/</li>
            <li aria-current="page" className="line-clamp-1 max-w-[16rem] text-creme-2">
              {p.nome}
            </li>
          </ol>
        </nav>

        <ProdutoInterativo produto={p} categoria={categoria} whatsapp={whatsapp} urlProduto={url} />
      </Container>

      {/* Detalhes da peça */}
      <section aria-labelledby="detalhes-titulo" className="mt-20 border-t border-white/[0.06] pt-16 sm:mt-28">
        <Container className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <p className="rota-kicker">Ficha da peça</p>
            <h2 id="detalhes-titulo" className="mt-4 font-display text-[1.75rem] font-medium tracking-[-0.02em] text-creme">
              Detalhes
            </h2>
          </div>
          <div className="lg:col-span-8">
            <dl className="divide-y divide-white/[0.07] border-y border-white/[0.07]">
              {ficha.map(([k, v]) => (
                <div key={k} className="grid gap-1 py-4 sm:grid-cols-3 sm:gap-6">
                  <dt className="text-sm text-nevoa">{k}</dt>
                  <dd className="text-creme sm:col-span-2">{v}</dd>
                </div>
              ))}
            </dl>
            {p.descricao && <RichContent html={p.descricao} className="mt-8 max-w-2xl text-[1.02rem] text-creme-2" />}
          </div>
        </Container>
      </section>

      {outros.length > 0 && (
        <section aria-labelledby="outros-titulo" className="mt-24 sm:mt-32">
          <Container>
            <CabecaSecao id="outros-titulo" kicker="Na mesma rota" titulo="Pra completar o pedido." />
            <ul className="rota-sem-barra -mx-5 mt-10 flex snap-x snap-mandatory scroll-px-5 gap-4 overflow-x-auto px-5 pb-2 sm:-mx-8 sm:scroll-px-8 sm:px-8 lg:mx-0 lg:grid lg:grid-cols-4 lg:gap-x-6 lg:gap-y-14 lg:overflow-visible lg:px-0">
              {outros.map((o) => (
                <li key={o.id} className="w-[72%] shrink-0 snap-start sm:w-[44%] lg:w-auto">
                  <CartaoProduto produto={o} />
                </li>
              ))}
            </ul>
          </Container>
        </section>
      )}
    </>
  );
}
