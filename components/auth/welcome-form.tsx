"use client";

import { useActionState } from "react";

import { completeProfile } from "@/app/(auth)/welcome/actions";
import { AvatarPicker } from "@/components/bills/avatar-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TextMorph } from "@/components/ui/text-morph";
import { MAX_FIRST_NAME_LENGTH } from "@/lib/auth/first-name";

export function WelcomeForm({
  defaultName,
  next,
}: {
  defaultName: string;
  next: string;
}) {
  const [state, formAction, isPending] = useActionState(completeProfile, null);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="next" value={next} />
      <div className="flex flex-col gap-2">
        <Label htmlFor="display_name">Como te chamam?</Label>
        <Input
          id="display_name"
          name="display_name"
          defaultValue={defaultName}
          autoComplete="given-name"
          maxLength={MAX_FIRST_NAME_LENGTH}
          required
          autoFocus={!defaultName}
        />
        <p className="text-muted-foreground text-xs">Só o primeiro nome, é o que aparece na mesa.</p>
      </div>
      <div className="flex flex-col gap-2">
        <Label>Seu avatar</Label>
        <AvatarPicker name="avatar_key" />
      </div>
      {state?.error && <p className="text-destructive text-sm">{state.error}</p>}
      <Button type="submit" disabled={isPending} className="w-full">
        <TextMorph>{isPending ? "Salvando..." : "Continuar"}</TextMorph>
      </Button>
    </form>
  );
}
