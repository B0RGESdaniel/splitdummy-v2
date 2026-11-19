import { useQuery } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";

export type BillItemShare = { item_id: string; participant_id: string; parts: number | null };

/** Partes de todos os itens da conta — usado na lista de Itens (marcar não divididos) e no Resumo. */
export function billItemSharesQueryKey(billId: string) {
  return ["bill-item-shares", billId];
}

export async function fetchBillItemShares(billId: string): Promise<BillItemShare[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("item_shares")
    .select("item_id, participant_id, parts")
    .eq("bill_id", billId);

  if (error) throw error;
  return data;
}

export function useBillItemShares(billId: string, initialShares: BillItemShare[]) {
  const { data } = useQuery({
    queryKey: billItemSharesQueryKey(billId),
    queryFn: () => fetchBillItemShares(billId),
    initialData: initialShares,
  });
  return data;
}

/** Ids dos itens com pelo menos uma parte atribuída. */
export function splitItemIdsOf(shares: BillItemShare[]): Set<string> {
  return new Set(shares.filter((share) => (share.parts ?? 0) > 0).map((share) => share.item_id));
}

/** Quantas pessoas têm pelo menos uma parte em cada item (item sem ninguém fica fora do mapa). */
export function sharerCountsOf(shares: BillItemShare[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const share of shares) {
    if ((share.parts ?? 0) > 0) counts.set(share.item_id, (counts.get(share.item_id) ?? 0) + 1);
  }
  return counts;
}
