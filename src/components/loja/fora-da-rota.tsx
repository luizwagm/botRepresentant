// Conteúdo do 404 — "saiu da rota". Usado dentro da loja (com topo e rodapé) e
// no 404 global (endereço que não existe em lugar nenhum).
import Estrada from "./estrada";
import { BotaoLink, Container } from "./ui";

export default function ForaDaRota() {
  return (
    <section className="relative isolate overflow-hidden">
      <Estrada className="absolute inset-x-0 bottom-0 -z-10 h-[70%] w-full opacity-40" intensidade={0.7} />
      <Container className="flex min-h-[62vh] flex-col items-start justify-center py-24">
        <p className="rota-kicker rota-filete">Erro 404</p>
        <h1 className="mt-6 max-w-3xl font-display text-[clamp(2.4rem,6vw,5rem)] font-semibold leading-[1] tracking-[-0.04em] text-creme">
          Essa página saiu da <span className="text-cobre">rota</span>.
        </h1>
        <p className="mt-6 max-w-lg text-[1.0625rem] leading-relaxed text-creme-2">
          O endereço pode ter mudado ou a peça saiu da vitrine. A estrada continua — é só voltar por aqui.
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          <BotaoLink href="/loja" seta>
            Ver a vitrine
          </BotaoLink>
          <BotaoLink href="/" variante="contorno">
            Página inicial
          </BotaoLink>
        </div>
      </Container>
    </section>
  );
}
