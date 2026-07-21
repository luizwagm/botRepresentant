// Reclassifica leads antigos segundo a regra nova: so CELULAR conta como zap.
//
// Roda como script (NAO como migration) de proposito: gravar o valor de enum
// novo 'SEM_WHATSAPP' enquanto o processo antigo ainda serve faria o
// PrismaClient em memoria dele falhar ("Value 'SEM_WHATSAPP' not found in enum")
// -> 500 no painel durante todo o build. Por isso o deploy.sh so chama isto
// DEPOIS do pm2 restart.
//
// Idempotente. Uso: npm run backfill:sem-whatsapp
import { prisma } from "../src/lib/db";
import { isMobileBr } from "../src/lib/phone";

async function main(): Promise<void> {
  // 1) Telefone fixo guardado no campo `whatsapp` nao e zap. O numero continua
  //    preservado em `phone`, entao nada se perde.
  const comWhats = await prisma.lead.findMany({
    where: { whatsapp: { not: null } },
    select: { id: true, whatsapp: true },
  });
  const fixos = comWhats.filter((l) => !isMobileBr(l.whatsapp)).map((l) => l.id);

  if (fixos.length > 0) {
    await prisma.lead.updateMany({
      where: { id: { in: fixos } },
      data: { whatsapp: null },
    });
  }
  console.log(`${fixos.length} leads tinham telefone fixo no campo WhatsApp — limpos.`);

  // 2) Quem esta em NOVO_LEAD e ficou sem zap vai pra coluna propria.
  //    Conservador: nao mexe em lead ja em andamento.
  const movidos = await prisma.lead.updateMany({
    where: { whatsapp: null, funnelStage: "NOVO_LEAD" },
    data: { funnelStage: "SEM_WHATSAPP" },
  });
  console.log(`✓ ${movidos.count} leads movidos para "Não tem Zap".`);

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("Erro:", e instanceof Error ? e.message : e);
  await prisma.$disconnect();
  process.exit(1);
});
