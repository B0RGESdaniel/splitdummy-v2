import { notFound } from "next/navigation";
import { connection } from "next/server";

import { courierPrime, dotGothic16 } from "@/app/fonts";
import { BillSummary } from "@/components/bills/bill-summary";
import { toBillParticipantsSelfFirst } from "@/lib/bill/participants";
import { waiterForBill } from "@/lib/bill/waiter";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const instant = false;

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
    { count: billNumber },
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
