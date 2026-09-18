// Dados estruturados (Schema.org) — é o que dá ao Google o nome da loja, a busca
// interna, o preço do produto e as perguntas frequentes direto no resultado.
// "<" vira <: um nome de produto com "</script>" não fecha a tag.
export default function JsonLd({ dados }: { dados: object | object[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(dados).replace(/</g, "\\u003c") }}
    />
  );
}
