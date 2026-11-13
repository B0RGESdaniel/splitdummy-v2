import { ListOrdered, ReceiptText } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { getOrCreateActiveInvite } from "@/app/(dashboard)/bills/actions";
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

  const invite = isOwner ? await getOrCreateActiveInvite(billId) : null;

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">{bill.name}</h1>
        <Badge variant={bill.status === "open" ? "success" : "destructive"}>
          {bill.status === "open" ? "aberta" : "fechada"}
        </Badge>
      </div>

      <div className="flex flex-col gap-2">
        <Button asChild variant="outline" className="w-full justify-start">
          <Link href={`/bills/${bill.id}/items`}>
            <ListOrdered data-icon="inline-start" />
            Ver itens
          </Link>
        </Button>
        <Button asChild variant="outline" className="w-full justify-start">
          <Link href={`/bills/${bill.id}/summary`}>
            <ReceiptText data-icon="inline-start" />
            Resumo
          </Link>
        </Button>
      </div>

      {isOwner && <InviteQrPanel billId={bill.id} invite={invite} />}
    </div>
  );
}
