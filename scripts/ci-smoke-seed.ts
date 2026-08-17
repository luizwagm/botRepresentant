// Semeia o minimo pro smoke test do CI e imprime o id do produto criado.
// Roda contra o Postgres efemero do GitHub Actions — nunca contra producao.
//
// O objetivo e ter um produto ATIVO real pra exercitar /catalogo/publico/[id]:
// foi exatamente essa rota que quebrou em producao (funcao de modulo "use client"
// chamada no servidor) passando por tsc e lint sem reclamar.
import { prisma } from "../src/lib/db";

async function main(): Promise<void> {
  const product = await prisma.product.create({
    data: {
      name: "Produto de fumaça (CI)",
      description: "<p>Peça usada só no teste automático.</p>",
      images: [],
      videos: [],
      sizes: ["38", "40"],
      tags: ["ci"],
      categories: [],
      colors: [{ name: "Azul", hex: "#1B2A4A", image: null }],
      wholesalePriceMin: 49.9,
      wholesalePriceMax: 59.9,
      retailPrice: 149.9,
      active: true,
      minOrderQty: 10,
      readyToShip: true,
    },
  });

  // Conteudo do "Sobre" fica de fora de proposito: /sobre tem que provar que
  // funciona SEM a linha no banco (caminho do fallback pro texto-semente).

  // Unica saida no stdout: o id, pro shell capturar.
  console.log(product.id);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("Falha ao semear:", e instanceof Error ? e.message : e);
  await prisma.$disconnect();
  process.exit(1);
});
