"use client";

// Carrinho da loja: vive no navegador (localStorage), sincronizado entre abas.
//
// useSyncExternalStore exige que o snapshot seja a MESMA referência enquanto
// nada mudou — por isso o cache em memória. Devolver um array novo a cada
// leitura faria o React re-renderizar em loop.
import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { DadosLojista, ItemCarrinho } from "./tipos";
import { pecasDoItem } from "./formato";

const CHAVE = "rota:pedido:v1";
const CHAVE_LOJISTA = "rota:lojista:v1";
export const MAX_ITENS = 60;
const MAX_POR_TAMANHO = 9999;

const VAZIO: ItemCarrinho[] = [];
let cache: ItemCarrinho[] | null = null;
const ouvintes = new Set<() => void>();

/** O que vem do localStorage pode ter sido editado à mão: valida campo a campo. */
function validar(bruto: unknown): ItemCarrinho[] {
  if (!Array.isArray(bruto)) return [];
  const itens: ItemCarrinho[] = [];
  for (const x of bruto.slice(0, MAX_ITENS)) {
    if (!x || typeof x !== "object") continue;
    const o = x as Record<string, unknown>;
    if (typeof o.produtoId !== "string" || typeof o.nome !== "string") continue;
    const grade: Record<string, number> = {};
    if (o.grade && typeof o.grade === "object") {
      for (const [t, q] of Object.entries(o.grade as Record<string, unknown>)) {
        const n = Math.floor(Number(q));
        // Tamanho é texto livre no cadastro ("Tamanho único", "G1 plus"...): limite folgado.
        if (t.length <= 40 && Number.isFinite(n) && n > 0) grade[t] = Math.min(n, MAX_POR_TAMANHO);
      }
    }
    if (Object.keys(grade).length === 0) continue;
    const cor =
      o.cor && typeof o.cor === "object" && typeof (o.cor as { nome?: unknown }).nome === "string"
        ? { nome: String((o.cor as { nome: string }).nome), hex: String((o.cor as { hex?: string }).hex ?? "#999999") }
        : null;
    const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
    itens.push({
      chave: `${o.produtoId}::${cor?.nome ?? ""}`,
      produtoId: o.produtoId,
      nome: o.nome.slice(0, 160),
      imagem: typeof o.imagem === "string" ? o.imagem : null,
      cor,
      grade,
      minimo: Math.max(1, Math.floor(num(o.minimo) ?? 1)),
      precoMin: num(o.precoMin),
      precoMax: num(o.precoMax),
    });
  }
  return itens;
}

function ler(): ItemCarrinho[] {
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(CHAVE);
    cache = raw ? validar(JSON.parse(raw)) : VAZIO;
  } catch {
    cache = VAZIO; // modo privado, armazenamento bloqueado, JSON corrompido
  }
  return cache;
}

function gravar(itens: ItemCarrinho[]) {
  cache = itens.length ? itens : VAZIO;
  try {
    window.localStorage.setItem(CHAVE, JSON.stringify(itens));
  } catch {
    /* sem armazenamento: o carrinho vale só nesta aba */
  }
  ouvintes.forEach((f) => f());
}

function assinar(f: () => void) {
  ouvintes.add(f);
  // Outra aba mexeu no carrinho: invalida o cache e avisa.
  const aoMudar = (e: StorageEvent) => {
    if (e.key === CHAVE) {
      cache = null;
      f();
    }
  };
  window.addEventListener("storage", aoMudar);
  return () => {
    ouvintes.delete(f);
    window.removeEventListener("storage", aoMudar);
  };
}

