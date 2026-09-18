// Consultas da loja pública (SERVIDOR). Converte Product -> ProdutoLoja e nunca
// devolve o que é interno (fornecedor, preço de custo, etc.).
import "server-only";
import { cache } from "react";
import type { Prisma, Product } from "@prisma/client";
import { prisma } from "../db";
import { readColors } from "../product-colors";
import { PRODUCT_CATEGORIES, CATEGORY_SLUGS } from "../categories";
import type { ProdutoLoja } from "./tipos";

const DIAS_NOVO = 21;

export function paraLoja(p: Product): ProdutoLoja {
  return {
    id: p.id,
    nome: p.name,
    descricao: p.description,
    imagens: p.images,
    videos: p.videos,
    tamanhos: p.sizes,
    precoMin: p.wholesalePriceMin,
    precoMax: p.wholesalePriceMax,
    precoVarejo: p.retailPrice,
    categorias: p.categories.filter((c) => CATEGORY_SLUGS.includes(c)),
    cores: readColors(p.colors).map((c) => ({ nome: c.name, hex: c.hex, imagem: c.image })),
    minimo: Math.max(1, p.minOrderQty),
    prontaEntrega: p.readyToShip,
    novo: Date.now() - p.createdAt.getTime() < DIAS_NOVO * 86_400_000,
    atualizadoEm: p.updatedAt.toISOString(),
  };
}

export type Ordem = "novidades" | "menor-preco" | "maior-preco" | "nome";
export const ORDENS: { valor: Ordem; rotulo: string }[] = [
  { valor: "novidades", rotulo: "Novidades" },
  { valor: "menor-preco", rotulo: "Menor preço" },
  { valor: "maior-preco", rotulo: "Maior preço" },
  { valor: "nome", rotulo: "A–Z" },
];

function ordenacao(o: Ordem): Prisma.ProductOrderByWithRelationInput[] {
  switch (o) {
    case "menor-preco":
      return [{ wholesalePriceMin: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }];
    case "maior-preco":
      return [{ wholesalePriceMax: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }];
    case "nome":
      return [{ name: "asc" }];
    default:
      return [{ createdAt: "desc" }];
  }
}

export async function listarProdutos(opts: {
  categoria?: string | null;
  busca?: string | null;
  ordem?: Ordem;
  limite?: number;
  /** Só o que está pronto pra sair. */
  prontaEntrega?: boolean;
} = {}): Promise<ProdutoLoja[]> {
  const where: Prisma.ProductWhereInput = { active: true };
  if (opts.prontaEntrega) where.readyToShip = true;
  if (opts.categoria && CATEGORY_SLUGS.includes(opts.categoria)) {
    where.categories = { has: opts.categoria };
  }
  const q = opts.busca?.trim().slice(0, 80);
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { tags: { has: q.toLowerCase() } },
    ];
  }
  const produtos = await prisma.product.findMany({
    where,
    orderBy: ordenacao(opts.ordem ?? "novidades"),
    take: Math.min(opts.limite ?? 120, 240),
  });
  return produtos.map(paraLoja);
}

export async function buscarProduto(id: string): Promise<ProdutoLoja | null> {
  // id vem da URL: rejeita lixo antes de ir ao banco.
  if (!/^[a-z0-9]{8,40}$/i.test(id)) return null;
  const p = await prisma.product.findUnique({ where: { id } });
  return p && p.active ? paraLoja(p) : null;
}

export async function relacionados(p: ProdutoLoja, limite = 8): Promise<ProdutoLoja[]> {
  const where: Prisma.ProductWhereInput = { active: true, id: { not: p.id } };
  if (p.categorias.length > 0) where.categories = { hasSome: p.categorias };
  let lista = await prisma.product.findMany({ where, orderBy: { createdAt: "desc" }, take: limite });
  if (lista.length < 4) {
    // Categoria com pouca coisa: completa com novidades gerais.
    const extra = await prisma.product.findMany({
      where: { active: true, id: { notIn: [p.id, ...lista.map((x) => x.id)] } },
      orderBy: { createdAt: "desc" },
      take: limite - lista.length,
    });
    lista = [...lista, ...extra];
  }
  return lista.map(paraLoja);
}

/**
 * Categorias que TÊM produto ativo, com contagem e uma foto de capa. O menu e a
 * vitrine só mostram estas — categoria vazia é beco sem saída pro cliente.
 */
export const categoriasComProduto = cache(async () => {
  const produtos = await prisma.product.findMany({
    where: { active: true },
    orderBy: { createdAt: "desc" },
    select: { categories: true, images: true },
  });
  return PRODUCT_CATEGORIES.map((c) => {
    const deles = produtos.filter((p) => p.categories.includes(c.slug));
    return { ...c, total: deles.length, capa: deles.find((p) => p.images[0])?.images[0] ?? null };
  }).filter((c) => c.total > 0);
});
// cache(): o layout e a página pedem as categorias no mesmo request — uma query só.

/** Quantos modelos estão no ar (número real, pra vitrine — nada inventado). */
export const contarProdutos = cache(async () => prisma.product.count({ where: { active: true } }));
