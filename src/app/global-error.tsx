"use client";

import { useEffect } from "react";

// Rede de seguranca de ultimo nivel: captura excecoes no proprio root layout
// (ex.: metadataBase/env), onde nenhuma error.tsx de segmento alcanca. Precisa
// renderizar <html>/<body> porque substitui o layout raiz.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Erro global:", error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "12px",
          fontFamily: "system-ui, sans-serif",
          color: "#18181b",
          background: "#fafafa",
          padding: "24px",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: "32px" }} aria-hidden="true">⚠️</div>
        <h1 style={{ fontSize: "20px", fontWeight: 700 }}>Algo deu errado</h1>
        <p style={{ fontSize: "14px", color: "#71717a", maxWidth: "28rem" }}>
          Estamos com uma instabilidade. Tente recarregar em instantes.
        </p>
        {error.digest && (
          <p style={{ fontSize: "12px", color: "#a1a1aa" }}>Código: {error.digest}</p>
        )}
        <button
          onClick={reset}
          style={{
            marginTop: "8px",
            borderRadius: "8px",
            background: "#4f46e5",
            color: "#fff",
            border: "none",
            padding: "8px 16px",
            fontSize: "14px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Tentar de novo
        </button>
      </body>
    </html>
  );
}
