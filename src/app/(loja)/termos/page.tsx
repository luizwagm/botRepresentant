// Termos de uso — as regras do jogo da loja, sem letra miúda: o site monta e
// registra o pedido; preço final, frete e pagamento são confirmados no WhatsApp.
import type { Metadata } from "next";
import Link from "next/link";
import PaginaTexto from "@/components/loja/pagina-texto";
import { ROTAS, SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Termos de uso",
  description: `Como funcionam os pedidos na ${SITE.nome}: preços de atacado, pedido mínimo, confirmação e envio.`,
  alternates: { canonical: ROTAS.termos },
};

const SECOES = [
  { id: "site", titulo: "O que é este site" },
  { id: "pedido", titulo: "Como funciona o pedido" },
  { id: "precos", titulo: "Preços e pedido mínimo" },
  { id: "fotos", titulo: "Fotos e cores" },
  { id: "pagamento", titulo: "Pagamento, frete e troca" },
  { id: "uso", titulo: "Uso do site" },
  { id: "mudancas", titulo: "Mudanças" },
];

export default function Termos() {
  return (
    <PaginaTexto kicker="Regras claras" titulo="Termos de uso" atualizado="18 de setembro de 2026" secoes={SECOES}>
      <h2 id="site">O que é este site</h2>
      <p>
        A <strong>{SITE.nome}</strong> apresenta peças de fábricas do {SITE.regiao} para venda no atacado a lojistas e
        revendedores. O site serve para você conhecer as peças e montar o pedido; a negociação é concluída com a nossa
        equipe pelo WhatsApp.
      </p>

      <h2 id="pedido">Como funciona o pedido</h2>
      <ul>
        <li>Você escolhe as peças, as cores e as quantidades por tamanho.</li>
        <li>Ao enviar, o pedido é registrado com um código e a mensagem abre pronta no WhatsApp.</li>
        <li>
          O envio pelo site <strong>não é uma compra fechada</strong>: a equipe confirma disponibilidade, valor final,
          frete e prazo com você. A compra só se conclui quando os dois lados concordam.
        </li>
      </ul>

      <h2 id="precos">Preços e pedido mínimo</h2>
      <p>
        Os preços exibidos são de atacado, por peça, e servem de referência para montar o pedido. Podem mudar sem aviso
        até a confirmação no atendimento. Cada modelo tem um pedido mínimo de peças, indicado na página do produto e
        contado por modelo — somando todas as cores e tamanhos escolhidos.
      </p>

      <h2 id="fotos">Fotos e cores</h2>
      <p>
        Fazemos o possível para as fotos mostrarem a peça como ela é, mas a cor pode variar um pouco conforme a tela e a
        lavagem de cada lote. Na dúvida, peça no WhatsApp uma foto ou vídeo da peça antes de fechar.
      </p>

      <h2 id="pagamento">Pagamento, frete e troca</h2>
      <p>
        Nenhum pagamento é feito pelo site. Forma de pagamento, frete, prazo de envio e as condições de troca por defeito
        de fabricação são combinados no atendimento, antes de fechar o pedido, e valem como parte do acordo entre a sua
        loja e a ROTA.
      </p>

      <h2 id="uso">Uso do site</h2>
      <p>
        Fotos, textos e marca deste site pertencem à ROTA ou às fábricas parceiras. Você pode compartilhar os links das
        peças à vontade; não é permitido copiar o conteúdo para outros sites ou catálogos sem autorização. O tratamento
        de dados está descrito na <Link href={ROTAS.privacidade}>política de privacidade</Link>.
      </p>

      <h2 id="mudancas">Mudanças</h2>
      <p>
        Estes termos podem ser atualizados para acompanhar a loja. A data no topo da página mostra a versão em vigor. O
        pedido já confirmado segue as condições combinadas no momento da confirmação.
      </p>
    </PaginaTexto>
  );
}
