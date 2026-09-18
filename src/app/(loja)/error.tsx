"use client";

// Erro inesperado numa página da loja (banco fora do ar, por exemplo). Oferece
// tentar de novo e o WhatsApp — o lojista nunca fica num beco sem saída.
import { useEffect } from "react";
import { Botao, BotaoLink, Container } from "@/components/loja/ui";

export default function ErroLoja({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("loja:", error);
  }, [error]);

  return (
    <Container className="flex min-h-[60vh] flex-col items-start justify-center py-24">
      <p className="rota-kicker">Parada técnica</p>
      <h1 className="mt-5 max-w-2xl font-display text-[clamp(2rem,5vw,3.6rem)] font-semibold leading-[1.04] tracking-[-0.03em] text-creme">
        Um trecho da estrada está em obras.
      </h1>
      <p className="mt-5 max-w-lg text-[1.0625rem] leading-relaxed text-creme-2">
        Não conseguimos carregar esta página agora. O seu pedido em montagem continua salvo neste aparelho.
      </p>
      <div className="mt-9 flex flex-wrap gap-3">
        <Botao type="button" onClick={reset} seta>
          Tentar de novo
        </Botao>
        <BotaoLink href="/" variante="contorno">
          Página inicial
        </BotaoLink>
      </div>
      {error.digest && <p className="mt-8 text-xs text-nevoa">Código do erro: {error.digest}</p>}
    </Container>
  );
}
