import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";

import { BackToItemsLink } from "@/components/bills/back-to-items-link";
import { ReceiptScanner } from "@/components/bills/receipt-scanner";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

export default async function ReceiptPage({
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

  if (bill.status !== "open") {
    redirect(`/bills/${billId}/items`);
  }

  const { count } = await supabase
    .from("items")
    .select("id", { count: "exact", head: true })
    .eq("bill_id", billId);

  return (
    <div className="flex flex-1 flex-col gap-4">
      <BackToItemsLink billId={billId} />
      <h1 className="font-mono text-sm uppercase tracking-wide text-foreground">
        Escanear cupom
      </h1>
      <ReceiptScanner billId={billId} existingItemsCount={count ?? 0} />
    </div>
  );
}
