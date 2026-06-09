"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import DOMPurify from "dompurify";
import BrandLogo from "@/components/brand-logo";

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
  minOrderQty: number;
  readyToShip: boolean;
};

type Media = { type: "image" | "video"; url: string };

function buildMedia(p: PublicProduct): Media[] {
  return [
    ...p.images.map((url) => ({ type: "image" as const, url })),
    ...p.videos.map((url) => ({ type: "video" as const, url })),
  ];
}

function sanitizeHtml(html: string): string {
  if (typeof window === "undefined") return "";
  return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
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

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
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
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h1 className="sr-only">{brandName}</h1>
            <BrandLogo variant="full" size="md" />
            <p className="mt-2 text-xs text-zinc-500">Catálogo atacado — fabricante do Agreste Pernambucano</p>
          </div>
          {luizWhatsapp && (
            <a
              href={`https://wa.me/${luizWhatsapp}?text=${encodeURIComponent("Olá Luiz, vim pelo catálogo. Pode me passar mais informações?")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 sm:w-auto"
            >
              <WhatsAppIcon className="h-4 w-4" />
              Falar no WhatsApp
            </a>
          )}
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-5 py-8 sm:px-6">
        <div className="mb-6 rounded-lg bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
          <strong className="text-zinc-900">Direto da fábrica, sem atravessador.</strong> Pedido mínimo e pronta-entrega informados em cada peça. Atendemos lojas em todo o Brasil.
        </div>

        {products.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-16 text-center text-zinc-500">
            Em breve: nosso catálogo de jeans direto do Agreste.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
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
                      <span className="absolute left-2 top-2 rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-semibold text-white shadow">
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
                    <h3 className="line-clamp-2 text-base font-semibold leading-snug text-zinc-900">{p.name}</h3>
                    <div className="mt-1 text-base font-bold text-brand-indigo">{priceRange(p)}</div>
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
  const descHtml = useMemo(() => (product.description ? sanitizeHtml(product.description) : ""), [product.description]);
  const [idx, setIdx] = useState(0);
  const count = media.length;
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden"; // trava o scroll do body
    panelRef.current?.focus();

    function focusable(): HTMLElement[] {
      if (!panelRef.current) return [];
      return Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input, select, textarea, video[controls], [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => el.offsetParent !== null);
    }

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (count > 1 && e.key === "ArrowRight") setIdx((i) => (i + 1) % count);
      if (count > 1 && e.key === "ArrowLeft") setIdx((i) => (i - 1 + count) % count);
      if (e.key === "Tab") {
        const f = focusable();
        if (f.length === 0) {
          e.preventDefault();
          panelRef.current?.focus();
          return;
        }
        const first = f[0]!;
        const last = f[f.length - 1]!;
        const active = document.activeElement;
        if (e.shiftKey && (active === first || active === panelRef.current)) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      previouslyFocused?.focus?.();
    };
  }, [count, onClose]);

  const discount = discountPercent(product);
  const current = media[idx] ?? null;
  const orderMessage = `Olá Luiz! Vim pelo catálogo, tenho interesse em "${product.name}". Pode me passar mais informações?`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/70 p-0 sm:p-4" onClick={onClose}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-modal-title"
        tabIndex={-1}
        className="grid max-h-[100vh] w-full max-w-5xl grid-cols-1 overflow-y-auto overscroll-contain rounded-none bg-white shadow-2xl focus:outline-none sm:max-h-[92vh] sm:rounded-2xl md:grid-cols-2"
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
                    className="absolute left-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow hover:bg-white"
                    aria-label="Anterior"
                  >◀</button>
                  <button
                    onClick={() => setIdx((i) => (i + 1) % count)}
                    className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow hover:bg-white"
                    aria-label="Próxima"
                  >▶</button>
                  <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2">
                    {media.map((m, i) => (
                      <button
                        key={`${m.type}-${i}`}
                        onClick={() => setIdx(i)}
                        aria-label={`Mídia ${i + 1}`}
                        className="flex h-6 w-6 items-center justify-center"
                      >
                        <span className={`h-2 w-2 rounded-full ring-1 ring-zinc-400 ${i === idx ? "bg-indigo-600" : "bg-white/80"}`} />
                      </button>
                    ))}
                  </div>
                </>
              )}
              {discount !== null && (
                <span className="absolute left-3 top-3 rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white shadow">
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
        <div className="flex flex-col p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <h2 id="product-modal-title" className="text-xl font-bold tracking-tight text-zinc-900">{product.name}</h2>
            <button onClick={onClose} className="shrink-0 rounded-md p-1 text-zinc-400 hover:bg-zinc-100" aria-label="Fechar">✕</button>
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
            <div className="mt-1 text-2xl font-bold text-brand-indigo">{priceRange(product)}</div>
            {product.retailPrice && (
              <div className="mt-1 text-sm text-zinc-500">
                <span className="line-through">Preço varejo de referência: {formatPrice(product.retailPrice)}</span>
                {discount !== null && <span className="ml-2 font-medium text-emerald-700">({discount}% mais barato)</span>}
              </div>
            )}
            <div className="mt-3 text-xs font-medium text-zinc-600">Pedido mínimo: {product.minOrderQty} peças por modelo</div>
          </div>

          {descHtml && (
            <div
              className="rich-text mt-4 text-sm text-zinc-700"
              dangerouslySetInnerHTML={{ __html: descHtml }}
            />
          )}

          {product.sizes.length > 0 && (
            <div className="mt-5">
              <div className="text-xs font-semibold uppercase tracking-wide text-zinc-700">Tamanhos disponíveis</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {product.sizes.map((s) => (
                  <span key={s} className="rounded-md border border-zinc-400 bg-white px-3 py-1 text-sm font-semibold text-zinc-900">{s}</span>
                ))}
              </div>
            </div>
          )}

          {/* Confianca de compra */}
          <ul className="mt-5 space-y-1.5 text-sm text-zinc-700">
            <li className="flex items-start gap-2"><span className="text-emerald-600">✓</span> Direto da fábrica — Agreste/PE</li>
            {product.readyToShip ? (
              <li className="flex items-start gap-2"><span className="text-emerald-600">✓</span> Pronta-entrega — disponível pra envio imediato</li>
            ) : (
              <li className="flex items-start gap-2"><span className="text-amber-600">•</span> Sob encomenda — produção rápida</li>
            )}
            <li className="flex items-start gap-2"><span className="text-emerald-600">✓</span> Tira dúvidas e ajusta grade pelo WhatsApp</li>
          </ul>

          <div className="mt-auto pt-6">
            {luizWhatsapp ? (
              <a
                href={`https://wa.me/${luizWhatsapp}?text=${encodeURIComponent(orderMessage)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3.5 text-center text-base font-semibold text-white shadow-sm hover:bg-emerald-700"
              >
                <WhatsAppIcon className="h-5 w-5" />
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
