import { notFound } from "next/navigation";
import Link from "next/link";
import { connection } from "next/server";

import { createItem, deleteItem, updateItem } from "./actions";
import { DeleteItemButton } from "@/components/bills/delete-item-button";
import { ItemFormDialog } from "@/components/bills/item-form-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default async function ItemsPage({
  params,
}: {
  params: Promise<{ billId: string }>;
}) {
  await connection();
  const { billId } = await params;
  const supabase = await createClient();

  const { data: bill } = await supabase
    .from("bills")
    .select("id, name, status")
    .eq("id", billId)
    .single();

  if (!bill) {
    notFound();
  }

  const { data: items } = await supabase
    .from("items")
    .select("id, description, unit_price, quantity")
    .eq("bill_id", billId)
    .order("created_at", { ascending: true });

  const isOpen = bill.status === "open";

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href={`/bills/${billId}`}
            className="text-muted-foreground text-xs hover:underline"
          >
            ← {bill.name}
          </Link>
          <h1 className="text-xl font-semibold">Itens</h1>
        </div>
        {isOpen && (
          <ItemFormDialog
            action={createItem.bind(null, billId)}
            trigger={<Button>Novo item</Button>}
            title="Novo item"
            submitLabel="Adicionar item"
          />
        )}
      </div>

      {!items?.length ? (
        <p className="text-muted-foreground text-sm">
          Nenhum item adicionado ainda.
        </p>
      ) : (
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
                {isOpen && (
                  <div className="flex items-center gap-1">
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
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
