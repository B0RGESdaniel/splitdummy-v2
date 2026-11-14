"use client";

import { Divide, Pencil } from "lucide-react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { deleteItem, updateItem } from "@/app/(dashboard)/bills/[billId]/items/actions";
import { DeleteItemButton } from "@/components/bills/delete-item-button";
import { ItemFormDialog } from "@/components/bills/item-form-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { useRealtimeTable } from "@/lib/realtime/use-realtime-table";

type Item = {
  id: string;
  description: string;
  unit_price: number;
  quantity: number;
};

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
}: {
  billId: string;
  initialItems: Item[];
  isOpen: boolean;
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

  useRealtimeTable({ table: "items", billId, queryKey });

  const updateMutation = useMutation({
    mutationFn: ({ itemId, formData }: { itemId: string; formData: FormData }) =>
      updateItem(billId, itemId, formData),
    onMutate: async ({ itemId, formData }) => {
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

  if (!items.length) {
    return (
      <Card className="border-dashed bg-transparent ring-foreground/15">
        <CardContent className="text-center text-sm text-muted-foreground">
          Nenhum item cadastrado ainda.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {items.map((item) => (
        <Card key={item.id}>
          <CardContent className="flex items-center justify-between gap-4">
            <div className="flex flex-col">
              <span className="font-medium">{item.description}</span>
              <span className="text-muted-foreground text-xs">
                {item.quantity} × {formatCurrency(item.unit_price)} ={" "}
                {formatCurrency(item.unit_price * item.quantity)}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Button asChild variant="outline" size="icon-sm" aria-label="Dividir item">
                <Link href={`/bills/${billId}/split?item=${item.id}`}>
                  <Divide />
                </Link>
              </Button>
              {isOpen && (
                <>
                  <ItemFormDialog
                    action={(formData) =>
                      updateMutation.mutateAsync({ itemId: item.id, formData })
                    }
                    trigger={
                      <Button variant="outline" size="icon-sm" aria-label="Editar item">
                        <Pencil />
                      </Button>
                    }
                    title="Editar item"
                    submitLabel="Salvar"
                    initialValues={{
                      description: item.description,
                      unit_price: item.unit_price,
                      quantity: item.quantity,
                    }}
                  />
                  <DeleteItemButton
                    action={() => deleteMutation.mutateAsync(item.id)}
                  />
                </>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