export function useCarrinho() {
  const itens = useSyncExternalStore(assinar, ler, () => VAZIO);

  /** false = o pedido já tem o máximo de linhas (modelo+cor) e esta não coube. */
  const adicionar = useCallback((novo: Omit<ItemCarrinho, "chave">): boolean => {
    const chave = `${novo.produtoId}::${novo.cor?.nome ?? ""}`;
    const atual = ler();
    const existente = atual.find((i) => i.chave === chave);
    if (existente) {
      // Mesmo modelo e cor: SOMA a grade em vez de duplicar a linha — e renova
      // nome, preço e mínimo com o que a página mostra agora.
      const grade = { ...existente.grade };
      for (const [t, q] of Object.entries(novo.grade)) grade[t] = Math.min((grade[t] ?? 0) + q, MAX_POR_TAMANHO);
      gravar(atual.map((i) => (i.chave === chave ? { ...i, ...novo, chave, grade } : i)));
      return true;
    }
    if (atual.length >= MAX_ITENS) return false;
    gravar([...atual, { ...novo, chave }]);
    return true;
  }, []);

  const definirQuantidade = useCallback((chave: string, tamanho: string, qtd: number) => {
    const n = Math.max(0, Math.min(MAX_POR_TAMANHO, Math.floor(qtd) || 0));
    const atual = ler();
    const proximos = atual
      .map((i) => {
        if (i.chave !== chave) return i;
        const grade = { ...i.grade };
        if (n === 0) delete grade[tamanho];
        else grade[tamanho] = n;
        return { ...i, grade };
      })
      .filter((i) => Object.keys(i.grade).length > 0);
    gravar(proximos);
  }, []);

  const remover = useCallback((chave: string) => gravar(ler().filter((i) => i.chave !== chave)), []);

  /** Renova nome, preço e mínimo por MODELO com dados atuais do servidor (só grava se mudou). */
  const atualizarModelos = useCallback(
    (dados: Record<string, Partial<Pick<ItemCarrinho, "nome" | "minimo" | "precoMin" | "precoMax">>>) => {
      const atual = ler();
      let mudou = false;
      const proximos = atual.map((i) => {
        const d = dados[i.produtoId];
        if (!d) return i;
        // Campo a campo: o que vier a mais em `dados` (tamanhos, cores...) não entra no carrinho.
        const novo: ItemCarrinho = {
          ...i,
          nome: d.nome ?? i.nome,
          minimo: Math.max(1, d.minimo ?? i.minimo),
          precoMin: d.precoMin !== undefined ? d.precoMin : i.precoMin,
          precoMax: d.precoMax !== undefined ? d.precoMax : i.precoMax,
        };
        if (
          novo.nome !== i.nome ||
          novo.minimo !== i.minimo ||
          novo.precoMin !== i.precoMin ||
          novo.precoMax !== i.precoMax
        ) {
          mudou = true;
          return novo;
        }
        return i;
      });
      if (mudou) gravar(proximos);
    },
    [],
  );
  const limpar = useCallback(() => gravar([]), []);

  const pecas = useMemo(() => itens.reduce((s, i) => s + pecasDoItem(i), 0), [itens]);
  const modelos = useMemo(() => new Set(itens.map((i) => i.produtoId)).size, [itens]);

  return { itens, pecas, modelos, adicionar, definirQuantidade, remover, limpar, atualizarModelos };
}

// ---------------------------------------------------------------------------
//  Dados do lojista: lembrados pra próxima compra (conveniência, não cadastro).
// ---------------------------------------------------------------------------
export const LOJISTA_VAZIO: DadosLojista = {
  loja: "", contato: "", whatsapp: "", cidade: "", uf: "", cnpj: "", observacoes: "",
};

export function lerLojista(): DadosLojista {
  try {
    const raw = window.localStorage.getItem(CHAVE_LOJISTA);
    if (!raw) return LOJISTA_VAZIO;
    const o = JSON.parse(raw) as Partial<DadosLojista>;
    const s = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");
    return {
      loja: s(o.loja, 120), contato: s(o.contato, 80), whatsapp: s(o.whatsapp, 20),
      cidade: s(o.cidade, 80), uf: s(o.uf, 2), cnpj: s(o.cnpj, 20),
      observacoes: "", // observação é do pedido, não se repete
    };
  } catch {
    return LOJISTA_VAZIO;
  }
}

export function lembrarLojista(d: DadosLojista) {
  try {
    const { observacoes: _obs, ...resto } = d;
    void _obs;
    window.localStorage.setItem(CHAVE_LOJISTA, JSON.stringify(resto));
  } catch {
    /* ok */
  }
}

export function esquecerLojista() {
  try {
    window.localStorage.removeItem(CHAVE_LOJISTA);
  } catch {
    /* ok */
  }
}
