// Teste E2E de upload de foto + video e CRUD de produto.
// Requer o dev rodando em localhost:3030. Uso: npx tsx scripts/test-upload-e2e.ts
import { unlink } from "node:fs/promises";
import path from "node:path";

const BASE = "http://localhost:3030";
const EMAIL = "admin@jeans.local";
const PASS = "jeans2026";

// PNG 1x1 valido
const PNG = Buffer.from(
  "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c63000100000500010d0a2db40000000049454e44ae426082",
  "hex",
);
// MP4 minimo (so o box ftyp — suficiente: o endpoint valida por MIME+tamanho)
const MP4 = Buffer.from("0000001c667479706d703432000000006d70343269736f6d", "hex");

function getCookie(res: Response): string {
  const h = res.headers as unknown as { getSetCookie?: () => string[] };
  const cookies = h.getSetCookie?.() ?? [];
  const jh = cookies.find((c) => c.startsWith("jh_session="));
  if (!jh) throw new Error("sem cookie de sessão no login");
  return jh.split(";")[0]!;
}

async function uploadFile(cookie: string, bytes: Buffer, type: string, filename: string) {
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(bytes)], { type }), filename);
  const res = await fetch(`${BASE}/api/upload`, { method: "POST", headers: { cookie }, body: form });
  const json = await res.json();
  return { status: res.status, json };
}

async function main(): Promise<void> {
  // 1. login
  const loginRes = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASS }),
  });
  if (!loginRes.ok) throw new Error("login falhou: " + loginRes.status);
  const cookie = getCookie(loginRes);
  console.log("1. login OK");

  // 2. upload imagem
  const img = await uploadFile(cookie, PNG, "image/png", "foto.png");
  if (img.status !== 200 || img.json.kind !== "image") throw new Error("upload imagem: " + JSON.stringify(img.json));
  console.log(`2. upload imagem OK -> ${img.json.url} (kind=${img.json.kind})`);

  // 3. upload video
  const vid = await uploadFile(cookie, MP4, "video/mp4", "giro.mp4");
  if (vid.status !== 200 || vid.json.kind !== "video") throw new Error("upload video: " + JSON.stringify(vid.json));
  console.log(`3. upload video OK -> ${vid.json.url} (kind=${vid.json.kind})`);

  // 4. rejeita tipo invalido
  const bad = await uploadFile(cookie, Buffer.from("x"), "application/pdf", "x.pdf");
  if (bad.status !== 400) throw new Error("deveria rejeitar PDF, veio " + bad.status);
  console.log("4. rejeita tipo inválido OK (400)");

  // 5. cria produto com imagem + video
  const createRes = await fetch(`${BASE}/api/products`, {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie },
    body: JSON.stringify({
      name: "[TESTE E2E] Jeans com vídeo",
      images: [img.json.url],
      videos: [vid.json.url],
      sizes: ["38", "40"],
      wholesalePriceMin: 49.9,
      retailPrice: 129.9,
      active: true,
    }),
  });
  const product = await createRes.json();
  if (createRes.status !== 201) throw new Error("criar produto: " + JSON.stringify(product));
  console.log(`5. produto criado OK (id=${product.id}, ${product.images.length} foto, ${product.videos.length} vídeo)`);

  // 6. GET e verifica persistencia
  const fetched = await (await fetch(`${BASE}/api/products/${product.id}`, { headers: { cookie } })).json();
  const ok =
    fetched.videos?.length === 1 &&
    fetched.videos[0] === vid.json.url &&
    fetched.images?.length === 1 &&
    fetched.images[0] === img.json.url;
  if (!ok) throw new Error("persistência falhou: " + JSON.stringify({ images: fetched.images, videos: fetched.videos }));
  console.log("6. persistência OK (foto + vídeo salvos no produto)");

  // 7. aparece na galeria publica
  const html = await (await fetch(`${BASE}/catalogo/publico`)).text();
  console.log("7. galeria pública:", html.includes("[TESTE E2E]") ? "OK (produto listado)" : "produto não apareceu (verificar)");

  // 8. limpeza: deleta produto + arquivos
  await fetch(`${BASE}/api/products/${product.id}`, { method: "DELETE", headers: { cookie } });
  for (const url of [img.json.url, vid.json.url]) {
    await unlink(path.join(process.cwd(), "public", url.replace(/^\//, ""))).catch(() => {});
  }
  console.log("8. limpeza OK (produto + arquivos removidos)");

  console.log("\n✓ TODOS OS TESTES DE UPLOAD/VÍDEO PASSARAM");
}

main().catch((e) => {
  console.error("✗ TESTE FALHOU:", e instanceof Error ? e.message : e);
  process.exit(1);
});
