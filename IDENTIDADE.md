# ROTA Atacado — identidade e loja

> **Moda que conecta negócios.** A ROTA liga as fábricas do Polo de Confecções do
> Agreste pernambucano (Toritama, Santa Cruz do Capibaribe, Caruaru, Riacho das
> Almas) a lojas de moda de todo o Brasil.

Este documento registra **o porquê** de cada decisão de marca e de interface. Se
for mudar algo, mude aqui também.

---

## 1. Conceito

A logo é um **R cuja perna vira uma estrada**: três faixas de cobre que afinam
até um ponto de fuga. Todo o sistema visual sai daí.

| Ideia da marca | Como aparece na interface |
| --- | --- |
| A estrada (perna do R) | Componente `Estrada` — fundo do herói, do rodapé, da vitrine e do 404. Anima "pavimentando" ao carregar. |
| As faixas da rodovia | Separador `Faixas` (três barras inclinadas) na faixa das cidades; tracejado ligando os 4 passos de "Como comprar". |
| Papel preto da arte | Fundo **asfalto** e textura de grão finíssima (`.rota-grao`). |
| "A T A C A D O" espaçado | O chapéu de seção (`.rota-kicker`), sempre em cobre, caixa alta, 0,32em de espaçamento. |
| Filetes "—— ATACADO ——" | `.rota-filete` no chapéu do herói e no rodapé. |
| A viagem | Linguagem da loja inteira: "Escolha a sua rota", "A rota do pedido", "Próxima parada", "Última parada", "Essa página saiu da rota". |

## 2. Paleta

Cores **amostradas da arte original** (`src/img/logo-rota-original.jpeg`).
Contraste medido sobre o asfalto — a meta é WCAG 2.2 AA (4,5:1 texto comum).

| Token | Hex | Uso | Contraste |
| --- | --- | --- | --- |
| `asfalto` | `#070707` | Fundo | — |
| `carvao` / `grafite` / `pedra` | `#0f0e0d` / `#171614` / `#22201d` | Camadas (cards, faixas) | — |
| `creme` | `#EFE7DD` | Wordmark e texto principal | 16,4:1 |
| `creme-2` | `#C9C1B6` | Texto corrido | 11,3:1 |
| `nevoa` | `#8F887E` | Texto de apoio | 5,8:1 |
| `cobre` | `#C89775` | Estrada, destaques, botão principal | 7,8:1 |
| `cobre-claro` | `#E2BB98` | Preços e links | 11,3:1 |
| `cobre-escuro` | `#9A6C4E` | Acento no painel (fundo claro) | 4,5:1 sobre branco |
| `sinal` | `#7ECB9A` | Confirmação (mínimo atingido, pedido ok) | 10,5:1 |

Botão principal: texto **asfalto sobre cobre** (7,8:1). O verde do WhatsApp é
`#1a7f47` (texto branco a 5:1) — mais escuro que o oficial justamente pra passar AA.

## 3. Tipografia

- **Unbounded** (títulos, preços, números): a geometria larga e arredondada do
  "ROTA" da logo.
- **Jost** (texto e chapéus): o desenho limpo e o espaçamento do "ATACADO".
- **Geist** continua no painel (ferramenta interna, prioridade é densidade).

Só duas famílias na loja: cada fonte a mais custa tempo de carregamento. Tamanhos
fluidos com `clamp()` — o título do herói vai de 2,55rem (celular) a 5,4rem.

## 4. Arquivos da marca

Gerados por `node scripts/gerar-marca.mjs` a partir da arte original, em
`public/rota/`:

- `rota-clara*` — para fundo escuro (creme + cobre, com o brilho metálico
  preservado por "desmultiplicação" do fundo preto).
- `rota-tinta*` — para fundo claro (matte de cor sólida: o creme vira tinta
  escura e o cobre se mantém).
- `*-completa` com o slogan; `*-simbolo` só o R com a estrada.
- `icone-192/512`, `icone-maskable-512`, `apple-touch-icon`, `favicon-32/48`.
- `og.jpg` 1200×630 — imagem de compartilhamento (WhatsApp, redes).

A logo pode ser trocada no painel (**Marca**). Só upload próprio (`/uploads/...`)
conta como personalização; caminhos da marca antiga salvos no banco são
ignorados e caem na ROTA.

## 5. Arquitetura da loja

| Rota | O que é | Indexa? |
| --- | --- | --- |
| `/` | Home: herói, cidades, categorias (bento), novidades, como comprar, por que a ROTA, perguntas | sim |
| `/loja` | Vitrine com busca (`?q=`), ordem (`?ordem=`) e pronta-entrega (`?pronta=1`) | sim (busca: não) |
| `/loja/[categoria]` | Vitrine por categoria — página própria pra cada busca do Google | sim |
| `/produto/[id]` | Galeria, cor, grade por tamanho, mínimo por modelo | sim |
| `/carrinho` | "Meu pedido": revisão, dados da loja, envio | não |
| `/sobre` | História (editável no painel → Conteúdo) | sim |
| `/politica-de-privacidade`, `/termos` | LGPD e regras | sim |

