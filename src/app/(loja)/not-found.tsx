// 404 dentro da loja (produto que saiu da vitrine, categoria inexistente):
// mantém topo e rodapé, então o lojista não fica sem saída.
import ForaDaRota from "@/components/loja/fora-da-rota";

export default function NaoEncontradoLoja() {
  return <ForaDaRota />;
}
