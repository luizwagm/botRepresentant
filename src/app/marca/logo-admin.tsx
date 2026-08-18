"use client";

import { useCallback, useEffect, useState } from "react";
import BrandLogo from "@/components/brand-logo";
import { DEFAULT_LOGO } from "@/lib/brand-defaults";

type Brand = { logoUrl: string | null; markUrl: string | null };

export default function LogoAdmin() {
  const [brand, setBrand] = useState<Brand>({ logoUrl: DEFAULT_LOGO, markUrl: DEFAULT_LOGO });
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [enviando, setEnviando] = useState<"logoUrl" | "markUrl" | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/brand");
      if (res.ok) setBrand((await res.json()) as Brand);
    } catch {
      /* mantém o padrão */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await load();
    })();
  }, [load]);

  async function enviar(campo: "logoUrl" | "markUrl", files: FileList | null) {
    if (!files || files.length === 0) return;
    setEnviando(campo);
    setErro(null);
    setMsg(null);
    try {
      const fd = new FormData();
      fd.append("file", files[0]!);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error ?? "Falha no upload.");
      setBrand((b) => ({ ...b, [campo]: j.url as string }));
      setMsg("Imagem enviada. Clique em Salvar pra aplicar no site.");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha no upload.");
    } finally {
      setEnviando(null);
    }
  }

  async function salvar() {
    setSalvando(true);
    setErro(null);
    setMsg(null);
    try {
      const res = await fetch("/api/brand", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(brand),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error ?? "Falha ao salvar.");
      setBrand({ logoUrl: j.logoUrl, markUrl: j.markUrl });
      setMsg("Logo salva. Recarregue a página pra ver no cabeçalho.");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao salvar.");
    } finally {
      setSalvando(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500">
        Carregando...
      </div>
    );
  }

  const usandoPadrao = brand.logoUrl === DEFAULT_LOGO;

  return (
    <section className="mb-8 rounded-2xl border border-indigo-200 bg-indigo-50/30 p-6">
      <h2 className="text-base font-semibold text-zinc-900">Trocar a logomarca</h2>
      <p className="mt-1 text-sm text-zinc-600">
        A logo definida aqui vale para <strong>todo o sistema</strong>: painel, catálogo público,
        página do produto e &ldquo;Sobre nós&rdquo;. Envie uma imagem para substituir a logo padrão.
      </p>
      {usandoPadrao && (
        <p className="mt-2 inline-block rounded-full bg-white px-3 py-1 text-xs font-medium text-zinc-600 ring-1 ring-zinc-200">
          Usando a logo padrão do sistema
        </p>
      )}

      <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Slot
          titulo="Logo principal"
          ajuda="Usada nos cabeçalhos do painel e do site."
          url={brand.logoUrl}
          enviando={enviando === "logoUrl"}
          onEnviar={(f) => void enviar("logoUrl", f)}
          onLimpar={() => setBrand((b) => ({ ...b, logoUrl: null }))}
          fundoEscuro={false}
        />
        <Slot
          titulo="Símbolo quadrado"
          ajuda="Ícone/avatar quadrado. Opcional — sem ela, usa a de cima."
          url={brand.markUrl}
          enviando={enviando === "markUrl"}
          onEnviar={(f) => void enviar("markUrl", f)}
          onLimpar={() => setBrand((b) => ({ ...b, markUrl: null }))}
          fundoEscuro
        />
      </div>

      {/* Prévia real: mesmo componente que o site usa */}
      <div className="mt-5 rounded-xl border border-zinc-200 bg-white p-4">
        <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Prévia no cabeçalho
        </div>
        <div className="mt-3 flex items-center gap-6">
          <BrandLogo variant="full" size="sm" logoUrl={brand.logoUrl} markUrl={brand.markUrl} />
          <BrandLogo variant="mark" size="md" logoUrl={brand.logoUrl} markUrl={brand.markUrl} />
        </div>
      </div>

      {erro && <div className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</div>}
      {msg && <div className="mt-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{msg}</div>}

      <div className="mt-5 flex justify-end">
        <button
          onClick={() => void salvar()}
          disabled={salvando || enviando !== null}
          className="rounded-md bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {salvando ? "Salvando..." : "Salvar logomarca"}
        </button>
      </div>
    </section>
  );
}

function Slot({
  titulo,
  ajuda,
  url,
  enviando,
  onEnviar,
  onLimpar,
  fundoEscuro,
}: {
  titulo: string;
  ajuda: string;
  url: string | null;
  enviando: boolean;
  onEnviar: (f: FileList | null) => void;
  onLimpar: () => void;
  fundoEscuro: boolean;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <div className="text-sm font-medium text-zinc-900">{titulo}</div>
      <p className="mt-0.5 text-xs text-zinc-500">{ajuda}</p>
      <div
        className={`mt-3 flex h-24 items-center justify-center rounded-md ${
          fundoEscuro ? "bg-brand-indigo" : "bg-zinc-50"
        }`}
      >
        {url ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={url} alt={titulo} className="max-h-20 max-w-full object-contain" />
        ) : (
          <span className={`text-xs ${fundoEscuro ? "text-white/50" : "text-zinc-400"}`}>
            nenhuma imagem
          </span>
        )}
      </div>
      <div className="mt-3 flex items-center gap-2">
        <label className="cursor-pointer rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50">
          {enviando ? "Enviando..." : url ? "Trocar" : "Escolher imagem"}
          <input
            type="file"
            accept="image/png,image/jpeg,image/svg+xml,image/webp"
            className="hidden"
            onChange={(e) => onEnviar(e.target.files)}
          />
        </label>
        {url && (
          <button
            onClick={onLimpar}
            className="rounded-md bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
          >
            Remover
          </button>
        )}
      </div>
    </div>
  );
}
