import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { InviteQrPanel } from "@/components/bills/invite-qr-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

export default async function BillPage({
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

  const isOwner = userId === bill.owner_id;

  const { data: invite } = isOwner
    ? await supabase
        .from("bill_invites")
        .select("id, token")
        .eq("bill_id", billId)
        .is("revoked_at", null)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null };

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{bill.name}</h1>
        <Badge variant={bill.status === "open" ? "default" : "secondary"}>
          {bill.status === "open" ? "aberta" : "fechada"}
        </Badge>
      </div>

      {isOwner && <InviteQrPanel billId={bill.id} invite={invite} />}

      <div className="flex gap-2">
        <Button asChild variant="outline" className="w-fit">
          <Link href={`/bills/${bill.id}/items`}>Ver itens</Link>
        </Button>
        <Button asChild variant="outline" className="w-fit">
          <Link href={`/bills/${bill.id}/summary`}>Resumo</Link>
        </Button>
      </div>
    </div>
  );
}
