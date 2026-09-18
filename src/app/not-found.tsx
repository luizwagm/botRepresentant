// 404 global — endereço que não existe em nenhuma área. Fica fora do layout da
// loja (que consulta o banco), então traz a própria marca e o fundo escuro.
import type { Metadata } from "next";
import Link from "next/link";
import BrandLogo from "@/components/brand-logo";
import ForaDaRota from "@/components/loja/fora-da-rota";

export const metadata: Metadata = { title: "Página não encontrada", robots: { index: false } };

export default function NaoEncontrado() {
  return (
    <div className="rota-loja min-h-screen">
      <header className="mx-auto flex h-20 max-w-[1320px] items-center px-5 sm:px-8">
        <Link href="/" aria-label="ROTA Atacado — página inicial">
          <BrandLogo size="sm" className="sm:h-9" />
        </Link>
      </header>
      <main>
        <ForaDaRota />
      </main>
    </div>
  );
}
