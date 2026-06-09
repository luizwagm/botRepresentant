"use client";

import { useId } from "react";

type Size = "sm" | "md" | "lg" | "xl";

const MARK_SIZE: Record<Size, string> = {
  sm: "h-8 w-8",
  md: "h-11 w-11",
  lg: "h-16 w-16",
  xl: "h-24 w-24",
};

const WORD_SIZE: Record<Size, string> = {
  sm: "text-lg",
  md: "text-2xl",
  lg: "text-3xl",
  xl: "text-5xl",
};

/**
 * Símbolo canônico "LA" — monograma quadrado-arredondado (índigo denim + dourado).
 * IDs de gradiente são namespaced por instância (useId) pra não colidir quando
 * há vários logos na mesma página.
 */
export function BrandMark({ className }: { className?: string }) {
  const uid = useId().replace(/[:]/g, "");
  const denim = `laDenim-${uid}`;
  const gold = `laGold-${uid}`;
  return (
    <svg viewBox="0 0 96 96" className={className} role="img" aria-label="L. Augusto Atacado">
      <defs>
        <linearGradient id={denim} x1="10" y1="6" x2="86" y2="90" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#2A3B61" />
          <stop offset="1" stopColor="#1B2A4A" />
        </linearGradient>
        <linearGradient id={gold} x1="48" y1="22" x2="48" y2="74" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#D9BC78" />
          <stop offset="1" stopColor="#C8A55B" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="92" height="92" rx="22" fill={`url(#${denim})`} />
      <rect x="6.5" y="6.5" width="83" height="83" rx="17.5" fill="none" stroke={`url(#${gold})`} strokeWidth="1.6" />
      <path d="M28 26 h11 v32 h13 v12 H28 Z" fill="#F4EFE6" />
      <path d="M65 26 h6 l11 44 h-9 l-2.3 -9.2 h-5.4 l-2.3 9.2 h-9 Z M65.8 57 h4.4 L68 40 Z" fill={`url(#${gold})`} fillRule="evenodd" />
    </svg>
  );
}

/** Versão monocromática do símbolo (usa currentColor) — pra fundo escuro/etiqueta. */
export function BrandMarkMono({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 96 96" className={className} role="img" aria-label="L. Augusto Atacado">
      <rect x="2" y="2" width="92" height="92" rx="22" fill="none" stroke="currentColor" strokeWidth="3" />
      <path d="M28 26 h11 v32 h13 v12 H28 Z" fill="currentColor" />
      <path d="M65 26 h6 l11 44 h-9 l-2.3 -9.2 h-5.4 l-2.3 9.2 h-9 Z M65.8 57 h4.4 L68 40 Z" fill="currentColor" fillRule="evenodd" />
    </svg>
  );
}

export default function BrandLogo({
  variant = "full",
  size = "md",
  withTagline = false,
  className = "",
}: {
  variant?: "full" | "mark";
  size?: Size;
  withTagline?: boolean;
  className?: string;
}) {
  if (variant === "mark") {
    return <BrandMark className={`${MARK_SIZE[size]} ${className}`} />;
  }
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <BrandMark className={MARK_SIZE[size]} />
      <div className="flex flex-col leading-none">
        <span
          className={`${WORD_SIZE[size]} font-bold text-brand-indigo`}
          style={{ fontFamily: "var(--font-display), Georgia, serif" }}
        >
          L<span className="text-brand-gold">.</span>&nbsp;Augusto
        </span>
        <span className="mt-1.5 block w-full border-t border-dashed border-brand-gold" aria-hidden />
        <span
          className="mt-1.5 text-[10px] font-medium uppercase text-brand-graphite"
          style={{ fontFamily: "var(--font-kicker), system-ui, sans-serif", letterSpacing: "0.34em" }}
        >
          Atacado
          {withTagline && (
            <span className="text-zinc-400" style={{ letterSpacing: "0.18em" }}>
              {" · "}denim direto de fábrica
            </span>
          )}
        </span>
      </div>
    </div>
  );
}
