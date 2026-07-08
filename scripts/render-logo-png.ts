// Gera PNGs da logo (versao avatar) pra usar como foto de perfil do WhatsApp.
// Fundo indigo cheio + anel dourado + monograma "LA" centralizado — pensado pro
// corte circular do WhatsApp. Uso: npx tsx scripts/render-logo-png.ts
import { Resvg } from "@resvg/resvg-js";
import { writeFile } from "node:fs/promises";
import path from "node:path";

const AVATAR = `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1000" viewBox="0 0 1000 1000">
  <rect width="1000" height="1000" fill="#1B2A4A"/>
  <circle cx="500" cy="500" r="466" fill="none" stroke="#C8A55B" stroke-width="9"/>
  <g transform="translate(500,500) scale(9.2) translate(-55,-48)">
    <path d="M28 26 h11 v32 h13 v12 H28 Z" fill="#F4EFE6"/>
    <path d="M65 26 h6 l11 44 h-9 l-2.3 -9.2 h-5.4 l-2.3 9.2 h-9 Z M65.8 57 h4.4 L68 40 Z" fill="#C8A55B" fill-rule="evenodd"/>
  </g>
</svg>`;

async function render(size: number, name: string): Promise<void> {
  const resvg = new Resvg(AVATAR, {
    fitTo: { mode: "width", value: size },
    background: "#1B2A4A",
  });
  const png = resvg.render().asPng();
  await writeFile(path.join(process.cwd(), "public", name), png);
  console.log(`gerado public/${name} (${size}x${size}, ${(png.length / 1024).toFixed(0)}KB)`);
}

async function main(): Promise<void> {
  await render(1000, "logo-whatsapp.png");
  await render(500, "logo-whatsapp-500.png");
}

main().catch((e) => {
  console.error("Falha ao gerar PNG:", e instanceof Error ? e.message : e);
  process.exit(1);
});
