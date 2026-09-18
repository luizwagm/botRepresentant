// Ícones da loja — SVG inline, traço de 1.6 (mesma espessura dos filetes da
// logo). Sem biblioteca de ícones: cada KB de JavaScript custa no LCP.
type P = { className?: string };
const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export const IconeSacola = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <path d="M5 8h14l-1.2 11.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8L5 8Z" />
    <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
  </svg>
);
export const IconeBusca = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4 4" />
  </svg>
);
export const IconeMenu = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <path d="M4 7h16M4 12h16M4 17h10" />
  </svg>
);
export const IconeFechar = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);
export const IconeSeta = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);
export const IconeMais = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);
export const IconeMenos = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <path d="M5 12h14" />
  </svg>
);
export const IconeLixeira = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <path d="M4 7h16M9 7V5h6v2M6.5 7l.8 12a2 2 0 0 0 2 1.8h5.4a2 2 0 0 0 2-1.8l.8-12" />
  </svg>
);
export const IconeCaminhao = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <path d="M3 6h11v10H3zM14 10h4l3 3v3h-7" />
    <circle cx="7" cy="17.5" r="1.8" />
    <circle cx="17" cy="17.5" r="1.8" />
  </svg>
);
export const IconeFabrica = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <path d="M3 20V10l5 3V10l5 3V10l5 3V5h3v15H3Z" />
    <path d="M7 17h2M12 17h2" />
  </svg>
);
export const IconeConversa = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <path d="M20 12a8 8 0 0 1-11.8 7L4 20l1.1-3.8A8 8 0 1 1 20 12Z" />
    <path d="M9 11h6M9 14h4" />
  </svg>
);
export const IconeGrade = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <rect x="4" y="4" width="16" height="16" rx="2" />
    <path d="M4 10h16M4 15h16M10 4v16M15 4v16" />
  </svg>
);
export const IconeCheck = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <path d="m5 12.5 4.2 4.2L19 7" />
  </svg>
);
