// Contrato do canal de envio. O motor fala com esta interface, nunca com o
// Baileys direto — assim o app Next.js nao precisa importar a biblioteca do
// WhatsApp (que so roda no worker) e da pra testar o motor sem canal real.
export type SendResult = {
  externalId: string | null;
  /**
   * Numero que REALMENTE recebeu (o WhatsApp pode ter a conta registrada numa
   * variante diferente da que pedimos — o nono digito brasileiro). O motor usa
   * isso pra corrigir o cadastro do lead.
   */
  deliveredTo?: string | null;
};

export type Channel = {
  /** Nome pra log ("whatsapp", "seco"...). */
  name: string;
  /** Sessao conectada e pronta pra enviar? */
  isReady(): boolean;
  /** Envia. `to` e E.164 sem "+" (ex.: 5581999998888). */
  send(to: string, text: string): Promise<SendResult>;
};

/** Canal que nao envia nada — usado quando a automacao roda em modo seco. */
export const dryChannel: Channel = {
  name: "seco",
  isReady: () => true,
  async send(to: string) {
    return { externalId: null, deliveredTo: to };
  },
};
