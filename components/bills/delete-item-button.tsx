"use client";

import { Trash2 } from "lucide-react";

import { ConfirmDeleteButton } from "@/components/bills/confirm-delete-button";
import { Button } from "@/components/ui/button";

export function DeleteItemButton({
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
          aria-label="Remover item"
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 />
        </Button>
      }
      title="Excluir item?"
      description="Essa ação não pode ser desfeita. O item será removido e os valores divididos recalculados."
      confirmLabel="Excluir"
      pendingLabel="Excluindo..."
    />
  );
}
