import { Fragment } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import {
  addGuestParticipant,
  removeParticipant,
  setOwnAvatar,
} from "@/app/(bill)/bills/[billId]/participants/actions";
import { AddGuestDialog } from "@/components/bills/add-guest-dialog";
import { AvatarIcon, type AvatarKey } from "@/components/bills/avatar-icon";
import { BackToItemsLink } from "@/components/bills/back-to-items-link";
import { RemoveParticipantButton } from "@/components/bills/remove-participant-button";
import { SelfAvatarDialog } from "@/components/bills/self-avatar-dialog";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

type Participant = {
  id: string;
  name: string;
  avatarKey: AvatarKey | null;
  isGuest: boolean;
  isBillOwner: boolean;
  isSelf: boolean;
  canRemove: boolean;
};

type Seat = { kind: "participant"; participant: Participant } | { kind: "empty" };

function PendingAvatarSlot({ size }: { size: "sm" | "lg" }) {
  const dimension = size === "lg" ? "h-12 w-12 text-xl" : "h-10 w-10 text-lg";
  return (
    <div
      className={`flex items-center justify-center border-2 border-dashed border-foreground font-bold text-foreground opacity-40 ${dimension}`}
    >
      +
    </div>
  );
}

function AvatarSlot({
  billId,
  participant,
  size,
}: {
  billId: string;
  participant: Participant;
  size: "sm" | "lg";
}) {
  if (participant.avatarKey) {
    return (
      <AvatarIcon
        avatarKey={participant.avatarKey}
        className={size === "lg" ? "h-12 w-12 text-foreground" : "h-10 w-10 text-foreground"}
      />
    );
  }

  if (!participant.isSelf) {
    return <PendingAvatarSlot size={size} />;
  }

  const dimension = size === "lg" ? "h-12 w-12 text-xl" : "h-10 w-10 text-lg";

  return (
    <SelfAvatarDialog
      action={setOwnAvatar.bind(null, billId)}
      trigger={
        <button
          type="button"
          aria-label="Escolher meu avatar"
          className={`flex items-center justify-center border-2 border-dashed border-foreground font-bold text-foreground opacity-70 ${dimension}`}
        >
          +
        </button>
      }
    />
  );
}

function EmptySeatSlot({ billId }: { billId: string }) {
  return (
    <div className="flex w-16 flex-col items-center gap-1">
      <AddGuestDialog
        action={addGuestParticipant.bind(null, billId)}
        trigger={
          <button
            type="button"
            aria-label="Adicionar convidado"
            className="flex h-10 w-10 items-center justify-center border-2 border-dashed border-foreground text-lg font-bold text-foreground opacity-70"
          >
            +
          </button>
        }
      />
      <span className="text-[10px] font-medium text-muted-foreground opacity-70">
        Próxima vaga
      </span>
    </div>
  );
}

function ParticipantSeat({ billId, participant }: { billId: string; participant: Participant }) {
  return (
    <div className="flex w-16 flex-col items-center gap-1">
      <AvatarSlot billId={billId} participant={participant} size="sm" />
      <span className="truncate text-xs font-semibold text-foreground">{participant.name}</span>
      {participant.isGuest && (
        <Badge variant="outline" className="border-dashed">
          convidado
        </Badge>
      )}
      {participant.canRemove && (
        <RemoveParticipantButton
          action={removeParticipant.bind(null, billId, participant.id)}
        />
      )}
    </div>
  );
}

function Slot({
  billId,
  seat,
  align,
}: {
  billId: string;
  seat: Seat | undefined;
  align: "start" | "end";
}) {
  const alignClass = align === "end" ? "justify-self-end -mr-2" : "justify-self-start -ml-2";

  if (!seat) {
    return <div />;
  }

  return (
    <div className={alignClass}>
      {seat.kind === "empty" ? (
        <EmptySeatSlot billId={billId} />
      ) : (
        <ParticipantSeat billId={billId} participant={seat.participant} />
      )}
    </div>
  );
}

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

  const { data: participantRows } = await supabase
    .from("bill_participants")
    .select("id, profile_id, display_name, avatar_key, profiles(display_name, avatar_key)")
    .eq("bill_id", billId)
    .order("joined_at", { ascending: true });

  const isOwner = userId === bill.owner_id;
  const isOpen = bill.status === "open";

  const participants: Participant[] = (participantRows ?? []).map((row) => {
    const isBillOwner = row.profile_id === bill.owner_id;
    const isSelf = row.profile_id === userId;

    return {
      id: row.id,
      name: row.display_name ?? row.profiles?.display_name ?? "Sem nome",
      avatarKey: (row.avatar_key ?? row.profiles?.avatar_key ?? null) as AvatarKey | null,
      isGuest: !row.profile_id,
      isBillOwner,
      isSelf,
      canRemove: isOpen && !isBillOwner && (isOwner || isSelf),
    };
  });

  const owner = participants.find((participant) => participant.isBillOwner);
  const others = participants.filter((participant) => !participant.isBillOwner);

  const seats: Seat[] = others.map((participant) => ({ kind: "participant", participant }));
  if (isOwner && isOpen) {
    seats.push({ kind: "empty" });
  }

  const rows: [Seat | undefined, Seat | undefined][] = [];
  for (let i = 0; i < seats.length; i += 2) {
    rows.push([seats[i], seats[i + 1]]);
  }

  return (
    <div className="flex flex-1 flex-col gap-3">
      <BackToItemsLink billId={billId} />

      {isOwner && isOpen && (
        <div className="flex justify-end pb-2">
          <AddGuestDialog action={addGuestParticipant.bind(null, billId)} />
        </div>
      )}

      <div className="grid grid-cols-[minmax(3.5rem,1fr)_5.5rem_minmax(3.5rem,1fr)] items-center justify-center gap-x-2 gap-y-6 py-2">
        {owner && (
          <div className="col-span-3 -mb-3 flex flex-col items-center justify-self-center gap-1">
            <AvatarSlot billId={billId} participant={owner} size="lg" />
            <span className="text-sm font-semibold text-foreground">{owner.name}</span>
            <Badge>dono</Badge>
          </div>
        )}

        {rows.map((row, index) => (
          <Fragment key={index}>
            <Slot billId={billId} seat={row[0]} align="end" />
            {index === 0 && (
              <div
                className="border-[1.5px] border-foreground bg-muted"
                style={{ gridColumn: "2", gridRow: `2 / span ${rows.length}` }}
              />
            )}
            <Slot billId={billId} seat={row[1]} align="start" />
          </Fragment>
        ))}
      </div>
    </div>
  );
}
