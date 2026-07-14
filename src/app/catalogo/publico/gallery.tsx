"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import BrandLogo from "@/components/brand-logo";
import { PRODUCT_CATEGORIES } from "@/lib/categories";
import ProductView, {
  type PublicProduct,
  formatPrice,
  priceRange,
  discountPercent,
  orderMessageFor,
  WhatsAppIcon,
} from "@/components/product-view";

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
  const [activeCat, setActiveCat] = useState<string | null>(null);

  // Só aparecem categorias que têm ao menos 1 produto (ativo) cadastrado.
  const presentCategories = useMemo(
    () => PRODUCT_CATEGORIES.filter((c) => products.some((p) => p.categories.includes(c.slug))),
    [products],
  );
  const visibleProducts = useMemo(
    () => (activeCat ? products.filter((p) => p.categories.includes(activeCat)) : products),
    [products, activeCat],
  );

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

        {presentCategories.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-2" role="group" aria-label="Filtrar por categoria">
            <button
              type="button"
              onClick={() => setActiveCat(null)}
              aria-pressed={activeCat === null}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                activeCat === null
                  ? "border-brand-indigo bg-brand-indigo text-white"
                  : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
              }`}
            >
              Todos
            </button>
            {presentCategories.map((c) => (
              <button
                key={c.slug}
                type="button"
                onClick={() => setActiveCat(c.slug)}
                aria-pressed={activeCat === c.slug}
                className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                  activeCat === c.slug
                    ? "border-brand-indigo bg-brand-indigo text-white"
                    : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        )}

        {products.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-16 text-center text-zinc-500">
            Em breve: nosso catálogo de jeans direto do Agreste.
          </div>
        ) : visibleProducts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-12 text-center text-zinc-500">
            Nenhum produto nesta categoria.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {visibleProducts.map((p) => {
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
                    {p.colors.length > 0 && (
                      <>
                        <div className="mt-1.5 flex items-center gap-1" aria-hidden="true">
                          {p.colors.slice(0, 6).map((c, i) => (
                            <span key={i} className="h-3 w-3 rounded-full border border-zinc-300" style={{ backgroundColor: c.hex }} title={c.name} />
                          ))}
                          {p.colors.length > 6 && <span className="text-[10px] text-zinc-400">+{p.colors.length - 6}</span>}
                        </div>
                        <span className="sr-only">Cores: {p.colors.map((c) => c.name).join(", ")}</span>
                      </>
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
  }, [onClose]);

  const orderMessage = orderMessageFor(product.name);
  const titleId = useId();

  return (
    <div className="fixed inset-0 z-50 flex bg-zinc-900/70 sm:items-center sm:justify-center sm:p-4" onClick={onClose}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-white shadow-2xl focus:outline-none sm:h-auto sm:max-h-[90dvh] sm:max-w-5xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Fechar — sempre visível (o painel em si não rola) */}
        <button
          onClick={onClose}
          aria-label="Fechar"
          className="absolute right-3 top-3 z-30 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-lg leading-none text-zinc-700 shadow hover:bg-white"
        >✕</button>

        {/* Área rolável: conteúdo do produto */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          <ProductView product={product} titleId={titleId} className="md:h-full" />
        </div>

        {/* Rodapé fixo — CTA sempre visível */}
        <div className="shrink-0 border-t border-zinc-200 bg-white p-4">
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
          <Link
            href={`/catalogo/publico/${product.id}`}
            className="mt-2 block text-center text-xs text-zinc-400 hover:text-zinc-600"
          >
            Abrir página deste produto ↗
          </Link>
        </div>
      </div>
    </div>
  );
}
