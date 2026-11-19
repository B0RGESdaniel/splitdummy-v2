"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

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

function ConfirmButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="destructive" disabled={pending}>
      {pending ? "Marcando..." : "Marcar como paga"}
    </Button>
  );
}

export function CloseBillButton({
  action,
  totalLabel,
  peopleCount,
  serviceTaxPercent,
}: {
  action: () => void | Promise<void>;
  totalLabel: string;
  peopleCount: number;
  serviceTaxPercent: number;
}) {
  const [open, setOpen] = useState(false);
  const portalContainer = usePortalContainer();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" className="w-full">
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
          <form action={action} className="contents">
            <ConfirmButton />
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
