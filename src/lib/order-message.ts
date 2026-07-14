// Mensagem de pedido do WhatsApp — funcao pura, usada tanto no SERVIDOR
// (pagina /catalogo/publico/[id]) quanto no CLIENTE (modal do catalogo).
// Precisa viver fora de um modulo "use client": chamar uma funcao de modulo
// cliente a partir de um server component lanca erro de RSC em runtime.
export function orderMessageFor(name: string): string {
  return `Olá Luiz! Vim pelo catálogo, tenho interesse em "${name}". Pode me passar mais informações?`;
}
