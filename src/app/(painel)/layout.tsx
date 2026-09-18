import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getBrand } from "@/lib/brand";
import SiteHeader from "@/components/site-header";

// O painel é ferramenta interna: fora do Google.
export const metadata: Metadata = {
  title: { default: "Painel", template: "%s · Painel ROTA" },
  robots: { index: false, follow: false },
};

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const me = await getCurrentUser();
  // Segunda trava (a primeira é o proxy): nenhuma página do painel abre sem
  // login, mesmo que alguém esqueça de listá-la em PAINEL_PREFIXES.
  const caminho = (await headers()).get("x-rota-caminho") ?? "";
  if (!me && caminho && caminho !== "/login") {
    redirect(`/login?next=${encodeURIComponent(caminho)}`);
  }
  const brand = await getBrand();
  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 font-sans text-zinc-900">
      <SiteHeader me={me ? { email: me.email, role: me.role, name: me.name } : null} brand={brand} />
      <main className="flex-1">{children}</main>
    </div>
  );
}
