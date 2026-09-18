// Casca das páginas de texto (privacidade, termos): leitura confortável —
// coluna de ~70 caracteres, índice lateral no desktop e data de atualização.
import type { ReactNode } from "react";
import { Container } from "./ui";

export default function PaginaTexto({
  kicker,
  titulo,
  atualizado,
  secoes,
  children,
}: {
  kicker: string;
  titulo: string;
  /** "18 de setembro de 2026" */
  atualizado: string;
  secoes: { id: string; titulo: string }[];
  children: ReactNode;
}) {
  return (
    <Container className="pt-10 sm:pt-16">
      <p className="rota-kicker">{kicker}</p>
      <h1 className="mt-4 max-w-3xl font-display text-[clamp(2.1rem,4.8vw,3.6rem)] font-semibold leading-[1.02] tracking-[-0.04em] text-creme">
        {titulo}
      </h1>
      <p className="mt-4 text-sm text-nevoa">Atualizado em {atualizado}</p>

      <div className="mt-12 grid gap-12 lg:grid-cols-12">
        <nav aria-label="Nesta página" className="lg:col-span-3">
          <ol className="space-y-2.5 text-sm lg:sticky lg:top-28">
            {secoes.map((s, i) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="text-creme-2 hover:text-cobre-claro">
                  <span className="rota-num mr-2 text-nevoa">{String(i + 1).padStart(2, "0")}</span>
                  {s.titulo}
                </a>
              </li>
            ))}
          </ol>
        </nav>
        <article className="max-w-[70ch] text-[1.02rem] leading-[1.8] text-creme-2 lg:col-span-9 [&_a]:text-cobre-claro [&_a]:underline [&_a]:underline-offset-4 [&_h2]:mt-12 [&_h2]:scroll-mt-28 [&_h2]:font-display [&_h2]:text-[1.35rem] [&_h2]:font-medium [&_h2]:tracking-[-0.01em] [&_h2]:text-creme [&_h2:first-child]:mt-0 [&_li]:mt-2 [&_p]:mt-4 [&_strong]:font-medium [&_strong]:text-creme [&_ul]:mt-4 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:marker:text-cobre">
          {children}
        </article>
      </div>
    </Container>
  );
}
