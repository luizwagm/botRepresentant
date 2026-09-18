// Gera todos os ativos da marca ROTA a partir da arte original.
//
//   node scripts/gerar-marca.mjs
//
// A arte chega como JPEG: letras claras (creme + cobre) sobre asfalto quase
// preto. Em vez de recortar com fundo preto "colado", DESMULTIPLICAMOS a cor
// sobre o fundo: alfa = quanto o pixel se afasta do asfalto. Resultado: PNG
// transparente com borda anti-aliased de verdade, que serve sobre qualquer fundo.
import sharp from "sharp";
import { mkdirSync } from "node:fs";

const SRC = "src/img/logo-rota-original.jpeg";
const OUT = "public/rota";
mkdirSync(OUT, { recursive: true });

const ASFALTO = [7, 7, 7];
const TINTA = [20, 18, 16]; // creme vira isto na versão para fundo claro
const COBRE = { r: 200, g: 151, b: 117 };

const { data, info } = await sharp(SRC).raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height, C = info.channels;

const CREME = [239, 231, 221];
const COBRE_RGB = [200, 151, 117];

/**
 * Versão para fundo CLARO: matte por cor.
 *
 * Desmultiplicar trata cor mais escura como "mais transparente" — o cobre
 * (canal máximo 200) sairia com 78% de opacidade e, sobre branco, lavaria para
 * cor de pêssego. Aqui cada pixel é classificado como cobre (quente) ou creme
 * (neutro) e recebe a cor SÓLIDA da marca; a opacidade vem de quanto ele chega
 * perto dessa cor. Miolo = 100% opaco, borda = anti-aliasing correto.
 */
function matte(recolorirCreme, soR = false) {
  const out = Buffer.alloc(W * H * 4);
  for (let i = 0, o = 0; i < W * H * C; i += C, o += 4) {
    if (soR) { const p = i / C; if (!doR(p % W, Math.floor(p / W))) continue; }
    const r = Math.max(0, data[i] - ASFALTO[0]);
    const g = Math.max(0, data[i + 1] - ASFALTO[1]);
    const b = Math.max(0, data[i + 2] - ASFALTO[2]);
    const m = Math.max(r, g, b);
    if (m < 18) continue; // textura do fundo
    const quente = (r - b) / Math.max(1, m) > 0.22;
    const cor = quente ? COBRE_RGB : recolorirCreme ? TINTA : CREME;
    const ref = (quente ? COBRE_RGB[0] : CREME[0]) - ASFALTO[0];
    const a = Math.min(1, m / ref);
    out[o] = cor[0]; out[o + 1] = cor[1]; out[o + 2] = cor[2]; out[o + 3] = Math.round(a * 255);
  }
  return sharp(out, { raw: { width: W, height: H, channels: 4 } });
}

/** RGBA transparente: desmultiplica sobre o asfalto. */
function transparente(recolorirCreme, soR = false) {
  const out = Buffer.alloc(W * H * 4);
  for (let i = 0, o = 0; i < W * H * C; i += C, o += 4) {
    if (soR) { const p = i / C; if (!doR(p % W, Math.floor(p / W))) continue; }
    const r = Math.max(0, data[i] - ASFALTO[0]);
    const g = Math.max(0, data[i + 1] - ASFALTO[1]);
    const b = Math.max(0, data[i + 2] - ASFALTO[2]);
    const m = Math.max(r, g, b);
    let a = m / (255 - ASFALTO[0]);
    // Textura do papel preto vira ruído de alfa baixo: corta.
    if (a < 0.07) a = 0;
    if (a === 0) continue;
    let R = Math.min(255, r / a), G = Math.min(255, g / a), B = Math.min(255, b / a);
    // Creme = claro e pouco saturado; cobre = quente (R bem acima de B).
    if (recolorirCreme && R - B < 38) [R, G, B] = TINTA;
    out[o] = R; out[o + 1] = G; out[o + 2] = B; out[o + 3] = Math.round(a * 255);
  }
  return sharp(out, { raw: { width: W, height: H, channels: 4 } });
}

