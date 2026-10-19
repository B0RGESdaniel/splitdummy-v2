import { notFound } from "next/navigation";
import Link from "next/link";
import { connection } from "next/server";

import { createItem } from "./actions";
import { ItemFormDialog } from "@/components/bills/item-form-dialog";
import { ItemsList } from "@/components/bills/items-list";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

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
        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link href={`/bills/${billId}/summary`}>Resumo</Link>
          </Button>
          {isOpen && (
            <ItemFormDialog
              action={createItem.bind(null, billId)}
              trigger={<Button>Novo item</Button>}
              title="Novo item"
              submitLabel="Adicionar item"
            />
          )}
        </div>
      </div>

      <ItemsList billId={billId} initialItems={items ?? []} isOpen={isOpen} />
    </div>
  );
}
