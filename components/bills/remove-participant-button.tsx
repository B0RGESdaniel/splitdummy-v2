"use client";

import { Trash2 } from "lucide-react";

import { ConfirmDeleteButton } from "@/components/bills/confirm-delete-button";
import { Button } from "@/components/ui/button";

export function RemoveParticipantButton({
  action,
}: {
  action: () => void | Promise<void>;
}) {
  return (
    <ConfirmDeleteButton
      action={action}
      trigger={
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Remover participante"
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 />
        </Button>
      }
      title="Remover participante?"
      description="Essa ação não pode ser desfeita. O participante perderá acesso a esta conta."
      confirmLabel="Remover"
      pendingLabel="Removendo..."
    />
  );
}
