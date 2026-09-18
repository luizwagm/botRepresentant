"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import RichTextEditor from "@/components/rich-text-editor";
import { DEFAULT_ABOUT, type AboutContent, type AboutHighlight, type AboutStat } from "@/lib/about";

export default function AboutAdmin() {
  const [content, setContent] = useState<AboutContent>(DEFAULT_ABOUT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/about");
        const json = (await res.json()) as AboutContent;
        if (!cancelled && res.ok) setContent(json);
      } catch {
        // mantém o DEFAULT já no estado
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function patch(p: Partial<AboutContent>) {
    setContent((c) => ({ ...c, ...p }));
    setOkMsg(null);
  }

  // --- Destaques ---
  function addHighlight() {
    patch({ highlights: [...content.highlights, { title: "", description: "" }] });
  }
  function updateHighlight(i: number, p: Partial<AboutHighlight>) {
    patch({ highlights: content.highlights.map((h, idx) => (idx === i ? { ...h, ...p } : h)) });
  }
  function removeHighlight(i: number) {
    patch({ highlights: content.highlights.filter((_, idx) => idx !== i) });
  }

  // --- Stats ---
  function addStat() {
    patch({ stats: [...content.stats, { value: "", label: "" }] });
  }
  function updateStat(i: number, p: Partial<AboutStat>) {
    patch({ stats: content.stats.map((s, idx) => (idx === i ? { ...s, ...p } : s)) });
  }
  function removeStat(i: number) {
    patch({ stats: content.stats.filter((_, idx) => idx !== i) });
  }

  async function handleImage(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    const fd = new FormData();
    fd.append("file", files[0]!);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    if (res.ok) {
      const j = (await res.json()) as { url: string };
      patch({ imageUrl: j.url });
    } else {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      setError(j.error ?? "Falha no upload da imagem.");
    }
    setUploading(false);
  }

  async function save() {
    if (!content.heroTitle.trim()) {
      setError("O título é obrigatório.");
      return;
    }
    setSaving(true);
    setError(null);
    setOkMsg(null);
    try {
      const res = await fetch("/api/about", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(content),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Falha ao salvar.");
      setContent(json as AboutContent);
      setOkMsg("Salvo! A página /sobre já está atualizada.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center text-sm text-zinc-500">Carregando...</div>;
  }

  // Texto salvo antes do rebrand ainda fala da marca antiga?
  const marcaAntiga = /L\.\s?Augusto|f[áa]brica de jeans em Riacho/i.test(
    [content.heroTitle, content.heroSubtitle, content.storyHtml, ...content.highlights.map((h) => h.title + h.description)].join(" "),
  );

  return (
    <div className="space-y-6">
      {marcaAntiga && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
          <span>
            Este texto ainda é da marca antiga (L. Augusto). A página <strong>/sobre</strong> mostra exatamente o que
            está salvo aqui.
          </span>
          <button
            type="button"
            onClick={() => setContent((c) => ({ ...DEFAULT_ABOUT, imageUrl: c.imageUrl }))}
            className="w-full rounded-md bg-amber-900 px-3 py-2.5 text-sm font-medium text-white hover:bg-amber-800 sm:w-auto sm:py-1.5 sm:text-xs"
          >
            Carregar texto padrão ROTA
          </button>
        </div>
      )}
      <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="space-y-5">
          {/* Herói */}
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700">Título principal *</label>
            <input
              type="text"
              value={content.heroTitle}
              onChange={(e) => patch({ heroTitle: e.target.value })}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-base focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
              placeholder="ex.: A rota entre as fábricas do Agreste e a sua loja"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700">Subtítulo</label>
            <textarea
              value={content.heroSubtitle}
              onChange={(e) => patch({ heroSubtitle: e.target.value })}
              rows={2}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-base focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
              placeholder="Uma frase curta que resume o negócio."
            />
          </div>

          {/* Imagem de topo */}
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700">
              Imagem de topo <span className="font-normal text-zinc-400">(opcional — sem ela, mostra o logo)</span>
            </label>
            <div className="flex items-center gap-3">
              {content.imageUrl ? (
                <div className="group relative h-24 w-32 overflow-hidden rounded-md border border-zinc-200 bg-zinc-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={content.imageUrl} alt="" className="h-full w-full object-cover" />
                  {/* Só esconde até o hover onde existe hover (mouse): no toque o
                      group-hover nunca dispara e o ✕ ficava invisível. */}
                  <button
                    onClick={() => patch({ imageUrl: null })}
                    className="absolute right-1 top-1 rounded bg-red-600 px-3 py-2 text-xs text-white transition group-hover:opacity-100 sm:px-1 sm:py-0 [@media(hover:hover)]:opacity-0"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <label className="flex h-24 w-32 cursor-pointer items-center justify-center rounded-md border-2 border-dashed border-zinc-300 text-center text-xs text-zinc-500 hover:border-indigo-400 hover:text-indigo-600">
                  {uploading ? "Subindo..." : "+ Imagem"}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImage(e.target.files)} />
                </label>
              )}
            </div>
          </div>

          {/* História */}
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700">Nossa história</label>
            <RichTextEditor
              value={content.storyHtml}
              onChange={(html) => patch({ storyHtml: html })}
              placeholder="Conte a origem da fábrica, a região, o diferencial..."
            />
          </div>
        </div>
      </div>

      {/* Destaques */}
      <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <h2 className="text-sm font-semibold text-zinc-900">Diferenciais</h2>
          <span className="text-xs text-zinc-400">Aparecem como cards ao lado da história</span>
        </div>
        <div className="space-y-3">
          {content.highlights.map((h, i) => (
            <div key={i} className="rounded-md border border-zinc-200 bg-zinc-50/50 p-3">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={h.title}
                  onChange={(e) => updateHighlight(i, { title: e.target.value })}
                  placeholder="Título (ex.: Fábrica própria)"
                  className="min-w-0 flex-1 rounded-md border border-zinc-300 px-3 py-2 text-base font-medium focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
                />
                <button
                  type="button"
                  onClick={() => removeHighlight(i)}
                  className="shrink-0 rounded-md bg-red-50 px-2 py-3 text-xs font-medium text-red-700 hover:bg-red-100 sm:py-2"
                >
                  Remover
                </button>
              </div>
              <textarea
                value={h.description}
                onChange={(e) => updateHighlight(i, { description: e.target.value })}
                rows={2}
                placeholder="Descrição curta do diferencial."
                className="mt-2 w-full rounded-md border border-zinc-300 px-3 py-2 text-base focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
          ))}
          <button
            type="button"
            onClick={addHighlight}
            className="w-full rounded-md border border-dashed border-zinc-300 px-3 py-2.5 text-sm font-medium text-zinc-600 hover:border-indigo-400 hover:text-indigo-600 sm:w-auto sm:py-2"
          >
            + Adicionar diferencial
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <h2 className="text-sm font-semibold text-zinc-900">Barra de destaques</h2>
          <span className="text-xs text-zinc-400">Ex.: &ldquo;12 anos&rdquo; · &ldquo;de fábrica&rdquo;</span>
        </div>
        <div className="space-y-2">
          {content.stats.map((s, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2 rounded-md border border-zinc-200 bg-zinc-50/50 p-2">
              <input
                type="text"
                value={s.value}
                onChange={(e) => updateStat(i, { value: e.target.value })}
                placeholder="Número/destaque"
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-base font-semibold focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:w-40 sm:text-sm"
              />
              <input
                type="text"
                value={s.label}
                onChange={(e) => updateStat(i, { label: e.target.value })}
                placeholder="Descrição"
                className="min-w-[160px] flex-1 rounded-md border border-zinc-300 px-3 py-2 text-base focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
              />
              <button
                type="button"
                onClick={() => removeStat(i)}
                className="shrink-0 rounded-md bg-red-50 px-2 py-3 text-xs font-medium text-red-700 hover:bg-red-100 sm:py-2"
              >
                Remover
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addStat}
            className="w-full rounded-md border border-dashed border-zinc-300 px-3 py-2.5 text-sm font-medium text-zinc-600 hover:border-indigo-400 hover:text-indigo-600 sm:w-auto sm:py-2"
          >
            + Adicionar destaque
          </button>
        </div>
      </div>

      {/* Ações */}
      {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      {okMsg && <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{okMsg}</div>}
      {/* No celular: Salvar em largura total por cima, link embaixo. */}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
        <Link href="/sobre" target="_blank" className="py-2 text-center text-sm text-indigo-600 hover:underline sm:py-0 sm:text-left">
          Ver página pública ↗
        </Link>
        <button
          onClick={save}
          disabled={saving || uploading}
          className="w-full rounded-md bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 sm:w-auto sm:py-2"
        >
          {saving ? "Salvando..." : "Salvar alterações"}
        </button>
      </div>
    </div>
  );
}
