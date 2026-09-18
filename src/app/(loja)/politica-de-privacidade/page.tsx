// Política de privacidade (LGPD — Lei 13.709/2018). Descreve SÓ o que o sistema
// faz de verdade: formulário do pedido, IP do pedido, armazenamento no aparelho
// e a prospecção de lojas por contato comercial público.
import type { Metadata } from "next";
import Link from "next/link";
import PaginaTexto from "@/components/loja/pagina-texto";
import { env } from "@/lib/env";
import { linkWhatsapp, telefoneVisivel } from "@/lib/loja/formato";
import { normalizeBrazilPhone } from "@/lib/phone";
import { ROTAS, SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Política de privacidade",
  description: `Como a ${SITE.nome} coleta, usa e protege os dados de quem compra na loja, conforme a LGPD.`,
  alternates: { canonical: ROTAS.privacidade },
};

const SECOES = [
  { id: "quem", titulo: "Quem somos" },
  { id: "dados", titulo: "Que dados usamos" },
  { id: "uso", titulo: "Para que usamos" },
  { id: "aparelho", titulo: "O que fica no seu aparelho" },
  { id: "prospeccao", titulo: "Contato com lojas" },
  { id: "compartilhamento", titulo: "Compartilhamento" },
  { id: "guarda", titulo: "Por quanto tempo" },
  { id: "direitos", titulo: "Seus direitos" },
];

export default function Privacidade() {
  const zap = normalizeBrazilPhone(env.luizWhatsapp);
  const contato = zap ? (
    <a href={linkWhatsapp(zap, "Olá! Tenho uma solicitação sobre os meus dados (LGPD).")} target="_blank" rel="noopener noreferrer">
      WhatsApp {telefoneVisivel(zap)}
    </a>
  ) : (
    "o nosso WhatsApp de atendimento"
  );

  return (
    <PaginaTexto kicker="Transparência" titulo="Política de privacidade" atualizado="18 de setembro de 2026" secoes={SECOES}>
      <h2 id="quem">Quem somos</h2>
      <p>
        A <strong>{SITE.nome}</strong> reúne peças de fábricas do {SITE.regiao} e atende lojistas de todo o Brasil. Esta
        política explica, em linguagem simples, o que fazemos com os dados de quem usa este site — conforme a Lei
        Geral de Proteção de Dados (LGPD, Lei nº 13.709/2018). Para qualquer assunto sobre dados, fale com a gente pelo{" "}
        {contato}.
      </p>

      <h2 id="dados">Que dados usamos</h2>
      <p>Navegar pela vitrine não exige cadastro. Só coletamos dados quando você envia um pedido:</p>
      <ul>
        <li>nome da loja, seu nome e o seu WhatsApp;</li>
        <li>cidade, estado e CNPJ — se você informar;</li>
        <li>as peças, quantidades e observações do pedido;</li>
        <li>o endereço IP de onde o pedido saiu, usado só para segurança e para evitar abuso.</li>
      </ul>
      <p>Não usamos ferramentas de rastreamento de anúncios nem vendemos dados.</p>

      <h2 id="uso">Para que usamos</h2>
      <ul>
        <li>registrar e atender o seu pedido: confirmar disponibilidade, frete e pagamento;</li>
        <li>falar com você pelo WhatsApp sobre esse pedido;</li>
        <li>manter o histórico de compras da sua loja, para os próximos atendimentos.</li>
      </ul>
      <p>
        A base legal é a execução de procedimentos a pedido do titular e do contrato de compra (art. 7º, V, da LGPD) e o
        legítimo interesse em manter o site seguro (art. 7º, IX).
      </p>

      <h2 id="aparelho">O que fica no seu aparelho</h2>
      <p>
        O seu pedido em montagem fica guardado <strong>no próprio navegador</strong> (armazenamento local), para não se
        perder se você fechar a página. Se você marcar a opção, os dados da loja também ficam salvos ali, para o
        próximo pedido. Nada disso é enviado para nós antes de você clicar em enviar, e você pode apagar a qualquer
        momento limpando os dados do site no navegador. O site não usa cookies de publicidade.
      </p>

      <h2 id="prospeccao">Contato com lojas</h2>
      <p>
        A ROTA também procura lojas de moda que possam se interessar pelas nossas peças, a partir de{" "}
        <strong>dados comerciais públicos</strong> (nome, cidade e telefone divulgados pela própria loja em mapas e
        perfis). Com base no legítimo interesse, podemos enviar uma mensagem de apresentação pelo WhatsApp. Se você não
        quiser mais receber, é só responder pedindo para parar — o número sai da lista e não volta a ser
        contatado.
      </p>
      <p>
        As primeiras respostas dessas conversas podem ser escritas com a ajuda de um assistente de inteligência
        artificial, sempre com a equipe acompanhando. Quando você faz um pedido, o atendimento passa a ser feito por
        pessoas.
      </p>

      <h2 id="compartilhamento">Compartilhamento</h2>
      <p>
        Os dados do pedido são vistos pela equipe da ROTA e, quando necessário para cumprir o pedido, pela fábrica da
        peça e pela transportadora combinada com você. Também passam por fornecedores de tecnologia que fazem o site e
        o atendimento funcionarem (hospedagem e o assistente de mensagens), só para essa finalidade. Não repassamos
        dados para fins de publicidade.
      </p>

      <h2 id="guarda">Por quanto tempo</h2>
      <p>
        Guardamos os dados do pedido enquanto houver relação comercial com a sua loja e pelo prazo exigido pela
        legislação fiscal e de defesa do consumidor. Depois disso, eles são apagados ou anonimizados.
      </p>

      <h2 id="direitos">Seus direitos</h2>
      <p>
        Você pode pedir, a qualquer momento: confirmação e acesso aos seus dados, correção, anonimização ou exclusão,
        informação sobre com quem compartilhamos e a revogação de um consentimento. Basta falar com a gente pelo{" "}
        {contato}. Se preferir, também pode procurar a Autoridade Nacional de Proteção de Dados (ANPD).
      </p>
      <p>
        Veja também os <Link href={ROTAS.termos}>termos de uso</Link>.
      </p>
    </PaginaTexto>
  );
}
