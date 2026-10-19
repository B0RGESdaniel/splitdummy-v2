"use client";

import { useQuery } from "@tanstack/react-query";

import { closeBill } from "@/app/(dashboard)/bills/actions";
import { CloseBillButton } from "@/components/bills/close-bill-button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { useRealtimeTable } from "@/lib/realtime/use-realtime-table";
import {
  applyServiceTax,
  calculateBillTotals,
  getUnsplitItemIds,
  type ItemForSplit,
} from "@/lib/split/calculate";
import type { PartsShareInput } from "@/lib/split/validate";

type Item = {
  id: string;
  description: string;
  unit_price: number;
  quantity: number;
};

type Share = { item_id: string; profile_id: string; parts: number | null };

function formatCurrency(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function BillSummary({
  billId,
  serviceTaxPercent,
  isOwner,
  isOpen,
  participants,
  initialItems,
  initialShares,
}: {
  billId: string;
  serviceTaxPercent: number;
  isOwner: boolean;
  isOpen: boolean;
  participants: { profile_id: string; display_name: string | undefined }[];
  initialItems: Item[];
  initialShares: Share[];
}) {
  const itemsQueryKey = ["items", billId];
  const sharesQueryKey = ["bill-item-shares", billId];

  const { data: items } = useQuery({
    queryKey: itemsQueryKey,
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

  const { data: shares } = useQuery({
    queryKey: sharesQueryKey,
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("item_shares")
        .select("item_id, profile_id, parts")
        .eq("bill_id", billId);

      if (error) throw error;
      return data;
    },
    initialData: initialShares,
  });

  useRealtimeTable({ table: "items", billId, queryKey: itemsQueryKey });
  useRealtimeTable({ table: "item_shares", billId, queryKey: sharesQueryKey });

  const sharesByItem = new Map<string, PartsShareInput[]>();
  for (const share of shares) {
    const list = sharesByItem.get(share.item_id) ?? [];
    list.push({ profileId: share.profile_id, parts: share.parts ?? 0 });
    sharesByItem.set(share.item_id, list);
  }

  const itemsForSplit: ItemForSplit[] = items.map((item) => ({
    id: item.id,
    quantity: item.quantity,
    unitPrice: item.unit_price,
    shares: sharesByItem.get(item.id) ?? [],
  }));

  const subtotals = calculateBillTotals(itemsForSplit);
  const totalsWithTax = applyServiceTax(subtotals, serviceTaxPercent);

  const unsplitItemIds = new Set(getUnsplitItemIds(itemsForSplit));
  const unsplitDescriptions = items
    .filter((item) => unsplitItemIds.has(item.id))
    .map((item) => item.description);

  const grandTotalCents = [...totalsWithTax.values()].reduce(
    (sum, v) => sum + v,
    0,
  );

  return (
    <>
      {unsplitDescriptions.length > 0 && (
        <Alert variant="destructive">
          <AlertTitle>Itens ainda não divididos</AlertTitle>
          <AlertDescription>
            <ul className="list-inside list-disc">
              {unsplitDescriptions.map((description) => (
                <li key={description}>{description}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-2">
        {participants.map((participant) => {
          const subtotal = subtotals.get(participant.profile_id) ?? 0;
          const total = totalsWithTax.get(participant.profile_id) ?? 0;

          return (
            <Card key={participant.profile_id}>
              <CardContent className="flex items-center justify-between gap-4">
                <span className="font-medium">
                  {participant.display_name}
                </span>
                <div className="flex flex-col items-end">
                  <span className="font-semibold">
                    {formatCurrency(total)}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {formatCurrency(subtotal)} + taxa
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex items-center justify-between border-t pt-4">
        <div>
          <p className="text-muted-foreground text-xs">
            Taxa de serviço: {serviceTaxPercent}%
          </p>
          <p className="text-lg font-semibold">
            Total: {formatCurrency(grandTotalCents)}
          </p>
        </div>
        {isOwner && isOpen && (
          <CloseBillButton action={closeBill.bind(null, billId)} />
        )}
      </div>
    </>
  );
}
