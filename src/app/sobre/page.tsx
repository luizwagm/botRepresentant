import type { Metadata } from "next";
import { cache } from "react";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { normalizeBrazilPhone } from "@/lib/phone";
import {
  ABOUT_ID,
  DEFAULT_ABOUT,
  plainText,
  readHighlights,
  readStats,
  type AboutContent,
} from "@/lib/about";
import BrandLogo from "@/components/brand-logo";
import { getBrand } from "@/lib/brand";
import RichContent from "@/components/rich-content";
import { WhatsAppIcon } from "@/components/whatsapp-icon";

export const dynamic = "force-dynamic";

// cache() dedup por request: generateMetadata e o render compartilham 1 query.
// Fallback resiliente: se a linha nao existe (ainda nao salvaram) OU a leitura
// falha (ex.: migration nao aplicada), cai no texto-semente em vez de dar 500.
const getAbout = cache(async (): Promise<AboutContent> => {
  try {
    const row = await prisma.aboutPage.findUnique({ where: { id: ABOUT_ID } });
    if (!row) return DEFAULT_ABOUT;
    return {
      heroTitle: row.heroTitle,
      heroSubtitle: row.heroSubtitle,
      storyHtml: row.storyHtml,
      highlights: readHighlights(row.highlights),
      stats: readStats(row.stats),
      imageUrl: row.imageUrl,
    };
  } catch (e) {
    console.error("Sobre: falha ao ler about_pages, usando padrão:", e instanceof Error ? e.message : e);
    return DEFAULT_ABOUT;
  }
});

export async function generateMetadata(): Promise<Metadata> {
  const a = await getAbout();
  const desc = (plainText(a.storyHtml).slice(0, 180) || a.heroSubtitle).trim();
  return {
    title: "Sobre nós — L. Augusto Atacado",
    description: desc,
    openGraph: {
      title: "Sobre a L. Augusto Atacado",
      description: desc,
      type: "website",
      images: a.imageUrl ? [{ url: a.imageUrl }] : [],
    },
  };
}

export default async function SobrePage() {
  const a = await getAbout();
  const brand = await getBrand();
  const wa = normalizeBrazilPhone(env.luizWhatsapp) ?? "";
  const waMsg = "Olá Luiz! Vi a página da L. Augusto Atacado e quero saber mais sobre o atacado.";
  const waHref = wa ? `https://wa.me/${wa}?text=${encodeURIComponent(waMsg)}` : null;

  return (
    <div className="min-h-screen bg-white">
      {/* Cabeçalho público (a chrome administrativa fica escondida em /sobre) */}
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4 sm:px-6">
          <Link href="/catalogo/publico" aria-label="L. Augusto Atacado — catálogo">
            <BrandLogo variant="full" size="sm" logoUrl={brand.logoUrl} markUrl={brand.markUrl} />
          </Link>
          <nav className="flex items-center gap-2 text-sm">
            <Link href="/catalogo/publico" className="rounded-md px-3 py-2 font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900">
              Catálogo
            </Link>
            {waHref && (
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                <WhatsAppIcon className="h-4 w-4" />
                WhatsApp
              </a>
            )}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-brand-indigo text-brand-cream">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{ background: "radial-gradient(1200px 400px at 15% -10%, #C8A55B 0%, transparent 60%)" }}
        />
        <div className="relative mx-auto grid max-w-5xl gap-8 px-5 py-14 sm:px-6 sm:py-20 md:grid-cols-2 md:items-center">
          <div>
            <span className="inline-flex items-center rounded-full border border-brand-gold/40 px-3 py-1 text-xs font-medium uppercase tracking-wider text-brand-gold">
              Fábrica de jeans · Agreste/PE
            </span>
            <h1
              className="mt-4 text-3xl font-bold leading-tight sm:text-4xl"
              style={{ fontFamily: "var(--font-display), Georgia, serif" }}
            >
              {a.heroTitle}
            </h1>
            {a.heroSubtitle && <p className="mt-4 max-w-prose text-base text-brand-cream/85">{a.heroSubtitle}</p>}
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/catalogo/publico"
                className="rounded-lg bg-brand-gold px-5 py-2.5 text-sm font-semibold text-brand-indigo hover:opacity-90"
              >
                Ver catálogo
              </Link>
              {waHref && (
                <a
                  href={waHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-brand-cream/30 px-5 py-2.5 text-sm font-semibold text-brand-cream hover:bg-white/10"
                >
                  <WhatsAppIcon className="h-4 w-4" />
                  Falar com a fábrica
                </a>
              )}
            </div>
          </div>
          <div className="relative">
            {a.imageUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={a.imageUrl}
                alt="L. Augusto Atacado"
                className="aspect-[4/3] w-full rounded-2xl object-cover shadow-2xl ring-1 ring-white/10"
              />
            ) : (
              <div className="flex aspect-[4/3] w-full items-center justify-center rounded-2xl bg-white/5 ring-1 ring-white/10">
                <BrandLogo
                  variant="mark"
                  size="xl"
                  className="opacity-90"
                  logoUrl={brand.logoUrl}
                  markUrl={brand.markUrl}
                />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Barra de stats */}
      {a.stats.length > 0 && (
        <section className="border-b border-zinc-200 bg-brand-cream/40">
          <div className="mx-auto grid max-w-5xl gap-6 px-5 py-8 sm:grid-cols-3 sm:px-6">
            {a.stats.map((s, i) => (
              <div key={i} className="text-center">
                <div
                  className="text-xl font-bold text-brand-indigo sm:text-2xl"
                  style={{ fontFamily: "var(--font-display), Georgia, serif" }}
                >
                  {s.value}
                </div>
                <div className="mt-1 text-sm text-zinc-600">{s.label}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* História + destaques */}
      <section className="mx-auto max-w-5xl px-5 py-14 sm:px-6">
        <div className="grid gap-10 md:grid-cols-5">
          <div className="md:col-span-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-brand-gold">Nossa história</h2>
            <RichContent html={a.storyHtml} className="mt-3 text-[15px] leading-relaxed text-zinc-700" />
          </div>

          {a.highlights.length > 0 && (
            <div className="md:col-span-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-brand-gold">Por que comprar da gente</h2>
              <ul className="mt-3 space-y-3">
                {a.highlights.map((h, i) => (
                  <li key={i} className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 text-emerald-600" aria-hidden>✓</span>
                      <div>
                        <div className="text-sm font-semibold text-zinc-900">{h.title}</div>
                        {h.description && <div className="mt-0.5 text-sm text-zinc-600">{h.description}</div>}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>

      {/* CTA final */}
      <section className="border-t border-zinc-200 bg-zinc-50">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 px-5 py-12 text-center sm:px-6">
          <h2 className="text-2xl font-bold text-zinc-900" style={{ fontFamily: "var(--font-display), Georgia, serif" }}>
            Pronto pra abastecer a sua loja?
          </h2>
          <p className="max-w-prose text-sm text-zinc-600">
            Confira o catálogo e chame a gente no WhatsApp — a gente ajusta a grade e o preço pro seu pedido.
          </p>
          <div className="mt-1 flex flex-wrap justify-center gap-3">
            <Link
              href="/catalogo/publico"
              className="rounded-lg bg-brand-indigo px-6 py-3 text-sm font-semibold text-white hover:opacity-90"
            >
              Ver catálogo
            </Link>
            {waHref && (
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                <WhatsAppIcon className="h-5 w-5" />
                Falar no WhatsApp
              </a>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
