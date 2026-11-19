import { ChevronRight, ConciergeBell } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { connection } from "next/server";

import { BillStatusBadge } from "@/components/bills/bill-status-badge";
import { CreateItemButton } from "@/components/bills/create-item-button";
import { ItemsList } from "@/components/bills/items-list";
import { ReceiptScanButton } from "@/components/bills/receipt-scan-button";
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
    .select("id, status, profiles(display_name)")
    .eq("id", billId)
    .single();

  if (!bill) {
    notFound();
  }

  if (bill.status === "closed") {
    redirect(`/bills/${billId}/summary`);
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
    <div className="flex flex-1 flex-col gap-3">
      <div className="grid grid-cols-[1fr_1fr_0.8fr] border-[1.5px] border-foreground text-xs">
        <div className="border-r-[1.5px] border-foreground px-3 py-2">
          <div className="font-mono text-[11px] uppercase tracking-wide text-foreground">
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
          <div className="flex items-center gap-1 font-mono text-[11px] uppercase tracking-wide text-foreground">
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
        isOpen={isOpen}
        participants={(participants ?? []).map((p) => ({
          participant_id: p.id,
          display_name: p.display_name ?? p.profiles?.display_name,
        }))}
      />
      {isOpen && (
        <ReceiptScanButton billId={billId} existingItemsCount={items?.length ?? 0} />
      )}
      {isOpen && <CreateItemButton billId={billId} />}

      <Button asChild className="mt-4 w-full justify-center gap-2">
        <Link href={`/bills/${billId}/summary`}>
          <ConciergeBell />
          fecha para mim
        </Link>
      </Button>
    </div>
  );
}
