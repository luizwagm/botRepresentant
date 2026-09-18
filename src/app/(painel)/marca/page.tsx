// Painel → Marca: o manual vivo da identidade ROTA (logo, paleta com contraste
// medido, tipografia, arquivos pra baixar) + a troca de logo do sistema.
import type { Metadata } from "next";
import BrandLogo from "@/components/brand-logo";
import Estrada from "@/components/loja/estrada";
import LogoAdmin from "./logo-admin";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Marca" };

// Cores amostradas da arte original da logo. Contraste medido sobre o asfalto
// (#070707) — WCAG AA pede 4,5:1 para texto comum.
const PALETA = [
  { nome: "Asfalto", hex: "#070707", uso: "Fundo da marca e da loja", contraste: "—" },
  { nome: "Creme", hex: "#EFE7DD", uso: "Wordmark “ROTA” e texto principal", contraste: "16,4:1" },
  { nome: "Cobre", hex: "#C89775", uso: "A estrada, destaques e botões", contraste: "7,8:1" },
  { nome: "Cobre claro", hex: "#E2BB98", uso: "Preços e links", contraste: "11,3:1" },
  { nome: "Névoa", hex: "#8F887E", uso: "Texto de apoio", contraste: "5,8:1" },
  { nome: "Sinal", hex: "#7ECB9A", uso: "Confirmações (pedido ok, mínimo atingido)", contraste: "10,5:1" },
];

const ARQUIVOS = [
  { rotulo: "Logo — fundo escuro (PNG)", href: "/rota/rota-clara.png" },
  { rotulo: "Logo — fundo claro (PNG)", href: "/rota/rota-tinta.png" },
  { rotulo: "Logo completa c/ slogan — fundo escuro", href: "/rota/rota-clara-completa.png" },
  { rotulo: "Logo completa c/ slogan — fundo claro", href: "/rota/rota-tinta-completa.png" },
  { rotulo: "Símbolo (R) — fundo escuro", href: "/rota/rota-clara-simbolo.png" },
  { rotulo: "Símbolo (R) — fundo claro", href: "/rota/rota-tinta-simbolo.png" },
  { rotulo: "Ícone 512 × 512 (perfil do WhatsApp)", href: "/rota/icone-512.png" },
  { rotulo: "Imagem de compartilhamento 1200 × 630", href: "/rota/og.jpg" },
];

export default function MarcaPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Identidade da marca</h1>
        <p className="mt-1 text-sm text-zinc-500">ROTA Atacado — moda que conecta negócios.</p>
      </div>

      <LogoAdmin />

      {/* Logo nos dois fundos */}
      <section className="grid gap-4 sm:grid-cols-2">
        <div className="relative isolate flex min-h-56 items-center justify-center overflow-hidden rounded-2xl bg-asfalto p-10">
          <Estrada className="absolute inset-x-0 bottom-0 -z-10 h-full w-full opacity-30" intensidade={0.6} />
          <BrandLogo size="xl" />
        </div>
        <div className="flex min-h-56 items-center justify-center rounded-2xl border border-zinc-200 bg-[#efe7dd] p-10">
          <BrandLogo size="xl" tone="claro" />
        </div>
        <div className="flex items-center justify-center gap-8 rounded-2xl bg-asfalto p-8">
          <BrandLogo variant="mark" size="lg" />
          <p className="max-w-[14rem] text-xs leading-relaxed text-nevoa">
            O símbolo é o <strong className="text-creme-2">R</strong> com a estrada de cobre na perna — use em
            avatar, ícone e selo.
          </p>
        </div>
        <div className="flex items-center justify-center gap-8 rounded-2xl border border-zinc-200 bg-white p-8">
          <BrandLogo variant="mark" size="lg" tone="claro" />
          <p className="max-w-[14rem] text-xs leading-relaxed text-zinc-500">
            Em fundo claro, o creme vira tinta escura e o cobre se mantém.
          </p>
        </div>
      </section>

      {/* Paleta */}
      <section className="mt-10">
        <h2 className="text-lg font-semibold">Paleta</h2>
        <p className="mt-1 text-sm text-zinc-500">Tirada da própria logo. Contraste medido sobre o asfalto.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PALETA.map((c) => (
            <div key={c.hex} className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
              <div className="flex h-20 items-end p-3" style={{ backgroundColor: c.hex }}>
                {c.hex !== "#070707" && (
                  <span className="rounded bg-[#070707] px-1.5 py-0.5 text-[10px] font-medium" style={{ color: c.hex }}>
                    Aa {c.contraste}
                  </span>
                )}
              </div>
              <div className="p-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-semibold">{c.nome}</span>
                  <span className="font-mono text-xs text-zinc-500">{c.hex}</span>
                </div>
                <p className="mt-1 text-xs text-zinc-500">{c.uso}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Tipografia */}
      <section className="mt-10 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 bg-white p-6">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Títulos — Unbounded</p>
          <p className="mt-3 font-display text-4xl font-semibold tracking-tight">ROTA 2026</p>
          <p className="mt-2 text-xs text-zinc-500">A geometria larga do “ROTA” da logo. Títulos, preços e números.</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-6">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Texto — Jost</p>
          <p className="mt-3 font-texto text-2xl">Moda que conecta negócios</p>
          <p className="mt-1 font-texto text-xs uppercase tracking-[0.32em] text-[#9a6c4e]">Atacado</p>
          <p className="mt-2 text-xs text-zinc-500">O espaçamento limpo do “ATACADO”. Texto corrido e chapéus de seção.</p>
        </div>
      </section>

      {/* Arquivos */}
      <section className="mt-10">
        <h2 className="text-lg font-semibold">Arquivos da marca</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Gerados a partir da arte original por <code className="text-xs">scripts/gerar-marca.mjs</code>.
        </p>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {ARQUIVOS.map((a) => (
            <li key={a.href}>
              <a
                href={a.href}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm hover:border-[#c89775]"
              >
                {a.rotulo}
                <span className="text-xs text-zinc-400">baixar ↓</span>
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
