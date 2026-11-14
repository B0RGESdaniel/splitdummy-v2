import { notFound } from "next/navigation";
import { connection } from "next/server";

import { CreateItemButton } from "@/components/bills/create-item-button";
import { ItemsList } from "@/components/bills/items-list";
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
    .select("id, status")
    .eq("id", billId)
    .single();

  if (!bill) {
    notFound();
  }

  const [{ data: items }, { data: participants }] = await Promise.all([
    supabase
      .from("items")
      .select("id, description, unit_price, quantity")
      .eq("bill_id", billId)
      .order("created_at", { ascending: true }),
    supabase
      .from("bill_participants")
      .select("id, display_name, profiles(display_name)")
      .eq("bill_id", billId),
  ]);

  const isOpen = bill.status === "open";

  return (
    <div className="flex flex-1 flex-col">
      <ItemsList
        billId={billId}
        initialItems={items ?? []}
        isOpen={isOpen}
        participants={(participants ?? []).map((p) => ({
          participant_id: p.id,
          display_name: p.display_name ?? p.profiles?.display_name,
        }))}
      />
      {isOpen && <CreateItemButton billId={billId} />}
    </div>
  );
}
