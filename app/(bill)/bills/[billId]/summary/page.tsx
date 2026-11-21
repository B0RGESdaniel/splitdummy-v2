import { notFound } from "next/navigation";

import { courierPrime, dotGothic16 } from "@/app/fonts";
import { BillSummary } from "@/components/bills/bill-summary";
import { toBillParticipantsSelfFirst } from "@/lib/bill/participants";
import { waiterForBill } from "@/lib/bill/waiter";
import { getSupabase, requireUser } from "@/lib/auth/session";
import { getBill, getBillParticipantRows } from "@/lib/bill/bill-queries";
import { getBillNumber } from "@/lib/bill/bill-number";
import { formatReceiptDate } from "@/lib/bill/receipt-date";

export default async function BillSummaryPage({
  params,
  searchParams,
}: {
  params: Promise<{ billId: string }>;
  searchParams: Promise<{ fechou?: string }>;
}) {
  const { billId } = await params;
  const { fechou } = await searchParams;
  const userId = await requireUser(`/bills/${billId}`);
  const supabase = await getSupabase();
  const bill = await getBill(billId);

  if (!bill) {
    notFound();
  }

  const [
    participants,
    { data: items },
    { data: shares },
    billNumber,
  ] = await Promise.all([
      getBillParticipantRows(billId),
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
          participants={toBillParticipantsSelfFirst(participants, userId)}
          initialItems={items ?? []}
          initialShares={shares ?? []}
        />
      </div>
    </div>
  );
}
