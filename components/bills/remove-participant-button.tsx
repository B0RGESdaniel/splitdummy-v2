"use client";

import { Trash2 } from "lucide-react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="ghost"
      size="icon-sm"
      disabled={pending}
      aria-label="Remover participante"
      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
    >
      <Trash2 />
    </Button>
  );
}

export function RemoveParticipantButton({
  action,
}: {
  action: () => void | Promise<void>;
}) {
  return (
    <form action={action}>
      <SubmitButton />
    </form>
  );
}
