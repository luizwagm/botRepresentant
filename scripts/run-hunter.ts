// CLI pra rodar o hunter.
// Uso:
//   npm run hunter -- --city "Campina Grande" --state PB
//   npm run hunter:wave1
import { huntCity, type HuntCityResult } from "../src/lib/hunter";
import { ONDA_1_NORDESTE, type CityTarget } from "../src/lib/cities";
import { prisma } from "../src/lib/db";

function parseArgs(): { city?: string; state?: string; wave?: string } {
  const args = process.argv.slice(2);
  const out: { city?: string; state?: string; wave?: string } = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--city" || a === "-c") out.city = args[++i];
    else if (a === "--state" || a === "-s") out.state = args[++i];
    else if (a === "--wave" || a === "-w") out.wave = args[++i];
  }
  return out;
}

function printResult(r: HuntCityResult): void {
  console.log(
    `  +${r.inserted} novos | ${r.updated} atualizados | ${r.total} candidatos | ` +
      `skip: ${r.skipped.blacklist} atacado, ${r.skipped.quality} qualidade, ` +
      `${r.skipped.duplicate} duplicados`,
  );
}

async function main(): Promise<void> {
  const args = parseArgs();
  let targets: CityTarget[];

  if (args.city) {
    targets = [{ name: args.city, state: (args.state ?? "PE").toUpperCase() }];
  } else if (!args.wave || args.wave === "1") {
    targets = ONDA_1_NORDESTE;
  } else {
    console.error(
      `Wave desconhecida: ${args.wave}. Use --wave 1 (Nordeste) ou --city/--state.`,
    );
    process.exit(1);
  }

  console.log(`\nHunter rodando em ${targets.length} cidade(s)...\n`);
  const t0 = Date.now();
  let totalInserted = 0;
  let totalUpdated = 0;

  for (const t of targets) {
    console.log(`[${t.name}/${t.state}]`);
    try {
      const r = await huntCity(t.name, t.state);
      printResult(r);
      totalInserted += r.inserted;
      totalUpdated += r.updated;
    } catch (e) {
      console.error(`  ! erro:`, e instanceof Error ? e.message : e);
    }
  }

  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(
    `\n=== Total: ${totalInserted} novos + ${totalUpdated} atualizados em ${secs}s ===\n`,
  );

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("Erro fatal:", e instanceof Error ? e.stack : e);
  await prisma.$disconnect();
  process.exit(1);
});
