"use client";

import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="ghost" size="sm" disabled={pending}>
      {pending ? "Removendo..." : "Remover"}
    </Button>
  );
}

export function DeleteItemButton({
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
