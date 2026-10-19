"use client";

import { useQuery } from "@tanstack/react-query";

import {
  decrementItemPart,
  incrementItemPart,
} from "@/app/(dashboard)/bills/[billId]/items/[itemId]/split/actions";
import { PartsStepper } from "@/components/bills/parts-stepper";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { useRealtimeTable } from "@/lib/realtime/use-realtime-table";
import { splitPartsCents } from "@/lib/split/calculate";

type Share = { profile_id: string; parts: number | null };

function formatCurrency(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function ItemSplit({
  billId,
  itemId,
  totalCents,
  isOpen,
  participants,
  initialShares,
}: {
  billId: string;
  itemId: string;
  totalCents: number;
  isOpen: boolean;
  participants: { profile_id: string; display_name: string | undefined }[];
  initialShares: Share[];
}) {
  const queryKey = ["item-shares", itemId];

  const { data: shares } = useQuery({
    queryKey,
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("item_shares")
        .select("profile_id, parts")
        .eq("item_id", itemId);

      if (error) throw error;
      return data;
    },
    initialData: initialShares,
  });

  useRealtimeTable({ table: "item_shares", billId, queryKey });

  const partsByProfile = new Map(
    shares.map((share) => [share.profile_id, share.parts ?? 0]),
  );

  const totalParts = [...partsByProfile.values()].reduce(
    (sum, parts) => sum + parts,
    0,
  );

  const amountsByProfile =
    totalParts > 0
      ? splitPartsCents(
          totalCents,
          participants.map((p) => ({
            profileId: p.profile_id,
            parts: partsByProfile.get(p.profile_id) ?? 0,
          })),
        )
      : null;

  return (
    <>
      {totalParts === 0 && (
        <p className="text-sm text-amber-600">
          Este item ainda não foi dividido entre os participantes.
        </p>
      )}

      <div className="flex flex-col gap-2">
        {participants.map((participant) => {
          const parts = partsByProfile.get(participant.profile_id) ?? 0;
          const amount = amountsByProfile?.get(participant.profile_id) ?? 0;

          return (
            <Card key={participant.profile_id}>
              <CardContent className="flex items-center justify-between gap-4">
                <span className="font-medium">
                  {participant.display_name}
                </span>
                <div className="flex items-center gap-4">
                  <PartsStepper
                    parts={parts}
                    disabled={!isOpen}
                    increment={incrementItemPart.bind(
                      null,
                      billId,
                      itemId,
                      participant.profile_id,
                    )}
                    decrement={decrementItemPart.bind(
                      null,
                      billId,
                      itemId,
                      participant.profile_id,
                    )}
                  />
                  <span className="text-muted-foreground w-20 text-right text-sm">
                    {amountsByProfile ? formatCurrency(amount) : "—"}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}
