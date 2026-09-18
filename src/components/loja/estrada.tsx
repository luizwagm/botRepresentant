// A ESTRADA — o motivo gráfico da marca, tirado da perna do R da logo: três
// faixas de cobre em perspectiva que afinam até um ponto de fuga. Aparece no
// herói (grande), nos separadores e no rodapé. Componente puro: sem hook, sem
// JavaScript — pode ser renderizado direto no servidor.

export default function Estrada({
  className = "",
  animar = false,
  intensidade = 1,
}: {
  className?: string;
  /** Pavimenta da esquerda pra direita ao carregar (herói). */
  animar?: boolean;
  /** 0–1: opacidade máxima das faixas. */
  intensidade?: number;
}) {
  // ID do gradiente derivado da intensidade: duas estradas iguais na mesma
  // página compartilham o MESMO gradiente (idêntico), então repetir não quebra.
  const id = `rota-estrada-${Math.round(intensidade * 100)}`;
  // Ponto de fuga no alto à esquerda; as faixas abrem em leque até a base,
  // exatamente como na logo (fina e junta em cima, larga e aberta embaixo).
  const fuga = { x: 40, y: 70 };
  const faixas = [
    { a: 250, b: 360 },
    { a: 440, b: 610 },
    { a: 700, b: 960 },
  ];
  return (
    <svg
      viewBox="0 0 1000 560"
      preserveAspectRatio="xMinYMax slice"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0" stopColor="#c89775" stopOpacity="0" />
          <stop offset="0.45" stopColor="#c89775" stopOpacity={0.35 * intensidade} />
          <stop offset="1" stopColor="#e2bb98" stopOpacity={0.95 * intensidade} />
        </linearGradient>
      </defs>
      <g
        fill={`url(#${id})`}
        style={animar ? { animation: "rota-pavimenta 1.8s cubic-bezier(.22,1,.36,1) both" } : undefined}
        className={animar ? "rota-pavimento" : undefined}
      >
        {faixas.map((f, i) => (
          <path
            key={i}
            d={`M ${fuga.x} ${fuga.y + i * 4}
                C ${fuga.x + 180} ${fuga.y + 60 + i * 30}, ${f.a - 120} ${300 + i * 20}, ${f.a} 560
                L ${f.b} 560
                C ${f.b - 150} ${290 + i * 18}, ${fuga.x + 220} ${fuga.y + 40 + i * 26}, ${fuga.x + 6} ${fuga.y - 2 + i * 4} Z`}
          />
        ))}
      </g>
    </svg>
  );
}

/** As três faixas da estrada em miniatura — separador de texto (faixa das cidades, listas). */
export function Faixas({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 30 16" className={className} aria-hidden="true" focusable="false">
      <path d="M2 16 7 0h3L6 16Z M11 16l5-16h3l-4 16Z M20 16l5-16h3l-4 16Z" fill="currentColor" />
    </svg>
  );
}
