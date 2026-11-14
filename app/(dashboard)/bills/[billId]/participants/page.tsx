import { notFound } from "next/navigation";
import { connection } from "next/server";

import { getOrCreateActiveInvite } from "@/app/(dashboard)/bills/actions";
import {
  addGuestParticipant,
  removeParticipant,
} from "@/app/(dashboard)/bills/[billId]/participants/actions";
import { AddGuestDialog } from "@/components/bills/add-guest-dialog";
import { BillTabs } from "@/components/bills/bill-tabs";
import { InviteQrPanel } from "@/components/bills/invite-qr-panel";
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
  const invite = isOwner ? await getOrCreateActiveInvite(billId) : null;

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">{bill.name}</h1>
        <div className="flex items-center gap-2">
          {isOwner && <InviteQrPanel billId={billId} invite={invite} />}
          {isOwner && isOpen && (
            <AddGuestDialog action={addGuestParticipant.bind(null, billId)} />
          )}
        </div>
      </div>

      <BillTabs billId={billId} isOpen={isOpen} />

      <div className="flex flex-col gap-2">
        {(participants ?? []).map((participant) => {
          const name =
            participant.display_name ?? participant.profiles?.display_name ?? "Sem nome";
          const isGuest = !participant.profile_id;
          const isBillOwner = participant.profile_id === bill.owner_id;
          const canRemove =
            isOpen && !isBillOwner && (isOwner || participant.profile_id === userId);

          return (
            <Card key={participant.id}>
              <CardContent className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{name}</span>
                  {isBillOwner ? (
                    <Badge variant="secondary">dono</Badge>
                  ) : (
                    <Badge variant={isGuest ? "outline" : "secondary"}>
                      {isGuest ? "convidado" : "ativo"}
                    </Badge>
                  )}
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
