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

function ConfirmButton({
  confirmLabel,
  pendingLabel,
}: {
  confirmLabel: string;
  pendingLabel: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="destructive" disabled={pending}>
      {pending ? pendingLabel : confirmLabel}
    </Button>
  );
}

export function ConfirmDeleteButton({
  action,
  trigger,
  title,
  description,
  confirmLabel,
  pendingLabel,
}: {
  action: () => void | Promise<void>;
  trigger: React.ReactNode;
  title: string;
  description: string;
  confirmLabel: string;
  pendingLabel: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <form action={action} className="contents">
            <ConfirmButton confirmLabel={confirmLabel} pendingLabel={pendingLabel} />
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
