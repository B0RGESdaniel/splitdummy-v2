"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  clearItemParts,
  decrementItemPart,
  incrementItemPart,
  splitItemEqually,
} from "@/app/(bill)/bills/[billId]/items/actions";
import { AvatarIcon } from "@/components/bills/avatar-icon";
import { PartsStepper } from "@/components/bills/parts-stepper";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "cn";
import { createClient } from "@/lib/supabase/client";
import { billItemSharesQueryKey } from "@/lib/bill/bill-item-shares";
import {
  invalidateAfterLastMutation,
  useRealtimeTable,
} from "@/lib/realtime/use-realtime-table";
import { useRemoteChangeFlash } from "@/lib/realtime/use-remote-change-flash";
import { splitPartsCents } from "@/lib/split/calculate";
import type { BillParticipant } from "@/lib/bill/participants";

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
  participants: BillParticipant[];
  initialShares?: Share[];
}) {
  const queryKey = ["item-shares", itemId];
  const queryClient = useQueryClient();

  const { data: shares = [] } = useQuery({
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

  const { flashing, markOwn, handleRemoteChange } = useRemoteChangeFlash();

  useRealtimeTable({
    table: "item_shares",
    billId,
    queryKey,
    onChange: (row) => {
      if (row.item_id === itemId && typeof row.participant_id === "string") {
        handleRemoteChange(row.participant_id);
      }
    },
  });

  // A lista de Itens marca os não divididos pelas partes da conta inteira;
  // atualiza já, sem esperar o eco do Realtime.
  function invalidateBillShares() {
    return queryClient.invalidateQueries({ queryKey: billItemSharesQueryKey(billId) });
  }

  function useStepMutation(delta: 1 | -1) {
    const action = delta === 1 ? incrementItemPart : decrementItemPart;

    return useMutation({
      mutationKey: queryKey,
      mutationFn: (participantId: string) => action(billId, itemId, participantId),
      onMutate: async (participantId: string) => {
        markOwn(participantId);
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
        // Mesmo id: vários toques que falham juntos viram um toast só.
        toast.error("Não deu pra alterar as partes. Tente de novo.", { id: "item-parts-error" });
      },
      onSettled: () => {
        invalidateAfterLastMutation(queryClient, queryKey);
        return invalidateBillShares();
      },
    });
  }

  const increment = useStepMutation(1);
  const decrement = useStepMutation(-1);

  function useBulkMutation(
    action: typeof splitItemEqually,
    parts: number,
    errorMessage: string,
  ) {
    return useMutation({
      mutationKey: queryKey,
      mutationFn: () => action(billId, itemId),
      onMutate: async () => {
        participants.forEach((p) => markOwn(p.participant_id));
        await queryClient.cancelQueries({ queryKey });
        const previous = queryClient.getQueryData<Share[]>(queryKey);
        queryClient.setQueryData<Share[]>(
          queryKey,
          participants.map((p) => ({ participant_id: p.participant_id, parts })),
        );
        return { previous };
      },
      onError: (_err, _vars, context) => {
        if (context?.previous) {
          queryClient.setQueryData(queryKey, context.previous);
        }
        toast.error(errorMessage, { id: "item-parts-error" });
      },
      onSettled: () => {
        invalidateAfterLastMutation(queryClient, queryKey);
        return invalidateBillShares();
      },
    });
  }

  const splitEqually = useBulkMutation(
    splitItemEqually,
    1,
    "Não deu pra dividir para todos. Tente de novo.",
  );
  const clearParts = useBulkMutation(
    clearItemParts,
    0,
    "Não deu pra limpar as partes. Tente de novo.",
  );

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
      {isOpen && (
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => splitEqually.mutate()}
          >
            Dividir para todos
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="flex-1"
            disabled={totalParts === 0}
            onClick={() => clearParts.mutate()}
          >
            Limpar partes
          </Button>
        </div>
      )}

      <div className="-mx-1 flex min-h-0 flex-col gap-2 overflow-y-auto px-1 py-px">
        {participants.map((participant) => {
          const parts = partsByParticipant.get(participant.participant_id) ?? 0;
          const amount = amountsByParticipant?.get(participant.participant_id) ?? 0;

          return (
            <Card
              key={participant.participant_id}
              className={cn(
                // Card tem overflow-hidden, o que deixa ele encolher numa coluna flex em vez de a lista rolar
                "shrink-0",
                participant.is_self && "ring-[1.5px] ring-foreground",
                flashing.has(participant.participant_id) && "realtime-flash",
              )}
            >
              <CardContent className="flex items-center justify-between gap-4">
                <span className="flex min-w-0 items-center gap-2">
                  {participant.avatar_key && (
                    <AvatarIcon
                      avatarKey={participant.avatar_key}
                      className="size-7 shrink-0 text-foreground"
                    />
                  )}
                  {/* Própria linha vira "Você": mais curto que o nome e já vem primeiro, com avatar */}
                  <span className="truncate font-medium">
                    {participant.is_self ? "Você" : participant.display_name}
                  </span>
                </span>
                <div className="flex shrink-0 items-center gap-4">
                  <PartsStepper
                    parts={parts}
                    label={
                      participant.is_self
                        ? "suas partes"
                        : `partes de ${participant.display_name}`
                    }
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
