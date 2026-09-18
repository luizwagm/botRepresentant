// /sobre — a história da ROTA. O texto é editável no painel (Conteúdo → Sobre);
// sem nada salvo, usa o texto-semente de lib/about.
import type { Metadata } from "next";
import { cache } from "react";
import BrandLogo from "@/components/brand-logo";
import RichContent from "@/components/rich-content";
import Estrada, { Faixas } from "@/components/loja/estrada";
import { IconeCheck } from "@/components/loja/icones";
import { BotaoLink, Container } from "@/components/loja/ui";
import {
  ABOUT_ID,
  DEFAULT_ABOUT,
  plainText,
  readHighlights,
  readStats,
  type AboutContent,
} from "@/lib/about";
import { getBrand } from "@/lib/brand";
import { prisma } from "@/lib/db";
import { OG_PADRAO, ROTAS, SITE } from "@/lib/site";

// cache(): generateMetadata e a página dividem a mesma leitura.
// Sem linha salva OU banco sem a tabela: cai no texto-semente em vez de dar 500.
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
  const desc = (plainText(a.storyHtml).slice(0, 170) || a.heroSubtitle).trim();
  return {
    title: "Sobre a ROTA",
    description: desc,
    alternates: { canonical: ROTAS.sobre },
    openGraph: {
      ...OG_PADRAO,
      url: ROTAS.sobre,
      title: `Sobre a ${SITE.nome}`,
      description: desc,
      ...(a.imageUrl ? { images: [{ url: a.imageUrl }] } : {}),
    },
  };
}

const PARADAS: { cidade: string; texto: string }[] = [
  { cidade: "Toritama", texto: "A cidade que fez do jeans a sua vocação — lavanderias e confecções em cada rua." },
  { cidade: "Santa Cruz do Capibaribe", texto: "Um dos maiores centros atacadistas de confecção do país." },
  { cidade: "Caruaru", texto: "A capital do Agreste e o coração comercial do polo." },
  { cidade: "Riacho das Almas", texto: "Fábricas de jeans e a nossa base — onde a ROTA começa." },
];

export default async function SobrePage() {
  const [a, brand] = await Promise.all([getAbout(), getBrand()]);

  return (
    <>
      {/* Herói */}
      <section className="relative isolate overflow-hidden border-b border-white/[0.06]">
        <Estrada className="absolute inset-x-0 bottom-0 -z-10 h-[70%] w-full opacity-40" intensidade={0.8} />
        <Container className="grid items-center gap-12 pb-20 pt-12 sm:pt-20 lg:grid-cols-12 lg:pb-28">
          <div className="lg:col-span-7">
            <p className="rota-kicker rota-filete rota-entra">Sobre a ROTA</p>
            <h1 className="rota-entra mt-6 font-display text-[clamp(2.3rem,5.6vw,4.6rem)] font-semibold leading-[1.02] tracking-[-0.04em] text-creme [--atraso:.08s]">
              {a.heroTitle}
            </h1>
            {a.heroSubtitle && (
              <p className="rota-entra mt-6 max-w-xl text-[clamp(1.05rem,1.35vw,1.2rem)] leading-relaxed text-creme-2 [--atraso:.18s]">
                {a.heroSubtitle}
              </p>
            )}
          </div>
          <div className="lg:col-span-5">
            {a.imageUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={a.imageUrl}
                alt={`${SITE.nome} — nossa operação`}
                width={800}
                height={1000}
                fetchPriority="high"
                className="rota-entra aspect-[4/5] w-full rounded-[1.75rem] object-cover shadow-[0_50px_90px_-40px_rgba(0,0,0,.95)] ring-1 ring-white/10 [--atraso:.25s]"
              />
            ) : (
              <div className="rota-entra mx-auto flex aspect-square w-full max-w-[420px] items-center justify-center rounded-full border border-white/[0.06] bg-[radial-gradient(closest-side,rgba(200,151,117,.14),transparent)] [--atraso:.25s]">
                <BrandLogo variant="mark" size="2xl" markUrl={brand.markUrl} priority />
              </div>
            )}
          </div>
        </Container>
      </section>

      {/* Números (editáveis no painel) */}
      {a.stats.length > 0 && (
        <section aria-label="A ROTA em números" className="border-b border-white/[0.06] bg-carvao">
          <Container className="grid gap-8 py-12 sm:grid-cols-3">
            {a.stats.map((s, i) => (
              <div key={i} className="rota-revela">
                <p className="font-display text-[clamp(1.5rem,2.6vw,2.2rem)] font-medium text-cobre-claro">{s.value}</p>
                <p className="mt-2 text-[0.95rem] text-creme-2">{s.label}</p>
              </div>
            ))}
          </Container>
        </section>
      )}

      {/* História + destaques */}
      <section aria-labelledby="historia-titulo" className="py-20 sm:py-28">
        <Container className="grid gap-14 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <h2 id="historia-titulo" className="rota-kicker">
              Nossa história
            </h2>
            <RichContent html={a.storyHtml} className="mt-6 text-[1.08rem] leading-[1.8] text-creme-2" />
          </div>
          {a.highlights.length > 0 && (
            <div className="lg:col-span-5">
              <h2 className="rota-kicker">O que a gente garante</h2>
              <ul className="mt-6 space-y-3">
                {a.highlights.map((h, i) => (
                  <li key={i} className="rota-revela flex gap-4 rounded-2xl border border-white/[0.07] bg-carvao p-5">
                    <IconeCheck className="mt-0.5 h-5 w-5 shrink-0 text-cobre" />
                    <div>
                      <p className="font-medium text-creme">{h.title}</p>
                      {h.description && (
                        <p className="mt-1 text-[0.95rem] leading-relaxed text-creme-2">{h.description}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Container>
      </section>

      {/* As paradas da rota */}
      <section aria-labelledby="paradas-titulo" className="border-t border-white/[0.06] py-20 sm:py-28">
        <Container>
          <p className="rota-kicker">As paradas da rota</p>
          <h2
            id="paradas-titulo"
            className="mt-4 max-w-3xl font-display text-[clamp(1.9rem,4vw,3.2rem)] font-medium leading-[1.06] tracking-[-0.03em] text-creme"
          >
            O Agreste pernambucano veste o Brasil. A gente leva até você.
          </h2>
          <ol className="relative mt-14 grid gap-10 border-l border-dashed border-cobre/40 pl-8 md:grid-cols-4 md:border-l-0 md:border-t md:pl-0 md:pt-10">
            {PARADAS.map((p, i) => (
              <li key={p.cidade} className="rota-revela relative">
                <span
                  aria-hidden
                  className="absolute -left-[2.55rem] top-1 h-4 w-4 rounded-full bg-asfalto ring-2 ring-cobre md:-top-[3.05rem] md:left-0"
                />
                <p className="rota-num font-display text-sm text-cobre">0{i + 1}</p>
                <h3 className="mt-2 font-display text-[1.2rem] font-medium text-creme">{p.cidade}</h3>
                <p className="mt-2 text-[0.97rem] leading-relaxed text-creme-2">{p.texto}</p>
              </li>
            ))}
          </ol>
          <div className="mt-14 flex flex-wrap items-center gap-4">
            <BotaoLink href={ROTAS.loja} seta>
              Ver a vitrine
            </BotaoLink>
            <Faixas className="h-4 w-8 text-cobre" />
          </div>
        </Container>
      </section>
    </>
  );
}
