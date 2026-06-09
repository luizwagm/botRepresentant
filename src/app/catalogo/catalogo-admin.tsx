"use client";

import { useCallback, useEffect, useState } from "react";

type Product = {
  id: string;
  name: string;
  description: string | null;
  images: string[];
  videos: string[];
  sizes: string[];
  wholesalePriceMin: number | null;
  wholesalePriceMax: number | null;
  retailPrice: number | null;
  tags: string[];
  active: boolean;
  createdAt: string;
};

type MediaKind = "images" | "videos";

type FormState = {
  id?: string;
  name: string;
  description: string;
  images: string[];
  videos: string[];
  sizes: string;
  wholesalePriceMin: string;
  wholesalePriceMax: string;
  retailPrice: string;
  tags: string;
  active: boolean;
};

const EMPTY_FORM: FormState = {
  name: "",
  description: "",
  images: [],
  videos: [],
  sizes: "",
  wholesalePriceMin: "",
  wholesalePriceMax: "",
  retailPrice: "",
  tags: "",
  active: true,
};

export default function CatalogoAdmin() {
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<MediaKind | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/products");
    const json = await res.json();
    setProducts(json.items);
  }, []);

  useEffect(() => {
    void (async () => {
      await load();
    })();
  }, [load]);

  function startEdit(p: Product) {
    setForm({
      id: p.id,
      name: p.name,
      description: p.description ?? "",
      images: p.images,
      videos: p.videos ?? [],
      sizes: p.sizes.join(", "),
      wholesalePriceMin: p.wholesalePriceMin?.toString() ?? "",
      wholesalePriceMax: p.wholesalePriceMax?.toString() ?? "",
      retailPrice: p.retailPrice?.toString() ?? "",
      tags: p.tags.join(", "),
      active: p.active,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setForm(EMPTY_FORM);
    setError(null);
  }

  async function handleUpload(kind: MediaKind, files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(kind);
    setError(null);
    const newUrls: string[] = [];
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (res.ok) {
        const j = (await res.json()) as { url: string };
        newUrls.push(j.url);
      } else {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setError(j.error ?? "Falha no upload.");
      }
    }
    if (newUrls.length > 0) {
      setForm((f) => ({ ...f, [kind]: [...f[kind], ...newUrls] }));
    }
    setUploading(null);
  }

  function removeMedia(kind: MediaKind, idx: number) {
    setForm((f) => ({ ...f, [kind]: f[kind].filter((_, i) => i !== idx) }));
  }

  function moveMedia(kind: MediaKind, idx: number, dir: -1 | 1) {
    setForm((f) => {
      const arr = [...f[kind]];
      const j = idx + dir;
      if (j < 0 || j >= arr.length) return f;
      [arr[idx], arr[j]] = [arr[j], arr[idx]];
      return { ...f, [kind]: arr };
    });
  }

  function parseList(s: string): string[] {
    return s.split(",").map((x) => x.trim()).filter(Boolean);
  }

  function parseNum(s: string): number | null {
    if (!s.trim()) return null;
    const n = parseFloat(s.replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }

  async function save() {
    if (!form.name.trim()) {
      setError("Nome é obrigatório.");
      return;
    }
    setSaving(true);
    setError(null);
    const body = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      images: form.images,
      videos: form.videos,
      sizes: parseList(form.sizes),
      tags: parseList(form.tags),
      wholesalePriceMin: parseNum(form.wholesalePriceMin),
      wholesalePriceMax: parseNum(form.wholesalePriceMax),
      retailPrice: parseNum(form.retailPrice),
      active: form.active,
    };
    const res = form.id
      ? await fetch(`/api/products/${form.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
      : await fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Falha ao salvar.");
      setSaving(false);
      return;
    }
    resetForm();
    await load();
    setSaving(false);
  }

  async function remove(id: string) {
    if (!confirm("Excluir este produto?")) return;
    await fetch(`/api/products/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div className="space-y-8">
      {/* Formulario */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">{form.id ? "Editar produto" : "Novo produto"}</h2>
          {form.id && (
            <button onClick={resetForm} className="text-sm text-zinc-500 hover:text-zinc-900">
              + Novo
            </button>
          )}
        </div>

        {error && <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700">Nome *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="ex.: Jeans Masculino Skinny Escuro"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700">Descrição</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="Modelagem, tecido, lavagem, diferenciais..."
            />
          </div>

          {/* Fotos */}
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700">Fotos (frente, costas, lateral, detalhe, etiqueta — a primeira vira capa)</label>
            <div className="flex flex-wrap gap-3">
              {form.images.map((url, idx) => (
                <div key={url} className="group relative h-24 w-24 overflow-hidden rounded-md border border-zinc-200 bg-zinc-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="h-full w-full object-cover" />
                  <div className="absolute inset-0 flex items-end justify-between bg-black/30 p-1 opacity-0 transition group-hover:opacity-100">
                    <button onClick={() => moveMedia("images", idx, -1)} className="rounded bg-white/90 px-1 text-xs">◀</button>
                    <button onClick={() => removeMedia("images", idx)} className="rounded bg-red-600 px-1 text-xs text-white">✕</button>
                    <button onClick={() => moveMedia("images", idx, 1)} className="rounded bg-white/90 px-1 text-xs">▶</button>
                  </div>
                  {idx === 0 && <span className="absolute left-1 top-1 rounded bg-indigo-600 px-1 text-[10px] text-white">capa</span>}
                </div>
              ))}
              <label className="flex h-24 w-24 cursor-pointer items-center justify-center rounded-md border-2 border-dashed border-zinc-300 text-center text-xs text-zinc-500 hover:border-indigo-400 hover:text-indigo-600">
                {uploading === "images" ? "Subindo..." : "+ Foto"}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => handleUpload("images", e.target.files)}
                />
              </label>
            </div>
          </div>

          {/* Videos */}
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700">Vídeos (peça em movimento, giro 360° — opcional, até 50MB cada)</label>
            <div className="flex flex-wrap gap-3">
              {form.videos.map((url, idx) => (
                <div key={url} className="group relative h-24 w-24 overflow-hidden rounded-md border border-zinc-200 bg-black">
                  <video src={url} className="h-full w-full object-cover" muted playsInline preload="metadata" />
                  <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-white/90">▶</span>
                  <div className="absolute inset-0 flex items-end justify-between bg-black/30 p-1 opacity-0 transition group-hover:opacity-100">
                    <button onClick={() => moveMedia("videos", idx, -1)} className="rounded bg-white/90 px-1 text-xs">◀</button>
                    <button onClick={() => removeMedia("videos", idx)} className="rounded bg-red-600 px-1 text-xs text-white">✕</button>
                    <button onClick={() => moveMedia("videos", idx, 1)} className="rounded bg-white/90 px-1 text-xs">▶</button>
                  </div>
                </div>
              ))}
              <label className="flex h-24 w-24 cursor-pointer items-center justify-center rounded-md border-2 border-dashed border-zinc-300 text-center text-xs text-zinc-500 hover:border-indigo-400 hover:text-indigo-600">
                {uploading === "videos" ? "Subindo..." : "+ Vídeo"}
                <input
                  type="file"
                  accept="video/*"
                  multiple
                  className="hidden"
                  onChange={(e) => handleUpload("videos", e.target.files)}
                />
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-700">Tamanhos (separe por vírgula)</label>
              <input
                type="text"
                value={form.sizes}
                onChange={(e) => setForm({ ...form, sizes: e.target.value })}
                placeholder="36, 38, 40, 42, 44"
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-700">Tags (separe por vírgula)</label>
              <input
                type="text"
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                placeholder="feminino, skinny, escuro"
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                  className="h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                />
                Produto ativo na galeria pública
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-700">Preço atacado mínimo (R$)</label>
              <input
                type="text"
                value={form.wholesalePriceMin}
                onChange={(e) => setForm({ ...form, wholesalePriceMin: e.target.value })}
                placeholder="49,90"
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-700">Preço atacado máximo (R$)</label>
              <input
                type="text"
                value={form.wholesalePriceMax}
                onChange={(e) => setForm({ ...form, wholesalePriceMax: e.target.value })}
                placeholder="59,90"
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-700">Preço varejo (referência — ancoragem)</label>
              <input
                type="text"
                value={form.retailPrice}
                onChange={(e) => setForm({ ...form, retailPrice: e.target.value })}
                placeholder="149,90"
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button onClick={resetForm} className="rounded-md px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100">Cancelar</button>
            <button
              onClick={save}
              disabled={saving || uploading !== null}
              className="rounded-md bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? "Salvando..." : form.id ? "Salvar alterações" : "Cadastrar produto"}
            </button>
          </div>
        </div>
      </div>

      {/* Lista */}
      <div>
        <h2 className="mb-3 text-base font-semibold">Produtos cadastrados ({products.length})</h2>
        {products.length === 0 ? (
          <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center text-sm text-zinc-500">
            Nenhum produto cadastrado ainda.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p) => (
              <div key={p.id} className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
                <div className="relative aspect-square bg-zinc-100">
                  {p.images[0] ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={p.images[0]} alt={p.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-zinc-400">sem foto</div>
                  )}
                  {p.videos?.length > 0 && (
                    <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-medium text-white">
                      ▶ {p.videos.length} vídeo{p.videos.length > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold leading-tight">{p.name}</h3>
                    {!p.active && (
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600">inativo</span>
                    )}
                  </div>
                  {(p.wholesalePriceMin ?? p.wholesalePriceMax) !== null && (
                    <div className="mt-1 text-xs text-zinc-600">
                      Atacado: R$ {p.wholesalePriceMin ?? "?"} {p.wholesalePriceMax ? `– R$ ${p.wholesalePriceMax}` : ""}
                    </div>
                  )}
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => startEdit(p)} className="flex-1 rounded-md bg-zinc-100 px-3 py-1.5 text-xs font-medium hover:bg-zinc-200">Editar</button>
                    <button onClick={() => remove(p.id)} className="rounded-md bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100">Excluir</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
