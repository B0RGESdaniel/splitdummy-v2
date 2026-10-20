"use client";

import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="destructive" disabled={pending} className="w-full">
      {pending ? "Fechando..." : "Fechar conta"}
    </Button>
  );
}

export function CloseBillButton({
  action,
}: {
  action: () => void | Promise<void>;
}) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (
          !window.confirm(
            "Fechar a conta é definitivo e não pode ser desfeita. Continuar?",
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <SubmitButton />
    </form>
  );
}
