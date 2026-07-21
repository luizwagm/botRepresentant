// Classifica leads antigos como FABRICANTE ou VAREJISTA a partir do nome.
// Opt-in (nao roda no deploy) porque a inferencia e por palavra-chave no nome
// e vale o usuario revisar. Idempotente: so toca em quem esta INDEFINIDO.
//
// Uso: npm run backfill:business-kind
import { prisma } from "../src/lib/db";
import { classifyBusinessKind } from "../src/lib/store-classifier";

async function main(): Promise<void> {
  const leads = await prisma.lead.findMany({
    where: { businessKind: "INDEFINIDO" },
    select: { id: true, name: true },
  });

  if (leads.length === 0) {
    console.log("Nenhum lead indefinido — nada a fazer.");
    await prisma.$disconnect();
    return;
  }

  console.log(`Classificando ${leads.length} leads...`);

  const fabricantes: string[] = [];
  const varejistas: string[] = [];
  for (const l of leads) {
    if (classifyBusinessKind(l.name) === "FABRICANTE") fabricantes.push(l.id);
    else varejistas.push(l.id);
  }

  if (fabricantes.length > 0) {
    await prisma.lead.updateMany({
      where: { id: { in: fabricantes } },
      data: { businessKind: "FABRICANTE" },
    });
  }
  if (varejistas.length > 0) {
    await prisma.lead.updateMany({
      where: { id: { in: varejistas } },
      data: { businessKind: "VAREJISTA" },
    });
  }

  console.log(`✓ ${fabricantes.length} fabricantes, ${varejistas.length} varejistas`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("Erro:", e instanceof Error ? e.message : e);
  await prisma.$disconnect();
  process.exit(1);
});
