"use client";

import { useMemo, useSyncExternalStore } from "react";
import DOMPurify from "dompurify";

// Detecta hidratacao sem setState-em-effect: false no SSR e no 1o render do
// client, true depois. Evita mismatch (o HTML sanitizado so existe no cliente).
const emptySubscribe = () => () => {};
function useHydrated(): boolean {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}

let hookAdded = false;
function sanitize(html: string): string {
  if (typeof window === "undefined") return "";
  if (!hookAdded) {
    DOMPurify.addHook("afterSanitizeAttributes", (node) => {
      if (node.tagName === "A" && node.getAttribute("href")) {
        node.setAttribute("target", "_blank");
        node.setAttribute("rel", "noopener noreferrer nofollow");
      }
    });
    hookAdded = true;
  }
  return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
}

/**
 * Renderiza HTML rico (vindo do editor do painel) com sanitizacao no cliente.
 * O container e sempre renderizado; o HTML entra apos hidratar pra nao gerar
 * mismatch. Usado na pagina /sobre.
 */
export default function RichContent({ html, className = "" }: { html: string; className?: string }) {
  const hydrated = useHydrated();
  const clean = useMemo(() => (html ? sanitize(html) : ""), [html]);
  return (
    <div className={`rich-text ${className}`} dangerouslySetInnerHTML={{ __html: hydrated ? clean : "" }} />
  );
}
