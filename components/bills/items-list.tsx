"use client";

import { useState } from "react";
import { Divide } from "lucide-react";
import { motion } from "motion/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  deleteItem,
  decrementItemQuantity,
  incrementItemQuantity,
  updateItem,
} from "@/app/(bill)/bills/[billId]/items/actions";
import { ItemFormDialog } from "@/components/bills/item-form-dialog";
import { ItemSplitDialog } from "@/components/bills/item-split-dialog";
import { PartsStepper } from "@/components/bills/parts-stepper";
import { Button } from "@/components/ui/button";
import { cn } from "cn";
import { createClient } from "@/lib/supabase/client";
import { useRealtimeTable } from "@/lib/realtime/use-realtime-table";
import { useRemoteChangeFlash } from "@/lib/realtime/use-remote-change-flash";

type Item = {
  id: string;
  description: string;
  unit_price: number;
  quantity: number;
};

// Itens que chegam juntos (leitura de cupom, "substituir tudo") entram em
// cascata, um logo depois do outro, em vez de todos de uma vez.
const ROW_STAGGER_S = 0.05;

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function ItemsList({
  billId,
  initialItems,
  isOpen,
  participants,
}: {
  billId: string;
  initialItems: Item[];
  isOpen: boolean;
  participants: { participant_id: string; display_name: string | undefined }[];
}) {
  const queryKey = ["items", billId];
  const queryClient = useQueryClient();

  const { data: items } = useQuery({
    queryKey,
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

  // Atraso de entrada de cada linha nova, guardado em estado (e não
  // recalculado a cada render) porque o Motion só lê o atraso na montagem.
  // Ajuste de estado durante o render, sem effect.
  const [knownIds, setKnownIds] = useState(() => new Set(initialItems.map((item) => item.id)));
  const [enterDelays, setEnterDelays] = useState<ReadonlyMap<string, number>>(() => new Map());
  const newIds = items.filter((item) => !knownIds.has(item.id)).map((item) => item.id);
  if (newIds.length > 0) {
    setKnownIds(new Set([...knownIds, ...newIds]));
    setEnterDelays(
      new Map([
        ...enterDelays,
        ...newIds.map((id, index) => [id, index * ROW_STAGGER_S] as const),
      ]),
    );
  }

  const { flashing, markOwn, handleRemoteChange } = useRemoteChangeFlash();

  useRealtimeTable({
    table: "items",
    billId,
    queryKey,
    // Item novo já chega com a animação de entrada; o flash fica pra edições.
    // Sem isso, quem salva a leitura de cupom veria os próprios itens piscando
    // como se fossem de outra pessoa.
    onChange: (row, event) => {
      if (event !== "INSERT" && typeof row.id === "string") handleRemoteChange(row.id);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ itemId, formData }: { itemId: string; formData: FormData }) =>
      updateItem(billId, itemId, formData),
    onMutate: async ({ itemId, formData }) => {
      markOwn(itemId);
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<Item[]>(queryKey);

      queryClient.setQueryData<Item[]>(queryKey, (current = []) =>
        current.map((item) =>
          item.id === itemId
            ? {
                ...item,
                description: String(formData.get("description") ?? item.description),
                unit_price: Number(formData.get("unit_price")),
                quantity: Number(formData.get("quantity") ?? item.quantity),
              }
            : item,
        ),
      );

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (itemId: string) => deleteItem(billId, itemId),
    onMutate: async (itemId: string) => {
      markOwn(itemId);
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<Item[]>(queryKey);

      queryClient.setQueryData<Item[]>(queryKey, (current = []) =>
        current.filter((item) => item.id !== itemId),
      );

      return { previous };
    },
    onError: (_err, _itemId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
  });

  function useQuantityStepMutation(delta: 1 | -1) {
    const action = delta === 1 ? incrementItemQuantity : decrementItemQuantity;

    return useMutation({
      mutationFn: (itemId: string) => action(billId, itemId),
      onMutate: async (itemId: string) => {
        markOwn(itemId);
        await queryClient.cancelQueries({ queryKey });
        const previous = queryClient.getQueryData<Item[]>(queryKey);

        queryClient.setQueryData<Item[]>(queryKey, (current = []) =>
          current.map((item) =>
            item.id === itemId
              ? { ...item, quantity: Math.max(1, item.quantity + delta) }
              : item,
          ),
        );

        return { previous };
      },
      onError: (_err, _itemId, context) => {
        if (context?.previous) {
          queryClient.setQueryData(queryKey, context.previous);
        }
      },
    });
  }

  const incrementQuantity = useQuantityStepMutation(1);
  const decrementQuantity = useQuantityStepMutation(-1);

  return (
    // Só a entrada de itens novos anima; a saída é imediata (animar a saída
    // junto com a entrada dos novos no "substituir tudo" ficava truncado).
    <>
      {items.length === 0 ? (
        <div className="border border-dashed border-border py-6 text-center">
          <p className="text-sm text-muted-foreground">
            Nada escrito aqui ainda — adicione o primeiro item.
          </p>
        </div>
      ) : (
        <table className="w-full table-fixed border-collapse border-[1.5px] border-foreground text-sm">
          <thead>
            <tr className="text-left font-mono text-[11px] uppercase tracking-wide text-foreground">
              <th scope="col" className="border-[1.5px] border-foreground px-3 py-2 font-medium">
                Descrição
              </th>
              <th
                scope="col"
                className="w-28 border-[1.5px] border-foreground px-3 py-2 text-center font-medium"
              >
                Qtd
              </th>
              <th
                scope="col"
                className="w-14 border-[1.5px] border-foreground px-3 py-2 font-medium"
              >
                <span className="sr-only">Dividir</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const description = (
                <div className="flex min-w-0 flex-col justify-center text-left">
                  <span className="truncate font-handwritten text-lg leading-tight text-[color:var(--ink-handwritten)]">
                    {item.description}
                  </span>
                  <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                    {formatCurrency(item.unit_price)}/un → {formatCurrency(item.unit_price * item.quantity)}
                  </span>
                </div>
              );

              return (
                <motion.tr
                  key={item.id}
                  // Linhas do carregamento inicial não animam, só as que chegam depois.
                  initial={enterDelays.has(item.id) ? { opacity: 0, y: -6 } : false}
                  animate={{
                    opacity: 1,
                    y: 0,
                    transition: { delay: enterDelays.get(item.id) ?? 0, duration: 0.2 },
                  }}
                  className={cn(flashing.has(item.id) && "realtime-flash")}
                >
                  <td className="min-w-0 border-[1.5px] border-foreground px-3 py-2">
                    {isOpen ? (
                      <ItemFormDialog
                        action={(formData) =>
                          updateMutation.mutateAsync({ itemId: item.id, formData })
                        }
                        deleteAction={() => deleteMutation.mutateAsync(item.id)}
                        trigger={
                          <button type="button" className="block w-full">
                            {description}
                          </button>
                        }
                        title="Editar item"
                        submitLabel="Salvar"
                        initialValues={{
                          description: item.description,
                          unit_price: item.unit_price,
                          quantity: item.quantity,
                        }}
                      />
                    ) : (
                      description
                    )}
                  </td>

                  <td className="border-[1.5px] border-foreground px-2 py-2">
                    <div className="flex justify-center">
                      <PartsStepper
                        parts={item.quantity}
                        disabled={!isOpen}
                        onIncrement={() => incrementQuantity.mutate(item.id)}
                        onDecrement={() => decrementQuantity.mutate(item.id)}
                      />
                    </div>
                  </td>

                  <td className="border-[1.5px] border-foreground px-2 py-2">
                    <div className="flex justify-center">
                      <ItemSplitDialog
                        billId={billId}
                        item={item}
                        isOpen={isOpen}
                        participants={participants}
                        trigger={
                          <Button variant="outline" size="icon-sm" aria-label="Dividir item">
                            <Divide />
                          </Button>
                        }
                      />
                    </div>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      )}
    </>
  );
}
