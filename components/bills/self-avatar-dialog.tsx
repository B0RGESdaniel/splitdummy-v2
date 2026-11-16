"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";

import { type AvatarKey } from "@/components/bills/avatar-icon";
import { AvatarPicker } from "@/components/bills/avatar-picker";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { usePortalContainer } from "@/components/theme-scope";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Salvando..." : "Salvar"}
    </Button>
  );
}

export function SelfAvatarDialog({
  action,
  currentAvatarKey,
  trigger,
}: {
  action: (formData: FormData) => void | Promise<void>;
  currentAvatarKey?: AvatarKey;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const portalContainer = usePortalContainer();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent container={portalContainer}>
        <DialogHeader>
          <DialogTitle>Escolher avatar</DialogTitle>
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
                  : "Não foi possível salvar o avatar.",
              );
            }
          }}
          className="flex flex-col gap-4"
        >
          <AvatarPicker name="avatar_key" defaultValue={currentAvatarKey} />
          <SubmitButton />
        </form>
      </DialogContent>
    </Dialog>
  );
}