Links antigos `/catalogo/publico` e `/catalogo/publico/:id` redirecionam (308)
para `/loja` e `/produto/:id` — a IA já mandou esses links pra clientes.

### Fluxo do pedido

1. O lojista monta a grade no produto (todas as cores de uma vez) → carrinho no
   navegador (`localStorage`, sincronizado entre abas).
2. Em "Meu pedido" o carrinho se confere com a vitrine (`GET /api/loja/conferir`):
   preço, nome e mínimo são atualizados, e peça/cor/tamanho que saiu fica
   marcado em vermelho — o envio só libera depois de resolvido.
3. `POST /api/loja/pedido` **grava o pedido antes do WhatsApp abrir**: recalcula
   preços no banco, confere tamanhos, cores e o mínimo por modelo e gera o código
   `RT-XXXXX`. Se algo mudou, devolve o ajuste de cada linha (409) ou quanto falta
   do mínimo (422) e o carrinho se corrige sozinho. O pedido é **vinculado** ao
   lead com o mesmo WhatsApp, mas não mexe nele: o número digitado no site não é
   verificado.
4. O lojista toca em "Abrir WhatsApp" com a mensagem pronta. Se o servidor
   falhar, o texto montado no navegador vai mesmo assim.
5. No painel, **Pedidos** mostra tudo. "Em atendimento" (a equipe confirmou o
   contato) move o lead para *Pedido feito* e tira a IA da conversa; "Fechado"
   promove o lead a *Cliente*.

## 6. Decisões de UX e conversão

- **Produto na cara**: a colagem do herói usa peças reais da vitrine; os números
  do herói (modelos, categorias) vêm do banco — nada de número inventado.
- **Mínimo visível e amigável**: barra de progresso "Faltam N para o mínimo do
  modelo", contando o que já está no carrinho.
- **"+1 de cada tamanho"**: um toque monta uma grade fechada — é como o lojista
  pensa.
- **Barra fixa no celular** na página de produto: preço + ação sempre ao alcance
  do polegar.
- **Sem cadastro, sem senha, sem pagamento no site** — fricção mínima; a venda
  fecha na conversa, que é como o atacado do polo funciona.
- **WhatsApp flutuante** some no produto e no pedido (lá a ação principal já é o
  WhatsApp; dois botões competindo confundem).
- **Honestidade**: nenhuma promessa de frete grátis, prazo ou depoimento
  fabricado. Perguntas frequentes respondem as objeções reais (mínimo, preço
  final, frete, pagamento, dados).

## 7. Técnica

- **SEO**: `metadataBase` pelo `PUBLIC_BASE_URL`; canonical em todas as páginas;
  Open Graph com a foto do produto; JSON-LD de `Organization`, `WebSite` +
  `SearchAction`, `FAQPage`, `BreadcrumbList`, `ItemList`/`CollectionPage` e
  `Product` com `AggregateOffer` (quantidade mínima, cliente revendedor); sitemap
  dinâmico com imagens; `robots.txt` fechando painel, API e carrinho.
- **PWA**: `manifest.webmanifest` com ícones normal e *maskable* e atalhos
  (Vitrine, Meu pedido).
- **Desempenho**: páginas renderizadas no servidor; JavaScript só nas ilhas
  interativas (topo, produto, carrinho, ordenação); imagens com largura/altura
  (sem salto de layout), `loading="lazy"` e `fetchpriority="high"` só no que
  entra no primeiro quadro; troca de foto no hover do card em CSS puro.
- **Movimento**: animações ligadas à rolagem (`animation-timeline: view()` /
  `scroll()`) sem JavaScript, dentro de `@supports` e de
  `prefers-reduced-motion: no-preference`. Sem suporte ou com movimento reduzido,
  o conteúdo simplesmente aparece.
- **Acessibilidade**: HTML semântico, "Pular para o conteúdo", foco visível em
  cobre, menu do celular em `<dialog>` (foco preso e Esc nativos), rótulos
  explícitos nos campos, `aria-live` nos avisos, carrossel navegável por teclado.
- **Segurança**: a API pública recalcula tudo no servidor, limita tentativas por
  IP (o nginx precisa enviar `X-Real-IP $remote_addr`), tem honeypot e lê o corpo
  com teto de 100 KB. Pedido pelo site nunca altera lead nem IA. Páginas do painel têm duas travas (proxy
  + layout); endereço desconhecido cai no 404 da loja, não no login.

## 8. Domínio

Tudo que depende do endereço (canonical, sitemap, links da IA, imagens de
compartilhamento) sai de `PUBLIC_BASE_URL`. Trocar de domínio = trocar essa
variável e reiniciar.
