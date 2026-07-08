"use client";

import { useCallback, useEffect, useRef, type ReactNode } from "react";

type Tool = { cmd: string; label: ReactNode; title: string };

// Barra de ferramentas — estatica (fora do componente) pra nao recriar por render.
const TOOLS: Tool[] = [
  { cmd: "bold", label: <span className="font-bold">B</span>, title: "Negrito (Ctrl+B)" },
  { cmd: "italic", label: <span className="italic">I</span>, title: "Itálico (Ctrl+I)" },
  { cmd: "underline", label: <span className="underline">U</span>, title: "Sublinhado (Ctrl+U)" },
  { cmd: "formatBlock:<h3>", label: "Título", title: "Subtítulo" },
  { cmd: "insertUnorderedList", label: "• Lista", title: "Lista com marcadores" },
  { cmd: "insertOrderedList", label: "1. Lista", title: "Lista numerada" },
  { cmd: "createLink", label: "🔗", title: "Inserir link" },
  { cmd: "removeFormat", label: "✕ Formato", title: "Limpar formatação" },
];

// Conteúdo visualmente vazio (só <br>/<div><br></div> residual do contentEditable)
// vira "" — pra o placeholder :empty voltar e não salvar lixo como descrição.
function readHtml(el: HTMLElement): string {
  return el.textContent && el.textContent.trim() !== "" ? el.innerHTML : "";
}

/**
 * Editor de texto rico leve (estilo Word básico) — sem dependências.
 * Produz HTML (negrito, itálico, listas, links) que a galeria pública renderiza
 * com sanitização (DOMPurify). Uso: <RichTextEditor value onChange placeholder />.
 */
export default function RichTextEditor({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // Sincroniza o conteúdo quando `value` muda de FORA (carregar produto pra editar,
  // reset ao criar novo). NÃO re-seta durante a digitação, pra não resetar o cursor.
  useEffect(() => {
    const el = ref.current;
    if (el && el.innerHTML !== value) {
      el.innerHTML = value;
    }
  }, [value]);

  const applyCommand = useCallback(
    (cmd: string) => {
      const el = ref.current;
      if (!el) return;
      el.focus();
      if (cmd === "createLink") {
        const raw = window.prompt("URL do link (ex.: https://...)");
        if (!raw) return;
        let href: string;
        try {
          const u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
          if (u.protocol !== "http:" && u.protocol !== "https:") return; // só http/https
          href = u.href;
        } catch {
          return; // URL inválida — ignora
        }
        const sel = window.getSelection();
        if (sel && !sel.isCollapsed) {
          document.execCommand("createLink", false, href);
        } else {
          // Sem texto selecionado: insere a própria URL como link (como no Word/Docs).
          const safe = href
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
          document.execCommand("insertHTML", false, `<a href="${safe}">${safe}</a>`);
        }
      } else if (cmd.startsWith("formatBlock:")) {
        document.execCommand("formatBlock", false, cmd.slice("formatBlock:".length));
      } else {
        document.execCommand(cmd, false);
      }
      onChange(readHtml(el));
    },
    [onChange],
  );

  return (
    <div className="overflow-hidden rounded-md border border-zinc-300 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500">
      <div className="flex flex-wrap items-center gap-1 border-b border-zinc-200 bg-zinc-50 px-1.5 py-1.5">
        {TOOLS.map((t) => (
          <button
            key={t.title}
            type="button"
            title={t.title}
            onMouseDown={(e) => e.preventDefault()} // mantém o foco/seleção no editor
            onClick={() => applyCommand(t.cmd)}
            className="rounded px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-200"
          >
            {t.label}
          </button>
        ))}
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label="Descrição do produto"
        onInput={(e) => onChange(readHtml(e.currentTarget))}
        data-placeholder={placeholder ?? ""}
        className="rich-text min-h-[130px] w-full px-3 py-2 text-sm text-zinc-800 focus:outline-none empty:before:text-zinc-400 empty:before:content-[attr(data-placeholder)]"
      />
    </div>
  );
}
