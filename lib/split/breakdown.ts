import {
  applyServiceTax,
  calculateBillTotals,
  itemTotalCents,
  splitPartsCents,
  type ItemForSplit,
} from "./calculate";

export type BreakdownItem = {
  id: string;
  description: string;
  quantity: number;
  myParts: number;
  totalParts: number;
  amountCents: number;
};

export type ParticipantBreakdown = {
  items: BreakdownItem[];
  subtotalCents: number;
  totalCents: number;
};

/**
 * Parcial de cada participante: itens em que tem parte (com a fração e o
 * valor), subtotal e total com taxa. A taxa é distribuída sobre os subtotais
 * de todos ao mesmo tempo (maior resto), por isso o cálculo é da conta
 * inteira mesmo quando só um participante vai ser exibido.
 */
export function buildParticipantBreakdowns(
  items: (ItemForSplit & { description: string })[],
  participantIds: string[],
  taxPercent: number,
): Map<string, ParticipantBreakdown> {
  const subtotals = calculateBillTotals(items);
  const totalsWithTax = applyServiceTax(subtotals, taxPercent);

  const breakdowns = new Map<string, ParticipantBreakdown>(
    participantIds.map((id) => [
      id,
      {
        items: [],
        subtotalCents: subtotals.get(id) ?? 0,
        totalCents: totalsWithTax.get(id) ?? 0,
      },
    ]),
  );

  for (const item of items) {
    const totalParts = item.shares.reduce((sum, share) => sum + share.parts, 0);
    if (totalParts === 0) continue;

    const amounts = splitPartsCents(itemTotalCents(item), item.shares);
    for (const share of item.shares) {
      const breakdown = breakdowns.get(share.profileId);
      if (!breakdown || share.parts === 0) continue;

      breakdown.items.push({
        id: item.id,
        description: item.description,
        quantity: item.quantity,
        myParts: share.parts,
        totalParts,
        amountCents: amounts.get(share.profileId) ?? 0,
      });
    }
  }

  return breakdowns;
}
