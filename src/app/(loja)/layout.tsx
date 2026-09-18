// Casca da loja pública: topo, rodapé e o atalho do WhatsApp em volta de todas
// as páginas de (loja). O painel tem a sua própria casca em (painel).
import type { ReactNode } from "react";
import Cabecalho from "@/components/loja/cabecalho";
import Rodape from "@/components/loja/rodape";
import WhatsappFlutuante from "@/components/loja/whatsapp-flutuante";
import { getBrand } from "@/lib/brand";
import { env } from "@/lib/env";
import { categoriasComProduto } from "@/lib/loja/catalogo";
import { normalizeBrazilPhone } from "@/lib/phone";

// Estoque e preço mudam pelo painel a qualquer hora: nada de página congelada no build.
export const dynamic = "force-dynamic";

export default async function LojaLayout({ children }: { children: ReactNode }) {
  const [categorias, brand] = await Promise.all([
    // Banco fora do ar não pode derrubar a loja inteira: o menu só perde as categorias.
    categoriasComProduto().catch((e) => {
      console.error("loja: falha ao ler categorias:", e instanceof Error ? e.message : e);
      return [];
    }),
    getBrand(),
  ]);
  const whatsapp = normalizeBrazilPhone(env.luizWhatsapp);

  return (
    <div className="rota-loja flex min-h-screen flex-col">
      <a
        href="#conteudo"
        className="sr-only z-[60] rounded-full bg-cobre px-5 py-3 font-medium text-asfalto focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Pular para o conteúdo
      </a>
      <Cabecalho logoUrl={brand.logoUrl} categorias={categorias} />
      <main id="conteudo" tabIndex={-1} className="flex-1 focus:outline-none">
        {children}
      </main>
      <Rodape logoUrl={brand.logoUrl} categorias={categorias} whatsapp={whatsapp} />
      <WhatsappFlutuante numero={whatsapp} />
    </div>
  );
}
