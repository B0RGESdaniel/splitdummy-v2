"use client";

import { Plus } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createItem } from "@/app/(dashboard)/bills/[billId]/items/actions";
import { ItemFormDialog } from "@/components/bills/item-form-dialog";
import { Button } from "@/components/ui/button";

type Item = {
  id: string;
  description: string;
  unit_price: number;
  quantity: number;
};

export function CreateItemButton({ billId }: { billId: string }) {
  const queryClient = useQueryClient();
  const queryKey = ["items", billId];

  const mutation = useMutation({
    mutationFn: (formData: FormData) => createItem(billId, formData),
    onMutate: async (formData: FormData) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<Item[]>(queryKey);

      const optimisticItem: Item = {
        id: `optimistic-${crypto.randomUUID()}`,
        description: String(formData.get("description") ?? ""),
        unit_price: Number(formData.get("unit_price")),
        quantity: Number(formData.get("quantity") ?? 1),
      };

      queryClient.setQueryData<Item[]>(queryKey, (current = []) => [
        ...current,
        optimisticItem,
      ]);

      return { previous };
    },
    onError: (_err, _formData, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
  });

  return (
    <ItemFormDialog
      action={(formData) => mutation.mutateAsync(formData)}
      trigger={
        <Button>
          <Plus data-icon="inline-start" />
          Novo item
        </Button>
      }
      title="Novo item"
      submitLabel="Adicionar item"
    />
  );
}
