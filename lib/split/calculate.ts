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

  const entries = shares.map((share) => {
    const exact = (totalCents * share.parts) / totalParts;
    const amount = Math.floor(exact);
    return { profileId: share.profileId, amount, remainder: exact - amount };
  });

  const distributed = entries.reduce((sum, entry) => sum + entry.amount, 0);
  const remaining = totalCents - distributed;

  const byRemainderDesc = [...entries].sort((a, b) => b.remainder - a.remainder);
  for (let i = 0; i < remaining; i++) {
    byRemainderDesc[i % byRemainderDesc.length].amount += 1;
  }

  return new Map(entries.map((entry) => [entry.profileId, entry.amount]));
}

/** Soma, por participante, o quanto cada um deve pelos itens já divididos no modo `parts`. Itens sem partes atribuídas ainda são ignorados aqui. */
export function calculateBillTotals(items: ItemForSplit[]): Map<string, number> {
  const totals = new Map<string, number>();

  for (const item of items) {
    if (item.shares.length === 0) continue;

    const itemSplit = splitPartsCents(itemTotalCents(item), item.shares);
    for (const [profileId, amount] of itemSplit) {
      totals.set(profileId, (totals.get(profileId) ?? 0) + amount);
    }
  }

  return totals;
}
