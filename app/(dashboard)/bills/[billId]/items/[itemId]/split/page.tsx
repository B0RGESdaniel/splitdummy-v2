import { notFound } from "next/navigation";
import Link from "next/link";
import { connection } from "next/server";

import { ItemSplit } from "@/components/bills/item-split";
import { createClient } from "@/lib/supabase/server";
import { itemTotalCents } from "@/lib/split/calculate";

export const instant = false;

function formatCurrency(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default async function ItemSplitPage({
  params,
}: {
  params: Promise<{ billId: string; itemId: string }>;
}) {
  await connection();
  const { billId, itemId } = await params;
  const supabase = await createClient();

  const { data: bill } = await supabase
    .from("bills")
    .select("id, name, status")
    .eq("id", billId)
    .single();

  if (!bill) {
    notFound();
  }

  const { data: item } = await supabase
    .from("items")
    .select("id, description, unit_price, quantity")
    .eq("id", itemId)
    .eq("bill_id", billId)
    .single();

  if (!item) {
    notFound();
  }

  const [{ data: participants }, { data: shares }] = await Promise.all([
    supabase
      .from("bill_participants")
      .select("profile_id, profiles(display_name)")
      .eq("bill_id", billId),
    supabase
      .from("item_shares")
      .select("profile_id, parts")
      .eq("item_id", itemId),
  ]);

  const totalCents = itemTotalCents({
    quantity: item.quantity,
    unitPrice: item.unit_price,
  });

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div>
        <Link
          href={`/bills/${billId}/items`}
          className="text-muted-foreground text-xs hover:underline"
        >
          ← Itens
        </Link>
        <h1 className="text-lg font-semibold">{item.description}</h1>
        <p className="text-muted-foreground text-sm">
          {item.quantity} × {formatCurrency(Math.round(item.unit_price * 100))}{" "}
          = {formatCurrency(totalCents)}
        </p>
      </div>

      <ItemSplit
        billId={billId}
        itemId={itemId}
        totalCents={totalCents}
        isOpen={bill.status === "open"}
        participants={(participants ?? []).map((p) => ({
          profile_id: p.profile_id,
          display_name: p.profiles?.display_name,
        }))}
        initialShares={shares ?? []}
      />
    </div>
  );
}
