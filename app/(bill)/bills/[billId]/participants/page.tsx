import { Fragment } from "react";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";

import {
  addGuestParticipant,
  importParticipants,
  removeParticipant,
  setOwnAvatar,
} from "@/app/(bill)/bills/[billId]/participants/actions";
import { AddGuestDialog } from "@/components/bills/add-guest-dialog";
import { AvatarIcon, type AvatarKey } from "@/components/bills/avatar-icon";
import { ImportParticipantsDialog } from "@/components/bills/import-participants-dialog";
import { SeatDialog } from "@/components/bills/seat-dialog";
import {
  buildParticipantBreakdowns,
  type ParticipantBreakdown,
} from "@/lib/split/breakdown";
import type { PartsShareInput } from "@/lib/split/validate";
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
  breakdown: ParticipantBreakdown;
};

type SeatContext = { billId: string; serviceTaxPercent: number };

type Seat =
  | { kind: "participant"; participant: Participant }
  | { kind: "empty" };

// Chave estável por participante: sem isso, remover alguém da lista não
// desmonta o diálogo de confirmação daquele assento (só reposiciona o
// próximo participante no mesmo lugar da árvore React), e o estado "aberto"
// do diálogo vaza pra ele — próximo clique confirma a exclusão errada.
function seatKey(seat: Seat | undefined, fallback: string) {
  if (!seat) return fallback;
  return seat.kind === "empty" ? "empty-seat" : seat.participant.id;
}

function PendingAvatarSlot() {
  return (
    <div className="flex h-12 w-12 items-center justify-center border-2 border-dashed border-foreground text-lg font-bold text-foreground opacity-40">
      +
    </div>
  );
}

function roleLabel(participant: Participant) {
  if (participant.isBillOwner) return "Organizador";
  return participant.isGuest ? "Na mesa" : "Colaborando";
}

// Papel da pessoa como carimbo sobre a base do avatar: azul cheio pro
// organizador, papel sombreado pra quem entrou com login ("colaborando"),
// papel claro com borda no tom secundário pra quem só tem o nome ("na mesa").
// Fundo sempre opaco, pra não se misturar com o desenho do avatar.
function RoleStamp({ participant }: { participant: Participant }) {
  const tone = participant.isBillOwner
    ? "bg-primary text-primary-foreground shadow-[0_0_0_1.5px_var(--background)]"
    : participant.isGuest
      ? "bg-background text-muted-foreground shadow-[inset_0_0_0_1px_currentColor,0_0_0_1.5px_var(--background)]"
      : "bg-[color-mix(in_srgb,var(--primary)_12%,var(--background))] text-foreground shadow-[0_0_0_1.5px_var(--background)]";

  return (
    <span
      className={`absolute -bottom-1.5 left-1/2 -translate-x-1/2 -rotate-6 whitespace-nowrap px-1 py-0.5 text-[10px] font-bold uppercase leading-none tracking-[0.06em] ${tone}`}
    >
      {roleLabel(participant)}
    </span>
  );
}

function AvatarSlot({ participant }: { participant: Participant }) {
  return (
    <span className="relative mb-2 block">
      {participant.avatarKey ? (
        <AvatarIcon
          avatarKey={participant.avatarKey}
          className="h-12 w-12 text-foreground"
        />
      ) : (
        <PendingAvatarSlot />
      )}
      <RoleStamp participant={participant} />
    </span>
  );
}

function SeatName({ participant }: { participant: Participant }) {
  return (
    <span className="flex max-w-full flex-col items-center text-xs font-semibold uppercase text-foreground">
      <span className="max-w-full truncate">{participant.name}</span>
      {participant.isSelf && (
        <span className="text-[11px] font-normal text-muted-foreground">você</span>
      )}
    </span>
  );
}

// O assento inteiro (avatar + nome) abre o parcial da pessoa; trocar o
// próprio avatar e remover participante moram dentro do modal.
function SeatButton({
  context,
  participant,
  className,
  children,
}: {
  context: SeatContext;
  participant: Participant;
  className: string;
  children: React.ReactNode;
}) {
  return (
    <SeatDialog
      name={participant.name}
      avatarKey={participant.avatarKey}
      isSelf={participant.isSelf}
      breakdown={participant.breakdown}
      serviceTaxPercent={context.serviceTaxPercent}
      setAvatarAction={
        participant.isSelf ? setOwnAvatar.bind(null, context.billId) : undefined
      }
      removeAction={
        participant.canRemove
          ? removeParticipant.bind(null, context.billId, participant.id)
          : undefined
      }
      trigger={
        <button
          type="button"
          aria-label={`Ver parcial de ${participant.name}${
            participant.isSelf ? ", você" : ""
          } (${roleLabel(participant).toLowerCase()})`}
          className={className}
        >
          {children}
        </button>
      }
    />
  );
}

function EmptySeatSlot({ billId }: { billId: string }) {
  return (
    <div className="flex w-20 flex-col items-center gap-1">
      <AddGuestDialog
        action={addGuestParticipant.bind(null, billId)}
        trigger={
          <button
            type="button"
            aria-label="Adicionar participante"
            className="flex h-12 w-12 items-center justify-center border-2 border-dashed border-foreground text-lg font-bold text-foreground opacity-70"
          >
            +
          </button>
        }
      />
      <span className="text-[11px] font-medium text-muted-foreground">
        Próxima vaga
      </span>
    </div>
  );
}

function ParticipantSeat({
  context,
  participant,
}: {
  context: SeatContext;
  participant: Participant;
}) {
  return (
    <div className="flex w-20 flex-col items-center gap-1">
      <SeatButton
        context={context}
        participant={participant}
        className="flex w-full flex-col items-center gap-1"
      >
        <AvatarSlot participant={participant} />
        <SeatName participant={participant} />
      </SeatButton>
    </div>
  );
}

