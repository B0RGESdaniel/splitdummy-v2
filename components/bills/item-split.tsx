"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  clearItemParts,
  decrementItemPart,
  incrementItemPart,
  restoreItemParts,
  splitItemEqually,
} from "@/app/(bill)/bills/[billId]/items/actions";
import { AvatarIcon } from "@/components/bills/avatar-icon";
import { PartsStepper } from "@/components/bills/parts-stepper";
import { Button } from "@/components/ui/button";
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
    onSuccess?: (previous: Share[]) => void,
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
      onSuccess: (_data, _vars, context) => {
        if (context?.previous) onSuccess?.(context.previous);
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
    // Limpar não pede confirmação (decisão do usuário); o toque acidental se
    // resolve com "Desfazer", que regrava as partes de antes.
    (previous) => {
      const toRestore = previous.flatMap((share) =>
        (share.parts ?? 0) > 0
          ? [{ participant_id: share.participant_id, parts: share.parts ?? 0 }]
          : [],
      );
      if (toRestore.length === 0) return;
      toast.success("Partes limpas.", {
        id: "item-parts-cleared",
        // Um pouco mais que o padrão: dá tempo de perceber o toque errado.
        duration: 6000,
        action: { label: "Desfazer", onClick: () => restoreParts.mutate(toRestore) },
      });
    },
  );

  const restoreParts = useMutation({
    mutationKey: queryKey,
    mutationFn: (toRestore: { participant_id: string; parts: number }[]) =>
      restoreItemParts(billId, itemId, toRestore),
    onMutate: async (toRestore) => {
      toRestore.forEach((share) => markOwn(share.participant_id));
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<Share[]>(queryKey);
      queryClient.setQueryData<Share[]>(queryKey, (current = []) =>
        current.map((share) => ({
          ...share,
          parts:
            toRestore.find((restored) => restored.participant_id === share.participant_id)
              ?.parts ?? share.parts,
        })),
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
      toast.error("Não deu pra desfazer. Tente de novo.", { id: "item-parts-error" });
    },
    // Mesmo id do "Partes limpas.": troca o aviso em vez de empilhar outro.
    // O Sonner mescla com o toast anterior, então o "Desfazer" sai à mão.
    onSuccess: () => {
      toast.success("Partes de volta.", {
        id: "item-parts-cleared",
        duration: 3000,
        action: undefined,
      });
    },
    onSettled: () => {
      invalidateAfterLastMutation(queryClient, queryKey);
      return invalidateBillShares();
    },
  });

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
      {/* No topo, zona difícil de alcançar sem querer com o polegar. "Dividir
          para todos" é a ação principal; "Limpar partes" fica pequeno, só
          texto vermelho (o vermelho sólido é reservado pra sinal), e o toque
          errado se desfaz pelo toast. */}
      {isOpen && (
        <div className="flex items-center gap-3">
          <Button type="button" className="flex-1" onClick={() => splitEqually.mutate()}>
            Dividir para todos
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            disabled={totalParts === 0}
            onClick={() => clearParts.mutate()}
          >
            Limpar partes
          </Button>
        </div>
      )}

      {/* Régua da comanda, igual à tabela de Itens: borda sólida em volta e
          entre as linhas, sem caixa por pessoa. A própria linha ganha uma moldura
          grossa por dentro da régua (fundo sombreado sozinho não se distinguia). */}
      <ul className="flex min-h-0 flex-col divide-y-[1.5px] divide-foreground overflow-y-auto border-[1.5px] border-foreground">
        {participants.map((participant) => {
          const parts = partsByParticipant.get(participant.participant_id) ?? 0;
          const amount = amountsByParticipant?.get(participant.participant_id) ?? 0;

          return (
            <li
              key={participant.participant_id}
              className={cn(
                "flex shrink-0 items-center justify-between gap-4 px-3 py-3",
                participant.is_self && "inset-ring-[1.5px] inset-ring-foreground",
                flashing.has(participant.participant_id) && "realtime-flash",
              )}
            >
                <span className="flex min-w-0 items-center gap-2">
                  {participant.avatar_key && (
                    <AvatarIcon
                      avatarKey={participant.avatar_key}
                      className="size-7 shrink-0 text-foreground"
                    />
                  )}
                  {/* Nome em cima, valor embaixo: com valor e stepper na mesma linha
                      sobravam ~40px pro nome num celular de 375px. */}
                  <span className="flex min-w-0 flex-col">
                    {/* Própria linha vira "Você": mais curto que o nome e já vem primeiro, com avatar */}
                    <span className="line-clamp-2 leading-tight font-medium text-pretty wrap-break-word">
                      {participant.is_self ? "Você" : participant.display_name}
                    </span>
                    <span className="text-sm font-medium tabular-nums">
                      {amountsByParticipant ? formatCurrency(amount) : "—"}
                    </span>
                  </span>
                </span>
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
            </li>
          );
        })}
      </ul>
    </>
  );
}
