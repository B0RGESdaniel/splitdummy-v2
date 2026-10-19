import { notFound } from "next/navigation";
import Link from "next/link";
import { connection } from "next/server";

import { closeBill } from "../../actions";
import { CloseBillButton } from "@/components/bills/close-bill-button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import {
  applyServiceTax,
  calculateBillTotals,
  getUnsplitItemIds,
  type ItemForSplit,
} from "@/lib/split/calculate";
import type { PartsShareInput } from "@/lib/split/validate";

export const instant = false;

function formatCurrency(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
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
        .eq("bill_id", billId),
      supabase
        .from("item_shares")
        .select("item_id, profile_id, parts")
        .eq("bill_id", billId),
    ]);

  const sharesByItem = new Map<string, PartsShareInput[]>();
  for (const share of shares ?? []) {
    const list = sharesByItem.get(share.item_id) ?? [];
    list.push({ profileId: share.profile_id, parts: share.parts ?? 0 });
    sharesByItem.set(share.item_id, list);
  }

  const itemsForSplit: ItemForSplit[] = (items ?? []).map((item) => ({
    id: item.id,
    quantity: item.quantity,
    unitPrice: item.unit_price,
    shares: sharesByItem.get(item.id) ?? [],
  }));

  const subtotals = calculateBillTotals(itemsForSplit);
  const totalsWithTax = applyServiceTax(subtotals, bill.service_tax_percent);

  const unsplitItemIds = new Set(getUnsplitItemIds(itemsForSplit));
  const unsplitDescriptions = (items ?? [])
    .filter((item) => unsplitItemIds.has(item.id))
    .map((item) => item.description);

  const grandTotalCents = [...totalsWithTax.values()].reduce(
    (sum, v) => sum + v,
    0,
  );

  const isOwner = userId === bill.owner_id;
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
          <h1 className="text-xl font-semibold">Resumo</h1>
        </div>
        <Badge variant={isOpen ? "default" : "secondary"}>
          {isOpen ? "aberta" : "fechada"}
        </Badge>
      </div>

      {unsplitDescriptions.length > 0 && (
        <Alert variant="destructive">
          <AlertTitle>Itens ainda não divididos</AlertTitle>
          <AlertDescription>
            <ul className="list-inside list-disc">
              {unsplitDescriptions.map((description) => (
                <li key={description}>{description}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-2">
        {(participants ?? []).map((participant) => {
          const subtotal = subtotals.get(participant.profile_id) ?? 0;
          const total = totalsWithTax.get(participant.profile_id) ?? 0;

          return (
            <Card key={participant.profile_id}>
              <CardContent className="flex items-center justify-between gap-4">
                <span className="font-medium">
                  {participant.profiles?.display_name}
                </span>
                <div className="flex flex-col items-end">
                  <span className="font-semibold">
                    {formatCurrency(total)}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {formatCurrency(subtotal)} + taxa
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex items-center justify-between border-t pt-4">
        <div>
          <p className="text-muted-foreground text-xs">
            Taxa de serviço: {bill.service_tax_percent}%
          </p>
          <p className="text-lg font-semibold">
            Total: {formatCurrency(grandTotalCents)}
          </p>
        </div>
        {isOwner && isOpen && (
          <CloseBillButton action={closeBill.bind(null, billId)} />
        )}
      </div>
    </div>
  );
}
