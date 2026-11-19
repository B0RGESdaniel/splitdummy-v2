/**
 * Apelidos de garçom — lista provisória, a definitiva vem depois. Também
 * vai alimentar o vocativo do botão "fecha para mim" (Fase 3, B4).
 */
export const WAITER_NICKNAMES = [
  "Chefe",
  "Patrão",
  "Campeão",
  "Amigão",
  "Mestre",
] as const;

/**
 * Garçom do cupom, derivado do id da conta: o mesmo pra todo participante e
 * em qualquer renderização, sem coluna no banco. Mudar a lista muda o
 * garçom das contas antigas — aceito, é só flavor.
 */
export function waiterForBill(billId: string): string {
  // FNV-1a 32 bits
  let hash = 0x811c9dc5;
  for (let i = 0; i < billId.length; i++) {
    hash ^= billId.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return WAITER_NICKNAMES[(hash >>> 0) % WAITER_NICKNAMES.length];
}
