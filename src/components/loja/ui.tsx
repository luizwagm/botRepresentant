// Primitivas da loja. Tudo que se repete (botão, título de seção, container)
// mora aqui — é o que mantém as páginas com uma linguagem só.
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { IconeSeta } from "./icones";

export function Container({ className = "", children }: { className?: string; children: ReactNode }) {
  return <div className={`mx-auto w-full max-w-[1320px] px-5 sm:px-8 ${className}`}>{children}</div>;
}

type Variante = "cobre" | "contorno" | "texto";

const VARIANTES: Record<Variante, string> = {
  // 7,8:1 — texto asfalto sobre cobre
  cobre:
    "px-6 py-3.5 bg-cobre text-asfalto hover:bg-cobre-claro shadow-[0_10px_30px_-12px_rgba(200,151,117,.55)]",
  contorno: "px-6 py-3.5 border border-creme/20 text-creme hover:border-cobre hover:text-cobre-claro",
  // Link de texto: sem "pílula" — alinha rente ao título da seção.
  texto: "py-2 text-cobre-claro hover:text-creme",
};

const BASE =
  "group inline-flex items-center justify-center gap-2.5 rounded-full text-[0.95rem] font-medium tracking-[0.01em] transition-[background-color,color,border-color,transform] duration-300 active:scale-[.98] disabled:pointer-events-none disabled:opacity-40";

export function BotaoLink({
  variante = "cobre",
  seta = false,
  className = "",
  children,
  ...rest
}: ComponentProps<typeof Link> & { variante?: Variante; seta?: boolean }) {
  return (
    <Link {...rest} className={`${BASE} ${VARIANTES[variante]} ${className}`}>
      {children}
      {seta && <IconeSeta className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />}
    </Link>
  );
}

export function Botao({
  variante = "cobre",
  seta = false,
  className = "",
  children,
  ...rest
}: ComponentProps<"button"> & { variante?: Variante; seta?: boolean }) {
  return (
    <button {...rest} className={`${BASE} ${VARIANTES[variante]} ${className}`}>
      {children}
      {seta && <IconeSeta className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />}
    </button>
  );
}

/** Abertura de seção: chapéu (kicker) + título + apoio opcional. */
export function CabecaSecao({
  kicker,
  titulo,
  apoio,
  alinhar = "esquerda",
  className = "",
  id,
  acao,
}: {
  kicker: string;
  titulo: ReactNode;
  apoio?: ReactNode;
  alinhar?: "esquerda" | "centro";
  className?: string;
  id?: string;
  acao?: ReactNode;
}) {
  const centro = alinhar === "centro";
  return (
    <div
      className={`flex flex-col gap-6 ${centro ? "items-center text-center" : "md:flex-row md:items-end md:justify-between"} ${className}`}
    >
      <div className={centro ? "max-w-2xl" : "max-w-2xl"}>
        <p className="rota-kicker">{kicker}</p>
        <h2
          id={id}
          className="mt-4 font-display text-[clamp(1.75rem,3.4vw,2.85rem)] font-medium leading-[1.08] tracking-[-0.02em] text-creme"
        >
          {titulo}
        </h2>
        {apoio && <p className="mt-4 text-[1.0625rem] leading-relaxed text-creme-2">{apoio}</p>}
      </div>
      {acao && <div className="shrink-0">{acao}</div>}
    </div>
  );
}

/** Selo pequeno sobre a foto do produto. */
export function Selo({ children, tom = "cobre" }: { children: ReactNode; tom?: "cobre" | "creme" }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[0.68rem] font-medium uppercase tracking-[0.14em] backdrop-blur-md ${
        tom === "cobre" ? "bg-cobre text-asfalto" : "bg-asfalto/70 text-creme ring-1 ring-creme/20"
      }`}
    >
      {children}
    </span>
  );
}
