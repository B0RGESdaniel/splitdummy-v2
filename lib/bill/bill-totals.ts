import { buildParticipantBreakdowns } from "@/lib/split/breakdown";
import { itemTotalCents } from "@/lib/split/calculate";
import type { PartsShareInput } from "@/lib/split/validate";

type ItemRow = { id: string; unit_price: number; quantity: number };
type ShareRow = { item_id: string; participant_id: string; parts: number | null };

/**
 * Parcial da comanda aberta: soma de todos os itens lançados (divididos ou
 * não) + taxa, com o mesmo arredondamento do total do Resumo. É o tamanho
 * da conta até agora, não o que já está garantido por alguém.
 */
export function openBillPartialCents(items: ItemRow[], taxPercent: number): number {
  const subtotal = items.reduce(
    (sum, item) => sum + itemTotalCents({ quantity: item.quantity, unitPrice: item.unit_price }),
    0,
  );
  return Math.round(subtotal * (1 + taxPercent / 100));
}

/**
 * Totais de uma conta paga, como o cupom do Resumo mostra: total = soma das
 * parciais (com taxa) e a parte de quem está vendo.
 */
export function paidBillTotals(
  items: ItemRow[],
  shares: ShareRow[],
  participantIds: string[],
  ownParticipantId: string | null,
  taxPercent: number,
): { totalCents: number; ownCents: number } {
  const sharesByItem = new Map<string, PartsShareInput[]>();
  for (const share of shares) {
    const list = sharesByItem.get(share.item_id) ?? [];
    list.push({ profileId: share.participant_id, parts: share.parts ?? 0 });
    sharesByItem.set(share.item_id, list);
  }

  const breakdowns = buildParticipantBreakdowns(
    items.map((item) => ({
      id: item.id,
      description: "",
      quantity: item.quantity,
      unitPrice: item.unit_price,
      shares: sharesByItem.get(item.id) ?? [],
    })),
    participantIds,
    taxPercent,
  );

  const totalCents = [...breakdowns.values()].reduce(
    (sum, breakdown) => sum + breakdown.totalCents,
    0,
  );
  const ownCents = ownParticipantId ? (breakdowns.get(ownParticipantId)?.totalCents ?? 0) : 0;

  return { totalCents, ownCents };
}
