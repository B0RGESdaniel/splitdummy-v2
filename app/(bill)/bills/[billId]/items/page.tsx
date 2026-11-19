import { ChevronRight } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { connection } from "next/server";

import { BillStatusBadge } from "@/components/bills/bill-status-badge";
import { CloseForMeButton } from "@/components/bills/close-for-me-button";
import { CreateItemButton } from "@/components/bills/create-item-button";
import { ItemsList } from "@/components/bills/items-list";
import { ReceiptScanButton } from "@/components/bills/receipt-scan-button";
import { toBillParticipantsSelfFirst } from "@/lib/bill/participants";
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
    .select("id, status, profiles(display_name)")
    .eq("id", billId)
    .single();

  if (!bill) {
    notFound();
  }

  if (bill.status === "closed") {
    redirect(`/bills/${billId}/summary`);
  }

  const [{ data: items }, { data: participants }, { data: shares }] = await Promise.all([
    supabase
      .from("items")
      .select("id, description, unit_price, quantity")
      .eq("bill_id", billId)
      .order("created_at", { ascending: true }),
    supabase
      .from("bill_participants")
      .select("id, profile_id, display_name, avatar_key, profiles(display_name, avatar_key)")
      .eq("bill_id", billId)
      .order("joined_at", { ascending: true }),
    supabase
      .from("item_shares")
      .select("item_id, participant_id, parts")
      .eq("bill_id", billId),
  ]);

  const isOpen = bill.status === "open";

  return (
    <div className="flex flex-1 flex-col gap-3">
      <div className="grid grid-cols-[1fr_1fr_0.8fr] border-[1.5px] border-foreground text-xs">
        <div className="border-r-[1.5px] border-foreground px-3 py-2">
          <div className="text-[11px] uppercase tracking-wide text-foreground">
            Dono
          </div>
          <div className="translate-y-[5px] truncate font-handwritten text-lg text-[color:var(--ink-handwritten)]">
            {bill.profiles?.display_name?.split(" ")[0] ?? "—"}
          </div>
        </div>
        <Link
          href={`/bills/${billId}/participants`}
          className="border-r-[1.5px] border-foreground px-3 py-2 hover:bg-muted"
        >
          <div className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-foreground">
            Participantes
            <ChevronRight className="size-3" />
          </div>
          <div className="translate-y-[5px] font-handwritten text-lg text-[color:var(--ink-handwritten)]">
            {participants?.length ?? 0}
          </div>
        </Link>
        <div className="flex items-center justify-center px-3 py-2">
          <BillStatusBadge isOpen={isOpen} />
        </div>
      </div>

      <ItemsList
        billId={billId}
        initialItems={items ?? []}
        initialShares={shares ?? []}
        isOpen={isOpen}
        participants={toBillParticipantsSelfFirst(participants ?? [], userId)}
      />
      {isOpen && <CreateItemButton billId={billId} />}
      {isOpen && (
        <ReceiptScanButton billId={billId} existingItemsCount={items?.length ?? 0} />
      )}

      <CloseForMeButton billId={billId} />
    </div>
  );
}
