"use client";

// Atalho de atendimento sempre à mão. Some no produto e no pedido: lá o botão
// principal já leva ao WhatsApp, e dois botões disputando o polegar confundem.
import { usePathname } from "next/navigation";
import { WhatsAppIcon } from "@/components/whatsapp-icon";
import { linkWhatsapp } from "@/lib/loja/formato";
import { ROTAS, SITE } from "@/lib/site";

export default function WhatsappFlutuante({ numero }: { numero: string | null }) {
  const pathname = usePathname() ?? "/";
  if (!numero) return null;
  if (pathname.startsWith("/produto/") || pathname === ROTAS.carrinho) return null;

  return (
    <a
      href={linkWhatsapp(numero, `Olá! Vim pelo site da ${SITE.nome} e quero atendimento para a minha loja.`)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Falar com a ROTA no WhatsApp"
      // Verde mais escuro que o oficial: texto branco a 5:1 (AA).
      className="group fixed bottom-5 right-5 z-40 flex h-14 items-center rounded-full bg-[#1a7f47] px-4 text-white shadow-[0_18px_40px_-12px_rgba(26,127,71,.7)] ring-1 ring-white/10 transition-transform duration-300 hover:-translate-y-0.5 sm:bottom-7 sm:right-7"
    >
      <WhatsAppIcon className="h-6 w-6 shrink-0" />
      <span className="max-w-0 overflow-hidden whitespace-nowrap text-sm font-medium transition-[max-width,margin] duration-500 group-hover:ml-2 group-hover:max-w-[12rem] group-focus-visible:ml-2 group-focus-visible:max-w-[12rem]">
        Fale com a gente
      </span>
    </a>
  );
}
