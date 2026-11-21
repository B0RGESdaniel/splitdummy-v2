"use client";

import { useState } from "react";

import { ProfileFields } from "@/components/auth/profile-fields";
import { SheetCell, SheetGrid, SheetValue } from "@/components/auth/sheet-grid";
import type { AvatarKey } from "@/components/bills/avatar-icon";
import { Button } from "@/components/ui/button";

type Guest = { id: string; name: string; avatarKey: AvatarKey | null };

type Step = { kind: "list" } | { kind: "claim"; guest: Guest } | { kind: "new" };

// Convite, já logado: primeiro a pessoa se aponta na mesa ("Sou Bia"); só
// quem não está na lista escreve o próprio nome. Perfil ainda sem nome ou
// avatar confirma os dois na mesma folha antes de entrar — já preenchidos com
// os do convidado que ela reivindicou.
export function JoinSeatPicker({
  token,
  billName,
  ownerName,
  guests,
  profile,
}: {
  token: string;
  billName: string;
  ownerName: string;
  guests: Guest[];
  profile: { name: string; avatarKey: AvatarKey | null; isComplete: boolean };
}) {
  const [step, setStep] = useState<Step>(guests.length > 0 ? { kind: "list" } : { kind: "new" });
  const needsProfile = !profile.isComplete;

  const billCells = (
    <>
      <SheetCell label="Conta">
        <SheetValue>{billName}</SheetValue>
      </SheetCell>
      <SheetCell label="Dono">
        <SheetValue>{ownerName}</SheetValue>
      </SheetCell>
    </>
  );

  const backToList =
    guests.length > 0 ? (
      <div className="flex">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-11"
          onClick={() => setStep({ kind: "list" })}
        >
          Voltar à lista
        </Button>
      </div>
    ) : null;

  if (step.kind === "list") {
    return (
      <>
        <SheetGrid>{billCells}</SheetGrid>
        <p className="text-sm">Quem é você nesta mesa?</p>
        <div className="flex flex-col gap-2">
          {guests.map((guest) =>
            needsProfile ? (
              <Button
                key={guest.id}
                type="button"
                variant="outline"
                className="h-11 w-full"
                onClick={() => setStep({ kind: "claim", guest })}
              >
                Sou {guest.name}
              </Button>
            ) : (
              <AcceptForm key={guest.id} token={token} claimId={guest.id}>
                <Button type="submit" variant="outline" className="h-11 w-full">
                  Sou {guest.name}
                </Button>
              </AcceptForm>
            ),
          )}
        </div>
        {needsProfile ? (
          <Button type="button" className="h-11 w-full" onClick={() => setStep({ kind: "new" })}>
            Não estou na lista
          </Button>
        ) : (
          <AcceptForm token={token}>
            <Button type="submit" className="h-11 w-full">
              Não estou na lista
            </Button>
          </AcceptForm>
        )}
      </>
    );
  }

  const guest = step.kind === "claim" ? step.guest : null;

  return (
    <AcceptForm token={token} claimId={guest?.id}>
      <div className="flex flex-col gap-4">
        <SheetGrid>
          {billCells}
          {needsProfile && (
            <ProfileFields
              defaultName={guest ? (guest.name.trim().split(/\s+/)[0] ?? "") : profile.name}
              defaultAvatar={(guest?.avatarKey ?? profile.avatarKey) || undefined}
            />
          )}
        </SheetGrid>
        {needsProfile && (
          <p className="text-sm">
            {guest ? "Confira como você vai aparecer na mesa." : "Só o primeiro nome, é o que aparece na mesa."}
          </p>
        )}
        <Button type="submit" className="h-11 w-full">
          Entrar na mesa
        </Button>
        {backToList}
      </div>
    </AcceptForm>
  );
}

function AcceptForm({
  token,
  claimId,
  children,
}: {
  token: string;
  claimId?: string;
  children: React.ReactNode;
}) {
  return (
    <form action="/api/invites/accept" method="POST">
      <input type="hidden" name="token" value={token} />
      {claimId && <input type="hidden" name="claim_participant_id" value={claimId} />}
      {children}
    </form>
  );
}
