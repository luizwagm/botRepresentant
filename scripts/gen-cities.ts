// Gera src/lib/br-cities.ts com os municipios brasileiros >= 20.000 habitantes.
// Fonte: IBGE (lista de municipios + estimativa populacional). Uso: npx tsx scripts/gen-cities.ts
import { writeFile } from "node:fs/promises";
import path from "node:path";

type Municipio = {
  id: number;
  nome: string;
  microrregiao?: { mesorregiao?: { UF?: { sigla?: string } } };
};

async function main(): Promise<void> {
  console.log("Buscando municipios do IBGE...");
  const muniRes = await fetch("https://servicodados.ibge.gov.br/api/v1/localidades/municipios");
  if (!muniRes.ok) throw new Error(`municipios HTTP ${muniRes.status}`);
  const munis = (await muniRes.json()) as Municipio[];
  const byId = new Map<number, { name: string; uf: string }>();
  for (const m of munis) {
    const uf = m.microrregiao?.mesorregiao?.UF?.sigla;
    if (uf) byId.set(m.id, { name: m.nome, uf });
  }
  console.log(`  ${byId.size} municipios com UF resolvida`);

  console.log("Buscando estimativa populacional (IBGE agregado 6579)...");
  const popRes = await fetch(
    "https://servicodados.ibge.gov.br/api/v3/agregados/6579/periodos/-1/variaveis/9324?localidades=N6[all]",
  );
  if (!popRes.ok) throw new Error(`populacao HTTP ${popRes.status}`);
  const popData = (await popRes.json()) as Array<{
    resultados?: Array<{ series?: Array<{ localidade?: { id?: string }; serie?: Record<string, string> }> }>;
  }>;
  const pop = new Map<number, number>();
  const series = popData?.[0]?.resultados?.[0]?.series ?? [];
  for (const s of series) {
    const id = Number(s.localidade?.id);
    const values = Object.values(s.serie ?? {});
    const val = Number(values[values.length - 1]);
    if (Number.isFinite(id) && Number.isFinite(val)) pop.set(id, val);
  }
  console.log(`  ${pop.size} municipios com populacao`);

  const cities: { name: string; state: string }[] = [];
  for (const [id, info] of byId) {
    const p = pop.get(id);
    if (p != null && p >= 20000) cities.push({ name: info.name, state: info.uf });
  }
  cities.sort((a, b) => a.state.localeCompare(b.state) || a.name.localeCompare(b.name, "pt-BR"));

  const out =
    `// GERADO por scripts/gen-cities.ts a partir do IBGE (municipios + estimativa populacional).\n` +
    `// Municipios brasileiros com populacao >= 20.000. Nao editar a mao.\n\n` +
    `export type BrCity = { name: string; state: string };\n\n` +
    `export const BR_CITIES: BrCity[] = ${JSON.stringify(cities)};\n`;

  await writeFile(path.join(process.cwd(), "src", "lib", "br-cities.ts"), out);
  console.log(`\ngerado src/lib/br-cities.ts com ${cities.length} cidades (>=20k habitantes)`);
}

main().catch((e) => {
  console.error("FALHOU:", e instanceof Error ? e.message : e);
  process.exit(1);
});
