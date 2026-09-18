// sitemap.xml — páginas fixas, categorias com peça e todos os produtos ativos.
// Gerado a cada pedido (o catálogo muda pelo painel) e tolerante a banco fora.
import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { CATEGORY_SLUGS } from "@/lib/categories";
import { urlAbsoluta } from "@/lib/loja/url";
import { ROTAS } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const agora = new Date();
  const fixas: MetadataRoute.Sitemap = [
    { url: urlAbsoluta(ROTAS.inicio), lastModified: agora, changeFrequency: "daily", priority: 1 },
    { url: urlAbsoluta(ROTAS.loja), lastModified: agora, changeFrequency: "daily", priority: 0.9 },
    { url: urlAbsoluta(ROTAS.sobre), changeFrequency: "monthly", priority: 0.5 },
    { url: urlAbsoluta(ROTAS.privacidade), changeFrequency: "yearly", priority: 0.2 },
    { url: urlAbsoluta(ROTAS.termos), changeFrequency: "yearly", priority: 0.2 },
  ];

  try {
    const produtos = await prisma.product.findMany({
      where: { active: true },
      select: { id: true, updatedAt: true, categories: true, images: true },
      orderBy: { updatedAt: "desc" },
      take: 5000,
    });
    const categorias = CATEGORY_SLUGS.filter((c) => produtos.some((p) => p.categories.includes(c)));
    return [
      ...fixas,
      ...categorias.map((c) => ({
        url: urlAbsoluta(ROTAS.categoria(c)),
        lastModified: agora,
        changeFrequency: "daily" as const,
        priority: 0.8,
      })),
      ...produtos.map((p) => ({
        url: urlAbsoluta(ROTAS.produto(p.id)),
        lastModified: p.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.7,
        images: p.images.slice(0, 3).map(urlAbsoluta),
      })),
    ];
  } catch (e) {
    console.error("sitemap: sem acesso ao banco, só páginas fixas:", e instanceof Error ? e.message : e);
    return fixas;
  }
}
