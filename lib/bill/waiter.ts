/**
 * Apelidos de garçom: dão nome ao garçom do cupom e o vocativo do botão
 * "fecha para mim".
 */
export const WAITER_NICKNAMES = [
  "Consagrado",
  "Patrão",
  "Chefia",
  "Nobre",
  "Camarada",
  "Chapa",
  "Amigão",
  "Príncipe",
  "Rei",
  "Guerreiro",
  "Campeão",
  "Comandante",
  "Mestre",
  "Doutor",
  "Chefe",
  "Abençoado",
  "Craque",
  "Digníssimo",
  "Distinto",
  "Referência",
  "Relíquia",
  "Motor V8",
  "Lorde Supremo",
  "Marquês do Atendimento",
  "Grão-Mestre do Salão",
  "Marechal da Mesa",
  "Secretário do Gelo",
  "Diplomata do Copo",
  "Camisa 10",
  "Artilheiro",
  "Bola de Ouro",
  "Maestro",
  "Ponta de lança",
  "Canhotinha de Ouro",
  "Bruxo",
  "Mestre Yoda",
  "Jorge Ben",
  "Cauã Reymond",
  "James Bond",
  "Brad Pitt",
  "Guardião das Geladas",
] as const;

export type WaiterNickname = (typeof WAITER_NICKNAMES)[number];

/**
 * Garçom do cupom, derivado do id da conta: o mesmo pra todo participante e
 * em qualquer renderização, sem coluna no banco. Mudar a lista muda o
 * garçom das contas antigas — aceito, é só flavor.
 */
export function waiterForBill(billId: string): WaiterNickname {
  // FNV-1a 32 bits
  let hash = 0x811c9dc5;
  for (let i = 0; i < billId.length; i++) {
    hash ^= billId.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return WAITER_NICKNAMES[(hash >>> 0) % WAITER_NICKNAMES.length];
}
