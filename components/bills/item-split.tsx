"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  decrementItemPart,
  incrementItemPart,
} from "@/app/(bill)/bills/[billId]/items/actions";
import { PartsStepper } from "@/components/bills/parts-stepper";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { useRealtimeTable } from "@/lib/realtime/use-realtime-table";
import { splitPartsCents } from "@/lib/split/calculate";

type Share = { participant_id: string; parts: number | null };

function formatCurrency(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function applyDelta(
  shares: Share[],
  participantId: string,
  delta: 1 | -1,
): Share[] {
  const existing = shares.find((share) => share.participant_id === participantId);

  if (!existing) {
    return [...shares, { participant_id: participantId, parts: Math.max(0, delta) }];
  }

  return shares.map((share) =>
    share.participant_id === participantId
      ? { ...share, parts: Math.max(0, (share.parts ?? 0) + delta) }
      : share,
  );
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
  participants: { participant_id: string; display_name: string | undefined }[];
  initialShares: Share[];
}) {
  const queryKey = ["item-shares", itemId];
  const queryClient = useQueryClient();

  const { data: shares } = useQuery({
    queryKey,
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("item_shares")
        .select("participant_id, parts")
        .eq("item_id", itemId);

      if (error) throw error;
      return data;
    },
    initialData: initialShares,
  });

  useRealtimeTable({ table: "item_shares", billId, queryKey });

  function useStepMutation(delta: 1 | -1) {
    const action = delta === 1 ? incrementItemPart : decrementItemPart;

    return useMutation({
      mutationFn: (participantId: string) => action(billId, itemId, participantId),
      onMutate: async (participantId: string) => {
        await queryClient.cancelQueries({ queryKey });
        const previous = queryClient.getQueryData<Share[]>(queryKey);
        queryClient.setQueryData<Share[]>(queryKey, (current = []) =>
          applyDelta(current, participantId, delta),
        );
        return { previous };
      },
      onError: (_err, _participantId, context) => {
        if (context?.previous) {
          queryClient.setQueryData(queryKey, context.previous);
        }
      },
    });
  }

  const increment = useStepMutation(1);
  const decrement = useStepMutation(-1);

  const partsByParticipant = new Map(
    shares.map((share) => [share.participant_id, share.parts ?? 0]),
  );

  const totalParts = [...partsByParticipant.values()].reduce(
    (sum, parts) => sum + parts,
    0,
  );

  const amountsByParticipant =
    totalParts > 0
      ? splitPartsCents(
          totalCents,
          participants.map((p) => ({
            profileId: p.participant_id,
            parts: partsByParticipant.get(p.participant_id) ?? 0,
          })),
        )
      : null;

  return (
    <>
      {totalParts === 0 && (
        <p className="text-sm text-amber-400">
          Este item ainda não foi dividido entre os participantes.
        </p>
      )}

      <div className="flex flex-col gap-2">
        {participants.map((participant) => {
          const parts = partsByParticipant.get(participant.participant_id) ?? 0;
          const amount = amountsByParticipant?.get(participant.participant_id) ?? 0;

          return (
            <Card key={participant.participant_id}>
              <CardContent className="flex items-center justify-between gap-4">
                <span className="font-medium">
                  {participant.display_name}
                </span>
                <div className="flex items-center gap-4">
                  <PartsStepper
                    parts={parts}
                    disabled={!isOpen}
                    onIncrement={() => increment.mutate(participant.participant_id)}
                    onDecrement={() => decrement.mutate(participant.participant_id)}
                  />
                  <span className="text-muted-foreground w-20 text-right text-sm">
                    {amountsByParticipant ? formatCurrency(amount) : "—"}
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
