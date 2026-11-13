import { notFound } from "next/navigation";
import Link from "next/link";
import { connection } from "next/server";

import {
  addGuestParticipant,
  removeParticipant,
} from "@/app/(dashboard)/bills/[billId]/participants/actions";
import { AddGuestDialog } from "@/components/bills/add-guest-dialog";
import { RemoveParticipantButton } from "@/components/bills/remove-participant-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

export default async function ParticipantsPage({
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
    .select("id, name, status, owner_id")
    .eq("id", billId)
    .single();

  if (!bill) {
    notFound();
  }

  const { data: participants } = await supabase
    .from("bill_participants")
    .select("id, profile_id, display_name, profiles(display_name)")
    .eq("bill_id", billId)
    .order("joined_at", { ascending: true });

  const isOwner = userId === bill.owner_id;
  const isOpen = bill.status === "open";

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href={`/bills/${billId}`}
            className="text-muted-foreground text-xs hover:underline"
          >
            ← {bill.name}
          </Link>
          <h1 className="text-lg font-semibold">Participantes</h1>
        </div>
        {isOwner && isOpen && (
          <AddGuestDialog action={addGuestParticipant.bind(null, billId)} />
        )}
      </div>

      <div className="flex flex-col gap-2">
        {(participants ?? []).map((participant) => {
          const name =
            participant.display_name ?? participant.profiles?.display_name ?? "Sem nome";
          const isGuest = !participant.profile_id;
          const canRemove = isOpen && (isOwner || participant.profile_id === userId);

          return (
            <Card key={participant.id}>
              <CardContent className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{name}</span>
                  <Badge variant={isGuest ? "outline" : "secondary"}>
                    {isGuest ? "convidado" : "ativo"}
                  </Badge>
                </div>
                {canRemove && (
                  <RemoveParticipantButton
                    action={removeParticipant.bind(null, billId, participant.id)}
                  />
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
