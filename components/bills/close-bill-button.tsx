"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { usePortalContainer } from "@/components/theme-scope";

function ConfirmButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="destructive" disabled={pending || disabled}>
      {pending ? "Marcando..." : "Marcar como paga"}
    </Button>
  );
}

export function CloseBillButton({
  action,
  totalLabel,
  peopleCount,
  serviceTaxPercent,
  disabled,
}: {
  action: () => void | Promise<void>;
  totalLabel: string;
  peopleCount: number;
  serviceTaxPercent: number;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const portalContainer = usePortalContainer();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" className="w-full" disabled={disabled}>
          Marcar como paga
        </Button>
      </DialogTrigger>
      <DialogContent container={portalContainer}>
        <DialogHeader>
          <DialogTitle>Marcar esta conta como paga?</DialogTitle>
          <DialogDescription>
            Fica congelado: <strong className="font-semibold">{totalLabel}</strong>{" "}
            entre {peopleCount} {peopleCount === 1 ? "pessoa" : "pessoas"}, com{" "}
            {serviceTaxPercent}% de taxa. Depois de paga, ninguém edita mais itens,
            partes nem a taxa — e não dá pra desfazer.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <form
            action={async () => {
              try {
                await action();
              } catch {
                // Inclui a recusa do servidor por item sem dono que chegou
                // antes do realtime; o aviso no cupom mostra qual.
                setOpen(false);
                toast.error("Não deu pra marcar como paga. Confira os itens e tente de novo.");
              }
            }}
            className="contents"
          >
            <ConfirmButton disabled={disabled} />
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
