import { notFound } from "next/navigation";
import { connection } from "next/server";

import { courierPrime, dotGothic16 } from "@/app/fonts";
import { BillSummary } from "@/components/bills/bill-summary";
import { toBillParticipantsSelfFirst } from "@/lib/bill/participants";
import { waiterForBill } from "@/lib/bill/waiter";
import { createClient } from "@/lib/supabase/server";
import { getBillNumber } from "@/lib/bill/bill-number";
import { formatReceiptDate } from "@/lib/bill/receipt-date";

export const instant = false;

export default async function BillSummaryPage({
  params,
  searchParams,
}: {
  params: Promise<{ billId: string }>;
  searchParams: Promise<{ fechou?: string }>;
}) {
  await connection();
  const { billId } = await params;
  const { fechou } = await searchParams;
  const supabase = await createClient();

  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;

  const { data: bill } = await supabase
    .from("bills")
    .select("id, name, status, service_tax_percent, owner_id, created_at, closed_at, profiles(display_name)")
    .eq("id", billId)
    .single();

  if (!bill) {
    notFound();
  }

  const [
    { data: participants },
    { data: items },
    { data: shares },
    billNumber,
  ] = await Promise.all([
      supabase
        .from("bill_participants")
        .select("id, profile_id, display_name, avatar_key, profiles(display_name, avatar_key)")
        .eq("bill_id", billId)
        .order("joined_at", { ascending: true }),
      supabase
        .from("items")
        .select("id, description, unit_price, quantity")
        .eq("bill_id", billId)
        .order("created_at", { ascending: true }),
      supabase
        .from("item_shares")
        .select("item_id, participant_id, parts")
        .eq("bill_id", billId),
      getBillNumber(bill.owner_id, bill.created_at),
    ]);

  const isOpen = bill.status === "open";
  const isOwner = userId === bill.owner_id;

  return (
    <div className="flex flex-1 flex-col gap-3">

      <div
        className={`${courierPrime.variable} ${dotGothic16.variable} flex flex-1 flex-col gap-4`}
      >
        <BillSummary
          billId={billId}
          billName={bill.name}
          billNumber={billNumber}
          waiter={waiterForBill(bill.id)}
          receiptDate={formatReceiptDate(bill.closed_at ?? bill.created_at)}
          serviceTaxPercent={bill.service_tax_percent}
          isOwner={isOwner}
          ownerName={bill.profiles?.display_name?.split(" ")[0] ?? "o organizador"}
          isOpen={isOpen}
          justClosed={!isOpen && fechou === "1"}
          participants={toBillParticipantsSelfFirst(participants ?? [], userId)}
          initialItems={items ?? []}
          initialShares={shares ?? []}
        />
      </div>
    </div>
  );
}
