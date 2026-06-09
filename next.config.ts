import type { NextConfig } from "next";

// Content-Security-Policy: defesa em profundidade pra renderizacao de HTML de
// usuario (descricao de produto). DOMPurify ja sanitiza; isto e a 2a barreira.
// script-src/style-src precisam de 'unsafe-inline' (e 'unsafe-eval' no dev/HMR)
// porque o Next injeta bootstrap/estilos inline sem nonce. As protecoes reais
// aqui sao object-src 'none', base-uri 'self' e frame-ancestors 'none'.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https:",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};

export default nextConfig;
