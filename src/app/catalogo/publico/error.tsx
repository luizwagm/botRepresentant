"use client";

import { useEffect } from "react";
import Link from "next/link";

// Error boundary do catalogo publico — cobre a lista (/catalogo/publico) e a
// pagina de produto (/catalogo/publico/[id]). Sem isto, uma excecao no server
// component (ex.: P2022 de coluna faltando no banco) vira um 500 cru com digest.
export default function CatalogoPublicoError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Vai pro console do navegador; o digest correspondente aparece no `pm2 logs`.
    console.error("Erro no catálogo público:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <div className="text-4xl" aria-hidden="true">⚠️</div>
      <h1 className="mt-4 text-xl font-bold text-zinc-900">Não foi possível carregar</h1>
      <p className="mt-2 max-w-md text-sm text-zinc-500">
        Tivemos um problema ao abrir esta página. Tente de novo em instantes.
      </p>
      {error.digest && <p className="mt-1 text-xs text-zinc-400">Código: {error.digest}</p>}
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button
          onClick={reset}
          className="rounded-lg bg-brand-indigo px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          Tentar de novo
        </button>
        <Link
          href="/catalogo/publico"
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
        >
          Voltar ao catálogo
        </Link>
      </div>
    </div>
  );
}
