export type CityTarget = { name: string; state: string };

/**
 * Onda 1 — Nordeste fora do polo do Agreste (Caruaru/Toritama/Santa Cruz do Capibaribe).
 * Frete barato pra fabrica em Riacho das Almas, mercado familiarizado com jeans do Agreste.
 * Capitais e cidades-mercado de medio/grande porte com varejo de moda.
 */
export const ONDA_1_NORDESTE: CityTarget[] = [
  // Pernambuco (longe do polo)
  { name: "Recife", state: "PE" },
  { name: "Petrolina", state: "PE" },
  { name: "Garanhuns", state: "PE" },

  // Paraiba
  { name: "Joao Pessoa", state: "PB" },
  { name: "Campina Grande", state: "PB" },
  { name: "Patos", state: "PB" },

  // Rio Grande do Norte
  { name: "Natal", state: "RN" },
  { name: "Mossoro", state: "RN" },

  // Ceara
  { name: "Fortaleza", state: "CE" },
  { name: "Sobral", state: "CE" },
  { name: "Juazeiro do Norte", state: "CE" },
  { name: "Crato", state: "CE" },

  // Alagoas
  { name: "Maceio", state: "AL" },
  { name: "Arapiraca", state: "AL" },

  // Sergipe
  { name: "Aracaju", state: "SE" },
  { name: "Itabaiana", state: "SE" },

  // Bahia
  { name: "Salvador", state: "BA" },
  { name: "Feira de Santana", state: "BA" },
  { name: "Vitoria da Conquista", state: "BA" },
  { name: "Itabuna", state: "BA" },

  // Maranhao
  { name: "Sao Luis", state: "MA" },
  { name: "Imperatriz", state: "MA" },

  // Piaui
  { name: "Teresina", state: "PI" },
];
