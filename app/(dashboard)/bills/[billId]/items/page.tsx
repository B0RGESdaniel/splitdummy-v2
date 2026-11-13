import { notFound } from "next/navigation";
import { connection } from "next/server";

import { getOrCreateActiveInvite } from "@/app/(dashboard)/bills/actions";
import { BillTabs } from "@/components/bills/bill-tabs";
import { CreateItemButton } from "@/components/bills/create-item-button";
import { InviteQrPanel } from "@/components/bills/invite-qr-panel";
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

  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;

  const { data: bill } = await supabase
    .from("bills")
    .select("id, name, status, owner_id")
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
  const isOwner = userId === bill.owner_id;
  const invite = isOwner ? await getOrCreateActiveInvite(billId) : null;

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">{bill.name}</h1>
        <div className="flex items-center gap-2">
          {isOwner && <InviteQrPanel billId={billId} invite={invite} />}
          {isOpen && <CreateItemButton billId={billId} />}
        </div>
      </div>

      <BillTabs billId={billId} />

      <ItemsList billId={billId} initialItems={items ?? []} isOpen={isOpen} />
    </div>
  );
}
