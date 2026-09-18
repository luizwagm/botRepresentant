// /carrinho — "Meu pedido". O carrinho vive no navegador; esta página só
// entrega a casca e o número de WhatsApp da loja.
import type { Metadata } from "next";
import CarrinhoPagina from "@/components/loja/carrinho-pagina";
import { Container } from "@/components/loja/ui";
import { env } from "@/lib/env";
import { normalizeBrazilPhone } from "@/lib/phone";

export const metadata: Metadata = {
  title: "Meu pedido",
  description: "Revise as peças, informe os dados da sua loja e envie o pedido pelo WhatsApp.",
  // Página pessoal (cada navegador tem o seu carrinho): nada a indexar.
  robots: { index: false, follow: true },
  alternates: { canonical: "/carrinho" },
};

export default function PaginaCarrinho() {
  return (
    <Container className="pt-10 sm:pt-16">
      <p className="rota-kicker">Última parada</p>
      <h1 className="mt-4 font-display text-[clamp(2.2rem,5vw,3.8rem)] font-semibold leading-[1] tracking-[-0.04em] text-creme">
        Meu pedido
      </h1>
      <p className="mt-4 max-w-2xl text-[1.0625rem] leading-relaxed text-creme-2">
        Confira a grade de cada peça, diga quem é a sua loja e envie. O pedido fica registrado com um código e abre
        pronto no WhatsApp.
      </p>
      <CarrinhoPagina whatsappLoja={normalizeBrazilPhone(env.luizWhatsapp)} />
    </Container>
  );
}
