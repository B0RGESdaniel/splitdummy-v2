"use client";

import { useRef, useState } from "react";
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
import { TextMorph } from "@/components/ui/text-morph";
import { shake } from "@/lib/ui/shake";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      <TextMorph>{pending ? "Adicionando..." : "Adicionar"}</TextMorph>
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
  const [duplicateName, setDuplicateName] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const portalContainer = usePortalContainer();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <UserPlus data-icon="inline-start" />
            Adicionar à mesa
          </Button>
        )}
      </DialogTrigger>
      <DialogContent container={portalContainer}>
        <DialogHeader>
          <DialogTitle>Adicionar à mesa</DialogTitle>
        </DialogHeader>
        <form
          action={async (formData) => {
            try {
              await action(formData);
              setOpen(false);
            } catch (error) {
              const message =
                error instanceof Error ? error.message : "Não deu pra adicionar à mesa.";
              // Nome repetido é erro do campo: ele sacode e fica marcado até mudar.
              if (message.includes("já está na mesa")) {
                setDuplicateName(true);
                shake(nameRef.current);
              }
              toast.error(message);
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
              ref={nameRef}
              aria-invalid={duplicateName || undefined}
              onChange={() => setDuplicateName(false)}
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
