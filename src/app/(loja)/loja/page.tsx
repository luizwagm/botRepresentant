// /loja — todas as peças, com busca (?q=), ordem (?ordem=) e pronta-entrega (?pronta=1).
import type { Metadata } from "next";
import JsonLd from "@/components/loja/json-ld";
import Vitrine, { lerFiltros } from "@/components/loja/vitrine";
import { env } from "@/lib/env";
import { categoriasComProduto, listarProdutos } from "@/lib/loja/catalogo";
import { urlAbsoluta } from "@/lib/loja/url";
import { normalizeBrazilPhone } from "@/lib/phone";
import { OG_PADRAO, ROTAS, SITE } from "@/lib/site";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const f = lerFiltros(await searchParams);
  return {
    title: f.q ? `Busca: ${f.q}` : "Loja — moda no atacado direto das fábricas",
    description: `Todas as peças da ${SITE.nome}: jeans, moda feminina, masculina, infantil e mais, com preço de atacado e pedido mínimo por modelo.`,
    alternates: { canonical: ROTAS.loja },
    // Resultado de busca não é página pra indexar (conteúdo fino e infinito).
    robots: f.q ? { index: false, follow: true } : undefined,
    openGraph: { ...OG_PADRAO, url: ROTAS.loja },
  };
}

export default async function LojaPage({ searchParams }: Props) {
  const filtros = lerFiltros(await searchParams);
  const [produtos, categorias] = await Promise.all([
    listarProdutos({ busca: filtros.q, ordem: filtros.ordem, prontaEntrega: filtros.pronta, limite: 240 }),
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
            ],
          },
          {
            "@context": "https://schema.org",
            "@type": "ItemList",
            itemListElement: produtos.slice(0, 60).map((p, i) => ({
              "@type": "ListItem",
              position: i + 1,
              url: urlAbsoluta(ROTAS.produto(p.id)),
              name: p.nome,
            })),
          },
        ]}
      />
      <Vitrine
        titulo={filtros.pronta ? "Pronta-entrega" : "Todas as peças"}
        kicker="A vitrine do polo"
        descricao="Tudo o que está no ar agora, direto das fábricas do Agreste. Escolha a peça, monte a grade e feche no WhatsApp."
        caminho={ROTAS.loja}
        categoriaAtual={null}
        categorias={categorias}
        produtos={produtos}
        filtros={filtros}
        whatsapp={normalizeBrazilPhone(env.luizWhatsapp)}
      />
    </>
  );
}
