"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { ItemSplit } from "@/components/bills/item-split";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { itemTotalCents } from "@/lib/split/calculate";

type Item = {
  id: string;
  description: string;
  unit_price: number;
  quantity: number;
};

type Share = { participant_id: string; parts: number | null };

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function SplitWorkspace({
  billId,
  initialItems,
  isOpen,
  participants,
  initialSharesByItem,
  initialSelectedItemId,
}: {
  billId: string;
  initialItems: Item[];
  isOpen: boolean;
  participants: { participant_id: string; display_name: string | undefined }[];
  initialSharesByItem: Record<string, Share[]>;
  initialSelectedItemId: string | null;
}) {
  const { data: items } = useQuery({
    queryKey: ["items", billId],
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

  const [selectedItemId, setSelectedItemId] = useState<string | null>(
    initialSelectedItemId ?? initialItems[0]?.id ?? null,
  );

  const resolvedSelectedId =
    selectedItemId && items.some((item) => item.id === selectedItemId)
      ? selectedItemId
      : items[0]?.id ?? null;

  const selectedItem = items.find((item) => item.id === resolvedSelectedId) ?? null;

  if (!selectedItem) {
    return (
      <Card className="border-dashed bg-transparent ring-foreground/15">
        <CardContent className="text-center text-sm text-muted-foreground">
          Nenhum item cadastrado ainda. Adicione itens antes de dividir.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Select value={selectedItem.id} onValueChange={setSelectedItemId}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {items.map((item) => (
            <SelectItem key={item.id} value={item.id}>
              {item.description} ({formatCurrency(item.unit_price * item.quantity)})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <ItemSplit
        key={selectedItem.id}
        billId={billId}
        itemId={selectedItem.id}
        totalCents={itemTotalCents({
          quantity: selectedItem.quantity,
          unitPrice: selectedItem.unit_price,
        })}
        isOpen={isOpen}
        participants={participants}
        initialShares={initialSharesByItem[selectedItem.id] ?? []}
      />
    </div>
  );
}
