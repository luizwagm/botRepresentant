// /loja/[categoria] — vitrine de uma categoria. Cada categoria tem URL própria
// (e título/descrição próprios): é a página que o lojista acha no Google
// procurando "jeans atacado", "moda infantil atacado"...
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import JsonLd from "@/components/loja/json-ld";
import Vitrine, { lerFiltros } from "@/components/loja/vitrine";
import { CATEGORY_LABEL } from "@/lib/categories";
import { env } from "@/lib/env";
import { categoriasComProduto, listarProdutos } from "@/lib/loja/catalogo";
import { urlAbsoluta } from "@/lib/loja/url";
import { normalizeBrazilPhone } from "@/lib/phone";
import { OG_PADRAO, ROTAS, SITE } from "@/lib/site";

type Props = {
  params: Promise<{ categoria: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function descricaoDa(rotulo: string) {
  return `${rotulo} no atacado, direto das fábricas do Polo de Confecções do Agreste. Preço de atacado, grade do seu jeito e pedido fechado no WhatsApp com a ${SITE.nome}.`;
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { categoria } = await params;
  const rotulo = CATEGORY_LABEL[categoria];
  if (!rotulo) return { title: "Categoria não encontrada" };
  const f = lerFiltros(await searchParams);
  return {
    title: `${rotulo} no atacado`,
    description: descricaoDa(rotulo),
    alternates: { canonical: ROTAS.categoria(categoria) },
    robots: f.q ? { index: false, follow: true } : undefined,
    openGraph: { ...OG_PADRAO, url: ROTAS.categoria(categoria), title: `${rotulo} no atacado | ${SITE.nome}` },
  };
}

export default async function CategoriaPage({ params, searchParams }: Props) {
  const { categoria } = await params;
  const rotulo = CATEGORY_LABEL[categoria];
  if (!rotulo) notFound();

  const filtros = lerFiltros(await searchParams);
  const [produtos, categorias] = await Promise.all([
    listarProdutos({ categoria, busca: filtros.q, ordem: filtros.ordem, prontaEntrega: filtros.pronta, limite: 240 }),
    categoriasComProduto(),
  ]);

  return (
    <>
      <JsonLd
        dados={[
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Início", item: urlAbsoluta("/") },
              { "@type": "ListItem", position: 2, name: "Loja", item: urlAbsoluta(ROTAS.loja) },
              { "@type": "ListItem", position: 3, name: rotulo, item: urlAbsoluta(ROTAS.categoria(categoria)) },
            ],
          },
          {
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: `${rotulo} no atacado`,
            description: descricaoDa(rotulo),
            url: urlAbsoluta(ROTAS.categoria(categoria)),
            mainEntity: {
              "@type": "ItemList",
              itemListElement: produtos.slice(0, 60).map((p, i) => ({
                "@type": "ListItem",
                position: i + 1,
                url: urlAbsoluta(ROTAS.produto(p.id)),
                name: p.nome,
              })),
            },
          },
        ]}
      />
      <Vitrine
        titulo={rotulo}
        kicker={filtros.pronta ? "Pronta-entrega" : "Categoria"}
        descricao={`${rotulo} das fábricas do polo, com preço de atacado. Monte a grade da sua loja e feche o pedido no WhatsApp.`}
        caminho={ROTAS.categoria(categoria)}
        categoriaAtual={categoria}
        categorias={categorias}
        produtos={produtos}
        filtros={filtros}
        whatsapp={normalizeBrazilPhone(env.luizWhatsapp)}
      />
    </>
  );
}
