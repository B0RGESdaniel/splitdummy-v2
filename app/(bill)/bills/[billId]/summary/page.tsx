import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Courier_Prime, DotGothic16 } from "next/font/google";

import { BackToItemsLink } from "@/components/bills/back-to-items-link";
import { BillSummary } from "@/components/bills/bill-summary";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

const courierPrime = Courier_Prime({
  variable: "--font-receipt-base",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const dotGothic16 = DotGothic16({
  variable: "--font-receipt-digits",
  subsets: ["latin"],
  weight: ["400"],
});

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
    .select("id, status, service_tax_percent, owner_id")
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

  return (
    <div className="flex flex-1 flex-col gap-3">
      <BackToItemsLink billId={billId} />

      <div
        className={`${courierPrime.variable} ${dotGothic16.variable} cupom-fiscal flex flex-1 flex-col gap-4`}
      >
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
    </div>
  );
}
