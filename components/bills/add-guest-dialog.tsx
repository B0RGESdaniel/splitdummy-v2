"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import { useFormStatus } from "react-dom";

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

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Adicionando..." : "Adicionar"}
    </Button>
  );
}

export function AddGuestDialog({
  action,
}: {
  action: (formData: FormData) => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus data-icon="inline-start" />
          Adicionar convidado
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar convidado</DialogTitle>
        </DialogHeader>
        <form
          action={async (formData) => {
            await action(formData);
            setOpen(false);
          }}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="display_name">Nome</Label>
            <Input
              id="display_name"
              name="display_name"
              placeholder="Ex: Fulano"
              required
              autoFocus
            />
          </div>
          <SubmitButton />
        </form>
      </DialogContent>
    </Dialog>
  );
}
