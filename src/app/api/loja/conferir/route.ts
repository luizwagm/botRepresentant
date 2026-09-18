// GET /api/loja/conferir?ids=a,b,c — dados ATUAIS das peças que estão no
// carrinho do lojista (nome, preço, mínimo, tamanhos e cores). O carrinho vive
// no navegador e pode ter sido montado dias atrás: sem isto, ele mostraria
// preço e mínimo velhos até o envio ser recusado.
//
// Rota pública e só leitura: devolve o mesmo que a página do produto já mostra.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { TAMANHO_UNICO, type PecaConferida } from "@/lib/loja/tipos";
import { readColors } from "@/lib/product-colors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const ids = [
    ...new Set(
      (req.nextUrl.searchParams.get("ids") ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter((s) => /^[a-z0-9]{8,40}$/i.test(s)),
    ),
  ].slice(0, 60);
  if (ids.length === 0) return NextResponse.json({ produtos: {} });

  const produtos = await prisma.product.findMany({
    where: { id: { in: ids }, active: true },
    select: {
      id: true,
      name: true,
      minOrderQty: true,
      wholesalePriceMin: true,
      wholesalePriceMax: true,
      sizes: true,
      colors: true,
    },
  });

  // Peça que não volta aqui saiu da vitrine (inativa ou apagada).
  const mapa: Record<string, PecaConferida> = {};
  for (const p of produtos) {
    mapa[p.id] = {
      nome: p.name,
      minimo: Math.max(1, p.minOrderQty),
      precoMin: p.wholesalePriceMin,
      precoMax: p.wholesalePriceMax,
      tamanhos: p.sizes.length ? p.sizes : [TAMANHO_UNICO],
      cores: readColors(p.colors).map((c) => c.name),
    };
  }
  return NextResponse.json({ produtos: mapa }, { headers: { "Cache-Control": "no-store" } });
}
