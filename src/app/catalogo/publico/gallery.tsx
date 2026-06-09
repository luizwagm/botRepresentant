"use client";

import { useEffect, useMemo, useState } from "react";

type PublicProduct = {
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
};

type Media = { type: "image" | "video"; url: string };

function buildMedia(p: PublicProduct): Media[] {
  return [
    ...p.images.map((url) => ({ type: "image" as const, url })),
    ...p.videos.map((url) => ({ type: "video" as const, url })),
  ];
}

function formatPrice(n: number | null): string {
  if (n === null) return "—";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });
}

function priceRange(p: PublicProduct): string {
  if (p.wholesalePriceMin === null && p.wholesalePriceMax === null) return "sob consulta";
  if (p.wholesalePriceMin !== null && p.wholesalePriceMax !== null && p.wholesalePriceMin !== p.wholesalePriceMax) {
    return `${formatPrice(p.wholesalePriceMin)} – ${formatPrice(p.wholesalePriceMax)}`;
  }
  return formatPrice(p.wholesalePriceMin ?? p.wholesalePriceMax);
}

function discountPercent(p: PublicProduct): number | null {
  if (!p.retailPrice || !p.wholesalePriceMin) return null;
  const pct = Math.round((1 - p.wholesalePriceMin / p.retailPrice) * 100);
  return pct > 0 ? pct : null;
}

