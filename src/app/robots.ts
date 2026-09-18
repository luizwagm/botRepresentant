// robots.txt — a loja é pública e indexável; o painel e as APIs, não.
import type { MetadataRoute } from "next";
import { baseUrl } from "@/lib/loja/url";

export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        // /catalogo/publico são os links ANTIGOS da loja: o Google precisa
        // poder visitá-los pra ver o 308 e passar a relevância pras URLs novas.
        // (A regra mais específica vence o "Disallow: /catalogo" abaixo.)
        allow: ["/", "/catalogo/publico"],
        disallow: [
          "/api/",
          "/carrinho",
          "/login",
          "/painel",
          "/pedidos",
          "/leads",
          "/funil",
          "/prospeccao",
          "/catalogo",
          "/fornecedores",
          "/conteudo",
          "/marca",
          "/usuarios",
          "/auditoria",
        ],
      },
    ],
    sitemap: `${baseUrl()}/sitemap.xml`,
  };
}
