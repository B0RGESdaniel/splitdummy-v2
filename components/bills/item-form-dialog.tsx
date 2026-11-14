"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";

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

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Salvando..." : label}
    </Button>
  );
}

export function ItemFormDialog({
  action,
  trigger,
  title,
  submitLabel,
  initialValues,
}: {
  action: (formData: FormData) => void | Promise<void>;
  trigger: React.ReactNode;
  title: string;
  submitLabel: string;
  initialValues?: {
    description: string;
    unit_price: number;
    quantity: number;
  };
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form
          action={async (formData) => {
            try {
              await action(formData);
              setOpen(false);
            } catch (error) {
              toast.error(
                error instanceof Error ? error.message : "Não foi possível salvar o item.",
              );
            }
          }}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="description">Descrição</Label>
            <Input
              id="description"
              name="description"
              placeholder="Ex: Cerveja long neck"
              defaultValue={initialValues?.description}
              required
              autoFocus
            />
          </div>
          <div className="flex gap-2">
            <div className="flex flex-1 flex-col gap-2">
              <Label htmlFor="unit_price">Preço unitário</Label>
              <Input
                id="unit_price"
                name="unit_price"
                type="number"
                step="0.01"
                min="0"
                defaultValue={initialValues?.unit_price}
                required
              />
            </div>
            <div className="flex flex-1 flex-col gap-2">
              <Label htmlFor="quantity">Quantidade</Label>
              <Input
                id="quantity"
                name="quantity"
                type="number"
                step="1"
                min="1"
                defaultValue={initialValues?.quantity ?? 1}
                required
              />
            </div>
          </div>
          <SubmitButton label={submitLabel} />
        </form>
      </DialogContent>
    </Dialog>
  );
}
