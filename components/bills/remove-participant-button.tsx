"use client";

import { ConfirmDeleteButton } from "@/components/bills/confirm-delete-button";

export function RemoveParticipantButton({
  action,
}: {
  action: () => void | Promise<void>;
}) {
  return (
    <ConfirmDeleteButton
      action={action}
      trigger={
        <button
          type="button"
          aria-label="Remover participante"
          className="flex h-4 w-4 items-center justify-center border border-destructive bg-background text-[11px] leading-none font-bold text-destructive"
        >
          ×
        </button>
      }
      title="Remover participante?"
      description="Essa ação não pode ser desfeita. O participante perderá acesso a esta conta."
      confirmLabel="Remover"
      pendingLabel="Removendo..."
    />
  );
}
