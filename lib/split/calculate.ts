import { validatePartsShares, type PartsShareInput } from "./validate";

export type ItemForSplit = {
  id: string;
  quantity: number;
  unitPrice: number;
  shares: PartsShareInput[];
};

export function itemTotalCents(item: Pick<ItemForSplit, "quantity" | "unitPrice">): number {
  return Math.round(item.quantity * item.unitPrice * 100);
}

function distributeLargestRemainder(
  totalCents: number,
  weights: { profileId: string; weight: number }[],
  totalWeight: number,
): Map<string, number> {
  const entries = weights.map(({ profileId, weight }) => {
    const exact = (totalCents * weight) / totalWeight;
    const amount = Math.floor(exact);
    return { profileId, amount, remainder: exact - amount };
  });

  const distributed = entries.reduce((sum, entry) => sum + entry.amount, 0);
  const remaining = totalCents - distributed;

  const byRemainderDesc = [...entries].sort((a, b) => b.remainder - a.remainder);
  for (let i = 0; i < remaining; i++) {
    byRemainderDesc[i % byRemainderDesc.length].amount += 1;
  }

  return new Map(entries.map((entry) => [entry.profileId, entry.amount]));
}

/** Distribui `totalCents` entre `shares` proporcionalmente às partes, usando o método do maior resto. */
export function splitPartsCents(
  totalCents: number,
  shares: PartsShareInput[],
): Map<string, number> {
  const validation = validatePartsShares(shares);
  if (!validation.valid) {
    throw new Error(validation.reason);
  }

  const totalParts = shares.reduce((sum, share) => sum + share.parts, 0);
  const weights = shares.map((share) => ({
    profileId: share.profileId,
    weight: share.parts,
  }));

  return distributeLargestRemainder(totalCents, weights, totalParts);
}

function totalPartsOf(item: ItemForSplit): number {
  return item.shares.reduce((sum, share) => sum + share.parts, 0);
}

/** Ids dos itens que ainda não têm nenhum participante com partes > 0. */
export function getUnsplitItemIds(items: ItemForSplit[]): string[] {
  return items.filter((item) => totalPartsOf(item) === 0).map((item) => item.id);
}

/** Soma, por participante, o quanto cada um deve pelos itens já divididos no modo `parts`. Itens sem partes atribuídas ainda são ignorados aqui. */
export function calculateBillTotals(items: ItemForSplit[]): Map<string, number> {
  const totals = new Map<string, number>();

  for (const item of items) {
    if (totalPartsOf(item) === 0) continue;

    const itemSplit = splitPartsCents(itemTotalCents(item), item.shares);
    for (const [profileId, amount] of itemSplit) {
      totals.set(profileId, (totals.get(profileId) ?? 0) + amount);
    }
  }

  return totals;
}

/** Aplica a taxa de serviço sobre os subtotais (centavos) de cada participante, redistribuindo o total com taxa proporcionalmente pelo método do maior resto. */
export function applyServiceTax(
  subtotalsCents: Map<string, number>,
  taxPercent: number,
): Map<string, number> {
  const subtotalTotal = [...subtotalsCents.values()].reduce((sum, v) => sum + v, 0);

  if (subtotalTotal === 0) {
    return new Map([...subtotalsCents.keys()].map((profileId) => [profileId, 0]));
  }

  const grandTotalCents = Math.round(subtotalTotal * (1 + taxPercent / 100));
  const weights = [...subtotalsCents.entries()].map(([profileId, weight]) => ({
    profileId,
    weight,
  }));

  return distributeLargestRemainder(grandTotalCents, weights, subtotalTotal);
}
