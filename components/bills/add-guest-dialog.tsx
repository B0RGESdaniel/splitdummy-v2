"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";

import { AvatarPicker } from "@/components/bills/avatar-picker";
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
      {pending ? "Adicionando..." : "Adicionar"}
    </Button>
  );
}

export function AddGuestDialog({
  action,
  trigger,
}: {
  action: (formData: FormData) => void | Promise<void>;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const portalContainer = usePortalContainer();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <UserPlus data-icon="inline-start" />
            Adicionar convidado
          </Button>
        )}
      </DialogTrigger>
      <DialogContent container={portalContainer}>
        <DialogHeader>
          <DialogTitle>Adicionar convidado</DialogTitle>
        </DialogHeader>
        <form
          action={async (formData) => {
            try {
              await action(formData);
              setOpen(false);
            } catch (error) {
              toast.error(
                error instanceof Error
                  ? error.message
                  : "Não foi possível adicionar o convidado.",
              );
            }
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
          <div className="flex flex-col gap-2">
            <Label>Avatar</Label>
            <AvatarPicker name="avatar_key" />
          </div>
          <SubmitButton />
        </form>
      </DialogContent>
    </Dialog>
  );
}