export default function Gallery({
  products,
  brandName,
  luizWhatsapp,
}: {
  products: PublicProduct[];
  brandName: string;
  luizWhatsapp: string;
}) {
  const [selected, setSelected] = useState<PublicProduct | null>(null);

  return (
    <>
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{brandName}</h1>
            <p className="text-xs text-zinc-500">Catálogo atacado — fabricante do Agreste Pernambucano</p>
          </div>
          {luizWhatsapp && (
            <a
              href={`https://wa.me/${luizWhatsapp}?text=${encodeURIComponent("Olá Luiz, vim pelo catálogo. Pode me passar mais informações?")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Falar no WhatsApp
            </a>
          )}
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6 rounded-lg bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
          <strong className="text-zinc-900">Pedido mínimo: 10 peças</strong>. Direto da fábrica, sem atravessador. Atendemos lojas em todo o Brasil.
        </div>

        {products.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-16 text-center text-zinc-500">
            Em breve: nosso catálogo de jeans direto do Agreste.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((p) => {
              const cover = p.images[0] ?? null;
              const coverVideo = !cover && p.videos[0] ? p.videos[0] : null;
              return (
                <button
                  key={p.id}
                  onClick={() => setSelected(p)}
                  className="group overflow-hidden rounded-xl border border-zinc-200 bg-white text-left shadow-sm transition hover:border-indigo-300 hover:shadow-md"
                >
                  <div className="relative aspect-square bg-zinc-100">
                    {cover ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={cover} alt={p.name} className="h-full w-full object-cover transition group-hover:scale-105" />
                    ) : coverVideo ? (
                      <video src={coverVideo} className="h-full w-full object-cover" muted playsInline preload="metadata" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-zinc-400">sem foto</div>
                    )}
                    {discountPercent(p) !== null && (
                      <span className="absolute left-2 top-2 rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-medium text-white shadow">
                        −{discountPercent(p)}% vs. varejo
                      </span>
                    )}
                    {p.videos.length > 0 && (
                      <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-medium text-white">
                        ▶ vídeo
                      </span>
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="line-clamp-2 text-sm font-medium leading-tight">{p.name}</h3>
                    <div className="mt-1 text-sm font-semibold text-zinc-900">{priceRange(p)}</div>
                    {p.retailPrice && (
                      <div className="text-xs text-zinc-400 line-through">varejo {formatPrice(p.retailPrice)}</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {selected && (
        <ProductModal
          product={selected}
          luizWhatsapp={luizWhatsapp}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}

function ProductModal({
  product,
  luizWhatsapp,
  onClose,
}: {
  product: PublicProduct;
  luizWhatsapp: string;
  onClose: () => void;
}) {
  const media = useMemo(() => buildMedia(product), [product]);
  const [idx, setIdx] = useState(0);
  const count = media.length;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (count > 1 && e.key === "ArrowRight") setIdx((i) => (i + 1) % count);
      if (count > 1 && e.key === "ArrowLeft") setIdx((i) => (i - 1 + count) % count);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [count, onClose]);

  const discount = discountPercent(product);
  const current = media[idx] ?? null;
  const orderMessage = `Olá Luiz! Vim pelo catálogo, tenho interesse em "${product.name}". Pode me passar mais informações?`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/70 p-4" onClick={onClose}>
      <div
        className="grid max-h-[92vh] w-full max-w-5xl grid-cols-1 overflow-y-auto rounded-2xl bg-white shadow-2xl md:grid-cols-2"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Midia */}
        <div className="relative flex items-center justify-center bg-zinc-900">
          {current ? (
            <>
              {current.type === "image" ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={current.url}
                  alt={product.name}
                  className="aspect-square w-full bg-zinc-100 object-cover md:aspect-auto md:h-full"
                />
              ) : (
                <video
                  key={current.url}
                  src={current.url}
                  controls
                  playsInline
                  className="aspect-square w-full bg-black object-contain md:aspect-auto md:h-full"
                />
              )}
              {count > 1 && (
                <>
                  <button
                    onClick={() => setIdx((i) => (i - 1 + count) % count)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow hover:bg-white"
                    aria-label="Anterior"
                  >◀</button>
                  <button
                    onClick={() => setIdx((i) => (i + 1) % count)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow hover:bg-white"
                    aria-label="Próxima"
                  >▶</button>
                  <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
                    {media.map((m, i) => (
                      <button
                        key={`${m.type}-${i}`}
                        onClick={() => setIdx(i)}
                        aria-label={`Mídia ${i + 1}`}
                        className={`h-2 w-2 rounded-full ring-1 ring-zinc-400 ${i === idx ? "bg-indigo-600" : "bg-white/80"}`}
                      />
                    ))}
                  </div>
                </>
              )}
              {discount !== null && (
                <span className="absolute left-3 top-3 rounded-full bg-emerald-600 px-3 py-1 text-xs font-medium text-white shadow">
                  −{discount}% vs. varejo
                </span>
              )}
              {current.type === "video" && (
                <span className="absolute right-3 top-3 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-medium text-white">
                  vídeo
                </span>
              )}
            </>
          ) : (
            <div className="flex aspect-square w-full items-center justify-center text-zinc-400">sem mídia</div>
          )}
        </div>

        {/* Detalhes */}
        <div className="flex flex-col p-6">
          <div className="flex items-start justify-between">
            <h2 className="text-xl font-semibold tracking-tight">{product.name}</h2>
            <button onClick={onClose} className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100" aria-label="Fechar">✕</button>
          </div>

          {product.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {product.tags.map((t) => (
                <span key={t} className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">{t}</span>
              ))}
            </div>
          )}

          {/* Preco — ancoragem */}
          <div className="mt-5 rounded-lg bg-zinc-50 p-4">
            <div className="text-xs uppercase tracking-wide text-zinc-500">Preço atacado</div>
            <div className="mt-1 text-2xl font-semibold text-zinc-900">{priceRange(product)}</div>
            {product.retailPrice && (
              <div className="mt-1 text-sm text-zinc-500">
                <span className="line-through">Preço varejo de referência: {formatPrice(product.retailPrice)}</span>
                {discount !== null && <span className="ml-2 text-emerald-700">({discount}% mais barato)</span>}
              </div>
            )}
            <div className="mt-3 text-xs text-zinc-500">Pedido mínimo: 10 peças por modelo</div>
          </div>

          {product.description && (
            <p className="mt-4 whitespace-pre-line text-sm text-zinc-700">{product.description}</p>
          )}

          {product.sizes.length > 0 && (
            <div className="mt-5">
              <div className="text-xs font-medium text-zinc-700">Tamanhos disponíveis</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {product.sizes.map((s) => (
                  <span key={s} className="rounded-md border border-zinc-300 px-3 py-1 text-sm">{s}</span>
                ))}
              </div>
            </div>
          )}

          {/* Confianca de compra */}
          <ul className="mt-5 space-y-1.5 text-sm text-zinc-700">
            <li className="flex items-start gap-2"><span className="text-emerald-600">✓</span> Direto da fábrica — Agreste/PE</li>
            <li className="flex items-start gap-2"><span className="text-emerald-600">✓</span> Pronta-entrega de várias peças</li>
            <li className="flex items-start gap-2"><span className="text-emerald-600">✓</span> Tira dúvidas e ajusta grade pelo WhatsApp</li>
          </ul>

          <div className="mt-auto pt-6">
            {luizWhatsapp ? (
              <a
                href={`https://wa.me/${luizWhatsapp}?text=${encodeURIComponent(orderMessage)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full rounded-md bg-emerald-600 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Quero fazer pedido pelo WhatsApp
              </a>
            ) : (
              <div className="rounded-md bg-amber-50 px-4 py-3 text-center text-sm text-amber-800">
                Configure <code>LUIZ_WHATSAPP</code> no .env pra liberar o botão de pedido.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
