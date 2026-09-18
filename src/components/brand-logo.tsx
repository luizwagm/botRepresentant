// Logo da ROTA. Componente puro (sem "use client"): renderiza no servidor e não
// manda JavaScript nenhum pro navegador — é só uma <img> bem dimensionada.
import { DEFAULT_LOGO, DEFAULT_MARK, LOGO_TINTA, MARK_TINTA } from "@/lib/brand-defaults";

type Size = "sm" | "md" | "lg" | "xl" | "2xl";

/** Altura por tamanho. Logo (~2,8:1) e símbolo (~1,4:1): a altura manda, a largura acompanha. */
const ALTURA: Record<Size, string> = {
  sm: "h-8",
  md: "h-10",
  lg: "h-14",
  xl: "h-24",
  "2xl": "h-36 sm:h-44",
};

/** Proporções reais dos arquivos — evitam salto de layout (CLS) enquanto carrega. */
const PROPORCAO_LOGO = { w: 720, h: 255 };
const PROPORCAO_SIMBOLO = { w: 256, h: 182 };

export default function BrandLogo({
  variant = "full",
  size = "md",
  tone = "escuro",
  className = "",
  logoUrl = null,
  markUrl = null,
  priority = false,
}: {
  variant?: "full" | "mark";
  size?: Size;
  /** Fundo onde a logo vai: "escuro" usa creme+cobre; "claro" usa tinta+cobre. */
  tone?: "escuro" | "claro";
  className?: string;
  /** Logo personalizada enviada no painel (tem prioridade sobre a embutida). */
  logoUrl?: string | null;
  markUrl?: string | null;
  /** true só na logo do topo da página (entra no LCP). */
  priority?: boolean;
}) {
  const ehSimbolo = variant === "mark";
  const padrao = ehSimbolo
    ? tone === "claro" ? MARK_TINTA : DEFAULT_MARK
    : tone === "claro" ? LOGO_TINTA : DEFAULT_LOGO;
  // Personalização do painel só vale se for upload próprio; senão, a embutida.
  const custom = ehSimbolo ? markUrl ?? logoUrl : logoUrl;
  const src = custom && custom.startsWith("/uploads/") ? custom : padrao;
  const p = ehSimbolo ? PROPORCAO_SIMBOLO : PROPORCAO_LOGO;

  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={src}
      alt="ROTA Atacado"
      width={p.w}
      height={p.h}
      decoding="async"
      fetchPriority={priority ? "high" : "auto"}
      className={`${ALTURA[size]} w-auto object-contain ${className}`}
    />
  );
}
