// Testa o prompt da IA sem depender do banco — chama a funcao com um lead fake.
// Uso: npx tsx scripts/test-ai-message.ts
import { generateFirstContactMessage } from "../src/lib/messaging";

async function main(): Promise<void> {
  const casos = [
    { name: "Boutique Bella Moda", city: "Fortaleza", state: "CE", storeType: "FEMININA" },
    { name: "Loja do Zé Multimarcas", city: "Campina Grande", state: "PB", storeType: "MULTIMARCA" },
  ];
  for (const lead of casos) {
    console.log(`\n=== ${lead.name} (${lead.city}/${lead.state}, ${lead.storeType}) ===`);
    const msg = await generateFirstContactMessage(lead);
    console.log(msg);
  }
}

main().catch((e) => {
  console.error("FALHOU:", e instanceof Error ? e.message : e);
  process.exit(1);
});
