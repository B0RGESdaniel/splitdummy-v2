import { notFound } from "next/navigation";
import Link from "next/link";
import { connection } from "next/server";

import { decrementItemPart, incrementItemPart } from "./actions";
import { PartsStepper } from "@/components/bills/parts-stepper";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { itemTotalCents, splitPartsCents } from "@/lib/split/calculate";

export const instant = false;

function formatCurrency(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default async function ItemSplitPage({
  params,
}: {
  params: Promise<{ billId: string; itemId: string }>;
}) {
  await connection();
  const { billId, itemId } = await params;
  const supabase = await createClient();

  const { data: bill } = await supabase
    .from("bills")
    .select("id, name, status")
    .eq("id", billId)
    .single();

  if (!bill) {
    notFound();
  }

  const { data: item } = await supabase
    .from("items")
    .select("id, description, unit_price, quantity")
    .eq("id", itemId)
    .eq("bill_id", billId)
    .single();

  if (!item) {
    notFound();
  }

  const [{ data: participants }, { data: shares }] = await Promise.all([
    supabase
      .from("bill_participants")
      .select("profile_id, profiles(display_name)")
      .eq("bill_id", billId),
    supabase
      .from("item_shares")
      .select("profile_id, parts")
      .eq("item_id", itemId),
  ]);

  const isOpen = bill.status === "open";
  const partsByProfile = new Map(
    (shares ?? []).map((share) => [share.profile_id, share.parts ?? 0]),
  );

  const totalCents = itemTotalCents({
    quantity: item.quantity,
    unitPrice: item.unit_price,
  });

  const totalParts = [...partsByProfile.values()].reduce(
    (sum, parts) => sum + parts,
    0,
  );

  const amountsByProfile =
    totalParts > 0
      ? splitPartsCents(
          totalCents,
          (participants ?? []).map((p) => ({
            profileId: p.profile_id,
            parts: partsByProfile.get(p.profile_id) ?? 0,
          })),
        )
      : null;

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div>
        <Link
          href={`/bills/${billId}/items`}
          className="text-muted-foreground text-xs hover:underline"
        >
          ← Itens
        </Link>
        <h1 className="text-xl font-semibold">{item.description}</h1>
        <p className="text-muted-foreground text-sm">
          {item.quantity} × {formatCurrency(Math.round(item.unit_price * 100))}{" "}
          = {formatCurrency(totalCents)}
        </p>
      </div>

      {totalParts === 0 && (
        <p className="text-sm text-amber-600">
          Este item ainda não foi dividido entre os participantes.
        </p>
      )}

      <div className="flex flex-col gap-2">
        {(participants ?? []).map((participant) => {
          const parts = partsByProfile.get(participant.profile_id) ?? 0;
          const amount = amountsByProfile?.get(participant.profile_id) ?? 0;

          return (
            <Card key={participant.profile_id}>
              <CardContent className="flex items-center justify-between gap-4">
                <span className="font-medium">
                  {participant.profiles?.display_name}
                </span>
                <div className="flex items-center gap-4">
                  <PartsStepper
                    parts={parts}
                    disabled={!isOpen}
                    increment={incrementItemPart.bind(
                      null,
                      billId,
                      itemId,
                      participant.profile_id,
                    )}
                    decrement={decrementItemPart.bind(
                      null,
                      billId,
                      itemId,
                      participant.profile_id,
                    )}
                  />
                  <span className="text-muted-foreground w-20 text-right text-sm">
                    {amountsByProfile ? formatCurrency(amount) : "—"}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
