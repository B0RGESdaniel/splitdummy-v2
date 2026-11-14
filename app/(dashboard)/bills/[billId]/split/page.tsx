import { notFound } from "next/navigation";
import { connection } from "next/server";

import { SplitWorkspace } from "@/components/bills/split-workspace";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

export default async function SplitPage({
  params,
  searchParams,
}: {
  params: Promise<{ billId: string }>;
  searchParams: Promise<{ item?: string }>;
}) {
  await connection();
  const { billId } = await params;
  const { item } = await searchParams;
  const supabase = await createClient();

  const { data: bill } = await supabase
    .from("bills")
    .select("id, status")
    .eq("id", billId)
    .single();

  if (!bill) {
    notFound();
  }

  const [{ data: items }, { data: participants }, { data: shares }] =
    await Promise.all([
      supabase
        .from("items")
        .select("id, description, unit_price, quantity")
        .eq("bill_id", billId)
        .order("created_at", { ascending: true }),
      supabase
        .from("bill_participants")
        .select("id, display_name, profiles(display_name)")
        .eq("bill_id", billId),
      supabase
        .from("item_shares")
        .select("item_id, participant_id, parts")
        .eq("bill_id", billId),
    ]);

  const sharesByItem: Record<string, { participant_id: string; parts: number | null }[]> = {};
  for (const share of shares ?? []) {
    (sharesByItem[share.item_id] ??= []).push({
      participant_id: share.participant_id,
      parts: share.parts,
    });
  }

  return (
    <div className="flex flex-1 flex-col">
      <SplitWorkspace
        billId={billId}
        initialItems={items ?? []}
        isOpen={bill.status === "open"}
        participants={(participants ?? []).map((p) => ({
          participant_id: p.id,
          display_name: p.display_name ?? p.profiles?.display_name,
        }))}
        initialSharesByItem={sharesByItem}
        initialSelectedItemId={item ?? null}
      />
    </div>
  );
}
