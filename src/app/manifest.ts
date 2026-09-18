// Web App Manifest — a loja pode ser "instalada" na tela inicial do celular do
// lojista, com o ícone da ROTA e abrindo direto na vitrine.
import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE.nome,
    short_name: SITE.nomeCurto,
    description: SITE.descricao,
    lang: "pt-BR",
    start_url: "/loja",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: SITE.corTema,
    theme_color: SITE.corTema,
    categories: ["shopping", "business"],
    icons: [
      { src: "/rota/icone-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/rota/icone-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/rota/icone-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Vitrine", url: "/loja", icons: [{ src: "/rota/icone-192.png", sizes: "192x192" }] },
      { name: "Meu pedido", url: "/carrinho", icons: [{ src: "/rota/icone-192.png", sizes: "192x192" }] },
    ],
  };
}
