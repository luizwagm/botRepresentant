import Gallery from "./gallery";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { normalizeBrazilPhone } from "@/lib/phone";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Catálogo — L. Augusto Atacado",
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
          minOrderQty: p.minOrderQty,
          readyToShip: p.readyToShip,
        }))}
        brandName={env.brandName}
        luizWhatsapp={normalizeBrazilPhone(env.luizWhatsapp) ?? ""}
      />
    </div>
  );
}
