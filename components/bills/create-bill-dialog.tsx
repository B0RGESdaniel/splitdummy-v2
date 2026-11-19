"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { useFormStatus } from "react-dom";

import { createBill } from "@/app/(dashboard)/bills/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePortalContainer } from "@/components/theme-scope";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Abrindo..." : "Abrir comanda"}
    </Button>
  );
}

export function CreateBillDialog() {
  const [open, setOpen] = useState(false);
  const portalContainer = usePortalContainer();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {/* Próxima folha do bloco: tracejada porque ainda não existe. */}
        <button
          type="button"
          className="flex min-h-16 w-full items-center justify-center gap-2.5 border-[1.5px] border-dashed border-[color:var(--balcao-line)] text-sm font-semibold tracking-[0.06em] uppercase transition-colors hover:border-[color:var(--balcao-ink)] hover:bg-[color:var(--balcao-ink)]/5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[color:var(--balcao-ink)]"
        >
          <Plus className="size-[18px]" strokeWidth={2.25} aria-hidden />
          Abrir nova comanda
        </button>
      </DialogTrigger>
      <DialogContent container={portalContainer}>
        <DialogHeader>
          <DialogTitle>Nova comanda</DialogTitle>
        </DialogHeader>
        <form action={createBill} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Nome da conta</Label>
            <Input
              id="name"
              name="name"
              placeholder="Ex: Bar do Zé, aniversário da Bia"
              required
              autoFocus
              className="font-handwritten text-lg text-[color:var(--ink-handwritten)]"
            />
          </div>
          <SubmitButton />
        </form>
      </DialogContent>
    </Dialog>
  );
}
