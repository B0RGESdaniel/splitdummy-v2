"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";

import { AvatarIcon, type AvatarKey } from "@/components/bills/avatar-icon";
import { AvatarPicker } from "@/components/bills/avatar-picker";
import { ConfirmDeleteButton } from "@/components/bills/confirm-delete-button";
import { usePortalContainer } from "@/components/theme-scope";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { ParticipantBreakdown } from "@/lib/split/breakdown";

function formatCurrency(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function SaveAvatarButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Salvando..." : "Salvar avatar"}
    </Button>
  );
}

export function SeatDialog({
  name,
  avatarKey,
  isSelf,
  breakdown,
  serviceTaxPercent,
  setAvatarAction,
  removeAction,
  trigger,
}: {
  name: string;
  avatarKey: AvatarKey | null;
  isSelf: boolean;
  breakdown: ParticipantBreakdown;
  serviceTaxPercent: number;
  setAvatarAction?: (formData: FormData) => void | Promise<void>;
  removeAction?: () => void | Promise<void>;
  trigger: React.ReactNode;
}) {
  const portalContainer = usePortalContainer();
  // Assento próprio ainda sem avatar já abre com o seletor à mostra.
  const [pickingAvatar, setPickingAvatar] = useState(isSelf && !avatarKey);

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open) setPickingAvatar(isSelf && !avatarKey);
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent container={portalContainer}>
        <DialogHeader className="flex-row items-center gap-3">
          {avatarKey && (
            <AvatarIcon avatarKey={avatarKey} className="h-10 w-10 shrink-0 text-foreground" />
          )}
          <DialogTitle>{name}</DialogTitle>
        </DialogHeader>

        {breakdown.items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ainda sem itens nesta conta.</p>
        ) : (
          <ul className="flex flex-col gap-1.5 text-sm">
            {breakdown.items.map((item) => (
              <li key={item.id} className="flex items-baseline justify-between gap-2">
                <span className="min-w-0 truncate">
                  <span className="font-semibold tabular-nums">
                    {item.myParts}/{item.totalParts}
                  </span>{" "}
                  <span className="text-muted-foreground tabular-nums">{item.quantity}x</span>{" "}
                  {item.description}
                </span>
                <span className="shrink-0 tabular-nums">{formatCurrency(item.amountCents)}</span>
              </li>
            ))}
          </ul>
        )}

        <dl className="flex flex-col gap-1 border-t border-dashed border-border pt-3 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <dt>Subtotal</dt>
            <dd className="tabular-nums">{formatCurrency(breakdown.subtotalCents)}</dd>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <dt>Taxa ({serviceTaxPercent}%)</dt>
            <dd className="tabular-nums">
              {formatCurrency(breakdown.totalCents - breakdown.subtotalCents)}
            </dd>
          </div>
          <div className="flex justify-between text-base font-semibold">
            <dt>Total</dt>
            <dd className="tabular-nums">{formatCurrency(breakdown.totalCents)}</dd>
          </div>
        </dl>

        {setAvatarAction &&
          (pickingAvatar ? (
            <form
              action={async (formData) => {
                try {
                  await setAvatarAction(formData);
                  setPickingAvatar(false);
                } catch (error) {
                  toast.error(
                    error instanceof Error
                      ? error.message
                      : "Não foi possível salvar o avatar.",
                  );
                }
              }}
              className="flex flex-col gap-3 border-t border-dashed border-border pt-3"
            >
              <AvatarPicker name="avatar_key" defaultValue={avatarKey ?? undefined} />
              <SaveAvatarButton />
            </form>
          ) : (
            <Button type="button" variant="outline" onClick={() => setPickingAvatar(true)}>
              Trocar avatar
            </Button>
          ))}

        {removeAction && (
          <div className="border-t border-dashed border-border pt-3">
            <ConfirmDeleteButton
              action={removeAction}
              trigger={
                <Button type="button" variant="destructive" className="w-full">
                  {isSelf ? "Sair desta conta" : "Remover participante"}
                </Button>
              }
              title={isSelf ? "Sair desta conta?" : "Remover participante?"}
              description={
                isSelf
                  ? "Essa ação não pode ser desfeita. Você perderá acesso a esta conta."
                  : "Essa ação não pode ser desfeita. O participante perderá acesso a esta conta."
              }
              confirmLabel={isSelf ? "Sair" : "Remover"}
              pendingLabel={isSelf ? "Saindo..." : "Removendo..."}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
