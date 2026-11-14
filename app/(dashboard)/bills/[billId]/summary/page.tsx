import { notFound } from "next/navigation";
import { connection } from "next/server";

import { getOrCreateActiveInvite } from "@/app/(dashboard)/bills/actions";
import { BillSummary } from "@/components/bills/bill-summary";
import { BillTabs } from "@/components/bills/bill-tabs";
import { InviteQrPanel } from "@/components/bills/invite-qr-panel";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

export default async function BillSummaryPage({
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
    .select("id, name, status, service_tax_percent, owner_id")
    .eq("id", billId)
    .single();

  if (!bill) {
    notFound();
  }

  const [{ data: participants }, { data: items }, { data: shares }] =
    await Promise.all([
      supabase
        .from("bill_participants")
        .select("id, display_name, profiles(display_name)")
        .eq("bill_id", billId),
      supabase
        .from("items")
        .select("id, description, unit_price, quantity")
        .eq("bill_id", billId)
        .order("created_at", { ascending: true }),
      supabase
        .from("item_shares")
        .select("item_id, participant_id, parts")
        .eq("bill_id", billId),
    ]);

  const isOpen = bill.status === "open";
  const isOwner = userId === bill.owner_id;
  const invite = isOwner ? await getOrCreateActiveInvite(billId) : null;

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">{bill.name}</h1>
        <div className="flex items-center gap-2">
          {isOwner && <InviteQrPanel billId={billId} invite={invite} />}
        </div>
      </div>

      <BillTabs billId={billId} isOpen={isOpen} />

      <BillSummary
        billId={billId}
        serviceTaxPercent={bill.service_tax_percent}
        isOwner={isOwner}
        isOpen={isOpen}
        participants={(participants ?? []).map((p) => ({
          participant_id: p.id,
          display_name: p.display_name ?? p.profiles?.display_name,
        }))}
        initialItems={items ?? []}
        initialShares={shares ?? []}
      />
    </div>
  );
}
