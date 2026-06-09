// Cria 2 produtos de demonstração pro catálogo (pra screenshot/teste). Imprime os IDs.
// Limpe depois com: npx tsx scripts/seed-demo-products.ts --clean
import { unlink } from "node:fs/promises";
import path from "node:path";

const BASE = "http://localhost:3030";

// PNGs 1x1 de cores diferentes (denim e bege)
const PNG_BLUE = Buffer.from(
  "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da6364a8a3a300000400015c"
  + "a24f5f0000000049454e44ae426082", "hex");

function getCookie(res: Response): string {
  const h = res.headers as unknown as { getSetCookie?: () => string[] };
  const jh = (h.getSetCookie?.() ?? []).find((c) => c.startsWith("jh_session="));
  if (!jh) throw new Error("sem cookie");
  return jh.split(";")[0]!;
}

async function login(): Promise<string> {
  const r = await fetch(`${BASE}/api/auth/login`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@jeans.local", password: "jeans2026" }),
  });
  if (!r.ok) throw new Error("login falhou");
  return getCookie(r);
}

async function uploadImg(cookie: string): Promise<string> {
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(PNG_BLUE)], { type: "image/png" }), "demo.png");
  const r = await fetch(`${BASE}/api/upload`, { method: "POST", headers: { cookie }, body: form });
  const j = await r.json();
  if (!r.ok) throw new Error("upload falhou: " + JSON.stringify(j));
  return j.url as string;
}

const DEMOS = [
  {
    name: "Short Jeans Feminino Cintura Alta",
    description:
      "<b>Destaques do produto:</b><ul><li>Modelagem cintura alta que valoriza a silhueta</li><li>Lavagem stone clara</li><li>Elastano pra conforto</li><li>Bolsos funcionais</li></ul><p>Ideal pra revenda no verão. <i>Pronta-entrega.</i></p>",
    sizes: ["36", "38", "40", "42"],
    wholesalePriceMin: 19, wholesalePriceMax: 22, retailPrice: 49.9,
    tags: ["feminino", "short", "cintura alta"], minOrderQty: 12, readyToShip: true,
  },
  {
    name: "Bermuda Masculina Tradicional",
    description:
      "<b>Destaques:</b><ul><li>Corte tradicional reto</li><li>Tecido jeans resistente</li><li>Cinco bolsos</li></ul><p>Sob encomenda — produção em 7 dias úteis.</p>",
    sizes: ["38", "40", "42", "44", "46"],
    wholesalePriceMin: 23, wholesalePriceMax: 26, retailPrice: 59.9,
    tags: ["masculino", "bermuda"], minOrderQty: 20, readyToShip: false,
  },
];

async function clean(cookie: string): Promise<void> {
  const list = await (await fetch(`${BASE}/api/products`, { headers: { cookie } })).json();
  for (const p of list.items as Array<{ id: string; name: string; images: string[] }>) {
    if (p.name.startsWith("Short Jeans Feminino Cintura Alta") || p.name.startsWith("Bermuda Masculina Tradicional")) {
      await fetch(`${BASE}/api/products/${p.id}`, { method: "DELETE", headers: { cookie } });
      for (const url of p.images) {
        await unlink(path.join(process.cwd(), "public", url.replace(/^\//, ""))).catch(() => {});
      }
      console.log("removido:", p.name);
    }
  }
}

async function main(): Promise<void> {
  const cookie = await login();
  if (process.argv.includes("--clean")) {
    await clean(cookie);
    console.log("limpeza concluída");
    return;
  }
  const img = await uploadImg(cookie);
  for (const d of DEMOS) {
    const r = await fetch(`${BASE}/api/products`, {
      method: "POST", headers: { "Content-Type": "application/json", cookie },
      body: JSON.stringify({ ...d, images: [img], active: true }),
    });
    const p = await r.json();
    console.log("criado:", p.name, p.id, "min", p.minOrderQty, "pronta", p.readyToShip);
  }
}

main().catch((e) => { console.error("FALHOU:", e instanceof Error ? e.message : e); process.exit(1); });
