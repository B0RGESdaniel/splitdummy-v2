import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Courier_Prime, DotGothic16 } from "next/font/google";

import { BackToItemsLink } from "@/components/bills/back-to-items-link";
import { BillSummary } from "@/components/bills/bill-summary";
import { waiterForBill } from "@/lib/bill/waiter";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

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

// Fuso explícito: o servidor roda em UTC, e o cupom precisa da hora local.
const receiptDateFormat = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function formatReceiptDate(iso: string) {
  return receiptDateFormat.format(new Date(iso)).replace(",", "");
}

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
    .select("id, name, status, service_tax_percent, owner_id, created_at, closed_at")
    .eq("id", billId)
    .single();

  if (!bill) {
    notFound();
  }

  const [
    { data: participants },
    { data: items },
    { data: shares },
    { count: billNumber },
  ] = await Promise.all([
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
      // Número da conta = posição dela entre as contas do dono. Service-role
      // porque um participante não enxerga (por RLS) as outras contas do
      // dono; só a contagem sai daqui, e a conta já foi lida acima via RLS.
      createServiceRoleClient()
        .from("bills")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", bill.owner_id)
        .lte("created_at", bill.created_at),
    ]);

  const isOpen = bill.status === "open";
  const isOwner = userId === bill.owner_id;

  return (
    <div className="flex flex-1 flex-col gap-3">
      <BackToItemsLink billId={billId} />

      <div
        className={`${courierPrime.variable} ${dotGothic16.variable} flex flex-1 flex-col gap-4`}
      >
        <BillSummary
          billId={billId}
          billName={bill.name}
          billNumber={billNumber ?? 1}
          waiter={waiterForBill(bill.id)}
          receiptDate={formatReceiptDate(bill.closed_at ?? bill.created_at)}
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
