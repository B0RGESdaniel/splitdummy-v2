import { notFound } from "next/navigation";
import Link from "next/link";
import { connection } from "next/server";

import { BillSummary } from "@/components/bills/bill-summary";
import { Badge } from "@/components/ui/badge";
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
        .select("profile_id, profiles(display_name)")
        .eq("bill_id", billId),
      supabase
        .from("items")
        .select("id, description, unit_price, quantity")
        .eq("bill_id", billId)
        .order("created_at", { ascending: true }),
      supabase
        .from("item_shares")
        .select("item_id, profile_id, parts")
        .eq("bill_id", billId),
    ]);

  const isOpen = bill.status === "open";

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href={`/bills/${billId}/items`}
            className="text-muted-foreground text-xs hover:underline"
          >
            ← {bill.name}
          </Link>
          <h1 className="text-lg font-semibold">Resumo</h1>
        </div>
        <Badge variant={isOpen ? "success" : "destructive"}>
          {isOpen ? "aberta" : "fechada"}
        </Badge>
      </div>

      <BillSummary
        billId={billId}
        serviceTaxPercent={bill.service_tax_percent}
        isOwner={userId === bill.owner_id}
        isOpen={isOpen}
        participants={(participants ?? []).map((p) => ({
          profile_id: p.profile_id,
          display_name: p.profiles?.display_name,
        }))}
        initialItems={items ?? []}
        initialShares={shares ?? []}
      />
    </div>
  );
}
