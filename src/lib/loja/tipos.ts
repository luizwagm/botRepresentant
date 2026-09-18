// Tipos da loja pública. Módulo neutro (servidor e navegador).

export type CorLoja = { nome: string; hex: string; imagem: string | null };

/** Produto como a loja enxerga — só o que é público (sem fornecedor, sem custo). */
export type ProdutoLoja = {
  id: string;
  nome: string;
  /** HTML do editor rico — SEMPRE renderizar sanitizado (RichContent). */
  descricao: string | null;
  imagens: string[];
  videos: string[];
  tamanhos: string[];
  precoMin: number | null;
  precoMax: number | null;
  precoVarejo: number | null;
  categorias: string[];
  cores: CorLoja[];
  /** Pedido mínimo, em peças, por modelo. */
  minimo: number;
  prontaEntrega: boolean;
  /** Cadastrado há pouco (selo "Novo"). */
  novo: boolean;
  atualizadoEm: string;
};

/** Tamanho "único" quando a peça não tem grade cadastrada. */
export const TAMANHO_UNICO = "UN";

/** Uma linha do pedido: um modelo numa cor, com a grade (tamanho → peças). */
export type ItemCarrinho = {
  /** produtoId + cor — o mesmo modelo em duas cores são duas linhas. */
  chave: string;
  produtoId: string;
  nome: string;
  imagem: string | null;
  cor: { nome: string; hex: string } | null;
  grade: Record<string, number>;
  minimo: number;
  precoMin: number | null;
  precoMax: number | null;
};

export type DadosLojista = {
  loja: string;
  contato: string;
  whatsapp: string;
  cidade: string;
  uf: string;
  cnpj: string;
  observacoes: string;
};

/** Dados atuais de uma peça do carrinho (GET /api/loja/conferir). */
export type PecaConferida = {
  nome: string;
  minimo: number;
  precoMin: number | null;
  precoMax: number | null;
  tamanhos: string[];
  cores: string[];
};

/** Ajuste que o servidor pede numa linha do carrinho (409 do envio). */
export type AjusteCarrinho = { chave: string; nome: string; remover: "tudo" | string[]; motivo: string };
