"use client";

// Ordenação da vitrine. É um <form method="get"> de verdade: sem JavaScript, o
// botão "Aplicar" aparece e tudo funciona; com JavaScript, mudar o select já
// navega (sem recarregar a página).
import { useRouter } from "next/navigation";

export default function Ordenacao({
  acao,
  atual,
  opcoes,
  manter,
}: {
  /** Caminho da vitrine (/loja ou /loja/categoria). */
  acao: string;
  atual: string;
  opcoes: { valor: string; rotulo: string }[];
  /** Outros filtros ativos que precisam sobreviver à troca de ordem. */
  manter: Record<string, string>;
}) {
  const router = useRouter();

  return (
    <form action={acao} method="get" className="flex items-center gap-2">
      {Object.entries(manter).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <label htmlFor="rota-ordem" className="text-sm text-nevoa">
        Ordenar
      </label>
      <select
        id="rota-ordem"
        name="ordem"
        defaultValue={atual}
        onChange={(e) => {
          const qs = new URLSearchParams({ ...manter, ordem: e.target.value });
          router.push(`${acao}?${qs.toString()}`, { scroll: false });
        }}
        className="h-10 rounded-full border border-white/10 bg-grafite pl-4 pr-9 text-sm text-creme focus:border-cobre/60 focus:outline-none"
      >
        {opcoes.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.rotulo}
          </option>
        ))}
      </select>
      <noscript>
        <button type="submit" className="h-10 rounded-full bg-cobre px-4 text-sm text-asfalto">
          Aplicar
        </button>
      </noscript>
    </form>
  );
}
