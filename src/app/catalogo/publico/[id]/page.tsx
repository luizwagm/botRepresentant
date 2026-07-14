import type { Metadata } from "next";
import { cache } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { normalizeBrazilPhone } from "@/lib/phone";
import { readColors } from "@/lib/product-colors";
import BrandLogo from "@/components/brand-logo";
import ProductView, { type PublicProduct, WhatsAppIcon } from "@/components/product-view";
import { orderMessageFor } from "@/lib/order-message";

export const dynamic = "force-dynamic";

// cache() deduplica por request: generateMetadata e a página compartilham 1 query.
const getProduct = cache((id: string) => prisma.product.findUnique({ where: { id } }));

function plainText(html: string | null): string {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const p = await getProduct(id);
  if (!p || !p.active) return { title: "Produto — L. Augusto Atacado" };
  const desc = plainText(p.description).slice(0, 180) || "Jeans direto da fábrica do Agreste — atacado para lojas.";
  const image = p.images[0];
  return {
    title: `${p.name} — L. Augusto Atacado`,
    description: desc,
    openGraph: {
      title: p.name,
      description: desc,
      type: "website",
      images: image ? [{ url: image }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title: p.name,
      description: desc,
      images: image ? [image] : [],
    },
  };
}

export default async function ProdutoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await getProduct(id);
  if (!p || !p.active) notFound();

  const product: PublicProduct = {
    id: p.id,
    name: p.name,
    description: p.description,
    images: p.images,
    videos: p.videos,
    sizes: p.sizes,
    wholesalePriceMin: p.wholesalePriceMin,
    wholesalePriceMax: p.wholesalePriceMax,
    retailPrice: p.retailPrice,
    tags: p.tags,
    categories: p.categories,
    colors: readColors(p.colors),
    minOrderQty: p.minOrderQty,
    readyToShip: p.readyToShip,
  };
  const luizWhatsapp = normalizeBrazilPhone(env.luizWhatsapp) ?? "";
  const orderMessage = orderMessageFor(product.name);

  return (
    <div className="min-h-screen bg-white">
      <h1 className="sr-only">{product.name}</h1>
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-4 sm:px-6">
          <Link href="/catalogo/publico" aria-label="L. Augusto Atacado — catálogo">
            <BrandLogo variant="full" size="sm" />
          </Link>
          {luizWhatsapp && (
            <a
              href={`https://wa.me/${luizWhatsapp}?text=${encodeURIComponent("Olá Luiz, vim pelo catálogo. Pode me passar mais informações?")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              <WhatsAppIcon className="h-4 w-4" />
              Falar no WhatsApp
            </a>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 py-6 sm:px-6">
        <Link href="/catalogo/publico" className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-800">
          ← Voltar ao catálogo
        </Link>
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <ProductView product={product} />
          <div className="border-t border-zinc-200 bg-white p-4 sm:p-5">
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
      </main>
    </div>
  );
}
