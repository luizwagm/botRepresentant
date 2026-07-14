import Link from "next/link";
import CatalogoAdmin from "./catalogo-admin";

export const dynamic = "force-dynamic";

export default function CatalogoPage() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Catálogo (admin)</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Cadastre suas peças. A galeria pública aparece em <Link href="/catalogo/publico" className="text-indigo-600 hover:underline">/catalogo/publico</Link>.
        </p>
      </div>
      <CatalogoAdmin />
    </div>
  );
}
