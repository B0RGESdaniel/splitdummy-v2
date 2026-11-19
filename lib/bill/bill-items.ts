import { useQuery } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";

export type BillItem = {
  id: string;
  description: string;
  unit_price: number;
  quantity: number;
};

/** Itens da conta — lista de Itens e as ações abaixo dela leem a mesma query. */
export function billItemsQueryKey(billId: string) {
  return ["items", billId];
}

export function useBillItems(billId: string, initialItems: BillItem[]) {
  const { data } = useQuery({
    queryKey: billItemsQueryKey(billId),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("items")
        .select("id, description, unit_price, quantity")
        .eq("bill_id", billId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data;
    },
    initialData: initialItems,
  });
  return data;
}
