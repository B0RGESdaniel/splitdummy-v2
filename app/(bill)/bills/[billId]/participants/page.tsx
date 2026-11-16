import { notFound } from "next/navigation";
import { connection } from "next/server";

import {
  addGuestParticipant,
  removeParticipant,
} from "@/app/(bill)/bills/[billId]/participants/actions";
import { AddGuestDialog } from "@/components/bills/add-guest-dialog";
import { BackToItemsLink } from "@/components/bills/back-to-items-link";
import { RemoveParticipantButton } from "@/components/bills/remove-participant-button";
import { Badge } from "@/components/ui/badge";
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
    .select("id, status, owner_id")
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
    <div className="flex flex-1 flex-col gap-3">
      <BackToItemsLink billId={billId} />

      {isOwner && isOpen && (
        <div className="flex justify-end pb-2">
          <AddGuestDialog action={addGuestParticipant.bind(null, billId)} />
        </div>
      )}

      <ul className="flex flex-col divide-y divide-border">
        {(participants ?? []).map((participant) => {
          const name =
            participant.display_name ?? participant.profiles?.display_name ?? "Sem nome";
          const isGuest = !participant.profile_id;
          const isBillOwner = participant.profile_id === bill.owner_id;
          const canRemove =
            isOpen && !isBillOwner && (isOwner || participant.profile_id === userId);

          return (
            <li key={participant.id} className="flex items-center justify-between gap-4 py-3">
              <div className="flex items-center gap-2">
                <span className="text-base font-semibold text-foreground">
                  {name}
                </span>
                {isBillOwner ? (
                  <Badge>dono</Badge>
                ) : (
                  <Badge variant="outline" className={isGuest ? "border-dashed" : undefined}>
                    {isGuest ? "convidado" : "ativo"}
                  </Badge>
                )}
              </div>
              {canRemove && (
                <RemoveParticipantButton
                  action={removeParticipant.bind(null, billId, participant.id)}
                />
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
