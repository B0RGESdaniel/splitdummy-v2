"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

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

  if (!items.length) {
    return (
      <p className="text-muted-foreground text-sm">
        Nenhum item adicionado ainda.
      </p>
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
              <Button asChild variant="outline" size="sm">
                <Link href={`/bills/${billId}/items/${item.id}/split`}>
                  Dividir
                </Link>
              </Button>
              {isOpen && (
                <>
                  <ItemFormDialog
                    action={updateItem.bind(null, billId, item.id)}
                    trigger={
                      <Button variant="outline" size="sm">
                        Editar
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
                    action={deleteItem.bind(null, billId, item.id)}
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
