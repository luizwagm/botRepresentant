import BrandLogo, { BrandMark, BrandMarkMono } from "@/components/brand-logo";

export const dynamic = "force-dynamic";
export const metadata = { title: "Marca — L. Augusto Atacado" };

const PALETTE = [
  { name: "Indigo Denim", hex: "#1B2A4A", usage: "Cor principal — fundo do símbolo, wordmark, favicon" },
  { name: "Dourado Champagne", hex: "#C8A55B", usage: "Acento de luxo (parcimônia) — letra A, ponto do L., costura" },
  { name: "Creme Editorial", hex: "#F4EFE6", usage: "Neutro de fundo sofisticado e a letra L do símbolo" },
  { name: "Grafite Suave", hex: "#3C4456", usage: "Texto secundário, kicker, divisores" },
  { name: "Branco", hex: "#FFFFFF", usage: "Fundo padrão de aplicação" },
];

export default function MarcaPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Identidade da marca</h1>
        <p className="mt-1 text-sm text-zinc-500">L. Augusto Atacado — sistema visual.</p>
      </div>

      {/* Lockup principal */}
      <section className="mb-8 overflow-hidden rounded-2xl border border-zinc-200">
        <div className="flex items-center justify-center bg-brand-cream px-6 py-16">
          <BrandLogo variant="full" size="xl" withTagline />
        </div>
        <div className="flex items-center justify-between border-t border-zinc-200 bg-white px-5 py-3 text-xs text-zinc-500">
          <span>Lockup horizontal — uso principal em cabeçalhos</span>
          <a href="/logo-horizontal.svg" target="_blank" rel="noopener noreferrer" className="font-medium text-brand-indigo hover:underline">baixar SVG ↗</a>
        </div>
      </section>

      {/* Variações do símbolo */}
      <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center">
          <div className="flex justify-center"><BrandMark className="h-24 w-24" /></div>
          <div className="mt-4 text-xs text-zinc-500">Símbolo (colorido)</div>
          <a href="/logo-mark.svg" target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-xs font-medium text-brand-indigo hover:underline">baixar SVG ↗</a>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-brand-indigo p-8 text-center">
          <div className="flex justify-center text-brand-cream"><BrandMarkMono className="h-24 w-24" /></div>
          <div className="mt-4 text-xs text-zinc-300">Mono — sobre fundo escuro</div>
        </div>
        <div className="flex flex-col items-center justify-center rounded-2xl border border-zinc-200 bg-white p-8 text-center">
          <div className="flex items-center gap-3">
            <BrandMark className="h-8 w-8" />
            <BrandMark className="h-6 w-6" />
            <BrandMark className="h-4 w-4" />
          </div>
          <div className="mt-4 text-xs text-zinc-500">Escala — legível até favicon (16px)</div>
        </div>
      </section>

      {/* Paleta */}
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">Paleta</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {PALETTE.map((c) => (
            <div key={c.hex} className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
              <div className="h-20 w-full" style={{ backgroundColor: c.hex }} />
              <div className="p-3">
                <div className="text-sm font-medium text-zinc-900">{c.name}</div>
                <div className="font-mono text-xs text-zinc-500">{c.hex}</div>
                <div className="mt-1 text-[11px] leading-snug text-zinc-400">{c.usage}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Tipografia */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">Tipografia</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-zinc-200 bg-white p-6">
            <div className="text-4xl text-brand-indigo" style={{ fontFamily: "var(--font-display), Georgia, serif", fontWeight: 700 }}>
              L. Augusto
            </div>
            <div className="mt-3 text-xs text-zinc-500">Playfair Display 700 — wordmark / títulos</div>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-6">
            <div className="text-2xl uppercase text-brand-graphite" style={{ fontFamily: "var(--font-kicker), system-ui, sans-serif", letterSpacing: "0.34em" }}>
              Atacado
            </div>
            <div className="mt-3 text-xs text-zinc-500">Jost — kicker, etiquetas, microtexto</div>
          </div>
        </div>
      </section>
    </div>
  );
}