function Slot({
  context,
  seat,
  align,
}: {
  context: SeatContext;
  seat: Seat | undefined;
  align: "start" | "end";
}) {
  const alignClass =
    align === "end" ? "justify-self-end mr-2.5" : "justify-self-start ml-2.5";

  if (!seat) {
    return <div />;
  }

  return (
    <div className={alignClass}>
      {seat.kind === "empty" ? (
        <EmptySeatSlot billId={context.billId} />
      ) : (
        <ParticipantSeat context={context} participant={seat.participant} />
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
    .select("id, name, status, owner_id, service_tax_percent")
    .eq("id", billId)
    .single();

  if (!bill) {
    notFound();
  }

  if (bill.status === "closed") {
    redirect(`/bills/${billId}/summary`);
  }

  const [{ data: participantRows }, { data: items }, { data: shares }] =
    await Promise.all([
      supabase
        .from("bill_participants")
        .select(
          "id, profile_id, display_name, avatar_key, profiles(display_name, avatar_key)",
        )
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
    ]);

  const sharesByItem = new Map<string, PartsShareInput[]>();
  for (const share of shares ?? []) {
    const list = sharesByItem.get(share.item_id) ?? [];
    list.push({ profileId: share.participant_id, parts: share.parts });
    sharesByItem.set(share.item_id, list);
  }

  const breakdowns = buildParticipantBreakdowns(
    (items ?? []).map((item) => ({
      id: item.id,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unit_price,
      shares: sharesByItem.get(item.id) ?? [],
    })),
    (participantRows ?? []).map((row) => row.id),
    bill.service_tax_percent,
  );

  const context: SeatContext = {
    billId,
    serviceTaxPercent: bill.service_tax_percent,
  };

  const isOwner = userId === bill.owner_id;
  const isOpen = bill.status === "open";

  const participants: Participant[] = (participantRows ?? []).map((row) => {
    const isBillOwner = row.profile_id === bill.owner_id;
    const isSelf = row.profile_id === userId;

    return {
      id: row.id,
      name: row.display_name ?? row.profiles?.display_name ?? "Sem nome",
      avatarKey: (row.avatar_key ??
        row.profiles?.avatar_key ??
        null) as AvatarKey | null,
      isGuest: !row.profile_id,
      isBillOwner,
      isSelf,
      canRemove: isOpen && !isBillOwner && (isOwner || isSelf),
      breakdown: breakdowns.get(row.id)!,
    };
  });

  const owner = participants.find((participant) => participant.isBillOwner);
  const others = participants.filter((participant) => !participant.isBillOwner);

  const seats: Seat[] = others.map((participant) => ({
    kind: "participant",
    participant,
  }));
  if (isOwner && isOpen) {
    seats.push({ kind: "empty" });
  }

  const rows: [Seat | undefined, Seat | undefined][] = [];
  for (let i = 0; i < seats.length; i += 2) {
    rows.push([seats[i], seats[i + 1]]);
  }

  return (
    <div className="flex flex-1 flex-col gap-3">
      {/* O nome da conta só aparece na grade de Itens; aqui fica pro leitor de tela. */}
      <h1 className="sr-only">Mesa de {bill.name}</h1>
      {isOwner && isOpen && (
        <div className="flex justify-end gap-2 pb-2">
          <ImportParticipantsDialog
            billId={billId}
            ownerId={bill.owner_id}
            currentProfileIds={(participantRows ?? []).flatMap((row) =>
              row.profile_id ? [row.profile_id] : [],
            )}
            currentNames={participants.map((participant) => participant.name)}
            action={importParticipants.bind(null, billId)}
          />
          <AddGuestDialog action={addGuestParticipant.bind(null, billId)} />
        </div>
      )}
      {/* Quem não é dono não tem ação aqui: diz por quê e o que dá pra fazer. */}
      {!isOwner && isOpen && (
        <p className="pb-2 text-center text-[13px] leading-snug text-balance text-muted-foreground">
          Só {owner?.name.split(" ")[0] ?? "o organizador"} coloca gente na mesa. Toque no seu
          lugar pra ver quanto você deve.
        </p>
      )}

      <div className="grid grid-cols-[minmax(3.5rem,1fr)_8rem_minmax(3.5rem,1fr)] items-center justify-center gap-x-4 gap-y-6 py-2">
        {owner && (
          <div className="col-span-3 -mb-3 flex flex-col items-center justify-self-center gap-1">
            <SeatButton
              context={context}
              participant={owner}
              className="flex flex-col items-center gap-1"
            >
              <AvatarSlot participant={owner} />
              <SeatName participant={owner} />
            </SeatButton>
          </div>
        )}

        {rows.map((row, index) => (
          <Fragment key={index}>
            <Slot
              key={seatKey(row[0], `blank-${index}-a`)}
              context={context}
              seat={row[0]}
              align="end"
            />
            {index === 0 && (
              <div
                className="self-stretch border-[1.5px] border-foreground bg-muted"
                style={{
                  gridColumn: "2",
                  gridRow: `2 / span ${rows.length}`,
                  boxShadow:
                    "0 10px 18px -8px color-mix(in oklch, var(--foreground), transparent 55%), inset 0 1px 0 color-mix(in oklch, var(--background), transparent 15%), inset 0 -1px 0 color-mix(in oklch, var(--foreground), transparent 80%)",
                }}
              />
            )}
            <Slot
              key={seatKey(row[1], `blank-${index}-b`)}
              context={context}
              seat={row[1]}
              align="start"
            />
          </Fragment>
        ))}
      </div>
    </div>
  );
}
