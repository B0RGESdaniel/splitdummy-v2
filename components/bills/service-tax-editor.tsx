"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePortalContainer } from "@/components/theme-scope";

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Salvando..." : "Salvar"}
    </Button>
  );
}

export function ServiceTaxEditor({
  serviceTaxPercent,
  action,
}: {
  serviceTaxPercent: number;
  action: (formData: FormData) => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const portalContainer = usePortalContainer();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs"
        >
          Taxa de serviço: <span className="font-digits">{serviceTaxPercent}%</span>
          <Pencil className="size-3" />
        </button>
      </DialogTrigger>
      <DialogContent container={portalContainer}>
        <DialogHeader>
          <DialogTitle>Taxa de serviço</DialogTitle>
        </DialogHeader>
        <form
          action={async (formData) => {
            await action(formData);
            setOpen(false);
          }}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="service_tax_percent">Porcentagem (%)</Label>
            <Input
              id="service_tax_percent"
              name="service_tax_percent"
              type="number"
              min={0}
              max={100}
              step="0.01"
              defaultValue={serviceTaxPercent}
              required
            />
          </div>
          <DialogFooter>
            <SaveButton />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