/** Caixa de tudo que tem tinta, dentro de uma faixa vertical. */
function caixa(y0, y1) {
  let x0 = W, x1 = 0, ya = H, yb = 0;
  for (let y = y0; y < y1; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * C;
    const m = Math.max(data[i], data[i + 1], data[i + 2]) - ASFALTO[0];
    if (m > 40) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < ya) ya = y; if (y > yb) yb = y; }
  }
  return { left: x0, top: ya, width: x1 - x0 + 1, height: yb - ya + 1 };
}

const lockup = caixa(380, 860);      // ROTA + ATACADO + frase
const semFrase = caixa(380, 770);    // ROTA + ATACADO (cabeçalho)
// Separar o R do O: o bojo do R ENCOSTA no O e a perna (faixas de cobre)
// avança por baixo dele — nenhum corte vertical separa os dois. Mas eles têm
// CORES diferentes: o O é creme, a estrada é cobre. Então:
//   - todo o cobre da faixa "ROTA" pertence ao R;
//   - o creme só vale até o vale entre o bojo do R e o O.
const faixaRota = caixa(380, 680);
const ehQuente = (i) => {
  const r = data[i] - 7, b = data[i + 2] - 7, m = Math.max(r, data[i + 1] - 7, b);
  return m > 18 && (r - b) / Math.max(1, m) > 0.22;
};
const valeCreme = (() => {
  let melhor = 0, menor = Infinity;
  for (let x = faixaRota.left + 230; x < faixaRota.left + 360; x++) {
    let tinta = 0;
    for (let y = faixaRota.top; y < faixaRota.top + faixaRota.height; y++) {
      const i = (y * W + x) * C;
      if (!ehQuente(i)) tinta += Math.max(0, Math.max(data[i], data[i + 1], data[i + 2]) - 7);
    }
    // Só conta como vale se houver creme dos DOIS lados (evita o miolo do bojo).
    if (tinta < menor) { menor = tinta; melhor = x; }
  }
  return melhor;
})();
// Extensão da estrada: só cobre FORTE conta. Nas bordas escuras das letras
// creme o JPEG deixa pixels fracos levemente quentes, e a razão (r-b)/m fica
// instável com brilho baixo — sem este corte o "fim da estrada" ia parar no T.
const cobreForte = (i) => {
  const r = data[i] - 7, b = data[i + 2] - 7, m = Math.max(r, data[i + 1] - 7, b);
  return m > 110 && (r - b) / m > 0.3;
};
let cobreMaxX = 0;
for (let y = faixaRota.top; y < faixaRota.top + faixaRota.height; y++)
  for (let x = faixaRota.left; x < faixaRota.left + 520; x++)
    if (cobreForte((y * W + x) * C) && x > cobreMaxX) cobreMaxX = x;
const letraR = {
  left: faixaRota.left, top: faixaRota.top,
  width: Math.max(valeCreme, cobreMaxX) - faixaRota.left + 1, height: faixaRota.height,
};
/** Pixel pertence ao R? (usado pra mascarar o O no recorte do símbolo) */
const doR = (x, y) => {
  if (x <= valeCreme) return true;
  if (x > cobreMaxX + 3) return false;
  // A estrada só existe na metade de baixo do R; cobre acima disso é ruído.
  if (y < faixaRota.top + faixaRota.height * 0.33) return false;
  const i = (y * W + x) * C;
  const r = data[i] - 7, b = data[i + 2] - 7, m = Math.max(r, data[i + 1] - 7, b);
  return m > 25 && (r - b) / Math.max(1, m) > 0.25;
};

const pad = (b, p) => ({
  left: Math.max(0, b.left - p), top: Math.max(0, b.top - p),
  width: Math.min(W - Math.max(0, b.left - p), b.width + 2 * p),
  height: Math.min(H - Math.max(0, b.top - p), b.height + 2 * p),
});

