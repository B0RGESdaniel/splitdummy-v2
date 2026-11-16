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
          type="button"
          variant="ghost"
          className="w-full justify-center gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="size-4" />
          Excluir item
        </Button>
      }
      title="Excluir item?"
      description="Essa ação não pode ser desfeita. O item será removido e os valores divididos recalculados."
      confirmLabel="Excluir"
      pendingLabel="Excluindo..."
    />
  );
}
