"use client";

import { useQuery } from "@tanstack/react-query";

import { closeBill, updateServiceTax } from "@/app/(dashboard)/bills/actions";
import { CloseBillButton } from "@/components/bills/close-bill-button";
import { ServiceTaxEditor } from "@/components/bills/service-tax-editor";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { useRealtimeTable } from "@/lib/realtime/use-realtime-table";
import {
  applyServiceTax,
  calculateBillTotals,
  getUnsplitItemIds,
  itemTotalCents,
  splitPartsCents,
  type ItemForSplit,
} from "@/lib/split/calculate";
import type { PartsShareInput } from "@/lib/split/validate";

type Item = {
  id: string;
  description: string;
  unit_price: number;
  quantity: number;
};

type Share = { item_id: string; participant_id: string; parts: number | null };

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
  participants: { participant_id: string; display_name: string | undefined }[];
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
        .select("item_id, participant_id, parts")
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
    list.push({ profileId: share.participant_id, parts: share.parts ?? 0 });
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

  const itemSplitsById = new Map<string, Map<string, number>>();
  for (const item of itemsForSplit) {
    const totalParts = item.shares.reduce((sum, share) => sum + share.parts, 0);
    if (totalParts === 0) continue;
    itemSplitsById.set(item.id, splitPartsCents(itemTotalCents(item), item.shares));
  }

  function getParticipantItems(participantId: string) {
    return items.flatMap((item) => {
      const itemShares = sharesByItem.get(item.id) ?? [];
      const totalParts = itemShares.reduce((sum, share) => sum + share.parts, 0);
      const myParts =
        itemShares.find((share) => share.profileId === participantId)?.parts ?? 0;

      if (myParts === 0 || totalParts === 0) return [];

      return [
        {
          id: item.id,
          description: item.description,
          quantity: item.quantity,
          myParts,
          totalParts,
          amount: itemSplitsById.get(item.id)?.get(participantId) ?? 0,
        },
      ];
    });
  }

  return (
    <>
      {unsplitDescriptions.length > 0 && (
        <Alert variant="warning">
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

      <Card>
        <CardContent>
          <Accordion type="single" collapsible>
            {participants.map((participant) => {
              const subtotal = subtotals.get(participant.participant_id) ?? 0;
              const total = totalsWithTax.get(participant.participant_id) ?? 0;
              const participantItems = getParticipantItems(participant.participant_id);

              return (
                <AccordionItem
                  key={participant.participant_id}
                  value={participant.participant_id}
                >
                  <AccordionTrigger className="gap-2">
                    <span className="flex w-full items-center justify-between">
                      <span className="font-medium">{participant.display_name}</span>
                      <span className="font-semibold">{formatCurrency(total)}</span>
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    {participantItems.length === 0 ? (
                      <p className="text-muted-foreground text-xs">Não consumiu nada</p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {participantItems.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between gap-2 text-xs"
                          >
                            <span className="text-muted-foreground">
                              <span className="font-medium text-foreground">
                                {item.myParts}/{item.totalParts}
                              </span>{" "}
                              {item.quantity}x {item.description}
                            </span>
                            <span className="text-foreground">
                              {formatCurrency(item.amount)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="text-muted-foreground mt-2 text-xs">
                      {formatCurrency(subtotal)} + taxa
                    </p>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 border-t pt-4">
        <div className="flex items-center justify-between">
          {isOpen ? (
            <ServiceTaxEditor
              serviceTaxPercent={serviceTaxPercent}
              action={updateServiceTax.bind(null, billId)}
            />
          ) : (
            <span className="text-muted-foreground text-xs">
              Taxa de serviço: {serviceTaxPercent}%
            </span>
          )}
          <span className="text-lg font-semibold">
            {formatCurrency(grandTotalCents)}
          </span>
        </div>
        {isOwner && isOpen && (
          <CloseBillButton action={closeBill.bind(null, billId)} />
        )}
      </div>
    </>
  );
}