async function salvar(img, nome, largura) {
  const buf = await img.png().toBuffer();
  await sharp(buf).resize({ width: largura }).png({ compressionLevel: 9 }).toFile(`${OUT}/${nome}.png`);
  await sharp(buf).resize({ width: largura }).webp({ quality: 92, alphaQuality: 100 }).toFile(`${OUT}/${nome}.webp`);
}

// Logo horizontal — creme+cobre (fundo escuro) e tinta+cobre (fundo claro)
for (const [nome, ink] of [["rota-clara", false], ["rota-tinta", true]]) {
  // Fundo escuro: desmultiplicar preserva o brilho metálico do cobre.
  // Fundo claro: matte com cor sólida (ver matte()).
  const base = await (ink ? matte(true) : transparente(false)).png().toBuffer();
  await salvar(sharp(base).extract(pad(semFrase, 4)), `${nome}`, 720);
  await salvar(sharp(base).extract(pad(lockup, 6)), `${nome}-completa`, 960);
  const soR = await (ink ? matte(true, true) : transparente(false, true)).png().toBuffer();
  await salvar(sharp(soR).extract(pad(letraR, 4)), `${nome}-simbolo`, 256);
}

// Ícones: o R-estrada centralizado no asfalto (é o que aparece na aba e no celular)
const simbolo = await transparente(false, true).png().toBuffer().then((b) =>
  sharp(b).extract(pad(letraR, 4)).png().toBuffer());
async function icone(tam, nome, respiro = 0.22) {
  const lado = Math.round(tam * (1 - 2 * respiro));
  const r = await sharp(simbolo).resize(lado, lado, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer();
  await sharp({ create: { width: tam, height: tam, channels: 4, background: { r: 7, g: 7, b: 7, alpha: 1 } } })
    .composite([{ input: r, gravity: "center" }]).png().toFile(`${OUT}/${nome}.png`);
}
await icone(512, "icone-512");
await icone(192, "icone-192");
await icone(512, "icone-maskable-512", 0.3); // área segura do Android
await icone(180, "apple-touch-icon");
await icone(48, "favicon-48", 0.12);
await icone(32, "favicon-32", 0.1);

// Imagem de compartilhamento (WhatsApp/Instagram/Google): 1200x630
{
  const logo = await transparente(false).png().toBuffer().then((b) =>
    sharp(b).extract(pad(lockup, 6)).resize({ width: 760 }).png().toBuffer());
  const linhas = `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="c" x1="0" y1="1" x2="1" y2="0">
      <stop offset="0" stop-color="rgb(${COBRE.r},${COBRE.g},${COBRE.b})" stop-opacity="0"/>
      <stop offset=".55" stop-color="rgb(${COBRE.r},${COBRE.g},${COBRE.b})" stop-opacity=".55"/>
      <stop offset="1" stop-color="rgb(${COBRE.r},${COBRE.g},${COBRE.b})" stop-opacity="0"/></linearGradient></defs>
    <rect width="1200" height="630" fill="#070707"/>
    <path d="M-40 700 C 260 520, 520 470, 1240 430" stroke="url(#c)" stroke-width="2" fill="none"/>
    <path d="M-40 740 C 280 560, 560 510, 1240 470" stroke="url(#c)" stroke-width="1.2" fill="none"/>
    <path d="M-40 780 C 300 600, 600 550, 1240 510" stroke="url(#c)" stroke-width=".8" fill="none"/>
  </svg>`;
  await sharp(Buffer.from(linhas)).composite([{ input: logo, gravity: "center" }])
    .jpeg({ quality: 88, mozjpeg: true }).toFile(`${OUT}/og.jpg`);
}

console.log("caixas:", { lockup, semFrase, letraR, valeCreme, cobreMaxX });
console.log("ok — ativos em", OUT);
