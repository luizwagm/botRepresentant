import Gallery from "./gallery";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Catálogo — Jeans Direto do Agreste",
};

export default async function GaleriaPublica() {
  const products = await prisma.product.findMany({
    where: { active: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="min-h-screen bg-white">
      <Gallery
        products={products.map((p) => ({
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
        }))}
        brandName={env.brandName}
        luizWhatsapp={env.luizWhatsapp}
      />
    </div>
  );
}
