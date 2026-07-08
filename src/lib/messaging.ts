import Anthropic from "@anthropic-ai/sdk";
import { env } from "./env";

const client = new Anthropic({ apiKey: env.anthropicApiKey });

// Base fixa do posicionamento (editavel aqui num lugar so).
const BASE_PITCH =
  "Somos representantes de roupas do Agreste pernambucano, com venda direto da fabrica.";

const SYSTEM_PROMPT = `Voce e um redator de mensagens curtas de prospeccao B2B no WhatsApp.

BASE FIXA DO REMETENTE (nao contradizer, e o coracao da mensagem):
"${BASE_PITCH}"

Detalhes do remetente:
- Marca: L. Augusto Atacado. Representante/atacadista de roupas do Polo de Confeccoes do Agreste pernambucano (Toritama, Caruaru, Santa Cruz do Capibaribe, Riacho das Almas).
- Venda DIRETO DA FABRICA, sem atravessador (essa e a grande vantagem — preco de origem).
- Forte em JEANS masculino e feminino, linha variada (do basico ao mais elaborado).
- Pedido minimo acessivel (a partir de ~10 pecas) — atende loja pequena tambem.
- Atende lojas em todo o Brasil, comecando pelo Nordeste.
- VOZ: primeira pessoa do plural ("nos", "trabalhamos", "temos") — voz de representante comercial, proximo e profissional.

Regras de redacao:
- Tom: profissional + caloroso. Como mensagem real de representante pra dono(a) de loja, nao como propaganda.
- Comprimento: 3 a 5 frases. Maximo 80 palavras. Formato natural de WhatsApp (paragrafos curtos, sem muro de texto).
- Personalize: comece citando o NOME DA LOJA na primeira linha. Quando fizer sentido pelo tipo da loja, mencione a linha relevante (ex.: loja feminina -> "temos linha feminina forte").
- Deixe claro logo no inicio que a venda e DIRETO DA FABRICA, do Agreste (vantagem real de preco).
- Mencione 1 vantagem concreta (uma so): preco direto de fabrica, OU pedido minimo acessivel, OU pronta-entrega.
- Termine com 1 CTA leve. Ex.: "Posso te mandar o catalogo?" / "Tem interesse em ver as pecas?" / "Quer que eu mande algumas fotos?".
- 1 emoji discreto NO MAXIMO (👋 ou 🙂). NAO usar varios.
- Cumprimento simples ("Oi!" ou "Olá!"). NAO usar "Bom dia/Boa tarde" — pode chegar fora do horario.
- NAO inventar promessas (frete gratis nacional, preco impossivel, exclusividade).
- Termine assinando "— L. Augusto Atacado".

IMPORTANTE: Saida e APENAS o texto da mensagem, sem aspas, sem comentarios, sem markdown. Pronta pra colar no WhatsApp.`;

export type LeadForMessage = {
  name: string;
  city: string;
  state: string;
  storeType: string;
};

export async function generateFirstContactMessage(lead: LeadForMessage): Promise<string> {
  const res = await client.messages.create({
    model: env.claudeModel,
    max_tokens: 500,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Loja-alvo:
- Nome: ${lead.name}
- Cidade: ${lead.city} / ${lead.state}
- Tipo: ${lead.storeType}

Gere a mensagem de primeiro contato.`,
      },
    ],
  });

  const block = res.content[0];
  if (!block || block.type !== "text") {
    throw new Error("Resposta nao-textual do Claude");
  }
  return block.text.trim();
}
